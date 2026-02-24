import { Star, Zap, Flame, Trophy } from "lucide-react";
import type { CompetitiveProfile } from "../api/gamificationApi";

interface Props {
  profile: CompetitiveProfile;
  compact?: boolean;
}

export function ProfileBanner({ profile, compact = false }: Props) {
  const XP_PER_LEVEL = 100;
  const xpTotal = profile.xp_total ?? 0;
  const nivel = profile.nivel ?? Math.floor(xpTotal / XP_PER_LEVEL) + 1;
  const xpEnNivel = xpTotal % XP_PER_LEVEL;
  const progresoXP = (xpEnNivel / XP_PER_LEVEL) * 100;

  const stats = [
    { icon: Trophy, label: "ELO",        value: profile.puntos_elo ?? 0,       color: "#fbbf24" },
    { icon: Star,   label: "Nivel",       value: nivel,                         color: "var(--accent)" },
    { icon: Flame,  label: "Racha",       value: `${profile.racha_dias ?? 0}d`,   color: "#ef4444" },
    { icon: Zap,    label: "Insignias",   value: profile.insignias_total ?? 0,   color: "#a78bfa" },
  ];

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.nombre} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold">{profile.nombre?.[0]?.toUpperCase() ?? "?"}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-base truncate">{profile.nombre}</p>
          {profile.bio && (
            <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>{profile.bio}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
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

      {/* Stats row */}
      {!compact && (
        <div className="grid grid-cols-4 gap-2">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 p-2 rounded-xl"
              style={{ background: "var(--bg-subtle)" }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
              <p className="text-sm font-bold">{value}</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Barra de experiencia */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
          <span>Experiencia · Nivel {nivel}</span>
          <span className="font-medium tabular-nums">{xpEnNivel}/{XP_PER_LEVEL} XP</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(100, progresoXP)}%`,
              background: "linear-gradient(90deg, var(--accent) 0%, #a78bfa 100%)",
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          <span>{profile.tareas_completadas ?? 0} tareas</span>
          <span>{profile.eventos_completados ?? 0} eventos</span>
        </div>
      </div>
    </div>
  );
}
