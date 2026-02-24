"use client";

import { useState, useEffect } from "react";
import { History, Calendar, Trophy, Lock } from "lucide-react";
import { gamificationApi, type Season, type HistoricalRankingEntry } from "@/features/gamification/api/gamificationApi";
import { TopBar } from "@/shared/ui/Sidebar";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { toast } from "sonner";

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TemporadasPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [historicalRanking, setHistoricalRanking] = useState<HistoricalRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const refreshSeasons = () => {
    gamificationApi.getSeasons()
      .then(setSeasons)
      .catch(() => {});
  };

  useEffect(() => {
    gamificationApi.getSeasons()
      .then(setSeasons)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSeasonId) {
      setHistoricalRanking([]);
      return;
    }
    setLoadingHistory(true);
    gamificationApi.getHistoricalRanking(selectedSeasonId)
      .then(setHistoricalRanking)
      .catch(() => setHistoricalRanking([]))
      .finally(() => setLoadingHistory(false));
  }, [selectedSeasonId]);

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);

  const handleCloseSeason = async (seasonId: string) => {
    setClosingId(seasonId);
    try {
      await gamificationApi.closeSeason(seasonId);
      toast.success("Temporada cerrada. Ranking guardado, ELO reiniciado.");
      refreshSeasons();
      if (selectedSeasonId === seasonId) setSelectedSeasonId(null);
    } catch {
      toast.error("No se pudo cerrar la temporada.");
    } finally {
      setClosingId(null);
    }
  };

  return (
    <>
      <TopBar title="Temporadas" />
      <div className="flex-1 p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Temporadas y ranking histórico
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Consulta el ranking histórico por temporada (CU27).
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : seasons.length === 0 ? (
          <EmptyState
            title="Sin temporadas"
            description="Aún no hay temporadas configuradas. Las temporadas se crean desde la gamificación."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {seasons.map((s) => (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl text-left transition-all"
                  style={{
                    background: selectedSeasonId === s.id ? "var(--accent-soft)" : "var(--bg-card)",
                    border: `1px solid ${selectedSeasonId === s.id ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <button
                    onClick={() => setSelectedSeasonId(s.id === selectedSeasonId ? null : s.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4" style={{ color: "var(--accent)" }} />
                      <span className="font-semibold text-sm">{s.nombre}</span>
                      {s.activa && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,.2)", color: "#22c55e" }}>
                          Activa
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatDate(s.fecha_inicio)} – {formatDate(s.fecha_fin)}
                    </p>
                  </button>
                  {s.activa && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full"
                      loading={closingId === s.id}
                      onClick={(e) => { e.stopPropagation(); handleCloseSeason(s.id); }}
                    >
                      <Lock className="w-3 h-3 mr-1" /> Cerrar temporada
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {selectedSeasonId && (
              <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  Ranking histórico – {selectedSeason?.nombre ?? "Temporada"}
                </h3>
                {loadingHistory ? (
                  <div className="flex justify-center py-12"><Spinner /></div>
                ) : historicalRanking.length === 0 ? (
                  <EmptyState
                    title="Sin datos"
                    description="No hay registros de ranking para esta temporada."
                  />
                ) : (
                  <ul className="divide-y" style={{ "--tw-divide-opacity": 1, borderColor: "var(--border)" } as React.CSSProperties}>
                    {historicalRanking.map((entry) => (
                      <li key={entry.id} className="flex items-center gap-4 py-3">
                        <span
                          className="w-8 h-8 text-xs font-bold rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: entry.posicion_final <= 3 ? "var(--accent)" : "var(--bg-subtle)",
                            color: entry.posicion_final <= 3 ? "#fff" : "var(--text-muted)",
                          }}
                        >
                          {entry.posicion_final}
                        </span>
                        <span className="text-sm tabular-nums">{entry.elo_final} ELO</span>
                        <span className="text-sm tabular-nums">{entry.xp_acumulada} XP</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {formatDate(entry.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
