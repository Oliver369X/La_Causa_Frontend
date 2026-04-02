"use client";

import { motion } from "framer-motion";
import { Star, Zap, Trophy, Target, Award, Clock, ThumbsUp, AlertTriangle, Link2 } from "lucide-react";
import type { CompetitiveProfile, PerformanceMetrics } from "../api/gamificationApi";
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
}

const XP_PER_LEVEL = 100;

export function ProfileBanner({ profile, compact = false, showcase = false, metrics, certificatesCount = 0 }: Props) {
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
          </div>

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
              className={`grid gap-3 ${showcase ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3"}`}
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
    </div>
  );
}
