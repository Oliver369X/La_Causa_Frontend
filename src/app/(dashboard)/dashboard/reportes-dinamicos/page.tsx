"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { analyticsApi } from "@/features/analytics/api/analyticsApi";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { eventsApi } from "@/features/events/api/eventsApi";
import { gamificationApi } from "@/features/gamification/api/gamificationApi";
import { TopBar } from "@/shared/ui/Sidebar";
import {
  FileText,
  Users,
  Calendar,
  CheckSquare,
  BarChart3,
  Download,
  Settings2,
  Bell,
  TrendingUp,
  AlertTriangle,
  Target,
  Repeat2,
  Clock,
  Timer,
  GraduationCap,
  Wallet,
  Plus,
} from "lucide-react";
import { generateEventReportPdf, generateReportPdf } from "@/features/reportes/utils/generateReportPdf";
import type { ReportMetrics, ReporteTipo } from "@/features/reportes/utils/generateReportPdf";

const METRIC_GROUPS: { key: keyof ReportMetrics; label: string }[] = [
  { key: "voluntarios", label: "Voluntarios" },
  { key: "eventos", label: "Eventos" },
  { key: "tareas", label: "Tareas" },
  { key: "completadas", label: "Completadas" },
  { key: "tasaFinalizacion", label: "Tasa finalización" },
  { key: "retencion", label: "Retención voluntarios" },
  { key: "precisionAsignacion", label: "Precisión asignación" },
  { key: "horasImpacto", label: "Horas impacto" },
  { key: "mtta", label: "MTTA auditoría" },
  { key: "skillsPromedio", label: "Skills / voluntario" },
];

const toStartOfDayIso = (dateStr: string) => `${dateStr}T00:00:00`;
const toEndOfDayIso = (dateStr: string) => `${dateStr}T23:59:59`;
const fmt = (v: number) => (Number.isFinite(v) ? v.toLocaleString() : "0");

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  visible?: boolean;
}

function StatCard({ label, value, icon: Icon, visible = true }: StatCardProps) {
  if (!visible) return null;
  const display =
    typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div
      className="p-6 rounded-2xl flex flex-col gap-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
          <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
        </div>
      </div>
      <p className="text-4xl font-bold tabular-nums">{display}</p>
    </div>
  );
}

const DEFAULT_METRICS: ReportMetrics = {
  voluntarios: true,
  eventos: true,
  tareas: true,
  completadas: true,
  tasaFinalizacion: true,
  retencion: true,
  precisionAsignacion: true,
  horasImpacto: true,
  mtta: true,
  skillsPromedio: true,
};

export default function ReportesDinamicosPage() {
  const { activeOrgId } = useAuthStore();
  const today = new Date();
  const defaultEnd = today.toISOString().slice(0, 10);
  const d = new Date(today);
  d.setDate(d.getDate() - 30);
  const defaultStart = d.toISOString().slice(0, 10);

  const [metrics, setMetrics] = useState<ReportMetrics>(DEFAULT_METRICS);
  const [tipoReporte, setTipoReporte] = useState<ReporteTipo>("formal");
  const [showPersonalizar, setShowPersonalizar] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingEvent, setDownloadingEvent] = useState(false);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ categoria: "Operación", descripcion: "", cantidad: "1", costo_unitario: "", moneda: "BOB", estado: "pagado", proveedor: "", numero_comprobante: "", fecha_gasto: "" });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", activeOrgId, startDate, endDate],
    queryFn: () => analyticsApi.dashboard(
      activeOrgId!,
      toStartOfDayIso(startDate),
      toEndOfDayIso(endDate)
    ),
    enabled: !!activeOrgId && !!startDate && !!endDate,
  });

  const { data: org } = useQuery({
    queryKey: ["org", activeOrgId],
    queryFn: () => organizationsApi.get(activeOrgId!),
    enabled: !!activeOrgId,
  });
  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => analyticsApi.notifications(),
    enabled: !!activeOrgId,
  });
  const { data: comparison } = useQuery({
    queryKey: ["dashboard-compare", activeOrgId, startDate, endDate],
    queryFn: () => analyticsApi.dashboardComparison(
      activeOrgId!,
      toStartOfDayIso(startDate),
      toEndOfDayIso(endDate)
    ),
    enabled: !!activeOrgId && !!startDate && !!endDate && startDate <= endDate,
  });
  const { data: periodFinances, isLoading: periodFinancesLoading, isError: periodFinancesError } = useQuery({
    queryKey: ["period-finances", activeOrgId, startDate, endDate],
    queryFn: () => analyticsApi.periodFinances(
      activeOrgId!,
      toStartOfDayIso(startDate),
      toEndOfDayIso(endDate),
    ),
    enabled: !!activeOrgId && !!startDate && !!endDate && startDate <= endDate,
  });
  const { data: events = [] } = useQuery({
    queryKey: ["analytics-events", activeOrgId],
    queryFn: () => eventsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  });
  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons", activeOrgId],
    queryFn: () => gamificationApi.getSeasons(activeOrgId!),
    enabled: !!activeOrgId,
  });
  const { data: eventAnalytics, isLoading: eventAnalyticsLoading } = useQuery({
    queryKey: ["event-analytics", selectedEventId],
    queryFn: () => analyticsApi.event(selectedEventId),
    enabled: !!selectedEventId,
  });
  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ["event-expenses", selectedEventId],
    queryFn: () => analyticsApi.listExpenses(selectedEventId),
    enabled: !!selectedEventId,
  });

  const totalVolunteers = stats?.total_volunteers ?? 0;
  const totalEvents = stats?.total_events ?? 0;
  const totalTasks = stats?.total_tasks ?? 0;
  const completedTasks = stats?.tasks_completed ?? 0;
  const pendingTasks = stats?.tasks_pending ?? 0;

  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;
  const pendingRate = totalTasks > 0 ? Math.max(0, 100 - completionRate) : 0;
  const tasksPerEvent = totalEvents > 0 ? (totalTasks / totalEvents) : 0;
  const tasksPerVolunteer = totalVolunteers > 0 ? (totalTasks / totalVolunteers) : 0;
  const unread = notifs.filter((n) => !n.leida).length;

  const retentionDisplay =
    stats?.volunteer_retention_pct != null ? `${stats.volunteer_retention_pct.toFixed(1)}%` : "—";
  const precisionDisplay =
    stats?.assignment_precision_pct != null ? `${stats.assignment_precision_pct.toFixed(1)}%` : "—";
  const horasDisplay = (stats?.impact_hours_total ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
  const skillsDisplay =
    stats?.skills_new_avg_per_volunteer != null
      ? stats.skills_new_avg_per_volunteer.toFixed(2)
      : "—";
  const currentClose = comparison
    ? (comparison.current.total_tasks > 0
      ? Math.round((comparison.current.tasks_completed / comparison.current.total_tasks) * 100)
      : 0)
    : completionRate;
  const previousClose = comparison
    ? (comparison.previous.total_tasks > 0
      ? Math.round((comparison.previous.tasks_completed / comparison.previous.total_tasks) * 100)
      : 0)
    : 0;
  const closeDelta = currentClose - previousClose;

  const recomendaciones: string[] = [];
  if (completionRate < 40) recomendaciones.push("La tasa de cierre es baja. Revisa bloqueos y define responsables por tarea.");
  if (pendingRate > 60) recomendaciones.push("Hay demasiadas tareas pendientes. Conviene priorizar backlog y cerrar tareas antiguas.");
  if (tasksPerVolunteer > 3) recomendaciones.push("La carga por voluntario es alta. Considera reclutar o redistribuir tareas.");
  if (unread > 5) recomendaciones.push("Hay muchas notificaciones sin leer. Define una rutina de seguimiento diario.");
  if (recomendaciones.length === 0) {
    recomendaciones.push("Buen estado general. Mantén revisiones semanales y mejora continua de tiempos de cierre.");
  }

  const fmtMtta = (seconds: number | null | undefined) => {
    if (seconds == null || !Number.isFinite(seconds)) return "—";
    if (seconds < 60) return `${seconds.toFixed(1)} s`;
    return `${(seconds / 60).toFixed(1)} min`;
  };

  const handleDownloadPdf = async () => {
    if (!stats) return;
    setDownloading(true);
    try {
      await generateReportPdf(
        {
          total_volunteers: stats.total_volunteers ?? 0,
          total_events: stats.total_events ?? 0,
          total_tasks: stats.total_tasks ?? 0,
          tasks_completed: stats.tasks_completed ?? 0,
          tasks_pending: stats.tasks_pending ?? 0,
          volunteer_retention_pct: stats.volunteer_retention_pct,
          assignment_precision_pct: stats.assignment_precision_pct,
          impact_hours_total: stats.impact_hours_total,
          mtta_audit_seconds: stats.mtta_audit_seconds,
          skills_new_avg_per_volunteer: stats.skills_new_avg_per_volunteer,
        },
        metrics,
        tipoReporte,
        org?.nombre,
        comparison
          ? {
              current: comparison.current,
              previous: comparison.previous,
              start_date: comparison.start_date,
              end_date: comparison.end_date,
              previous_start_date: comparison.previous_start_date,
              previous_end_date: comparison.previous_end_date,
            }
          : undefined
      );
    } catch (e) {
      console.error("Error al generar PDF:", e);
    } finally {
      setDownloading(false);
    }
  };

  const toggleMetric = (key: keyof ReportMetrics) => {
    setMetrics((m) => ({ ...m, [key]: !m[key] }));
  };

  const handleDownloadEventPdf = async () => {
    if (!eventAnalytics) return;
    setDownloadingEvent(true);
    try {
      await generateEventReportPdf(eventAnalytics, org?.nombre, expenses);
    } finally {
      setDownloadingEvent(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!selectedEventId || !expenseForm.descripcion || !expenseForm.costo_unitario) return;
    await analyticsApi.createExpense(selectedEventId, {
      ...expenseForm,
      cantidad: Number(expenseForm.cantidad),
      costo_unitario: Number(expenseForm.costo_unitario),
      fecha_gasto: expenseForm.fecha_gasto ? `${expenseForm.fecha_gasto}T00:00:00` : null,
    });
    setExpenseForm({ categoria: "Operación", descripcion: "", cantidad: "1", costo_unitario: "", moneda: "BOB", estado: "pagado", proveedor: "", numero_comprobante: "", fecha_gasto: "" });
    setShowExpenseForm(false);
    await refetchExpenses();
  };

  return (
    <>
      <TopBar title="Reportes por período" />
      <div className="flex-1 p-5 sm:p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: "var(--accent)" }} />
              Reportes por evento y período
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Analiza la organización por fechas, temporada o evento; revisa resultados y costos, y descarga el informe.
            </p>
          </div>

          {activeOrgId && stats && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowPersonalizar((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <Settings2 className="w-4 h-4" /> Personalizar
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "white" }}
              >
                <Download className="w-4 h-4" /> {downloading ? "Generando…" : "Descargar PDF"}
              </button>
            </div>
          )}
        </div>

        {/* Panel de personalización */}
        {activeOrgId && (
          <section className="mb-6 p-4 rounded-2xl flex flex-col gap-4 md:flex-row md:items-end"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="min-w-52">
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Temporada</p>
              <select
                value={selectedSeasonId}
                onChange={(e) => {
                  const seasonId = e.target.value;
                  setSelectedSeasonId(seasonId);
                  const season = seasons.find((item) => item.id === seasonId);
                  if (season) {
                    setStartDate(season.fecha_inicio.slice(0, 10));
                    setEndDate(season.fecha_fin.slice(0, 10));
                  }
                }}
                className="w-full px-3 py-2 rounded-xl text-sm"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                <option value="">Rango personalizado</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.nombre}{season.activa ? " (activa)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Desde</p>
              <input type="date" value={startDate} onChange={(e) => { setSelectedSeasonId(""); setStartDate(e.target.value); }}
                className="px-3 py-2 rounded-xl text-sm" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Hasta</p>
              <input type="date" value={endDate} onChange={(e) => { setSelectedSeasonId(""); setEndDate(e.target.value); }}
                className="px-3 py-2 rounded-xl text-sm" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }} />
            </div>
            <p className="text-xs md:pb-2" style={{ color: "var(--text-muted)" }}>
              El detalle inferior permite concentrar el análisis y los gastos en un evento específico.
            </p>
          </section>
        )}

        {showPersonalizar && activeOrgId && (
          <div
            className="mb-6 p-5 rounded-2xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>
              Personalizar reporte
            </p>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  Métricas a incluir
                </p>
                <div className="flex flex-wrap gap-3">
                  {METRIC_GROUPS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={metrics[key]}
                        onChange={() => toggleMetric(key)}
                        className="rounded"
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  Tipo de reporte
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      checked={tipoReporte === "formal"}
                      onChange={() => setTipoReporte("formal")}
                    />
                    <span className="text-sm">Formal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      checked={tipoReporte === "informal"}
                      onChange={() => setTipoReporte("informal")}
                    />
                    <span className="text-sm">Informal</span>
                  </label>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  Temporada
                </p>
                <select
                  value={selectedSeasonId}
                  onChange={(e) => {
                    const seasonId = e.target.value;
                    setSelectedSeasonId(seasonId);
                    const season = seasons.find((item) => item.id === seasonId);
                    if (season) {
                      setStartDate(season.fecha_inicio.slice(0, 10));
                      setEndDate(season.fecha_fin.slice(0, 10));
                    }
                  }}
                  className="px-2 py-1 rounded-lg text-sm max-w-52"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  <option value="">Rango personalizado</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.nombre}{season.activa ? " (activa)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  Rango de fechas
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-1 rounded-lg text-sm"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>a</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-1 rounded-lg text-sm"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!activeOrgId ? (
          <div className="p-8 rounded-2xl text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p className="font-medium mb-2">Sin organización activa</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Selecciona una organización para ver los reportes dinámicos.
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)" }} />
            ))}
          </div>
        ) : (
          <>
            {/* Resumen ejecutivo */}
            <div className="mb-6 p-5 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <p className="text-sm font-semibold">Resumen ejecutivo</p>
              </div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {org?.nombre ?? "La organización"} tiene {completedTasks} tareas completadas de {totalTasks}
                {" "}({completionRate}% de cierre), con una intensidad promedio de {tasksPerEvent.toFixed(1)} tareas por evento.
              </p>
            </div>

            <section className="mb-6 p-5 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold">Resumen financiero del período</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {periodFinances?.eventos.length ?? 0} eventos incluidos según las fechas seleccionadas.
                  </p>
                </div>
                <Wallet className="w-5 h-5" style={{ color: "var(--accent)" }} />
              </div>
              {periodFinancesLoading ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>Calculando costos del período...</p> : periodFinancesError ? <p className="text-sm" style={{ color: "var(--danger, #ef4444)" }}>No se pudo calcular el resumen financiero. Intentá recargar la página.</p> : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="p-4 rounded-xl" style={{ background: "var(--bg-subtle)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Presupuesto estimado</p><p className="font-bold mt-1">{Object.entries(periodFinances?.costos_estimados_por_moneda ?? {}).map(([currency, total]) => `${Number(total).toFixed(2)} ${currency}`).join(" · ") || "—"}</p></div>
                    <div className="p-4 rounded-xl" style={{ background: "var(--bg-subtle)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Costo real consolidado</p><p className="font-bold mt-1">{Object.entries(periodFinances?.gastos_reales_por_moneda ?? {}).map(([currency, total]) => `${Number(total).toFixed(2)} ${currency}`).join(" · ") || "—"}</p></div>
                    <div className="p-4 rounded-xl" style={{ background: "var(--accent-soft)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Pendiente de aprobación</p><p className="font-bold mt-1">{Object.entries(periodFinances?.gastos_pendientes_por_moneda ?? {}).map(([currency, total]) => `${Number(total).toFixed(2)} ${currency}`).join(" · ") || "—"}</p></div>
                  </div>
                  <div className="space-y-2">
                    {periodFinances?.eventos.map((event) => (
                      <button key={event.evento_id} type="button" onClick={() => setSelectedEventId(event.evento_id)} className="w-full text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
                        <span className="text-sm font-medium">{event.titulo}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Estimado: {Object.entries(event.costos_estimados_por_moneda).map(([currency, total]) => `${Number(total).toFixed(2)} ${currency}`).join(" · ") || "—"} · Real: {Object.entries(event.gastos_reales_por_moneda).map(([currency, total]) => `${Number(total).toFixed(2)} ${currency}`).join(" · ") || "—"}</span>
                      </button>
                    ))}
                    {periodFinances && periodFinances.eventos.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay eventos dentro de este período.</p>}
                  </div>
                </>
              )}
            </section>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Voluntarios" value={totalVolunteers} icon={Users} visible={metrics.voluntarios} />
              <StatCard label="Eventos" value={totalEvents} icon={Calendar} visible={metrics.eventos} />
              <StatCard label="Total Tareas" value={totalTasks} icon={CheckSquare} visible={metrics.tareas} />
              <StatCard label="Completadas" value={completedTasks} icon={BarChart3} visible={metrics.completadas} />
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                KPIs estratégicos
              </p>
              <p className="text-xs mb-4 max-w-3xl" style={{ color: "var(--text-muted)" }}>
                Periodo según fechas arriba. La precisión de asignación es un indicador operativo (tareas completadas sobre
                asignaciones aceptadas/en curso); el modelo ML no etiqueta aún cada sugerencia en base de datos.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                  label="Retención"
                  value={retentionDisplay}
                  icon={Repeat2}
                  visible={metrics.retencion}
                />
                <StatCard
                  label="Precisión asignación"
                  value={precisionDisplay}
                  icon={Target}
                  visible={metrics.precisionAsignacion}
                />
                <StatCard
                  label="Horas impacto"
                  value={horasDisplay}
                  icon={Clock}
                  visible={metrics.horasImpacto}
                />
                <StatCard
                  label="MTTA auditoría"
                  value={fmtMtta(stats?.mtta_audit_seconds)}
                  icon={Timer}
                  visible={metrics.mtta}
                />
                <StatCard
                  label="Skills / voluntario"
                  value={skillsDisplay}
                  icon={GraduationCap}
                  visible={metrics.skillsPromedio}
                />
              </div>
            </div>

            {metrics.tasaFinalizacion && (
              <div className="p-6 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold text-sm">Tasa de finalización</p>
                  <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{completionRate}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${completionRate}%`, background: "var(--accent)" }}
                  />
                </div>
                <div className="flex justify-between mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>{completedTasks} completadas</span>
                  <span>{pendingTasks} pendientes</span>
                </div>
              </div>
            )}

            {/* Indicadores operativos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-5 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Carga por voluntario</p>
                <p className="text-2xl font-bold">{tasksPerVolunteer.toFixed(2)}</p>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>tareas por voluntario</p>
              </div>
              <div className="p-5 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Intensidad por evento</p>
                <p className="text-2xl font-bold">{tasksPerEvent.toFixed(2)}</p>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>tareas por evento</p>
              </div>
              <div className="p-5 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Notificaciones sin leer</p>
                <p className="text-2xl font-bold">{unread}</p>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>pendientes de revisión</p>
              </div>
            </div>

            {/* Diagnóstico y recomendaciones */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              <div className="p-5 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <p className="text-sm font-semibold">Diagnóstico operativo</p>
                </div>
                <div className="space-y-2 text-sm">
                  <p style={{ color: "var(--text-muted)" }}>
                    Cierre: <span style={{ color: "var(--text)" }}>{completionRate}%</span>
                  </p>
                  <p style={{ color: "var(--text-muted)" }}>
                    Pendiente: <span style={{ color: "var(--text)" }}>{pendingRate}%</span>
                  </p>
                  <p style={{ color: "var(--text-muted)" }}>
                    Balance: <span style={{ color: "var(--text)" }}>{completedTasks} / {pendingTasks}</span>
                  </p>
                </div>
              </div>
              <div className="p-5 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <p className="text-sm font-semibold">Recomendaciones</p>
                </div>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  {recomendaciones.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Comparativo: periodo actual vs anterior */}
            {comparison && (
              <div className="p-6 rounded-2xl mt-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <p className="font-semibold text-sm">Comparativo de periodos</p>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Δ cierre: {closeDelta >= 0 ? "+" : ""}{closeDelta} pp
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ color: "var(--text-muted)" }}>
                        <th className="text-left py-2">Métrica</th>
                        <th className="text-right py-2">Actual</th>
                        <th className="text-right py-2">Anterior</th>
                        <th className="text-right py-2">Variación</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2">Voluntarios</td>
                        <td className="text-right">{fmt(comparison.current.total_volunteers)}</td>
                        <td className="text-right">{fmt(comparison.previous.total_volunteers)}</td>
                        <td className="text-right">
                          {(comparison.current.total_volunteers - comparison.previous.total_volunteers) >= 0 ? "+" : ""}
                          {fmt(comparison.current.total_volunteers - comparison.previous.total_volunteers)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Eventos</td>
                        <td className="text-right">{fmt(comparison.current.total_events)}</td>
                        <td className="text-right">{fmt(comparison.previous.total_events)}</td>
                        <td className="text-right">
                          {(comparison.current.total_events - comparison.previous.total_events) >= 0 ? "+" : ""}
                          {fmt(comparison.current.total_events - comparison.previous.total_events)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Tareas</td>
                        <td className="text-right">{fmt(comparison.current.total_tasks)}</td>
                        <td className="text-right">{fmt(comparison.previous.total_tasks)}</td>
                        <td className="text-right">
                          {(comparison.current.total_tasks - comparison.previous.total_tasks) >= 0 ? "+" : ""}
                          {fmt(comparison.current.total_tasks - comparison.previous.total_tasks)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Completadas</td>
                        <td className="text-right">{fmt(comparison.current.tasks_completed)}</td>
                        <td className="text-right">{fmt(comparison.previous.tasks_completed)}</td>
                        <td className="text-right">
                          {(comparison.current.tasks_completed - comparison.previous.tasks_completed) >= 0 ? "+" : ""}
                          {fmt(comparison.current.tasks_completed - comparison.previous.tasks_completed)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Retención</td>
                        <td className="text-right">
                          {comparison.current.volunteer_retention_pct != null
                            ? `${comparison.current.volunteer_retention_pct.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="text-right">
                          {comparison.previous.volunteer_retention_pct != null
                            ? `${comparison.previous.volunteer_retention_pct.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="text-right">
                          {comparison.current.volunteer_retention_pct != null &&
                          comparison.previous.volunteer_retention_pct != null
                            ? `${(comparison.current.volunteer_retention_pct - comparison.previous.volunteer_retention_pct >= 0 ? "+" : "")}${(comparison.current.volunteer_retention_pct - comparison.previous.volunteer_retention_pct).toFixed(1)} pp`
                            : "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Horas impacto</td>
                        <td className="text-right">{horasDisplay}</td>
                        <td className="text-right">
                          {(comparison.previous.impact_hours_total ?? 0).toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })}
                        </td>
                        <td className="text-right">
                          {(comparison.current.impact_hours_total ?? 0) -
                            (comparison.previous.impact_hours_total ?? 0) >=
                          0
                            ? "+"
                            : ""}
                          {(
                            (comparison.current.impact_hours_total ?? 0) -
                            (comparison.previous.impact_hours_total ?? 0)
                          ).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notificaciones recientes */}
            <div className="p-6 rounded-2xl mt-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="mb-4">
                <p className="font-semibold text-sm">Detalle por evento</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Elegí una tarjeta para ver participación, tareas, impacto y gastos.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
                {events.map((event) => {
                  const isSelected = event.id === selectedEventId;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => { setSelectedEventId(event.id); setShowExpenseForm(false); }}
                      className="relative min-h-40 overflow-hidden text-left p-4 rounded-2xl transition-all hover:-translate-y-0.5"
                      style={{
                        background: isSelected ? "var(--accent-soft)" : "var(--bg-subtle)",
                        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                      }}
                    >
                      {event.imagen_url && (
                        <img
                          src={event.imagen_url}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-45"
                        />
                      )}
                      {event.imagen_url && <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/10" />}
                      <div className="relative z-10 flex min-h-32 flex-col justify-end">
                        <p className="font-semibold line-clamp-2">{event.nombre}</p>
                        <p className="text-xs mt-2" style={{ color: event.imagen_url ? "rgba(255,255,255,.78)" : "var(--text-muted)" }}>
                          {new Date(event.fecha_inicio).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                        <span className="inline-flex w-fit mt-3 px-2 py-1 rounded-lg text-[11px] font-medium" style={{ background: "var(--bg-card)", color: "var(--accent)" }}>
                          {isSelected ? "Viendo detalle" : "Ver métricas"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {events.length === 0 && <p className="text-sm pb-4" style={{ color: "var(--text-muted)" }}>No hay eventos en esta organización.</p>}
              {selectedEventId && eventAnalyticsLoading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando detalle...</p>}
              {selectedEventId && eventAnalytics && (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleDownloadEventPdf}
                      disabled={downloadingEvent}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      <Download className="w-4 h-4" />
                      {downloadingEvent ? "Generando…" : "Descargar PDF del evento"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <StatCard label="Voluntarios" value={eventAnalytics.voluntarios_registrados} icon={Users} />
                    <StatCard label="Tareas" value={`${eventAnalytics.tareas_completadas}/${eventAnalytics.tareas_totales}`} icon={CheckSquare} />
                    <StatCard label="Horas" value={eventAnalytics.horas_voluntarias} icon={Clock} />
                    <StatCard label="ELO máximo" value={eventAnalytics.elo_maximo} icon={TrendingUp} />
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs mb-5" style={{ color: "var(--text-muted)" }}>
                    <span>Entregas aprobadas: <strong style={{ color: "var(--text)" }}>{eventAnalytics.entregas_aprobadas}</strong></span>
                    <span>Rechazadas: <strong style={{ color: "var(--text)" }}>{eventAnalytics.entregas_rechazadas}</strong></span>
                    <span>XP acumulada de participantes: <strong style={{ color: "var(--text)" }}>{eventAnalytics.xp_generada}</strong></span>
                    {eventAnalytics.mejor_voluntario && <span>Mejor voluntario: <strong style={{ color: "var(--text)" }}>{eventAnalytics.mejor_voluntario.nombre}</strong></span>}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div>
                      <p className="text-sm font-semibold mb-3">Voluntarios destacados</p>
                      {eventAnalytics.voluntarios.length === 0 ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin voluntarios registrados.</p> : (
                        <div className="space-y-2">
                          {eventAnalytics.voluntarios.slice(0, 8).map((volunteer, index) => (
                            <div key={volunteer.usuario_id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
                              <div><span className="text-xs mr-2" style={{ color: "var(--text-muted)" }}>#{index + 1}</span><span className="text-sm font-medium">{volunteer.nombre}</span><p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{volunteer.tareas_completadas} tareas · {volunteer.horas} h · {volunteer.elo} ELO</p></div>
                              <span className="text-xs" style={{ color: "var(--accent)" }}>{volunteer.xp} XP</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3"><p className="text-sm font-semibold">Gastos del evento</p><button onClick={() => setShowExpenseForm((v) => !v)} className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><Plus className="w-3 h-3" /> Añadir</button></div>
                      {showExpenseForm && <div className="grid grid-cols-2 gap-2 mb-3 p-3 rounded-xl" style={{ background: "var(--bg-subtle)" }}><input placeholder="Categoría" value={expenseForm.categoria} onChange={(e) => setExpenseForm({ ...expenseForm, categoria: e.target.value })} className="px-2 py-2 rounded-lg text-sm" /><input placeholder="Descripción" value={expenseForm.descripcion} onChange={(e) => setExpenseForm({ ...expenseForm, descripcion: e.target.value })} className="px-2 py-2 rounded-lg text-sm" /><input type="number" min="0" placeholder="Cantidad" value={expenseForm.cantidad} onChange={(e) => setExpenseForm({ ...expenseForm, cantidad: e.target.value })} className="px-2 py-2 rounded-lg text-sm" /><input type="number" min="0" step="0.01" placeholder="Costo unitario" value={expenseForm.costo_unitario} onChange={(e) => setExpenseForm({ ...expenseForm, costo_unitario: e.target.value })} className="px-2 py-2 rounded-lg text-sm" /><select value={expenseForm.estado} onChange={(e) => setExpenseForm({ ...expenseForm, estado: e.target.value })} className="px-2 py-2 rounded-lg text-sm"><option value="estimado">Presupuesto estimado</option><option value="pendiente_aprobacion">Pendiente de aprobación</option><option value="aprobado">Aprobado</option><option value="pagado">Pagado</option></select><input placeholder="Proveedor" value={expenseForm.proveedor} onChange={(e) => setExpenseForm({ ...expenseForm, proveedor: e.target.value })} className="px-2 py-2 rounded-lg text-sm" /><input placeholder="N.º factura/recibo" value={expenseForm.numero_comprobante} onChange={(e) => setExpenseForm({ ...expenseForm, numero_comprobante: e.target.value })} className="px-2 py-2 rounded-lg text-sm" /><input type="date" value={expenseForm.fecha_gasto} onChange={(e) => setExpenseForm({ ...expenseForm, fecha_gasto: e.target.value })} className="px-2 py-2 rounded-lg text-sm" /><button onClick={handleCreateExpense} className="py-2 rounded-lg text-sm" style={{ background: "var(--accent)", color: "white" }}>Guardar gasto</button></div>}
                      {Object.entries(eventAnalytics.costos_estimados_por_moneda).map(([currency, total]) => <div key={`estimated-${currency}`} className="flex justify-between p-3 rounded-xl mb-2" style={{ background: "var(--bg-subtle)" }}><span className="text-sm">Presupuesto estimado {currency}</span><span className="font-semibold">{Number(total).toFixed(2)}</span></div>)}
                      {Object.entries(eventAnalytics.gastos_por_moneda).length === 0 ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin gastos registrados.</p> : Object.entries(eventAnalytics.gastos_por_moneda).map(([currency, total]) => <div key={currency} className="flex justify-between p-3 rounded-xl mb-2" style={{ background: "var(--bg-subtle)" }}><span className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4" />Costo real {currency}</span><span className="font-semibold">{Number(total).toFixed(2)}</span></div>)}
                      {Object.entries(eventAnalytics.gastos_pendientes_por_moneda).map(([currency, total]) => <div key={`pending-${currency}`} className="flex justify-between p-3 rounded-xl mb-2" style={{ background: "var(--accent-soft)" }}><span className="text-sm">Pendiente de aprobación {currency}</span><span className="font-semibold">{Number(total).toFixed(2)}</span></div>)}
                      {expenses.length > 0 && <div className="mt-3 space-y-2">{expenses.map((expense) => <div key={expense.id} className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}><span>{expense.descripcion} · {expense.cantidad} × {expense.costo_unitario}</span><span>{expense.total.toFixed(2)} {expense.moneda}</span></div>)}</div>}
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="text-sm font-semibold mb-3">Desglose de tareas</p>
                    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ color: "var(--text-muted)" }}><th className="text-left py-2">Tarea</th><th className="text-right py-2">Asignaciones</th><th className="text-right py-2">Completadas</th><th className="text-right py-2">Gastos</th></tr></thead><tbody>{eventAnalytics.tareas.map((task) => <tr key={task.tarea_id} style={{ borderTop: "1px solid var(--border)" }}><td className="py-2">{task.titulo}</td><td className="text-right">{task.asignaciones}</td><td className="text-right">{task.completadas}</td><td className="text-right">{Object.entries(task.gastos).map(([currency, total]) => `${Number(total).toFixed(2)} ${currency}`).join(" · ") || "—"}</td></tr>)}</tbody></table></div>
                  </div>
                </>
              )}
            </div>

            {/* Notificaciones recientes */}
            <div className="p-6 rounded-2xl mt-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <p className="font-semibold text-sm">Notificaciones recientes</p>
              </div>
              {notifs.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>Sin notificaciones</p>
              ) : (
                <div className="space-y-3">
                  {notifs.slice(0, 5).map((n) => (
                    <div key={n.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-1.5 rounded-full shrink-0"
                        style={{ background: n.leida ? "var(--border)" : "var(--accent)" }} />
                      <div>
                        <p className="text-sm font-medium">{n.titulo}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{n.mensaje}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
