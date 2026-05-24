"use client";

import { useState, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Calendar, Trophy, Lock, Clock, CheckCircle, Plus } from "lucide-react";
import { gamificationApi, type Season, type HistoricalRankingEntry } from "@/features/gamification/api/gamificationApi";
import { useAuthStore } from "@/shared/store/authStore";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { TopBar } from "@/shared/ui/Sidebar";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { SeasonCard, PodiumCard } from "@/shared/ui/gamification";
import { motionSpring, staggerFast } from "@/shared/lib/motion";
import { toast } from "sonner";

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(end: string): number {
  const now = new Date();
  const endDate = new Date(end);
  const diff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function seasonProgress(season: Season): number {
  const start = new Date(season.fecha_inicio).getTime();
  const end = new Date(season.fecha_fin).getTime();
  const now = Date.now();
  if (now < start) return 0;
  if (now > end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function apiErrorDetail(err: unknown): string {
  const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === "string" ? d : "No se pudo completar la operación.";
}

export default function TemporadasPage() {
  const { activeOrgId, user } = useAuthStore();
  const { can, isSuperAdmin, canManageOrg } = usePermissions();
  const isOrganizer = canManageOrg;
  /** Solo la organización (gestores con create_events o super-admin) puede cerrar temporadas. */
  const canManageSeasons = isSuperAdmin || can("createEvents");

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [historicalRanking, setHistoricalRanking] = useState<HistoricalRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState(todayIsoDate);
  const [duracionMeses, setDuracionMeses] = useState(12);
  const [useFechaFin, setUseFechaFin] = useState(false);
  const [fechaFin, setFechaFin] = useState("");
  const [creating, setCreating] = useState(false);

  const refreshSeasons = () => {
    gamificationApi
      .getSeasons(activeOrgId ?? undefined)
      .then(setSeasons)
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    gamificationApi
      .getSeasons(activeOrgId ?? undefined)
      .then(setSeasons)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeOrgId]);

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
  const activeSeason = seasons.find((s) => s.activa);

  const handleCloseSeason = async (seasonId: string) => {
    setClosingId(seasonId);
    try {
      await gamificationApi.closeSeason(seasonId);
      toast.success("Temporada cerrada. Ranking guardado, ELO con reset suave.");
      refreshSeasons();
      if (selectedSeasonId === seasonId) setSelectedSeasonId(null);
    } catch (e) {
      toast.error(apiErrorDetail(e));
    } finally {
      setClosingId(null);
    }
  };

  const handleCreateSeason = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !nombre.trim()) return;
    setCreating(true);
    try {
      await gamificationApi.createSeason({
        nombre: nombre.trim(),
        organizacion_id: activeOrgId,
        fecha_inicio: fechaInicio,
        ...(useFechaFin && fechaFin ? { fecha_fin: fechaFin } : { duracion_meses: duracionMeses }),
      });
      toast.success("Temporada creada.");
      setNombre("");
      setFechaInicio(todayIsoDate());
      setDuracionMeses(12);
      setUseFechaFin(false);
      setFechaFin("");
      refreshSeasons();
    } catch (err) {
      toast.error(apiErrorDetail(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <TopBar title="Temporadas" />
      <div className="flex-1 p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionSpring.tab}
        >
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6" style={{ color: "var(--g-progreso)" }} />
            Temporadas y ranking histórico
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Crea temporadas para tu organización, consulta el ranking histórico y cierra la temporada al finalizar el ciclo.
          </p>
        </motion.div>

        {isOrganizer && !activeOrgId && (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            Selecciona una organización en la barra superior para gestionar temporadas y crear una nueva.
          </div>
        )}

        {canManageSeasons && activeOrgId && (
          <motion.form
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={motionSpring.tab}
            onSubmit={handleCreateSeason}
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" style={{ color: "var(--g-progreso)" }} />
              Nueva temporada
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                Nombre
                <input
                  required
                  value={nombre}
                  onChange={(ev) => setNombre(ev.target.value)}
                  placeholder="Ej. Verano 2026"
                  className="rounded-lg px-3 py-2 text-sm w-full"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  maxLength={100}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                Fecha de inicio
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(ev) => setFechaInicio(ev.target.value)}
                  className="rounded-lg px-3 py-2 text-sm w-full"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </label>
              {!useFechaFin ? (
                <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  Duración (meses)
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={duracionMeses}
                    onChange={(ev) => setDuracionMeses(Number(ev.target.value) || 12)}
                    className="rounded-lg px-3 py-2 text-sm w-full tabular-nums"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                </label>
              ) : (
                <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  Fecha de fin
                  <input
                    type="date"
                    required={useFechaFin}
                    value={fechaFin}
                    onChange={(ev) => setFechaFin(ev.target.value)}
                    className="rounded-lg px-3 py-2 text-sm w-full"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                </label>
              )}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <Button type="submit" loading={creating} disabled={!nombre.trim()} className="w-full sm:w-auto">
                  Crear temporada
                </Button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
              <input
                type="checkbox"
                checked={useFechaFin}
                onChange={(ev) => setUseFechaFin(ev.target.checked)}
                className="rounded"
              />
              Definir fecha de fin en lugar de duración en meses
            </label>
          </motion.form>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : seasons.length === 0 ? (
          <EmptyState
            title="Sin temporadas"
            description={
              isOrganizer && activeOrgId
                ? "Usa el formulario de arriba para crear la primera temporada de la organización."
                : "No hay temporadas que coincidan con el filtro actual o aún no se han registrado."
            }
          />
        ) : (
          <>
            {/* Active season hero */}
            {activeSeason && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...motionSpring.tab, delay: 0.1 }}
                className="g-season-card p-6"
                style={{ boxShadow: "0 0 0 2px var(--g-progreso)", outline: "2px solid var(--bg)", outlineOffset: "2px" }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "var(--g-logro-soft)", color: "var(--g-logro)" }}>
                        Activa
                      </span>
                      <span className="font-bold text-lg">{activeSeason.nombre}</span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {formatDate(activeSeason.fecha_inicio)} – {formatDate(activeSeason.fecha_fin)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
                      <Clock className="w-4 h-4" style={{ color: "var(--g-progreso)" }} />
                      <span className="text-sm font-semibold tabular-nums">
                        {daysUntil(activeSeason.fecha_fin)} días restantes
                      </span>
                    </div>
                    {canManageSeasons && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={closingId === activeSeason.id}
                        onClick={() => handleCloseSeason(activeSeason.id)}
                      >
                        <Lock className="w-3 h-3 mr-1" /> Cerrar temporada
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    <span>Progreso de la temporada</span>
                    <span className="font-medium tabular-nums">{seasonProgress(activeSeason)}%</span>
                  </div>
                  <motion.div
                    className="h-2.5 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-subtle)" }}
                    initial={{ width: "100%" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${seasonProgress(activeSeason)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      style={{
                        background: "linear-gradient(90deg, var(--g-progreso) 0%, var(--g-epic) 100%)",
                      }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Season cards timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {seasons.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...motionSpring.tab, delay: staggerFast * (i + 2) }}
                >
                  <SeasonCard active={selectedSeasonId === s.id}>
                    <button
                      onClick={() => setSelectedSeasonId(s.id === selectedSeasonId ? null : s.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4" style={{ color: "var(--g-progreso)" }} />
                        <span className="font-semibold text-sm">{s.nombre}</span>
                        {s.activa && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--g-logro-soft)", color: "var(--g-logro)" }}>
                            Activa
                          </span>
                        )}
                        {!s.activa && (
                          <CheckCircle className="w-4 h-4 ml-auto" style={{ color: "var(--text-muted)" }} />
                        )}
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatDate(s.fecha_inicio)} – {formatDate(s.fecha_fin)}
                      </p>
                    </button>
                    {s.activa && canManageSeasons && (
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
                  </SeasonCard>
                </motion.div>
              ))}
            </div>

            {/* Historical ranking panel */}
            <AnimatePresence>
              {selectedSeasonId && (
                <motion.div
                  key={selectedSeasonId}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={motionSpring.tab}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl p-5 mt-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Trophy className="w-4 h-4" style={{ color: "var(--g-progreso)" }} />
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
                      <div className="space-y-3">
                        {historicalRanking.slice(0, 3).map((entry, i) => (
                          <PodiumCard key={entry.id} position={(i + 1) as 1 | 2 | 3} delay={staggerFast * i}>
                            <div className="flex items-center gap-4">
                              <span className="text-2xl" aria-hidden>
                                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                              </span>
                              <div className="flex-1">
                                <p className="font-semibold">Puesto #{entry.posicion_final}</p>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                  {entry.elo_final} ELO · {entry.xp_acumulada} XP
                                </p>
                              </div>
                              <span className="text-sm font-bold tabular-nums" style={{ color: "var(--g-energia)" }}>
                                {entry.elo_final} ELO
                              </span>
                            </div>
                          </PodiumCard>
                        ))}
                        {historicalRanking.length > 3 && (
                          <ul className="divide-y mt-4" style={{ borderColor: "var(--border)" }}>
                            {historicalRanking.slice(3).map((entry, i) => (
                              <motion.li
                                key={entry.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: staggerFast * (i + 4) }}
                                className="flex items-center gap-4 py-3"
                                style={{ borderBottom: "1px solid var(--border)" }}
                              >
                                <span
                                  className="w-8 h-8 text-xs font-bold rounded-full flex items-center justify-center shrink-0"
                                  style={{
                                    background: "var(--bg-subtle)",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {entry.posicion_final}
                                </span>
                                <span className="text-sm tabular-nums">{entry.elo_final} ELO</span>
                                <span className="text-sm tabular-nums">{entry.xp_acumulada} XP</span>
                                <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
                                  {formatDate(entry.created_at)}
                                </span>
                              </motion.li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </>
  );
}
