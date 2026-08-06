"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Play,
  Flag,
  Ban,
  Inbox,
  ClipboardList,
  Eye,
} from "lucide-react";
import { formatDate } from "@/shared/utils/utils";
import { useState } from "react";
import { toast } from "sonner";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { Modal } from "@/shared/ui/Modal";
import { gamificationApi, type Badge, type CompetitiveProfile } from "@/features/gamification/api/gamificationApi";
import { ProfileBanner } from "@/features/gamification/ui/ProfileBanner";
import { BadgeGrid } from "@/features/gamification/ui/BadgeGrid";

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { activeOrgId } = useAuthStore();
  const { isVolunteerExperience, isOwner } = usePermissions();
  const isVolunteer = isVolunteerExperience;
  const qc = useQueryClient();
  const [tab, setTab] = useState<EventDetailTab>(searchParams.get("tab") === "solicitudes" ? "solicitudes" : "general");
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
    enabled: !!eventId && !isVolunteer && (tab === "solicitudes" || tab === "general"),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["event-participants", eventId],
    queryFn: () => eventsApi.listParticipants(eventId),
    enabled: !!eventId,
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

  const updateApplicationsMutation = useMutation({
    mutationFn: (enabled: boolean) => eventsApi.update(eventId, { permite_postulaciones_en_curso: enabled }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event", eventId] }); qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Postulaciones actualizadas"); },
    onError: () => toast.error("No se pudo actualizar las postulaciones"),
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

  const approvedCount = participants.length;
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
          className="overflow-hidden rounded-2xl mb-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="h-52 bg-cover bg-center" style={{ backgroundImage: event.imagen_url ? `linear-gradient(0deg, rgba(0,0,0,.62), rgba(0,0,0,.06)), url(${event.imagen_url})` : "linear-gradient(135deg, var(--accent), #312e81)" }} />
          <div className="p-6">
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

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold">Voluntarios en este evento</p>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{participants.length} confirmados</span>
            </div>
            {participants.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aún no hay voluntarios confirmados.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {participants.slice(0, 10).map((participant) => (
                  <Link key={participant.usuario_id} href={`/voluntario/${participant.usuario_id}?returnTo=${encodeURIComponent(`/dashboard/events/${eventId}`)}`} className="flex items-center gap-2 pr-3 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                    <span className="w-9 h-9 rounded-full bg-cover bg-center flex items-center justify-center text-xs font-bold" style={{ backgroundImage: participant.avatar_url ? `url(${participant.avatar_url})` : undefined, backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>{participant.avatar_url ? "" : participant.nombre.slice(0, 1).toUpperCase()}</span>
                    <span className="text-xs"><strong className="block">{participant.nombre}</strong><span style={{ color: "var(--text-muted)" }}>{participant.xp_total} XP · {participant.elo_score} ELO</span></span>
                  </Link>
                ))}
              </div>
            )}
          </div>

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
            organizacionId={event.organizacion_id}
            onReview={(id, estado, nota) => reviewAppMutation.mutateAsync({ id, estado, nota })}
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

            <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <input type="checkbox" id="event-live-applications" checked={event.permite_postulaciones_en_curso !== false} onChange={(e) => updateApplicationsMutation.mutate(e.target.checked)} disabled={updateApplicationsMutation.isPending} className="mt-1" />
              <label htmlFor="event-live-applications" className="text-sm cursor-pointer"><span className="font-medium">Permitir postulaciones mientras el evento está en curso</span><span className="block text-xs mt-1" style={{ color: "var(--text-muted)" }}>Activalo cuando necesites cubrir vacantes urgentes.</span></label>
            </div>

            {isOwner && <>
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
            </>}
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
  organizacionId,
  onReview,
  isPending,
}: {
  applications: EventApplication[];
  appFilter: string;
  setAppFilter: (v: string) => void;
  organizacionId: string;
  onReview: (id: string, estado: "aprobado" | "rechazado", nota?: string) => Promise<unknown>;
  isPending: boolean;
}) {
  const [selectedApplication, setSelectedApplication] = useState<EventApplication | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [confirmation, setConfirmation] = useState<"aprobado" | "rechazado" | null>(null);
  const { data: applicantProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ["event-applicant-profile", selectedApplication?.usuario_id, organizacionId],
    queryFn: () => gamificationApi.getProfile(selectedApplication!.usuario_id, organizacionId),
    enabled: !!selectedApplication?.usuario_id,
  });

  const { data: applicantBadges = [] } = useQuery({
    queryKey: ["event-applicant-badges", selectedApplication?.usuario_id, organizacionId],
    queryFn: () => gamificationApi.getBadges(selectedApplication!.usuario_id, organizacionId),
    enabled: !!selectedApplication?.usuario_id,
  });

  const closeProfile = () => {
    setSelectedApplication(null);
    setResponseNote("");
    setConfirmation(null);
  };

  const confirmReview = () => {
    if (!selectedApplication || !confirmation) return;
    void onReview(selectedApplication.id, confirmation, responseNote.trim() || undefined)
      .then(closeProfile)
      .catch(() => {});
  };

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
            <button
              type="button"
              key={app.id}
              onClick={() => {
                setSelectedApplication(app);
                setResponseNote("");
              }}
              className="w-full p-4 rounded-xl text-left transition-opacity hover:opacity-80"
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
              <span className="mt-3 flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--accent)" }}>
                <Eye className="w-3.5 h-3.5" /> Ver perfil y revisar solicitud
              </span>
            </button>
          ))
        )}
      </div>

      <Modal
        open={!!selectedApplication}
        onClose={closeProfile}
        title="Perfil del postulante"
        description="Revisá su perfil gamificado y su mensaje antes de decidir sobre su participación en el evento."
        size="xl"
        scrollable
        footer={selectedApplication?.estado === "pendiente" ? <>
          <button onClick={() => setConfirmation("rechazado")} disabled={isPending} className="px-4 py-2 rounded-xl text-sm" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>Rechazar</button>
          <button onClick={() => setConfirmation("aprobado")} disabled={isPending} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}>Aprobar</button>
        </> : undefined}
      >
        {loadingProfile ? (
          <div className="h-72 rounded-2xl animate-pulse" style={{ background: "var(--bg-subtle)" }} />
        ) : applicantProfile ? (
          <div className="space-y-5">
            <ProfileBanner profile={applicantProfile as CompetitiveProfile} showcase />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ProfileMetric label="ELO" value={applicantProfile.elo_score ?? applicantProfile.puntos_elo ?? 0} />
              <ProfileMetric label="Experiencia" value={`${applicantProfile.xp_total ?? 0} XP`} />
              <ProfileMetric label="Tareas aprobadas" value={applicantProfile.tareas_completadas ?? 0} />
              <ProfileMetric label="Racha" value={applicantProfile.racha_entregas ?? 0} />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Medallas obtenidas</h3>
              <BadgeGrid badges={applicantBadges as Badge[]} maxVisible={8} />
            </div>
            {selectedApplication?.mensaje_solicitud && <div className="p-4 rounded-xl text-sm" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}><p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Mensaje de postulación</p>{selectedApplication.mensaje_solicitud}</div>}
            {selectedApplication?.estado === "pendiente" && <div><label className="block text-sm font-medium mb-2">Mensaje para el voluntario <span className="font-normal" style={{ color: "var(--text-muted)" }}>(opcional)</span></label><textarea value={responseNote} onChange={(e) => setResponseNote(e.target.value)} rows={3} maxLength={2000} placeholder="Ej. Te esperamos en el evento. / Motivo de la decisión." className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }} /></div>}
          </div>
        ) : <p className="text-sm" style={{ color: "var(--text-muted)" }}>No se pudo cargar el perfil de este postulante.</p>}
      </Modal>

      <Modal
        open={!!confirmation && !!selectedApplication}
        onClose={() => setConfirmation(null)}
        title={confirmation === "aprobado" ? "Confirmar aprobación" : "Confirmar rechazo"}
        description={confirmation === "aprobado" ? "El voluntario será añadido al evento y recibirá una notificación." : "El voluntario recibirá una notificación con la decisión y tu mensaje, si lo escribiste."}
        footer={<><button onClick={() => setConfirmation(null)} className="px-4 py-2 rounded-xl text-sm" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>Volver</button><button onClick={confirmReview} disabled={isPending} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: confirmation === "aprobado" ? "var(--accent)" : "#dc2626", color: "white" }}>{isPending ? "Procesando…" : confirmation === "aprobado" ? "Sí, aprobar" : "Sí, rechazar"}</button></>}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Esta acción cambiará la solicitud del evento. Revisá el perfil antes de confirmar.</p>
      </Modal>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="p-3 rounded-xl" style={{ background: "var(--bg-subtle)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p><p className="text-xl font-bold mt-1">{value}</p></div>;
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
