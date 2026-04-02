"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crown, Flag, FlaskConical, Gem, Rocket, Shuffle, Sparkles,
  Trophy, Volume2, VolumeX, Star, Gift, Zap, Medal,
  ChevronDown, Flame,
} from "lucide-react";
import CountUp from "react-countup";
import confetti from "canvas-confetti";
import { TopBar } from "@/shared/ui/Sidebar";
import { Button } from "@/shared/ui/Button";
import { ProgressCard, RewardCard, LockedState } from "@/shared/ui/gamification";
import { useCelebrationStore } from "@/shared/store/celebrationStore";
import {
  getAudioPrefs, setAudioPrefs, play,
  type EffectId, type EffectVariant,
} from "@/shared/lib/gamificationAudio";

/* ── Types ─────────────────────────────────────── */
type DemoRank = { id: string; name: string; elo: number; prevElo: number };
type Intensity = "suave" | "medio" | "intenso";
type ThemeId = "arcade" | "neo" | "minimal";

const EFFECT_IDS: EffectId[] = ["click", "xp_gain", "rank_shift", "badge_unlock", "season_finale"];
const EFFECT_LABELS: Record<EffectId, string> = {
  click: "Click", xp_gain: "XP", rank_shift: "Ranking",
  badge_unlock: "Insignia", season_finale: "Finale",
};

const PATH_ICONS = [Star, Zap, Gift, Crown, Medal, Trophy];

const BASE_RANK: DemoRank[] = [
  { id: "u1", name: "Ana", elo: 1460, prevElo: 1460 },
  { id: "u2", name: "Luis", elo: 1390, prevElo: 1390 },
  { id: "u3", name: "Mario", elo: 1320, prevElo: 1320 },
  { id: "u4", name: "Sofia", elo: 1280, prevElo: 1280 },
  { id: "u5", name: "Carlos", elo: 1210, prevElo: 1210 },
];

/* ── Particle Field (CSS-driven) ───────────────── */
function ParticleField({ theme }: { theme: ThemeId }) {
  const particles = useMemo(() => {
    const count = theme === "minimal" ? 0 : 24;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: theme === "arcade" ? 3 + Math.random() * 4 : 2 + Math.random() * 5,
      dur: `${6 + Math.random() * 10}s`,
      delay: `${-Math.random() * 8}s`,
      opacity: 0.2 + Math.random() * 0.4,
    }));
  }, [theme]);

  if (theme === "minimal") return null;

  const color = theme === "arcade"
    ? ["#a855f7", "#22d3ee", "#f43f5e", "#fbbf24"]
    : ["#06b6d4", "#8b5cf6", "#ec4899", "#a78bfa"];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="g-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: theme === "arcade" ? "2px" : "50%",
            background: color[p.id % color.length],
            "--p-dur": p.dur,
            "--p-delay": p.delay,
            "--p-opacity": p.opacity,
            filter: theme === "neo" ? `blur(1px)` : undefined,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ── Podium Component ──────────────────────────── */
function Podium({ ranks, theme }: { ranks: DemoRank[]; theme: ThemeId }) {
  const top3 = ranks.slice(0, 3);
  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
  const heights = [100, 140, 75];
  const medals = ["🥈", "🥇", "🥉"];
  const glowColors = theme === "arcade"
    ? ["rgba(34,211,238,0.4)", "rgba(251,191,36,0.5)", "rgba(244,63,94,0.3)"]
    : theme === "neo"
    ? ["rgba(6,182,212,0.3)", "rgba(139,92,246,0.4)", "rgba(236,72,153,0.25)"]
    : ["transparent", "transparent", "transparent"];

  return (
    <div className="flex items-end justify-center gap-3 h-52 mt-4">
      {podiumOrder.map((rankIdx, visualIdx) => {
        const entry = top3[rankIdx];
        if (!entry) return null;
        return (
          <motion.div
            key={entry.id}
            className="flex flex-col items-center"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: visualIdx * 0.12, type: "spring", damping: 18, stiffness: 200 }}
          >
            <motion.span
              className="text-2xl mb-1"
              animate={rankIdx === 0 ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            >
              {medals[rankIdx]}
            </motion.span>
            <p className="text-xs font-bold mb-1">{entry.name}</p>
            <p className="text-xs font-mono tabular-nums mb-2">
              <CountUp end={entry.elo} duration={0.8} preserveValue />
            </p>
            <motion.div
              className="g-podium-bar w-16 md:w-20"
              style={{
                background: rankIdx === 0
                  ? "linear-gradient(180deg, #fbbf24, #f59e0b)"
                  : rankIdx === 1
                  ? "linear-gradient(180deg, #94a3b8, #64748b)"
                  : "linear-gradient(180deg, #f97316, #ea580c)",
                boxShadow: `0 0 16px ${glowColors[rankIdx]}`,
              }}
              initial={{ height: 0 }}
              animate={{ height: heights[visualIdx] }}
              transition={{ delay: 0.2 + visualIdx * 0.15, type: "spring", damping: 16, stiffness: 180 }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────── */
export default function GamificationLabPage() {
  const [xpPercent, setXpPercent] = useState(42);
  const [prevXp, setPrevXp] = useState(42);
  const [streakDays, setStreakDays] = useState(7);
  const [prevStreak, setPrevStreak] = useState(7);
  const [locked, setLocked] = useState(true);
  const [unlockAnim, setUnlockAnim] = useState(false);
  const [mode, setMode] = useState<Intensity>("medio");
  const [finaleOpen, setFinaleOpen] = useState(false);
  const [finaleStep, setFinaleStep] = useState(0);
  const [pathProgress, setPathProgress] = useState(3);
  const [rankData, setRankData] = useState<DemoRank[]>(BASE_RANK);
  const [theme, setTheme] = useState<ThemeId>("arcade");
  const [audioPrefs, setAudioPrefsLocal] = useState(() => getAudioPrefs());
  const [soundPanelOpen, setSoundPanelOpen] = useState(false);
  const showCelebration = useCelebrationStore((s) => s.show);
  const finaleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => { setAudioPrefsLocal(getAudioPrefs()); }, []);

  const updateAudioPrefs = useCallback((u: Parameters<typeof setAudioPrefs>[0]) => {
    setAudioPrefs(u);
    setAudioPrefsLocal(getAudioPrefs());
  }, []);

  const orderedRank = useMemo(
    () => [...rankData].sort((a, b) => b.elo - a.elo),
    [rankData]
  );

  const randomizeRanking = useCallback(() => {
    play("rank_shift");
    setRankData((prev) =>
      prev.map((item) => ({
        ...item,
        prevElo: item.elo,
        elo: Math.max(1000, item.elo + Math.floor(Math.random() * 160) - 80),
      }))
    );
  }, []);

  const motionConfig = useMemo(() => {
    if (mode === "suave") return { duration: 0.45, bounce: 0.1, stiffness: 180, damping: 28 };
    if (mode === "intenso") return { duration: 1.1, bounce: 0.55, stiffness: 320, damping: 16 };
    return { duration: 0.75, bounce: 0.32, stiffness: 240, damping: 22 };
  }, [mode]);

  const handleUnlock = useCallback(() => {
    if (locked) {
      setUnlockAnim(true);
      play("badge_unlock");
      setTimeout(() => {
        setLocked(false);
        setUnlockAnim(false);
      }, 500);
    } else {
      play("click");
      setLocked(true);
    }
  }, [locked]);

  const revealFinale = useCallback(() => {
    play("season_finale");
    setFinaleOpen(true);
    setFinaleStep(0);

    finaleTimers.current.forEach(clearTimeout);
    finaleTimers.current = [];

    finaleTimers.current.push(setTimeout(() => setFinaleStep(1), 300));
    finaleTimers.current.push(setTimeout(() => setFinaleStep(2), 600));
    finaleTimers.current.push(setTimeout(() => setFinaleStep(3), 900));
    finaleTimers.current.push(setTimeout(() => {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
    }, 1100));
    finaleTimers.current.push(setTimeout(() => {
      confetti({ particleCount: 40, spread: 100, origin: { y: 0.5 }, zIndex: 9999, colors: ["#7c3aed", "#22d3ee", "#fbbf24"] });
    }, 1500));
    finaleTimers.current.push(setTimeout(() => {
      confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 }, zIndex: 9999, scalar: 1.3 });
    }, 1900));
    finaleTimers.current.push(setTimeout(() => {
      showCelebration({
        tarea_titulo: "¡Final de temporada!",
        delta_elo: 120, delta_xp: 300,
        nuevas_insignias: [{ id: "s1", nombre: "Elite de temporada", imagen_url: "" }],
        subio_nivel: true,
      });
    }, 2200));
  }, [showCelebration]);

  const closeFinale = useCallback(() => {
    finaleTimers.current.forEach(clearTimeout);
    setFinaleOpen(false);
    setFinaleStep(0);
  }, []);

  const handleXpChange = useCallback((val: number) => {
    setPrevXp(xpPercent);
    setXpPercent(val);
    if (val > xpPercent) play("xp_gain");
  }, [xpPercent]);

  const handleStreakChange = useCallback((delta: number) => {
    play("click");
    setPrevStreak(streakDays);
    setStreakDays((v) => Math.max(0, v + delta));
  }, [streakDays]);

  const handlePathStep = useCallback((delta: number) => {
    play("click");
    const next = Math.max(1, Math.min(6, pathProgress + delta));
    if (next > pathProgress && next <= 6) {
      confetti({
        particleCount: 20, spread: 40, startVelocity: 15,
        origin: { x: (pathProgress / 6) * 0.7 + 0.15, y: 0.65 },
        zIndex: 9999, scalar: 0.7,
      });
    }
    setPathProgress(next);
  }, [pathProgress]);

  const fireColor = streakDays < 5 ? "#ef4444" : streakDays < 15 ? "#f97316" : "#fbbf24";
  const fireScale = Math.min(1.8, 0.8 + streakDays * 0.05);

  const finaleCards = [
    { icon: Trophy, title: "Top 3", value: "Puesto #2", glow: "#fbbf24" },
    { icon: Gem, title: "Insignia", value: "Elite de temporada", glow: "#a855f7" },
    { icon: Rocket, title: "Impulso", value: "+300 XP / +120 ELO", glow: "#22d3ee" },
  ];

  return (
    <>
      <TopBar title="Lab visual de gamificación" />
      <div
        className={`flex-1 p-5 md:p-8 space-y-6 relative g-lab-theme-${theme}`}
        style={{ color: "var(--lab-text, var(--text))", background: "var(--lab-bg, var(--bg))", minHeight: "100vh" }}
      >
        <ParticleField theme={theme} />

        {/* ── HERO ─────────────────────────────── */}
        <div className="g-hero-mesh p-6 md:p-8 relative" style={{ zIndex: 1 }}>
          <motion.div
            className="g-glow-orb"
            style={{ width: 180, height: 180, background: theme === "arcade" ? "rgba(168,85,247,0.3)" : theme === "neo" ? "rgba(6,182,212,0.25)" : "transparent", top: -40, left: -30 }}
            animate={{ x: [0, 20, 0], y: [0, 10, 0] }}
            transition={{ duration: 7, repeat: Infinity }}
          />
          <motion.div
            className="g-glow-orb"
            style={{ width: 140, height: 140, background: theme === "arcade" ? "rgba(34,211,238,0.25)" : theme === "neo" ? "rgba(236,72,153,0.2)" : "transparent", right: 10, top: 10 }}
            animate={{ x: [0, -15, 0], y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
                <FlaskConical className="w-7 h-7" style={{ color: theme === "arcade" ? "#a855f7" : theme === "neo" ? "#06b6d4" : "#2563eb" }} />
                Sandbox de experiencia
              </h1>
              <p className="text-sm mt-1 opacity-70">
                Compara temas, sonidos y animaciones. Ajusta todo en tiempo real.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["suave", "medio", "intenso"] as const).map((opt) => (
                <Button key={opt} size="sm" variant={mode === opt ? "primary" : "outline"}
                  onClick={() => { play("click"); setMode(opt); }}>
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* ── XP BAR PREMIUM ───────────────────── */}
        <ProgressCard className="relative" style={{ zIndex: 1 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: theme === "arcade" ? "#22d3ee" : theme === "neo" ? "#8b5cf6" : "#2563eb" }} />
              Barra de XP
            </p>
            <span className="text-sm font-mono tabular-nums font-bold">
              <CountUp start={prevXp} end={xpPercent} duration={0.6} preserveValue />%
            </span>
          </div>
          <input type="range" min={0} max={100} value={xpPercent}
            onChange={(e) => handleXpChange(Number(e.target.value))} className="w-full mb-3" />
          <div className="relative h-5 rounded-full overflow-hidden" style={{ background: "var(--lab-card-bg, var(--bg-subtle))", border: "1px solid var(--lab-card-border, var(--border))" }}>
            {/* Level markers */}
            {[25, 50, 75].map((m) => (
              <div key={m} className="absolute top-0 bottom-0 w-px opacity-30"
                style={{ left: `${m}%`, background: "var(--lab-text, var(--text))" }} />
            ))}
            <motion.div
              className="g-xp-bar h-full"
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: motionConfig.duration, ease: "easeOut" }}
              style={{
                background: theme === "arcade"
                  ? "linear-gradient(90deg, #a855f7, #22d3ee)"
                  : theme === "neo"
                  ? "linear-gradient(90deg, #06b6d4, #8b5cf6, #ec4899)"
                  : "linear-gradient(90deg, #2563eb, #3b82f6)",
              }}
            />
            {xpPercent >= 100 && (
              <motion.div
                className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full g-pulse-glow"
                style={{ background: "#fbbf24", "--glow-color": "rgba(251,191,36,0.6)" } as React.CSSProperties}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>
          <div className="flex justify-between mt-1 text-xs opacity-40">
            <span>Nv. 1</span><span>Nv. 2</span><span>Nv. 3</span><span>Nv. 4</span>
          </div>
        </ProgressCard>

        {/* ── CELEBRATIONS ─────────────────────── */}
        <ProgressCard style={{ zIndex: 1 }}>
          <p className="font-bold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: "#fbbf24" }} />
            Celebraciones
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => {
              play("badge_unlock"); play("xp_gain");
              showCelebration({
                tarea_titulo: "Entrega demo aprobada", delta_elo: 48, delta_xp: 120,
                nuevas_insignias: [{ id: "b1", nombre: "Impacto", imagen_url: "" }], subio_nivel: true,
              });
            }}>
              <Sparkles className="w-4 h-4" /> Modal completo
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              play("xp_gain");
              showCelebration({ tarea_titulo: "Tarea simple", delta_xp: 40 });
            }}>
              Modal simple
            </Button>
            <Button size="sm" variant="ghost" onClick={revealFinale}>
              <Rocket className="w-4 h-4" /> Fin de temporada
            </Button>
          </div>
        </ProgressCard>

        {/* ── PATH (game map style) ────────────── */}
        <ProgressCard style={{ zIndex: 1 }}>
          <div className="flex items-center justify-between mb-4 gap-3">
            <p className="font-bold flex items-center gap-2">
              <Flag className="w-4 h-4" style={{ color: theme === "arcade" ? "#22d3ee" : theme === "neo" ? "#ec4899" : "#2563eb" }} />
              Camino de progreso
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handlePathStep(-1)}>- Paso</Button>
              <Button size="sm" variant="outline" onClick={() => handlePathStep(1)}>+ Paso</Button>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 6 }).map((_, i) => {
              const step = i + 1;
              const done = step < pathProgress;
              const active = step === pathProgress;
              const Icon = PATH_ICONS[i];
              return (
                <div key={step} className="flex items-center gap-1 md:gap-2">
                  <motion.div
                    className={[
                      "g-path-node relative",
                      done ? "g-path-node--done" : "",
                      active ? "g-path-node--active" : "",
                    ].join(" ")}
                    style={{ width: "3rem", height: "3rem", fontSize: "0.85rem" }}
                    animate={active ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                    transition={{ duration: motionConfig.duration, repeat: active ? Infinity : 0 }}
                  >
                    {done ? (
                      <Icon className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" style={{ opacity: active ? 1 : 0.4 }} />
                    )}
                    {active && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ border: "2px solid currentColor", opacity: 0.3 }}
                        animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                  {step < 6 && (
                    <svg width="32" height="4" className="shrink-0">
                      <line
                        x1="0" y1="2" x2="32" y2="2"
                        stroke={done ? (theme === "arcade" ? "#22d3ee" : theme === "neo" ? "#8b5cf6" : "#2563eb") : "var(--lab-card-border, var(--border))"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        className={done ? "g-path-svg-link" : ""}
                      />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </ProgressCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative" style={{ zIndex: 1 }}>
          {/* ── RANKING + PODIUM ────────────────── */}
          <ProgressCard>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold flex items-center gap-2">
                <Crown className="w-4 h-4" style={{ color: "#fbbf24" }} />
                Ranking
              </p>
              <Button size="sm" variant="outline" onClick={() => { play("click"); randomizeRanking(); }}>
                <Shuffle className="w-4 h-4" /> Simular
              </Button>
            </div>
            <Podium ranks={orderedRank} theme={theme} />
            <ul className="space-y-2 mt-4">
              {orderedRank.map((entry, idx) => {
                const diff = entry.elo - entry.prevElo;
                return (
                  <motion.li
                    key={entry.id}
                    layout
                    transition={{ type: "spring", stiffness: motionConfig.stiffness, damping: motionConfig.damping }}
                    className="flex items-center gap-3 p-3 rounded-xl relative overflow-hidden"
                    style={{
                      background: idx === 0
                        ? theme === "arcade" ? "rgba(251,191,36,0.1)" : theme === "neo" ? "rgba(139,92,246,0.08)" : "rgba(37,99,235,0.05)"
                        : "var(--lab-card-bg, var(--bg-card))",
                      border: "1px solid var(--lab-card-border, var(--border))",
                    }}
                  >
                    {diff > 0 && (
                      <motion.div
                        className="absolute inset-0"
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        style={{ background: "rgba(34,197,94,0.15)" }}
                      />
                    )}
                    {diff < 0 && (
                      <motion.div
                        className="absolute inset-0"
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        style={{ background: "rgba(239,68,68,0.12)" }}
                      />
                    )}
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold relative"
                      style={{
                        background: idx < 3
                          ? theme === "arcade" ? "rgba(168,85,247,0.2)" : theme === "neo" ? "rgba(6,182,212,0.15)" : "rgba(37,99,235,0.1)"
                          : "var(--bg-subtle)",
                        color: idx < 3
                          ? theme === "arcade" ? "#a855f7" : theme === "neo" ? "#06b6d4" : "#2563eb"
                          : "var(--text-muted)",
                      }}>
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium">{entry.name}</span>
                    <span className="text-sm font-bold tabular-nums">
                      <CountUp end={entry.elo} duration={0.8} preserveValue /> ELO
                    </span>
                    {diff !== 0 && (
                      <span className="text-xs font-bold ml-1" style={{ color: diff > 0 ? "#22c55e" : "#ef4444" }}>
                        {diff > 0 ? "+" : ""}{diff}
                      </span>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </ProgressCard>

          {/* ── STREAK + UNLOCK ─────────────────── */}
          <ProgressCard>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold">Racha y desbloqueo</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleStreakChange(-1)}>-1</Button>
                <Button size="sm" variant="outline" onClick={() => handleStreakChange(1)}>+1</Button>
              </div>
            </div>

            {/* Enhanced streak with fire */}
            <div className="g-streak-state p-4 flex items-center gap-4 mb-4" style={{ borderRadius: "var(--lab-radius, 1rem)" }}>
              <motion.div
                className="g-fire-anim relative"
                style={{ transform: `scale(${fireScale})` }}
                animate={streakDays > 0 ? { scale: [fireScale, fireScale * 1.1, fireScale] } : {}}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <Flame className="w-10 h-10" style={{ color: fireColor, filter: `drop-shadow(0 0 8px ${fireColor})` }} />
              </motion.div>
              <div>
                <p className="text-3xl font-black tabular-nums">
                  <CountUp start={prevStreak} end={streakDays} duration={0.5} preserveValue />
                </p>
                <p className="text-xs font-medium opacity-60">entregas en racha (demo)</p>
              </div>
            </div>

            {/* Cinematic unlock */}
            <Button size="sm" variant="ghost" onClick={handleUnlock}>
              {locked ? "Desbloquear insignia" : "Volver a bloquear"}
            </Button>

            <div className="mt-3 relative">
              <AnimatePresence mode="wait">
                {locked ? (
                  <motion.div
                    key="locked"
                    initial={{ opacity: 1 }}
                    exit={unlockAnim ? { scale: 1.05, opacity: 0, filter: "brightness(2)" } : { opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <LockedState label="Completa 3 tareas">
                      <RewardCard className="cursor-default">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-6 h-6" style={{ color: "#fbbf24" }} />
                          <div>
                            <p className="font-semibold text-sm">Insignia especial</p>
                            <p className="text-xs opacity-50">Completa 3 tareas para desbloquear</p>
                          </div>
                        </div>
                      </RewardCard>
                    </LockedState>
                    {unlockAnim && (
                      <motion.div
                        className="absolute inset-0 rounded-xl g-flash-overlay"
                        style={{ background: "white", zIndex: 10 }}
                      />
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="unlocked"
                    initial={{ scale: 0.5, opacity: 0, rotate: -3 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 14, stiffness: 200 }}
                  >
                    <RewardCard className="cursor-default g-pulse-glow"
                      style={{ "--glow-color": theme === "arcade" ? "rgba(251,191,36,0.3)" : theme === "neo" ? "rgba(139,92,246,0.25)" : "transparent" } as React.CSSProperties}>
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ rotate: [0, -10, 10, 0] }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        >
                          <Trophy className="w-6 h-6" style={{ color: "#fbbf24" }} />
                        </motion.div>
                        <div>
                          <p className="font-semibold text-sm">¡Insignia desbloqueada!</p>
                          <p className="text-xs opacity-50">Lista para compartir</p>
                        </div>
                      </div>
                    </RewardCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ProgressCard>
        </div>

        {/* ── SEASON FINALE (cinematic) ────────── */}
        <AnimatePresence>
          {finaleOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="relative rounded-2xl overflow-hidden"
              style={{
                zIndex: 2,
                background: theme === "arcade"
                  ? "radial-gradient(ellipse at center, rgba(168,85,247,0.15), rgba(12,12,26,0.95))"
                  : theme === "neo"
                  ? "radial-gradient(ellipse at center, rgba(6,182,212,0.1), rgba(15,15,35,0.95))"
                  : "rgba(255,255,255,0.98)",
                border: "1px solid var(--lab-card-border, var(--border))",
                padding: "2rem",
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-6"
              >
                <p className="text-xs uppercase tracking-widest mb-2 opacity-50">Cinemática</p>
                <h3 className="text-2xl md:text-3xl font-black">Fin de temporada</h3>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {finaleCards.map((item, i) => (
                  <AnimatePresence key={item.title}>
                    {finaleStep > i && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0, rotateY: -15 }}
                        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                        transition={{ type: "spring", damping: 14, stiffness: 180 }}
                        className="g-reward-card p-5 text-center g-pulse-glow"
                        style={{ "--glow-color": `${item.glow}40` } as React.CSSProperties}
                      >
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <item.icon className="w-8 h-8 mx-auto mb-3" style={{ color: item.glow }} />
                        </motion.div>
                        <p className="text-xs opacity-50 mb-1">{item.title}</p>
                        <p className="font-bold">{item.value}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                ))}
              </div>

              <div className="text-center mt-4">
                <Button size="sm" variant="outline" onClick={closeFinale}>Cerrar</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FLOATING TOOLBAR ─────────────────── */}
        <div className="g-lab-toolbar flex flex-wrap items-center gap-3 md:gap-4 rounded-t-xl" style={{ zIndex: 10 }}>
          <Button size="xs" variant={audioPrefs.enabled ? "primary" : "outline"}
            onClick={() => updateAudioPrefs({ enabled: !audioPrefs.enabled })}>
            {audioPrefs.enabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {audioPrefs.enabled ? "ON" : "OFF"}
          </Button>

          <input type="range" min={0} max={100} value={Math.round(audioPrefs.volume * 100)}
            onChange={(e) => updateAudioPrefs({ volume: Number(e.target.value) / 100 })}
            className="w-20" title="Volumen" />

          <div className="h-4 w-px opacity-20" style={{ background: "currentColor" }} />

          {(["arcade", "neo", "minimal"] as const).map((t) => (
            <Button key={t} size="xs" variant={theme === t ? "primary" : "ghost"}
              onClick={() => { play("click"); setTheme(t); }}>
              {t === "arcade" ? "Arcade" : t === "neo" ? "Neo" : "Minimal"}
            </Button>
          ))}

          <div className="h-4 w-px opacity-20" style={{ background: "currentColor" }} />

          <div className="relative">
            <Button size="xs" variant="ghost" onClick={() => setSoundPanelOpen((v) => !v)}>
              Sonidos <ChevronDown className="w-3 h-3" />
            </Button>
            <AnimatePresence>
              {soundPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full mb-2 left-0 p-3 rounded-xl space-y-2 min-w-[220px]"
                  style={{
                    background: "var(--lab-card-bg, var(--bg-card))",
                    border: "1px solid var(--lab-card-border, var(--border))",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 -8px 24px rgba(0,0,0,0.2)",
                  }}
                >
                  {EFFECT_IDS.map((effectId) => (
                    <div key={effectId} className="flex items-center gap-2">
                      <span className="text-xs w-14 opacity-60">{EFFECT_LABELS[effectId]}</span>
                      {(["a", "b", "c"] as EffectVariant[]).map((v) => (
                        <Button key={v} size="xs"
                          variant={audioPrefs.variants[effectId] === v ? "primary" : "ghost"}
                          onClick={() => { updateAudioPrefs({ variants: { [effectId]: v } }); play(effectId); }}>
                          {v.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
