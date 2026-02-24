"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { analyticsApi } from "@/features/analytics/api/analyticsApi";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
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
} from "lucide-react";
import { generateReportPdf } from "@/features/reportes/utils/generateReportPdf";
import type { ReportMetrics, ReporteTipo } from "@/features/reportes/utils/generateReportPdf";

const toStartOfDayIso = (dateStr: string) => `${dateStr}T00:00:00`;
const toEndOfDayIso = (dateStr: string) => `${dateStr}T23:59:59`;
const fmt = (v: number) => (Number.isFinite(v) ? v.toLocaleString() : "0");

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  visible?: boolean;
}

function StatCard({ label, value, icon: Icon, visible = true }: StatCardProps) {
  if (!visible) return null;
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
      <p className="text-4xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

const DEFAULT_METRICS: ReportMetrics = {
  voluntarios: true,
  eventos: true,
  tareas: true,
  completadas: true,
  tasaFinalizacion: true,
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
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

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
        },
        metrics,
        tipoReporte,
        org?.nombre,
        comparison
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

  return (
    <>
      <TopBar title="Reporte Dinámico" />
      <div className="flex-1 p-5 sm:p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: "var(--accent)" }} />
              Reporte Dinámico
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Panel unificado de analítica y reportes. Personaliza, analiza y descarga.
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
                  {(["voluntarios", "eventos", "tareas", "completadas", "tasaFinalizacion"] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={metrics[key]}
                        onChange={() => toggleMetric(key)}
                        className="rounded"
                      />
                      <span className="text-sm">
                        {key === "tasaFinalizacion" ? "Tasa finalización" : key.charAt(0).toUpperCase() + key.slice(1)}
                      </span>
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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Voluntarios" value={totalVolunteers} icon={Users} visible={metrics.voluntarios} />
              <StatCard label="Eventos" value={totalEvents} icon={Calendar} visible={metrics.eventos} />
              <StatCard label="Total Tareas" value={totalTasks} icon={CheckSquare} visible={metrics.tareas} />
              <StatCard label="Completadas" value={completedTasks} icon={BarChart3} visible={metrics.completadas} />
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
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
