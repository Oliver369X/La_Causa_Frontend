"use client";

import { motion } from "framer-motion";
import { Star, Zap, Trophy, Target, Award, Clock, ThumbsUp, AlertTriangle, Link2, Sparkles } from "lucide-react";
import type { Badge, CompetitiveProfile, PerformanceMetrics } from "../api/gamificationApi";
import { ProgressCard, StreakState } from "@/shared/ui/gamification";
import { motionSpring, staggerFast } from "@/shared/lib/motion";
import CountUp from "react-countup";

interface Props {
  profile: CompetitiveProfile;
  compact?: boolean;
  /** Estilo “jugador” para perfil público: más stats y presentación */
  showcase?: boolean;
  metrics?: PerformanceMetrics | null;
  certificatesCount?: number;
  currentBadge?: Badge | null;
  currentBadgeOrgName?: string | null;
  onSelectBadge?: (badge: Badge) => void;
}

function formatBadgeRankName(name?: string, defaultRank?: string) {
  if (!name) return defaultRank ? `Rango ${defaultRank}` : "Medalla de Honor";
  if (/^[A-Z0-9]+-[A-Z0-9_-]+$/i.test(name)) {
    const parts = name.split("-");
    const rank = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    return `Rango ${rank}`;
  }
  return name;
}

export function ProfileBanner({
  profile,
  compact = false,
  showcase = false,
  metrics,
  certificatesCount = 0,
  currentBadge,
  currentBadgeOrgName,
  onSelectBadge,
}: Props) {
  const xpTotal = profile.xp_total ?? 0;
  const nivel = profile.nivel ?? 1;
  const xpEnNivel = profile.xp_en_nivel ?? 0;
  const xpParaSiguienteNivel = profile.xp_para_siguiente_nivel ?? 100;
  const progresoXP = (xpEnNivel / xpParaSiguienteNivel) * 100;
  const xpFaltante = xpParaSiguienteNivel - xpEnNivel;

  const stats = [
    { icon: Trophy, label: "ELO", value: profile.puntos_elo ?? 0, color: "var(--g-energia)" },
    { icon: Star, label: "Nivel", value: nivel, color: "var(--g-progreso)" },
    { icon: Zap, label: "Insignias", value: profile.insignias_total ?? 0, color: "var(--g-epic)" },
    { icon: Clock, label: "Horas", value: profile.horas_totales_voluntario ?? 0, color: "var(--g-logro)" },
  ];

  const streak = profile.racha_entregas ?? 0;

  const outerClass = showcase
    ? "relative rounded-2xl p-[1px] overflow-hidden"
    : "";

  const innerStyle = showcase
    ? {
        background: "linear-gradient(145deg, var(--bg-card) 0%, var(--bg-subtle) 55%, var(--bg-card) 100%)",
        border: "1px solid var(--border)",
        boxShadow: "0 24px 48px -12px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06)",
      }
    : {};

  return (
    <div className={outerClass} style={showcase ? { background: "linear-gradient(120deg, var(--accent), var(--g-epic), var(--g-progreso))" } : undefined}>
      <ProgressCard className={showcase ? "!border-0 !shadow-none rounded-[15px]" : undefined} style={showcase ? innerStyle : undefined}>
        <div className="space-y-5">
          {/* Hero */}
          <div className={`flex items-center gap-4 ${showcase ? "flex-col sm:flex-row sm:items-start" : ""}`}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={motionSpring.celebration}
              className={`rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-[var(--g-progreso-soft)] ${showcase ? "w-24 h-24 ring-4" : "w-16 h-16"}`}
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
                boxShadow: showcase ? "0 0 32px var(--g-progreso-soft)" : undefined,
              }}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.nombre ?? ""} className="w-full h-full object-cover" />
              ) : (
                <span className={showcase ? "text-4xl font-black" : "text-2xl font-bold"}>{profile.nombre?.[0]?.toUpperCase() ?? "?"}</span>
              )}
            </motion.div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className={`font-bold truncate ${showcase ? "text-2xl tracking-tight" : "text-lg"}`}>{profile.nombre}</p>
              {profile.titulo_publico ? (
                <p className={`mt-0.5 line-clamp-2 ${showcase ? "text-sm" : "text-xs"}`} style={{ color: "var(--accent)" }}>
                  {profile.titulo_publico}
                </p>
              ) : null}
              {profile.bio && (
                <p className={`mt-1 line-clamp-3 ${showcase ? "text-sm" : "text-sm"}`} style={{ color: "var(--text-muted)" }}>
                  {profile.bio}
                </p>
              )}
              {profile.enlaces_publicos && Object.keys(profile.enlaces_publicos).length > 0 ? (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                  {Object.entries(profile.enlaces_publicos).map(([key, url]) => {
                    if (!url?.trim()) return null;
                    const label =
                      key === "linkedin"
                        ? "LinkedIn"
                        : key === "github"
                          ? "GitHub"
                          : key === "web"
                            ? "Web"
                            : key.charAt(0).toUpperCase() + key.slice(1);
                    return (
                      <a
                        key={key}
                        href={url.startsWith("http") ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-opacity hover:opacity-90"
                        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--accent)" }}
                      >
                        <Link2 className="w-3 h-3 shrink-0" />
                        {label}
                      </a>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <span
                  className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide"
                  style={{ background: "var(--g-progreso-soft)", color: "var(--g-progreso)" }}
                >
                  {profile.rango}
                </span>
                {profile.ultimo_evento && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Últ. evento {new Date(profile.ultimo_evento).toLocaleDateString("es-ES")}
                  </span>
                )}
              </div>
            </div>
            {currentBadge && (
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onSelectBadge?.(currentBadge)}
                role={onSelectBadge ? "button" : undefined}
                tabIndex={onSelectBadge ? 0 : undefined}
                className="flex flex-col items-center gap-1 shrink-0 sm:ml-auto p-2.5 rounded-2xl transition-all cursor-pointer group"
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 8px 24px -6px rgba(0,0,0,0.28)",
                }}
                title={onSelectBadge ? "Ver reconocimiento oficial" : (currentBadge.nombre ?? "Medalla")}
              >
                <div className="flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase" style={{ color: "var(--accent)" }}>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{profile.rango ? `Rango ${profile.rango}` : "Medalla"}</span>
                </div>
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-1">
                  <div
                    className="absolute inset-0 rounded-full blur-md opacity-35 group-hover:opacity-75 transition-opacity"
                    style={{ background: "var(--accent)" }}
                  />
                  {currentBadge.imagen_url ? (
                    <img
                      src={currentBadge.imagen_url}
                      alt={currentBadge.nombre ?? "Medalla actual"}
                      className="relative z-10 w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Award className="relative z-10 w-10 h-10 text-amber-400" />
                  )}
                </div>
                <span className="text-xs font-bold text-center max-w-28 truncate" style={{ color: "var(--text)" }}>
                  {formatBadgeRankName(currentBadge.nombre, profile.rango)}
                </span>
                <span className="text-[10px] text-center max-w-28 truncate" style={{ color: "var(--text-muted)" }}>
                  {currentBadgeOrgName || "Acreditada"}
                </span>
              </motion.div>
            )}
          </div>

          {profile.elo_puntos_min != null && profile.elo_puntos_max != null && (
            <div className="rounded-xl p-3" style={{ background: "var(--bg-subtle)" }}>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
                <span className="font-medium">Progreso del rango ELO</span>
                <span>{profile.puntos_elo ?? profile.elo_score ?? 0}/{profile.elo_puntos_max}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, (((profile.puntos_elo ?? profile.elo_score ?? 0) - profile.elo_puntos_min) / (profile.elo_puntos_max - profile.elo_puntos_min)) * 100))}%`,
                    background: "var(--g-energia)",
                  }}
                />
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                {profile.elo_para_siguiente_rango != null
                  ? `${Math.max(0, profile.elo_para_siguiente_rango - (profile.puntos_elo ?? profile.elo_score ?? 0))} ELO para el siguiente rango`
                  : "Rango máximo alcanzado"}
              </p>
            </div>
          )}

          {/* Racha por entregas impecables */}
          {streak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...motionSpring.tab, delay: staggerFast }}
            >
              <StreakState
                value={streak}
                label="Racha · entregas impecables"
              />
              <p className="text-[11px] mt-2 leading-snug" style={{ color: "var(--text-muted)" }}>
                Cuenta entregas aprobadas seguidas, a tiempo y con calificación ≥3. Se reinicia si hay rechazo, retraso grave o incidencia atribuida.
              </p>
            </motion.div>
          )}

          {/* Stats row */}
          {!compact && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: staggerFast * 2 }}
              className={`grid gap-3 ${showcase ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
            >
              {stats.map(({ icon: Icon, label, value, color }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...motionSpring.tab, delay: staggerFast * (i + 1) }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl"
                  style={{ background: "var(--bg-subtle)", border: showcase ? "1px solid var(--border)" : undefined }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                  <p className="text-lg font-bold tabular-nums">
                    <CountUp end={value} duration={0.8} />
                  </p>
                  <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Panel extra: métricas reales (perfil público) */}
          {showcase && metrics && (
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl p-3"
              style={{ background: "rgba(0,0,0,.2)", border: "1px solid var(--border)" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-semibold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <ThumbsUp className="w-3 h-3" /> Aprobadas
                </span>
                <span className="text-lg font-bold tabular-nums">{metrics.tareas_aprobadas}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-semibold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <AlertTriangle className="w-3 h-3" /> Rechazadas
                </span>
                <span className="text-lg font-bold tabular-nums">{metrics.tareas_rechazadas}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-semibold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Star className="w-3 h-3" /> Nota media
                </span>
                <span className="text-lg font-bold tabular-nums">
                  {metrics.promedio_calificacion != null ? metrics.promedio_calificacion.toFixed(1) : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-semibold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Clock className="w-3 h-3" /> Horas vol.
                </span>
                <span className="text-lg font-bold tabular-nums">{metrics.horas_totales.toFixed(1)}</span>
              </div>
            </div>
          )}

          {showcase && certificatesCount > 0 && (
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--g-epic)" }}>
              <Award className="w-4 h-4 shrink-0" />
              <span>{certificatesCount} certificado{certificatesCount !== 1 ? "s" : ""} emitido{certificatesCount !== 1 ? "s" : ""}</span>
            </div>
          )}

          {/* XP bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              <span className="font-medium">Experiencia · Nivel {nivel}</span>
              <span className="tabular-nums font-semibold" style={{ color: "var(--g-progreso)" }}>
                {xpEnNivel}/{xpParaSiguienteNivel} XP
              </span>
            </div>
            <motion.div
              className="h-3 rounded-full overflow-hidden"
              style={{ background: "var(--bg-subtle)" }}
              initial={{ width: "100%" }}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progresoXP)}%` }}
                transition={{ duration: 0.75, ease: "easeOut" }}
                style={{
                  background: "linear-gradient(90deg, var(--g-progreso) 0%, var(--g-epic) 100%)",
                  boxShadow: "0 0 12px var(--g-progreso-soft)",
                }}
              />
            </motion.div>
            <div className="flex justify-between text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>
              <span>{profile.tareas_completadas ?? 0} tareas · {profile.eventos_completados ?? 0} eventos</span>
                {xpFaltante > 0 && (
                <span className="flex items-center gap-1 font-medium" style={{ color: "var(--g-logro)" }}>
                  <Target className="w-3 h-3" />
                  {xpFaltante} XP para subir
                </span>
              )}
            </div>
          </div>
        </div>
      </ProgressCard>
    </div>
  );
}
