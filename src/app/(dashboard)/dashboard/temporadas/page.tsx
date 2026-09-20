"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { History, Calendar, Trophy, Lock, Clock, CheckCircle, Plus, Crown, Shield, Zap } from "lucide-react";
import { gamificationApi, type Season, type HistoricalRankingEntry } from "@/features/gamification/api/gamificationApi";
import { useAuthStore } from "@/shared/store/authStore";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { TopBar } from "@/shared/ui/Sidebar";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Modal } from "@/shared/ui/Modal";
import { SeasonCard } from "@/shared/ui/gamification";
import { motionSpring, staggerFast } from "@/shared/lib/motion";
import { toast } from "sonner";

const RANK_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  aspirante: {
    bg: "var(--bg-subtle)",
    text: "var(--text-muted)",
    border: "var(--border)",
  },
  bronce: {
    bg: "rgba(180, 83, 9, 0.10)",
    text: "#b45309",
    border: "rgba(180, 83, 9, 0.28)",
  },
  plata: {
    bg: "rgba(100, 116, 139, 0.10)",
    text: "#475569",
    border: "rgba(100, 116, 139, 0.28)",
  },
  oro: {
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#b45309",
    border: "rgba(245, 158, 11, 0.35)",
  },
  platino: {
    bg: "rgba(14, 165, 233, 0.10)",
    text: "#0369a1",
    border: "rgba(14, 165, 233, 0.28)",
  },
  diamante: {
    bg: "rgba(124, 58, 237, 0.10)",
    text: "#6d28d9",
    border: "rgba(124, 58, 237, 0.28)",
  },
  prospecto: {
    bg: "rgba(225, 29, 72, 0.10)",
    text: "#be123c",
    border: "rgba(225, 29, 72, 0.28)",
  },
  centenario: {
    bg: "rgba(168, 85, 247, 0.12)",
    text: "#7e22ce",
    border: "rgba(168, 85, 247, 0.35)",
  },
};

function getRankStyle(rankName?: string | null) {
  const clean = (rankName || "aspirante").toLowerCase().trim();
  return RANK_STYLES[clean] || RANK_STYLES.aspirante;
}

function getMedalUrl(rankName?: string | null, medallaUrl?: string | null): string {
  if (medallaUrl) return medallaUrl;
  const clean = (rankName || "aspirante").toLowerCase().trim();
  const valid = ["aspirante", "bronce", "plata", "oro", "platino", "diamante", "prospecto", "centenario"];
  if (clean === "platino") return "/medals/oro.png";
  if (valid.includes(clean)) return `/medals/${clean}.png`;
  return "/medals/aspirante.png";
}

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
  const [confirmSeason, setConfirmSeason] = useState<Season | null>(null);
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1);
  const [closePreview, setClosePreview] = useState<Season | null>(null);

  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState(todayIsoDate);
  const [duracionMeses, setDuracionMeses] = useState(12);
  const [useFechaFin, setUseFechaFin] = useState(false);
  const [fechaFin, setFechaFin] = useState("");
  const [creating, setCreating] = useState(false);

  const refreshSeasons = () => {
    if (!activeOrgId) {
      setSeasons([]);
      return;
    }
    gamificationApi
      .getSeasons(activeOrgId)
      .then((data) => {
        setSeasons(data);
        if (data.length > 0 && !selectedSeasonId) {
          const active = data.find((s) => s.activa);
          setSelectedSeasonId(active ? active.id : data[0].id);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!activeOrgId) {
      setSeasons([]);
      setSelectedSeasonId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    gamificationApi
      .getSeasons(activeOrgId)
      .then((data) => {
        setSeasons(data);
        if (data.length > 0) {
          const active = data.find((s) => s.activa);
          setSelectedSeasonId(active ? active.id : data[0].id);
        }
      })
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
  const myRankingEntry = user?.id ? historicalRanking.find((entry) => entry.usuario_id === user.id) : null;

  const handleCloseSeason = async (seasonId: string) => {
    setClosingId(seasonId);
    try {
      const closedSeason = await gamificationApi.closeSeason(seasonId);
      setClosePreview(closedSeason);
      toast.success("Temporada cerrada. Ranking y certificados generados.");
      refreshSeasons();
      if (selectedSeasonId === seasonId) setSelectedSeasonId(null);
    } catch (e) {
      toast.error(apiErrorDetail(e));
    } finally {
      setClosingId(null);
    }
  };

  const requestCloseSeason = (season: Season) => {
    setConfirmSeason(season);
    setConfirmationStep(1);
  };

  const confirmCloseSeason = async () => {
    if (!confirmSeason) return;
    if (confirmationStep === 1) {
      setConfirmationStep(2);
      return;
    }
    const season = confirmSeason;
    setConfirmSeason(null);
    await handleCloseSeason(season.id);
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
      <Modal
        open={!!confirmSeason}
        onClose={() => setConfirmSeason(null)}
        title={confirmationStep === 1 ? "Confirmar cierre de temporada" : "Confirmación final obligatoria"}
        description={confirmationStep === 1
          ? "Se guardará el ranking y se generarán certificados automáticos."
          : "El cierre es definitivo y no se podrá reabrir la temporada."}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmSeason(null)}>Cancelar</Button>
            <Button variant={confirmationStep === 2 ? "danger" : "primary"} onClick={confirmCloseSeason}>
              {confirmationStep === 1 ? "Continuar" : "Sí, cerrar definitivamente"}
            </Button>
          </div>
        }
      >
        {confirmSeason && (
          <div className="space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
            <p><strong style={{ color: "var(--text)" }}>{confirmSeason.nombre}</strong></p>
            {confirmationStep === 1
              ? <p>Se recopilarán eventos, tareas, horas, XP, ELO, rango y medallas. El certificado genérico podrá personalizarse después.</p>
              : <p style={{ color: "var(--danger, #ef4444)" }}>Verificá que todos los eventos hayan finalizado antes de confirmar.</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={!!closePreview}
        onClose={() => setClosePreview(null)}
        title="Preview del certificado genérico"
        description="La organización puede editar los certificados desde la sección Certificados."
      >
        {closePreview?.certificado_preview ? (
          <div className="space-y-3 text-sm">
            <p className="font-semibold">{closePreview.certificado_preview.organizacion} · {closePreview.nombre}</p>
            <div className="grid grid-cols-2 gap-2">
              <span>Eventos: <strong>{closePreview.certificado_preview.eventos ?? 0}</strong></span>
              <span>Tareas: <strong>{closePreview.certificado_preview.tareas_completadas ?? 0}</strong></span>
              <span>Horas: <strong>{closePreview.certificado_preview.horas ?? 0}</strong></span>
              <span>XP: <strong>{closePreview.certificado_preview.xp ?? 0}</strong></span>
              <span>ELO: <strong>{closePreview.certificado_preview.elo ?? 0}</strong></span>
              <span>Rango: <strong>{closePreview.certificado_preview.rango ?? "Principiante"}</strong></span>
            </div>
            <p style={{ color: "var(--text-muted)" }}>{closePreview.certificados_generados ?? 0} certificados generados.</p>
            <Link href="/dashboard/certificates" className="text-sm font-semibold" style={{ color: "var(--g-progreso)" }}>
              Ver certificados generados →
            </Link>
            {canManageSeasons && (
              <Link href="/dashboard/certificates/templates" className="block text-sm font-semibold" style={{ color: "var(--accent)" }}>
                Personalizar plantilla de certificados →
              </Link>
            )}
          </div>
        ) : <p>No hubo participantes elegibles para generar certificados.</p>}
      </Modal>
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
              !activeOrgId
                ? "No perteneces a una organización activa. Únete a una o selecciónala para ver sus temporadas."
                : isOrganizer
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
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant={selectedSeasonId === activeSeason.id ? "primary" : "outline"}
                      onClick={() => setSelectedSeasonId(activeSeason.id)}
                    >
                      <Trophy className="w-3.5 h-3.5 mr-1" />
                      {selectedSeasonId === activeSeason.id ? "Viendo ranking en vivo" : "Ver ranking en vivo"}
                    </Button>
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
                        onClick={() => requestCloseSeason(activeSeason)}
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
                      <div className="mt-2 text-xs flex items-center gap-1 font-medium" style={{ color: selectedSeasonId === s.id ? "var(--g-progreso)" : "var(--text-muted)" }}>
                        <Trophy className="w-3.5 h-3.5" />
                        {s.activa ? "Ver ranking en vivo →" : "Ver ranking histórico →"}
                      </div>
                    </button>
                    {s.activa && canManageSeasons && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                        loading={closingId === s.id}
                        onClick={(e) => { e.stopPropagation(); requestCloseSeason(s); }}
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
                  <div
                    className="rounded-2xl p-5 md:p-7 mt-6"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {/* Header */}
                    <div
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="p-1.5 rounded-lg flex items-center justify-center"
                            style={{ background: "var(--g-energia-soft)", color: "var(--g-energia)" }}
                          >
                            <Trophy className="w-5 h-5" />
                          </span>
                          <h3 className="text-lg md:text-xl font-bold" style={{ color: "var(--text)" }}>
                            {selectedSeason?.activa ? "Ranking en vivo" : "Ranking histórico"} – {selectedSeason?.nombre ?? "Temporada"}
                          </h3>
                          {selectedSeason?.activa ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5" style={{ background: "rgba(34, 197, 94, 0.12)", color: "#16a34a", border: "1px solid rgba(34, 197, 94, 0.25)" }}>
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              En vivo
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                              <Lock className="w-3 h-3" />
                              Histórico cerrado
                            </span>
                          )}
                        </div>
                        <p className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
                          {selectedSeason?.activa
                            ? "Posiciones en tiempo real durante la temporada. El ELO y el ranking se actualizan continuamente con cada tarea evaluada."
                            : "Posiciones finales, ELO acumulado y medallas oficiales alcanzadas al cierre de la temporada."}
                        </p>
                      </div>

                      {historicalRanking.length > 0 && (
                        <div
                          className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 self-start sm:self-auto"
                          style={{
                            background: "var(--bg-subtle)",
                            border: "1px solid var(--border)",
                            color: "var(--text-muted)",
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: selectedSeason?.activa ? "var(--g-progreso)" : "var(--g-logro)" }} />
                          <span className="font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                            {historicalRanking.length} {selectedSeason?.activa ? "voluntarios clasificados" : "participantes"}
                          </span>
                        </div>
                      )}
                    </div>

                    {loadingHistory ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Spinner size="lg" />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {selectedSeason?.activa ? "Cargando ranking en vivo..." : "Cargando ranking histórico..."}
                        </span>
                      </div>
                    ) : historicalRanking.length === 0 ? (
                      <EmptyState
                        title="Sin participantes en el ranking"
                        description={
                          selectedSeason?.activa
                            ? "Aún no hay voluntarios registrados con actividad o puntos en esta temporada activa."
                            : "No se registraron participantes al cierre de esta temporada."
                        }
                      />
                    ) : (
                      <div className="space-y-6">
                        {/* Tarjeta de posición del voluntario autenticado */}
                        {myRankingEntry && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            style={{
                              background: "linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, var(--bg-subtle) 100%)",
                              border: "1px solid rgba(14, 165, 233, 0.28)",
                              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                            }}
                          >
                            <div className="flex items-center gap-3.5">
                              <div
                                className="w-11 h-11 rounded-full font-black text-base flex items-center justify-center shadow-sm shrink-0"
                                style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", color: "#ffffff" }}
                              >
                                #{myRankingEntry.posicion_final}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm" style={{ color: "var(--text)" }}>Tu posición en el ranking</span>
                                  <span
                                    className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(14, 165, 233, 0.15)", color: "#0284c7" }}
                                  >
                                    Tú
                                  </span>
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                  {selectedSeason?.activa
                                    ? "Continúa completando y entregando tareas para seguir escalando posiciones en la tabla clasificatoria."
                                    : "Posición definitiva oficial alcanzada al cierre de esta temporada."}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 sm:gap-6 self-start sm:self-center pl-14 sm:pl-0">
                              <div>
                                <span className="text-[10px] uppercase font-bold block" style={{ color: "var(--text-muted)" }}>
                                  {selectedSeason?.activa ? "ELO Actual" : "ELO Final"}
                                </span>
                                <span className="text-base font-black tabular-nums" style={{ color: "var(--g-energia)" }}>
                                  {myRankingEntry.elo_final}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold block" style={{ color: "var(--text-muted)" }}>
                                  XP Acumulada
                                </span>
                                <span className="text-base font-black tabular-nums" style={{ color: "var(--g-progreso)" }}>
                                  {myRankingEntry.xp_acumulada}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold block" style={{ color: "var(--text-muted)" }}>
                                  Rango
                                </span>
                                <span
                                  className="text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider inline-block mt-0.5"
                                  style={{
                                    background: getRankStyle(myRankingEntry.rango_final).bg,
                                    color: getRankStyle(myRankingEntry.rango_final).text,
                                    border: `1px solid ${getRankStyle(myRankingEntry.rango_final).border}`,
                                  }}
                                >
                                  {myRankingEntry.rango_final || "Aspirante"}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        {/* Top 3 Podium (Esports Style with Theme Backgrounds) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                          {/* 2nd Place (Desktop: Col 1, Mobile: Order 2) */}
                          {historicalRanking[1] && (() => {
                            const entry = historicalRanking[1];
                            const rankStyle = getRankStyle(entry.rango_final);
                            return (
                              <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ ...motionSpring.celebration, delay: 0.1 }}
                                className="order-2 md:order-1 rounded-2xl p-5 text-center relative flex flex-col items-center justify-between"
                                style={{
                                  background: "linear-gradient(180deg, var(--g-common-soft) 0%, var(--bg-card) 60%)",
                                  border: "1px solid var(--border)",
                                  boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                                }}
                              >
                                <div
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4"
                                  style={{
                                    background: "var(--bg-subtle)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                  }}
                                >
                                  {selectedSeason?.activa ? "🥈 #2 SEGUNDO LUGAR" : "🥈 #2 SUBCAMPEÓN"}
                                </div>

                                <div className="relative my-2">
                                  <div
                                    className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-slate-400 shadow-sm flex items-center justify-center"
                                    style={{
                                      background: "var(--bg-subtle)",
                                      boxShadow: "0 0 0 2px var(--bg-card)",
                                    }}
                                  >
                                    {entry.avatar_url ? (
                                      <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-xl font-bold" style={{ color: "var(--text)" }}>
                                        {(entry.nombre || "V")[0]?.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className="absolute -bottom-2 -right-1 w-9 h-9 rounded-full p-0.5 shadow-md"
                                    style={{
                                      background: "var(--bg-elevated)",
                                      border: "1px solid var(--border)",
                                    }}
                                  >
                                    <img src={getMedalUrl(entry.rango_final, entry.medalla_url)} alt="" className="w-full h-full object-contain" />
                                  </div>
                                </div>

                                <h4
                                  className="text-base font-bold mt-3 truncate max-w-[200px]"
                                  style={{ color: "var(--text)" }}
                                  title={entry.nombre || "Voluntario"}
                                >
                                  {entry.nombre || "Voluntario"}
                                </h4>

                                <div className="my-2">
                                  <span
                                    className="text-[11px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider"
                                    style={{ background: rankStyle.bg, color: rankStyle.text, border: `1px solid ${rankStyle.border}` }}
                                  >
                                    {entry.rango_final || "Aspirante"}
                                  </span>
                                </div>

                                <div
                                  className="w-full mt-4 pt-3 grid grid-cols-2 gap-2 text-center"
                                  style={{ borderTop: "1px solid var(--border)" }}
                                >
                                  <div className="rounded-xl p-2" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                                    <span className="text-[10px] uppercase font-bold block" style={{ color: "var(--text-muted)" }}>
                                      {selectedSeason?.activa ? "ELO Actual" : "ELO Final"}
                                    </span>
                                    <span className="text-base font-bold tabular-nums" style={{ color: "var(--text)" }}>{entry.elo_final}</span>
                                  </div>
                                  <div className="rounded-xl p-2" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                                    <span className="text-[10px] uppercase font-bold block" style={{ color: "var(--text-muted)" }}>XP</span>
                                    <span className="text-base font-bold tabular-nums" style={{ color: "var(--g-progreso)" }}>{entry.xp_acumulada}</span>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })()}

                          {/* 1st Place (Desktop: Col 2, Mobile: Order 1) */}
                          {historicalRanking[0] && (() => {
                            const entry = historicalRanking[0];
                            const rankStyle = getRankStyle(entry.rango_final);
                            return (
                              <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ ...motionSpring.celebration, delay: 0 }}
                                className="order-1 md:order-2 rounded-2xl p-6 text-center relative flex flex-col items-center justify-between md:-translate-y-2"
                                style={{
                                  background: "linear-gradient(180deg, var(--g-energia-soft) 0%, var(--bg-card) 60%)",
                                  border: "2px solid var(--g-energia)",
                                  boxShadow: "0 8px 24px var(--g-energia-soft)",
                                }}
                              >
                                <div
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm mb-4"
                                  style={{
                                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                    color: "#ffffff",
                                  }}
                                >
                                  <Crown className="w-4 h-4 fill-white" /> {selectedSeason?.activa ? "#1 LÍDER ACTUAL" : "#1 CAMPEÓN"}
                                </div>

                                <div className="relative my-2">
                                  <div
                                    className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-amber-400 shadow-md flex items-center justify-center"
                                    style={{
                                      background: "var(--bg-subtle)",
                                      boxShadow: "0 0 0 2px var(--bg-card)",
                                    }}
                                  >
                                    {entry.avatar_url ? (
                                      <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-2xl font-black" style={{ color: "var(--g-energia)" }}>
                                        {(entry.nombre || "V")[0]?.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className="absolute -bottom-2 -right-1 w-11 h-11 rounded-full p-1 shadow-md"
                                    style={{
                                      background: "var(--bg-elevated)",
                                      border: "2px solid var(--g-energia)",
                                    }}
                                  >
                                    <img src={getMedalUrl(entry.rango_final, entry.medalla_url)} alt="" className="w-full h-full object-contain" />
                                  </div>
                                </div>

                                <h4
                                  className="text-lg font-bold mt-3 truncate max-w-[220px]"
                                  style={{ color: "var(--text)" }}
                                  title={entry.nombre || "Campeón"}
                                >
                                  {entry.nombre || "Campeón"}
                                </h4>

                                <div className="my-2">
                                  <span
                                    className="text-xs font-bold px-3 py-1 rounded uppercase tracking-wider"
                                    style={{ background: rankStyle.bg, color: rankStyle.text, border: `1px solid ${rankStyle.border}` }}
                                  >
                                    {entry.rango_final || "Aspirante"}
                                  </span>
                                </div>

                                <div
                                  className="w-full mt-4 pt-3 grid grid-cols-2 gap-2 text-center"
                                  style={{ borderTop: "1px solid var(--border)" }}
                                >
                                  <div className="rounded-xl p-2.5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                                    <span className="text-[10px] uppercase font-bold block" style={{ color: "var(--text-muted)" }}>
                                      {selectedSeason?.activa ? "ELO Actual" : "ELO Final"}
                                    </span>
                                    <span className="text-xl font-black tabular-nums" style={{ color: "var(--g-energia)" }}>{entry.elo_final}</span>
                                  </div>
                                  <div className="rounded-xl p-2.5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                                    <span className="text-[10px] uppercase font-bold block" style={{ color: "var(--text-muted)" }}>XP Acumulada</span>
                                    <span className="text-xl font-black tabular-nums" style={{ color: "var(--g-progreso)" }}>{entry.xp_acumulada}</span>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })()}

                          {/* 3rd Place (Desktop: Col 3, Mobile: Order 3) */}
                          {historicalRanking[2] && (() => {
                            const entry = historicalRanking[2];
                            const rankStyle = getRankStyle(entry.rango_final);
                            return (
                              <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ ...motionSpring.celebration, delay: 0.2 }}
                                className="order-3 md:order-3 rounded-2xl p-5 text-center relative flex flex-col items-center justify-between"
                                style={{
                                  background: "linear-gradient(180deg, var(--g-advertencia-soft) 0%, var(--bg-card) 60%)",
                                  border: "1px solid var(--border)",
                                  boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                                }}
                              >
                                <div
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4"
                                  style={{
                                    background: "var(--g-advertencia-soft)",
                                    border: "1px solid var(--border)",
                                    color: "var(--g-advertencia)",
                                  }}
                                >
                                  🥉 #3 TERCER PUESTO
                                </div>

                                <div className="relative my-2">
                                  <div
                                    className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-amber-600 shadow-sm flex items-center justify-center"
                                    style={{
                                      background: "var(--bg-subtle)",
                                      boxShadow: "0 0 0 2px var(--bg-card)",
                                    }}
                                  >
                                    {entry.avatar_url ? (
                                      <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-xl font-bold" style={{ color: "var(--g-advertencia)" }}>
                                        {(entry.nombre || "V")[0]?.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className="absolute -bottom-2 -right-1 w-9 h-9 rounded-full p-0.5 shadow-md"
                                    style={{
                                      background: "var(--bg-elevated)",
                                      border: "1px solid var(--border)",
                                    }}
                                  >
                                    <img src={getMedalUrl(entry.rango_final, entry.medalla_url)} alt="" className="w-full h-full object-contain" />
                                  </div>
                                </div>

                                <h4
                                  className="text-base font-bold mt-3 truncate max-w-[200px]"
                                  style={{ color: "var(--text)" }}
                                  title={entry.nombre || "Voluntario"}
                                >
                                  {entry.nombre || "Voluntario"}
                                </h4>

                                <div className="my-2">
                                  <span
                                    className="text-[11px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider"
                                    style={{ background: rankStyle.bg, color: rankStyle.text, border: `1px solid ${rankStyle.border}` }}
                                  >
                                    {entry.rango_final || "Aspirante"}
                                  </span>
                                </div>

                                <div
                                  className="w-full mt-4 pt-3 grid grid-cols-2 gap-2 text-center"
                                  style={{ borderTop: "1px solid var(--border)" }}
                                >
                                  <div className="rounded-xl p-2" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                                    <span className="text-[10px] uppercase font-bold block" style={{ color: "var(--text-muted)" }}>
                                      {selectedSeason?.activa ? "ELO Actual" : "ELO Final"}
                                    </span>
                                    <span className="text-base font-bold tabular-nums" style={{ color: "var(--g-advertencia)" }}>{entry.elo_final}</span>
                                  </div>
                                  <div className="rounded-xl p-2" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                                    <span className="text-[10px] uppercase font-bold block" style={{ color: "var(--text-muted)" }}>XP</span>
                                    <span className="text-base font-bold tabular-nums" style={{ color: "var(--g-progreso)" }}>{entry.xp_acumulada}</span>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })()}
                        </div>

                        {/* Positions 4+ (Competitive Ladder Table with Dynamic Theme Tokens) */}
                        {historicalRanking.length > 3 && (
                          <div className="mt-6">
                            <div className="flex items-center gap-2 mb-3">
                              <Shield className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                Tabla Clasificatoria
                              </h4>
                            </div>

                            <div
                              className="rounded-2xl overflow-hidden"
                              style={{
                                background: "var(--bg-card)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              {/* Table Header */}
                              <div
                                className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider"
                                style={{
                                  background: "var(--bg-subtle)",
                                  borderBottom: "1px solid var(--border)",
                                  color: "var(--text-muted)",
                                }}
                              >
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-4">Voluntario</div>
                                <div className="col-span-3">Rango y Medalla</div>
                                <div className="col-span-2 text-right">
                                  {selectedSeason?.activa ? "ELO Actual" : "ELO Final"}
                                </div>
                                <div className="col-span-2 text-right">XP Acumulada</div>
                              </div>

                              {/* Table Body */}
                              <div>
                                {historicalRanking.slice(3).map((entry, idx) => {
                                  const rankStyle = getRankStyle(entry.rango_final);
                                  return (
                                    <motion.div
                                      key={entry.id}
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: staggerFast * (idx + 3) }}
                                      className="grid grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-5 py-3.5 items-center transition-colors hover:bg-[var(--bg-subtle)]"
                                      style={{
                                        borderBottom: idx === historicalRanking.length - 4 ? "none" : "1px solid var(--border)",
                                        background: entry.usuario_id === user?.id ? "rgba(14, 165, 233, 0.08)" : undefined,
                                        boxShadow: entry.usuario_id === user?.id ? "inset 3px 0 0 var(--accent)" : undefined,
                                      }}
                                    >
                                      {/* Position */}
                                      <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                                        <span
                                          className="w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center tabular-nums"
                                          style={{
                                            background: "var(--bg-subtle)",
                                            border: "1px solid var(--border)",
                                            color: "var(--text-muted)",
                                          }}
                                        >
                                          #{entry.posicion_final}
                                        </span>
                                      </div>

                                      {/* Volunteer Info */}
                                      <div className="col-span-6 sm:col-span-4 flex items-center gap-3 min-w-0">
                                        <div
                                          className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                                          style={{
                                            background: "var(--bg-subtle)",
                                            border: "1px solid var(--border)",
                                          }}
                                        >
                                          {entry.avatar_url ? (
                                            <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                                              {(entry.nombre || "V")[0]?.toUpperCase()}
                                            </span>
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <p
                                              className="font-bold text-sm truncate"
                                              style={{ color: "var(--text)" }}
                                              title={entry.nombre || "Voluntario"}
                                            >
                                              {entry.nombre || "Voluntario"}
                                            </p>
                                            {entry.usuario_id === user?.id && (
                                              <span
                                                className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                                                style={{ background: "rgba(14, 165, 233, 0.20)", color: "var(--accent)" }}
                                              >
                                                Tú
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[11px] sm:hidden" style={{ color: "var(--text-muted)" }}>
                                            {entry.rango_final || "Aspirante"}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Rank & Medal */}
                                      <div className="hidden sm:flex col-span-3 items-center gap-2">
                                        <img
                                          src={getMedalUrl(entry.rango_final, entry.medalla_url)}
                                          alt=""
                                          className="w-7 h-7 object-contain shrink-0"
                                        />
                                        <span
                                          className="text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider truncate"
                                          style={{ background: rankStyle.bg, color: rankStyle.text, border: `1px solid ${rankStyle.border}` }}
                                        >
                                          {entry.rango_final || "Aspirante"}
                                        </span>
                                      </div>

                                      {/* ELO */}
                                      <div className="col-span-2 text-right">
                                        <span className="font-extrabold text-sm tabular-nums" style={{ color: "var(--g-energia)" }}>
                                          {entry.elo_final} <span className="text-[10px] font-semibold opacity-70">ELO</span>
                                        </span>
                                      </div>

                                      {/* XP */}
                                      <div className="col-span-2 text-right">
                                        <span
                                          className="text-xs font-bold tabular-nums px-2 py-0.5 rounded inline-block"
                                          style={{
                                            background: "var(--g-progreso-soft)",
                                            color: "var(--g-progreso)",
                                          }}
                                        >
                                          ⚡ {entry.xp_acumulada} XP
                                        </span>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
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
