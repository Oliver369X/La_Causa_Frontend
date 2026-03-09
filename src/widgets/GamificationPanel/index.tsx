"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, TrendingUp, ChevronRight } from "lucide-react";
import { gamificationApi, type RankingEntry } from "@/features/gamification/api/gamificationApi";
import { Spinner } from "@/shared/ui/Spinner";
import { motionSpring, staggerFast } from "@/shared/lib/motion";

/**
 * GamificationPanel widget — shows top-5 ranking as a compact leaderboard with motion.
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

  const podiumMedals = ["🥇", "🥈", "🥉"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionSpring.tab}
      className="rounded-2xl p-5 g-progress-card"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4" style={{ color: "var(--g-progreso)" }} />
          Top voluntarios
        </p>
        <Link
          href="/dashboard/gamification"
          className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-80"
          style={{ color: "var(--g-progreso)" }}
        >
          Ver ranking
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner size="sm" /></div>
      ) : ranking.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Sin datos</p>
      ) : (
        <ul className="space-y-2">
          {ranking.map((entry, i) => (
            <motion.li
              key={entry.usuario_id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: staggerFast * i }}
              className="flex items-center gap-3 py-1.5"
            >
              <span
                className="w-7 h-7 text-xs font-bold rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: entry.posicion <= 3 ? "var(--g-progreso)" : "var(--bg-subtle)",
                  color: entry.posicion <= 3 ? "#fff" : "var(--text-muted)",
                }}
              >
                {entry.posicion <= 3 ? podiumMedals[entry.posicion - 1] : entry.posicion}
              </span>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "var(--g-progreso-soft)", color: "var(--g-progreso)" }}>
                    {entry.nombre[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
                <p className="text-sm truncate" style={{ color: "var(--text)" }}>{entry.nombre}</p>
              </div>
              <span className="text-xs tabular-nums font-semibold" style={{ color: "var(--g-energia)" }}>
                {entry.puntos_elo ?? entry.elo_score ?? 0}
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
