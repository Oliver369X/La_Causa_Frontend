"use client";

import { motion } from "framer-motion";
import { Star, Zap, Flame, Trophy, Target } from "lucide-react";
import type { CompetitiveProfile } from "../api/gamificationApi";
import { ProgressCard, StreakState } from "@/shared/ui/gamification";
import { motionSpring, staggerFast } from "@/shared/lib/motion";
import CountUp from "react-countup";

interface Props {
  profile: CompetitiveProfile;
  compact?: boolean;
}

const XP_PER_LEVEL = 100;

export function ProfileBanner({ profile, compact = false }: Props) {
  const xpTotal = profile.xp_total ?? 0;
  const nivel = profile.nivel ?? Math.floor(xpTotal / XP_PER_LEVEL) + 1;
  const xpEnNivel = xpTotal % XP_PER_LEVEL;
  const progresoXP = (xpEnNivel / XP_PER_LEVEL) * 100;
  const xpFaltante = XP_PER_LEVEL - xpEnNivel;

  const stats = [
    { icon: Trophy, label: "ELO", value: profile.puntos_elo ?? 0, color: "var(--g-energia)" },
    { icon: Star, label: "Nivel", value: nivel, color: "var(--g-progreso)" },
    { icon: Zap, label: "Insignias", value: profile.insignias_total ?? 0, color: "var(--g-epic)" },
  ];

  return (
    <ProgressCard>
      <div className="space-y-5">
        {/* Hero: avatar + nombre + rango */}
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={motionSpring.celebration}
            className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-[var(--g-progreso-soft)]"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.nombre} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold">{profile.nombre?.[0]?.toUpperCase() ?? "?"}</span>
            )}
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-lg truncate">{profile.nombre}</p>
            {profile.bio && (
              <p className="text-sm mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>{profile.bio}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: "var(--g-progreso-soft)", color: "var(--g-progreso)" }}
              >
                {profile.rango}
              </span>
              {profile.ultimo_evento && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  últ. evento {new Date(profile.ultimo_evento).toLocaleDateString("es-ES")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Streak destacado */}
        {(profile.racha_dias ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionSpring.tab, delay: staggerFast }}
          >
            <StreakState days={profile.racha_dias ?? 0} label="Días de racha" />
          </motion.div>
        )}

        {/* Stats row con CountUp */}
        {!compact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: staggerFast * 2 }}
            className="grid grid-cols-3 gap-3"
          >
            {stats.map(({ icon: Icon, label, value, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...motionSpring.tab, delay: staggerFast * (i + 1) }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl"
                style={{ background: "var(--bg-subtle)" }}
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

        {/* Barra de XP con meta siguiente */}
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
            <span className="font-medium">Experiencia · Nivel {nivel}</span>
            <span className="tabular-nums font-semibold" style={{ color: "var(--g-progreso)" }}>
              {xpEnNivel}/{XP_PER_LEVEL} XP
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
            {xpFaltante > 0 && xpFaltante < XP_PER_LEVEL && (
              <span className="flex items-center gap-1 font-medium" style={{ color: "var(--g-logro)" }}>
                <Target className="w-3 h-3" />
                {xpFaltante} XP para subir
              </span>
            )}
          </div>
        </div>
      </div>
    </ProgressCard>
  );
}
