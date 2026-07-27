"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { eventsApi, type Event, type EventApplication } from "@/features/events/api/eventsApi";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { tasksApi, type Task } from "@/features/tasks/api/tasksApi";
import { TopBar } from "@/shared/ui/Sidebar";
import { staffApi } from "@/features/staff/api/staffApi";
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
import { usePermissions } from "@/shared/hooks/usePermissions";

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
  const router = useRouter();
  const eventId = params.eventId as string;
  const { activeOrgId, user } = useAuthStore();
  const { isVolunteerExperience } = usePermissions();
  const isVolunteer = isVolunteerExperience;
  const qc = useQueryClient();
  const [tab, setTab] = useState<EventDetailTab>("general");
  const [appFilter, setAppFilter] = useState<string>("todos");

  const deleteEventMutation = useMutation({
    mutationFn: () => eventsApi.delete(eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento eliminado exitosamente");
      router.push("/dashboard/events");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail ?? "Error al eliminar el evento");
    },
  });

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

  const { data: members = [] } = useQuery({
    queryKey: ["org-members", event?.organizacion_id],
    queryFn: () => staffApi.list(event!.organizacion_id),
    enabled: !!event?.organizacion_id && tab === "config",
  });

  const addOrganizerMutation = useMutation({
    mutationFn: (userId: string) => eventsApi.addOrganizer(eventId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-applications", eventId] });
      toast.success("Organizador asignado al evento");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail ?? "Error al asignar organizador");
    },
  });

  const removeOrganizerMutation = useMutation({
    mutationFn: (userId: string) => eventsApi.removeOrganizer(eventId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-applications", eventId] });
      toast.success("Organizador removido del evento");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail ?? "Error al remover organizador");
    },
  });

  const [selectedOrganizerId, setSelectedOrganizerId] = useState("");

  const approvedCount = applications.filter((a) => a.estado === "aprobado" || a.estado === "asistio").length;
  const pendingCount = applications.filter((a) => a.estado === "pendiente").length;

  const assignedOrganizers = applications.filter((app) => {
    const member = members.find((m) => m.usuario_id === app.usuario_id);
    return member && (member.rol === "owner" || member.rol === "organizador");
  });

  const candidateOrganizers = members.filter((m) => {
    const isOrgAdmin = m.rol === "owner" || m.rol === "organizador";
    const isAlreadyAssigned = applications.some((app) => app.usuario_id === m.usuario_id);
    return isOrgAdmin && !isAlreadyAssigned;
  });

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
            <div className="space-y-1.5">
              <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <Users className="w-4 h-4 shrink-0" />
                <span>{approvedCount}/{event.cupo_maximo} voluntarios aprobados</span>
                {approvedCount < event.cupo_maximo ? (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{ color: "#b45309", background: "rgba(245, 158, 11, 0.12)" }}
                  >
                    Faltan {event.cupo_maximo - approvedCount} voluntarios
                  </span>
                ) : (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{ color: "#15803d", background: "rgba(34, 197, 94, 0.12)" }}
                  >
                    Cupo completo
                  </span>
                )}
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden ml-6"
                style={{ background: "var(--bg-subtle)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((approvedCount / event.cupo_maximo) * 100, 100)}%`,
                    background: approvedCount >= event.cupo_maximo
                      ? "#22c55e"
                      : "linear-gradient(90deg, #f59e0b, #f97316)",
                  }}
                />
              </div>
              {pendingCount > 0 && (
                <p className="text-xs ml-6" style={{ color: "var(--text-muted)" }}>
                  {pendingCount} solicitudes pendientes
                </p>
              )}
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
            className="p-6 rounded-2xl space-y-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div>
              <h3 className="font-semibold text-lg mb-1">Configuración del Evento</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Administra las opciones avanzadas y el ciclo de vida del evento.
              </p>
            </div>

            {/* Gestión de Organizadores Asignados */}
            <div className="pt-6">
              <h4 className="font-semibold text-base mb-1">Organizadores del Evento</h4>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                Asigna qué organizadores de la organización participarán y gestionarán las actividades de este evento específico.
              </p>

              {/* Formulario de Asignación */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <select
                  value={selectedOrganizerId}
                  onChange={(e) => setSelectedOrganizerId(e.target.value)}
                  className="flex-1 h-10 px-3 text-sm rounded-xl outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <option value="">Selecciona un organizador para asignar...</option>
                  {candidateOrganizers.map((m) => (
                    <option key={m.usuario_id} value={m.usuario_id}>
                      {m.nombre || m.email} ({m.email})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (!selectedOrganizerId) return;
                    addOrganizerMutation.mutate(selectedOrganizerId, {
                      onSuccess: () => setSelectedOrganizerId(""),
                    });
                  }}
                  disabled={!selectedOrganizerId || addOrganizerMutation.isPending}
                  className="h-10 px-4 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: selectedOrganizerId ? "var(--accent)" : "var(--bg-subtle)",
                    color: selectedOrganizerId ? "white" : "var(--text-muted)",
                    cursor: selectedOrganizerId ? "pointer" : "not-allowed",
                  }}
                >
                  {addOrganizerMutation.isPending ? "Asignando..." : "Asignar al Evento"}
                </button>
              </div>

              {/* Lista de Organizadores Asignados */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Organizadores Asignados ({assignedOrganizers.length})
                </h5>
                {assignedOrganizers.length === 0 ? (
                  <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
                    No hay organizadores adicionales asignados a este evento aún.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {assignedOrganizers.map((app) => {
                      const member = members.find((m) => m.usuario_id === app.usuario_id);
                      return (
                        <div
                          key={app.id}
                          className="flex items-center justify-between p-3 rounded-xl"
                          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {member?.nombre || app.usuario_nombre || "Miembro sin nombre"}
                            </p>
                            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                              {member?.email || app.usuario_email || "Sin email"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                            >
                              Organizador
                            </span>
                            <button
                              onClick={() => {
                                if (confirm(`¿Remover a este organizador de este evento?`)) {
                                  removeOrganizerMutation.mutate(app.usuario_id);
                                }
                              }}
                              disabled={removeOrganizerMutation.isPending}
                              className="text-xs text-red-400 hover:text-red-500 transition-colors"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-6" style={{ borderColor: "var(--border)" }}>
              <div className="p-4 rounded-xl space-y-4" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div>
                  <h4 className="font-semibold text-sm text-red-500 mb-1" style={{ color: "#ef4444" }}>Zona de Peligro</h4>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Una vez que elimines un evento, no podrás recuperar sus datos. 
                    Por políticas del Plan y de la Plataforma, solo se pueden eliminar eventos en estado <strong>Borrador</strong> y que no tengan tareas asociadas para evitar el abuso del cupo de eventos y mantener la consistencia histórica.
                  </p>
                </div>
                {event.estado === "borrador" || !event.temporada_id ? (
                  <button
                    onClick={() => {
                      const msg = !event.temporada_id 
                        ? "Este evento no está ligado a ninguna temporada (es huérfano). Al eliminarlo se borrarán en cascada todas sus tareas, equipos y postulaciones. ¿Estás seguro?"
                        : "¿Estás completamente seguro de que deseas eliminar este evento? Esta acción es irreversible.";
                      if (confirm(msg)) {
                        deleteEventMutation.mutate();
                      }
                    }}
                    disabled={deleteEventMutation.isPending}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ backgroundColor: "#ef4444" }}
                  >
                    {deleteEventMutation.isPending ? "Eliminando..." : "Eliminar Evento"}
                  </button>
                ) : (
                  <div className="text-xs font-medium p-3 rounded-lg" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                    No se puede eliminar este evento porque su estado es <strong>{statusLabels[event.estado]}</strong> y pertenece a una temporada activa. Si deseas darlo de baja, puedes usar la opción de <strong>Cancelar evento</strong> en la cabecera.
                  </div>
                )}
              </div>
            </div>
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
                    {app.usuario_nombre || app.usuario_email || "Solicitante"}
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
