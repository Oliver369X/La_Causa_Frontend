"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { eventsApi, type Event, type EventApplication } from "@/features/events/api/eventsApi";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { tasksApi, type Task } from "@/features/tasks/api/tasksApi";
import { TopBar } from "@/shared/ui/Sidebar";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  ListTodo,
  MessageSquare,
  Award,
  Settings,
  Plus,
  Check,
  X,
  Play,
  Flag,
  Ban,
  Inbox,
  ClipboardList,
} from "lucide-react";
import { formatDate } from "@/shared/utils/utils";
import { useState } from "react";
import { toast } from "sonner";

type EventDetailTab = "general" | "solicitudes" | "tareas" | "equipos" | "retrospectiva" | "config";

const statusColors: Record<string, { background: string; color: string }> = {
  borrador: { background: "var(--bg-subtle)", color: "var(--text-muted)" },
  publicado: { background: "rgba(34,197,94,.15)", color: "#22c55e" },
  en_curso: { background: "rgba(59,130,246,.15)", color: "#60a5fa" },
  finalizado: { background: "rgba(59,130,246,.15)", color: "#60a5fa" },
  cancelado: { background: "rgba(239,68,68,.15)", color: "#f87171" },
};

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const appStatusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  en_revision: "En revisión",
  lista_espera: "Lista de espera",
  cancelado: "Cancelado",
  asistio: "Asistió",
  falto: "Faltó",
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return `${formatDate(start)} → ${formatDate(end)} (${days} día${days !== 1 ? "s" : ""})`;
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const { activeOrgId, user } = useAuthStore();
  const isVolunteer = user?.tipo === "voluntario";
  const qc = useQueryClient();
  const [tab, setTab] = useState<EventDetailTab>("general");
  const [appFilter, setAppFilter] = useState<string>("todos");

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventsApi.getById(eventId),
    enabled: !!eventId,
  });

  const { data: org } = useQuery({
    queryKey: ["org", event?.organizacion_id],
    queryFn: () => organizationsApi.get(event!.organizacion_id),
    enabled: !!event?.organizacion_id,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["event-applications", eventId, appFilter],
    queryFn: () =>
      eventsApi.listApplications(eventId, appFilter === "todos" ? undefined : appFilter),
    enabled: !!eventId && (tab === "solicitudes" || tab === "general"),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", eventId],
    queryFn: () => tasksApi.listByEvent(eventId),
    enabled: !!eventId && (tab === "tareas" || tab === "general"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (estado: Event["estado"]) => eventsApi.updateStatus(eventId, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      toast.success("Estado actualizado");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail ?? "Error al actualizar");
    },
  });

  const reviewAppMutation = useMutation({
    mutationFn: ({
      id,
      estado,
      nota,
    }: {
      id: string;
      estado: string;
      nota?: string;
    }) =>
      eventsApi.reviewApplication(id, {
        estado,
        nota_interna_organizador: nota,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-applications", eventId] });
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      toast.success("Solicitud actualizada");
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const approvedCount = applications.filter((a) => a.estado === "aprobado" || a.estado === "asistio").length;
  const pendingCount = applications.filter((a) => a.estado === "pendiente").length;

  if (!eventId) return null;

  if (loadingEvent || !event) {
    return (
      <>
        <TopBar title="Evento" />
        <div className="flex-1 p-8">
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            Cargando...
          </div>
        </div>
      </>
    );
  }

  const canManage = !isVolunteer && activeOrgId === event.organizacion_id;
  const showRetroTab = event.estado === "finalizado";

  const tabs: { key: EventDetailTab; label: string; count?: number; icon: React.ReactNode }[] = [
    { key: "general", label: "General", icon: <Calendar className="w-4 h-4" /> },
    ...(canManage
      ? [
          {
            key: "solicitudes" as EventDetailTab,
            label: "Solicitudes",
            count: applications.length,
            icon: <Users className="w-4 h-4" />,
          },
          {
            key: "tareas" as EventDetailTab,
            label: "Tareas",
            count: tasks.length,
            icon: <ListTodo className="w-4 h-4" />,
          },
          {
            key: "equipos" as EventDetailTab,
            label: "Equipos",
            icon: <Users className="w-4 h-4" />,
          },
        ]
      : []),
    ...(showRetroTab ? [{ key: "retrospectiva" as EventDetailTab, label: "Retrospectiva", icon: <MessageSquare className="w-4 h-4" /> }] : []),
    ...(canManage ? [{ key: "config" as EventDetailTab, label: "Configuración", icon: <Settings className="w-4 h-4" /> }] : []),
  ];

  return (
    <>
      <TopBar title={event.nombre} />
      <div className="flex-1 p-8">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/events"
            className="p-2 rounded-full hover:opacity-80"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate">{event.nombre}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {org?.nombre ?? "Organización"}
            </p>
          </div>
        </div>

        {/* Header card */}
        <div
          className="p-6 rounded-2xl mb-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={statusColors[event.estado] ?? { background: "var(--bg-subtle)", color: "var(--text-muted)" }}
              >
                {statusLabels[event.estado] ?? event.estado}
              </span>
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-2">
                {event.estado === "borrador" && (
                  <button
                    onClick={() => updateStatusMutation.mutate("publicado")}
                    disabled={updateStatusMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                    style={{ background: "#22c55e", color: "white" }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Publicar
                  </button>
                )}
                {event.estado === "publicado" && (
                  <button
                    onClick={() => updateStatusMutation.mutate("en_curso")}
                    disabled={updateStatusMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                    style={{ background: "#3b82f6", color: "white" }}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Iniciar
                  </button>
                )}
                {event.estado === "en_curso" && (
                  <button
                    onClick={() => updateStatusMutation.mutate("finalizado")}
                    disabled={updateStatusMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                    style={{ background: "#3b82f6", color: "white" }}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    Finalizar
                  </button>
                )}
                {(event.estado === "borrador" || event.estado === "publicado" || event.estado === "en_curso") && (
                  <button
                    onClick={() => {
                      if (confirm("¿Cancelar este evento? Esta acción no se puede deshacer.")) {
                        updateStatusMutation.mutate("cancelado");
                      }
                    }}
                    disabled={updateStatusMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "#ef4444" }}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Cancelar evento
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <Calendar className="w-4 h-4 shrink-0" />
              {formatDateRange(event.fecha_inicio, event.fecha_fin)}
            </div>
            {(event.ubicacion_geo?.direccion || (event.ubicacion_geo?.lat != null && event.ubicacion_geo?.lng != null)) && (
              <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <MapPin className="w-4 h-4 shrink-0" />
                {event.ubicacion_geo.direccion || `${event.ubicacion_geo?.lat?.toFixed(5)}, ${event.ubicacion_geo?.lng?.toFixed(5)}`}
              </div>
            )}
            <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <Users className="w-4 h-4 shrink-0" />
              {approvedCount}/{event.cupo_maximo} voluntarios aprobados
            </div>
            <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <ListTodo className="w-4 h-4 shrink-0" />
              {tasks.length} tareas
              {tasks.filter((t) => t.estado === "in_progress").length > 0 &&
                ` (${tasks.filter((t) => t.estado === "in_progress").length} en progreso)`}
            </div>
          </div>

          {event.descripcion && (
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {event.descripcion}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {canManage && event.estado !== "borrador" && event.estado !== "cancelado" && (
              <Link
                href={`/dashboard/events/${eventId}/medallas`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                <Award className="w-3.5 h-3.5" />
                Medallas
              </Link>
            )}
            {showRetroTab && (
              <Link
                href={`/dashboard/events/${eventId}/retrospectiva`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Ver retrospectiva
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
              style={{
                background: tab === t.key ? "var(--bg-card)" : "transparent",
                color: tab === t.key ? "var(--text)" : "var(--text-muted)",
                boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,.15)" : undefined,
              }}
            >
              {t.icon}
              {t.label}
              {t.count != null && (
                <span className="text-xs opacity-80">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "solicitudes" && canManage && (
          <ApplicationsTab
            applications={applications}
            appFilter={appFilter}
            setAppFilter={setAppFilter}
            onApprove={(id, nota) => reviewAppMutation.mutate({ id, estado: "aprobado", nota })}
            onReject={(id, nota) => reviewAppMutation.mutate({ id, estado: "rechazado", nota })}
            isPending={reviewAppMutation.isPending}
          />
        )}

        {tab === "tareas" && canManage && (
          <TasksTab eventId={eventId} tasks={tasks} />
        )}

        {tab === "equipos" && canManage && (
          <div
            className="p-6 rounded-2xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Gestión de equipos próximamente.
            </p>
            <Link
              href={`/dashboard/teams?evento_id=${eventId}`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Ir a equipos
            </Link>
          </div>
        )}

        {tab === "retrospectiva" && showRetroTab && (
          <div
            className="p-6 rounded-2xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <Link
              href={`/dashboard/events/${eventId}/retrospectiva`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Abrir retrospectiva
            </Link>
          </div>
        )}

        {tab === "config" && canManage && (
          <div
            className="p-6 rounded-2xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Configuración del evento (editar, normas, etc.) próximamente.
            </p>
          </div>
        )}

        {tab === "general" && canManage && pendingCount > 0 && (
          <div
            className="p-4 rounded-xl mt-4"
            style={{ background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.3)" }}
          >
            <p className="text-sm font-medium">
              Tienes {pendingCount} solicitud{pendingCount !== 1 ? "es" : ""} pendiente{pendingCount !== 1 ? "s" : ""} de revisión.
            </p>
            <button
              onClick={() => setTab("solicitudes")}
              className="mt-2 text-sm font-medium underline"
            >
              Revisar solicitudes
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function ApplicationsTab({
  applications,
  appFilter,
  setAppFilter,
  onApprove,
  onReject,
  isPending,
}: {
  applications: EventApplication[];
  appFilter: string;
  setAppFilter: (v: string) => void;
  onApprove: (id: string, nota?: string) => void;
  onReject: (id: string, nota?: string) => void;
  isPending: boolean;
}) {
  const [notaMap, setNotaMap] = useState<Record<string, string>>({});

  const filters: { key: string; label: string }[] = [
    { key: "pendiente", label: "Pendientes" },
    { key: "aprobado", label: "Aprobados" },
    { key: "rechazado", label: "Rechazados" },
    { key: "todos", label: "Todos" },
  ];

  return (
    <div
      className="p-6 rounded-2xl"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setAppFilter(f.key)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              background: appFilter === f.key ? "var(--accent)" : "var(--bg-subtle)",
              color: appFilter === f.key ? "white" : "var(--text-muted)",
              border: appFilter === f.key ? "none" : "1px solid var(--border)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {applications.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border)" }}>
            <Inbox className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              No hay solicitudes en este filtro
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Las solicitudes de voluntarios aparecerán aquí cuando postulen al evento
            </p>
          </div>
        ) : (
          applications.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded-xl"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">
                    {app.usuario_nombre || app.usuario_email || `Usuario ${app.usuario_id.slice(0, 8)}…`}
                  </p>
                  {app.usuario_email && app.usuario_nombre && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{app.usuario_email}</p>
                  )}
                  {app.mensaje_solicitud && (
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                      &quot;{app.mensaje_solicitud}&quot;
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Postuló: {formatDate(app.fecha_solicitud)}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full shrink-0"
                  style={{
                    background:
                      app.estado === "aprobado" || app.estado === "asistio"
                        ? "rgba(34,197,94,.15)"
                        : app.estado === "rechazado"
                          ? "rgba(239,68,68,.15)"
                          : "var(--bg-card)",
                    color:
                      app.estado === "aprobado" || app.estado === "asistio"
                        ? "#22c55e"
                        : app.estado === "rechazado"
                          ? "#ef4444"
                          : "var(--text-muted)",
                  }}
                >
                  {appStatusLabels[app.estado] ?? app.estado}
                </span>
              </div>
              {app.estado === "pendiente" && (
                <div className="mt-3 flex flex-wrap gap-2 items-end">
                  <input
                    type="text"
                    placeholder="Nota interna (opcional)"
                    value={notaMap[app.id] ?? ""}
                    onChange={(e) => setNotaMap((p) => ({ ...p, [app.id]: e.target.value }))}
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  />
                  <button
                    onClick={() => onApprove(app.id, notaMap[app.id] || undefined)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ background: "#22c55e", color: "white" }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => onReject(app.id, notaMap[app.id] || undefined)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ background: "#ef4444", color: "white" }}
                  >
                    <X className="w-3.5 h-3.5" />
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TasksTab({ eventId, tasks }: { eventId: string; tasks: Task[] }) {
  return (
    <div
      className="p-6 rounded-2xl"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Tareas del evento</h3>
        <Link
          href={`/dashboard/tasks?evento_id=${eventId}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: "var(--accent)", color: "white" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva tarea
        </Link>
      </div>
      {tasks.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border)" }}>
          <ClipboardList className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            No hay tareas en este evento
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
            Crea tareas para organizar el trabajo de los voluntarios
          </p>
          <Link
            href={`/dashboard/tasks?evento_id=${eventId}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--accent)", color: "white" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva tarea
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-xl flex items-center justify-between"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              <div>
                <p className="font-medium text-sm">{t.titulo}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {t.dificultad && `Dificultad: ${t.dificultad}`}
                  {t.fecha_vencimiento && ` · Vence: ${formatDate(t.fecha_vencimiento)}`}
                  {t.vacantes != null && ` · ${t.vacantes} vacante${t.vacantes !== 1 ? "s" : ""}`}
                </p>
              </div>
              <Link
                href={`/dashboard/tasks/${t.id}`}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                Ver detalle
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
