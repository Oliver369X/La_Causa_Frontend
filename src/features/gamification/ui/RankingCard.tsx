import type { RankingEntry } from "../api/gamificationApi";
import { Card } from "@/shared/ui/Card";

interface Props {
  entry: RankingEntry;
  highlight?: boolean;
}

const PODIUM_STYLE: Record<number, { bg: string; text: string; medal: string }> = {
  1: { bg: "rgba(251,191,36,.12)", text: "#fbbf24", medal: "🥇" },
  2: { bg: "rgba(148,163,184,.12)", text: "#94a3b8", medal: "🥈" },
  3: { bg: "rgba(180,83,9,.12)",   text: "#b45309", medal: "🥉" },
};

export function RankingCard({ entry, highlight = false }: Props) {
  const podium = PODIUM_STYLE[entry.posicion];

  return (
    <Card
      style={{
        background: highlight ? "var(--accent-soft)" : podium ? podium.bg : undefined,
        borderColor: highlight ? "var(--accent)" : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Position */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            background: podium ? podium.bg : "var(--bg-subtle)",
            color:      podium ? podium.text : "var(--text-muted)",
          }}
        >
          {podium ? podium.medal : `#${entry.posicion}`}
        </div>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          {entry.avatar_url ? (
            <img src={entry.avatar_url} alt={entry.nombre} className="w-full h-full object-cover" />
          ) : (
            entry.nombre[0]?.toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{entry.nombre}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {entry.rango} · {entry.eventos_mes} evento{entry.eventos_mes !== 1 ? "s" : ""} este mes
          </p>
        </div>

        {/* ELO */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold" style={{ color: podium?.text ?? "var(--accent)" }}>
            {entry.puntos_elo}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>ELO</p>
        </div>
      </div>
    </Card>
  );
}
