"use client";
import { useState, useEffect } from "react";
import { Trophy, TrendingUp } from "lucide-react";
import { gamificationApi, type RankingEntry } from "@/features/gamification/api/gamificationApi";
import { Spinner } from "@/shared/ui/Spinner";

/**
 * GamificationPanel widget — shows top-5 ranking as a compact leaderboard.
 * Drop inside any dashboard page or card.
 */
export function GamificationPanel() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamificationApi.getRanking()
      .then((r) => setRanking(r.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4" style={{ color: "var(--accent)" }} />
          Top voluntarios
        </p>
        <TrendingUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner size="sm" /></div>
      ) : ranking.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Sin datos</p>
      ) : (
        <ul className="space-y-2">
          {ranking.map((entry) => (
            <li key={entry.usuario_id} className="flex items-center gap-3">
              <span
                className="w-6 h-6 text-xs font-bold rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: entry.posicion <= 3 ? "var(--accent)" : "var(--bg-subtle)",
                  color:      entry.posicion <= 3 ? "#fff"          : "var(--text-muted)",
                }}
              >
                {entry.posicion}
              </span>
              <p className="flex-1 text-xs truncate" style={{ color: "var(--text)" }}>{entry.nombre}</p>
              <span className="text-xs tabular-nums font-semibold" style={{ color: "var(--accent)" }}>
                {entry.puntos_elo}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
