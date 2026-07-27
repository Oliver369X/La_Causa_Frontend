"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { useCelebrationStore } from "@/shared/store/celebrationStore";
import { tasksApi, type Task } from "@/features/tasks/api/tasksApi";
import {
  assignmentsApi,
  type Assignment,
  type Delivery,
  type DeliveryReviewResponse,
} from "@/features/assignments/api/assignmentsApi";
import { eventsApi } from "@/features/events/api/eventsApi";
import { volunteersApi, filterVolunteerMembers } from "@/features/volunteers/api/volunteersApi";
import { subscriptionsApi } from "@/features/subscriptions/api/subscriptionsApi";
import { TopBar } from "@/shared/ui/Sidebar";
import Link from "next/link";
import { ArrowLeft, UserPlus, Clock, AlertTriangle, Check, X, Search, Sparkles, AlertCircle, CreditCard } from "lucide-react";
import { formatDate, parseUTC, toLocalDateTimeString } from "@/shared/utils/utils";
import { useState, useEffect } from "react";
import { TaskInstructionsDisplay } from "@/features/tasks/ui/TaskInstructionsDisplay";
import { extractApiDetail } from "@/shared/utils/apiError";
import { toast } from "sonner";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useSidebarLayoutStore } from "@/shared/store/sidebarLayoutStore";

const dificultadColors: Record<string, { bg: string; color: string }> = {
  baja: { bg: "rgba(34,197,94,.15)", color: "#22c55e" },
  media: { bg: "rgba(234,179,8,.15)", color: "#eab308" },
  alta: { bg: "rgba(249,115,22,.15)", color: "#f97316" },
  urgente: { bg: "rgba(239,68,68,.15)", color: "#ef4444" },
};

const assignStatusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  en_revision: "En revisión",
  aprobada: "Aprobada",
  devuelta: "Devuelta",
  completada: "Completada",
};

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const { activeOrgId, user } = useAuthStore();
  const { isVolunteerExperience } = usePermissions();
  const isVolunteer = isVolunteerExperience;
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"detalle" | "asignar">("detalle");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [assigningMultiple, setAssigningMultiple] = useState(false);
  const setSidebarCollapsed = useSidebarLayoutStore((s) => s.setCollapsed);

  useEffect(() => {
    if (showPlansModal) {
      setSidebarCollapsed(true);
    }
  }, [showPlansModal, setSidebarCollapsed]);

  const { data: task, isLoading: loadingTask, isError: taskLoadError } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => tasksApi.getById(taskId),
    enabled: !!taskId,
  });

  const { data: event } = useQuery({
    queryKey: ["event", task?.evento_id],
    queryFn: () => eventsApi.getById(task!.evento_id),
    enabled: !!task?.evento_id,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["task-assignments", taskId],
    queryFn: () => assignmentsApi.listByTask(taskId),
    enabled: !!taskId && !isVolunteer,
  });

  const canManage = !isVolunteer && activeOrgId && event?.organizacion_id === activeOrgId;

  // Cargar miembros de la organización para la pestaña de asignación
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["members", activeOrgId],
    queryFn: () => volunteersApi.listMembers(activeOrgId!),
    enabled: !!activeOrgId && !!canManage,
  });

  // Cargar inscritos en el evento para advertir o matricular automáticamente
  const { data: applications = [], isLoading: loadingApplications } = useQuery({
    queryKey: ["event-applications", task?.evento_id],
    queryFn: () => eventsApi.listApplications(task!.evento_id),
    enabled: !!task?.evento_id && !!canManage,
  });

  const editTaskMutation = useMutation({
    mutationFn: (data: Parameters<typeof tasksApi.update>[1]) =>
      tasksApi.update(taskId, data),
    onSuccess: () => {
      toast.success("Tarea actualizada correctamente.");
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setShowEditModal(false);
    },
    onError: (err) => {
      toast.error(extractApiDetail(err, "No se pudo actualizar la tarea."));
    },
  });

  if (!taskId) return null;

  if (loadingTask) {
    return (
      <>
        <TopBar title="Tarea" />
        <div className="flex-1 p-8">
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            Cargando...
          </div>
        </div>
      </>
    );
  }

  if (taskLoadError || !task) {
    return (
      <>
        <TopBar title="Tarea" />
        <div className="flex-1 p-8">
          <div className="rounded-2xl p-6 max-w-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h2 className="font-semibold">No se pudo cargar la tarea</h2>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              El enlace puede estar desactualizado o la tarea ya no existe. Regresa al tablero e inténtalo nuevamente.
            </p>
            <Link
              href="/dashboard/tasks"
              className="inline-flex mt-4 px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              Volver al tablero
            </Link>
          </div>
        </div>
      </>
    );
  }

  const isOverdue =
    task.fecha_vencimiento &&
    task.estado !== "completed" &&
    task.estado !== "cancelled" &&
    parseUTC(task.fecha_vencimiento) < new Date();
  const approvedInEvent = new Set(
    applications
      .filter((a) => a.estado === "aprobado" || a.estado === "asistio")
      .map((a) => a.usuario_id)
  );
  const alreadyAssigned = new Set(assignments.map((a) => a.usuario_id).filter(Boolean) as string[]);

  // Filtrar candidatos voluntarios según buscador
  const allVolunteerCandidates = filterVolunteerMembers(members);
  const filteredCandidates = allVolunteerCandidates.filter((m) => {
    const query = searchQuery.toLowerCase();
    const nombre = (m.usuario_nombre || "").toLowerCase();
    const email = (m.usuario_email || "").toLowerCase();
    return nombre.includes(query) || email.includes(query);
  });

  const handleAssignMultiple = async () => {
    if (selectedUserIds.length === 0) return;
    setAssigningMultiple(true);
    try {
      await Promise.all(
        selectedUserIds.map((uId) =>
          assignmentsApi.assign(taskId, { tipo: "individual", usuario_id: uId })
        )
      );
      toast.success("Voluntarios asignados exitosamente a la tarea.");
      setSelectedUserIds([]);
      qc.invalidateQueries({ queryKey: ["task-assignments", taskId] });
      qc.invalidateQueries({ queryKey: ["event-applications", task.evento_id] });
      setActiveTab("detalle");
    } catch (err) {
      toast.error(extractApiDetail(err, "No se pudieron asignar algunos voluntarios."));
    } finally {
      setAssigningMultiple(false);
    }
  };

  return (
    <>
      <TopBar title={task.titulo} />
      <div className="flex-1 p-6 md:p-8">
        {/* Cabecera / Navegación */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/dashboard/tasks${event?.id ? `?evento_id=${event.id}` : ""}`}
            className="p-2 rounded-full hover:opacity-80 transition-all"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{task.titulo}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {event?.nombre ?? "Evento"}
            </p>
          </div>
        </div>

        {/* Sistema de Pestañas Premium */}
        {canManage && (
          <div className="flex border-b mb-6" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setActiveTab("detalle")}
              className="px-6 py-3 text-sm font-semibold transition-all relative"
              style={{
                color: activeTab === "detalle" ? "var(--text)" : "var(--text-muted)",
              }}
            >
              Detalle y Entregas
              {activeTab === "detalle" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--accent)" }} />
              )}
            </button>
            <button
              onClick={() => setActiveTab("asignar")}
              className="px-6 py-3 text-sm font-semibold transition-all relative flex items-center gap-1.5"
              style={{
                color: activeTab === "asignar" ? "var(--text)" : "var(--text-muted)",
              }}
            >
              <UserPlus className="w-4 h-4" />
              Asignar Voluntarios
              {activeTab === "asignar" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--accent)" }} />
              )}
            </button>
          </div>
        )}

        {/* PESTAÑA 1: DETALLE DE TAREA */}
        {activeTab === "detalle" && (
          <div className="space-y-6">
            <div
              className="p-6 rounded-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="flex justify-between items-center mb-4 gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {task.dificultad && (
                    <span
                      className="text-xs px-2 py-1 rounded-full capitalize font-medium"
                      style={dificultadColors[task.dificultad] ?? { background: "var(--bg-subtle)", color: "var(--text-muted)" }}
                    >
                      {task.dificultad}
                    </span>
                  )}
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    background: task.estado === "completed" ? "rgba(34,197,94,.15)" : "var(--bg-subtle)",
                    color: task.estado === "completed" ? "#22c55e" : "var(--text-muted)",
                  }}
                >
                  {task.estado === "pending" && "Pendiente"}
                  {task.estado === "in_progress" && "En progreso"}
                  {task.estado === "completed" && "Completada"}
                  {task.estado === "cancelled" && "Cancelada"}
                </span>
                {task.vacantes != null && (
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    {task.vacantes} vacante{task.vacantes !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {canManage && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border transition-all hover:scale-[1.02] shrink-0"
                  style={{ borderColor: "var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }}
                >
                  Editar Tarea
                </button>
              )}
            </div>

              {task.fecha_vencimiento && (
                <div className="flex items-center gap-2 text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  <Clock className="w-4 h-4" />
                  Vence: {formatDate(task.fecha_vencimiento)}
                  {isOverdue && (
                    <span className="flex items-center gap-1 text-red-500 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Vencida
                    </span>
                  )}
                </div>
              )}

              {task.descripcion && (
                <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {task.descripcion}
                </p>
              )}

              {task.instrucciones?.trim() && (
                <div className="mb-4">
                  <TaskInstructionsDisplay text={task.instrucciones} heading="Instrucciones para voluntarios" />
                </div>
              )}

              <div className="flex gap-2 mt-2">
                {canManage && (
                  <button
                    onClick={() => setActiveTab("asignar")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-all"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Asignar voluntario
                  </button>
                )}
                <Link
                  href={`/dashboard/events/${task.evento_id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:bg-black/5 transition-all"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  Ver evento
                </Link>
              </div>
            </div>

            {/* Asignaciones actuales */}
            {canManage && assignments.length > 0 && (
              <div
                className="p-6 rounded-2xl"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <h3 className="font-bold mb-4">Asignaciones</h3>
                <div className="space-y-4">
                  {assignments.map((a) => (
                    <AssignmentCard key={a.id} assignment={a} taskId={taskId} taskTitulo={task.titulo} />
                  ))}
                </div>
              </div>
            )}

            {canManage && assignments.length === 0 && (
              <div
                className="p-6 rounded-2xl text-center"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No hay asignaciones. Asigna voluntarios miembros de tu organización.
                </p>
                <button
                  onClick={() => setActiveTab("asignar")}
                  className="mt-3 text-sm font-semibold underline hover:opacity-85"
                  style={{ color: "var(--accent)" }}
                >
                  Asignar voluntario ahora
                </button>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: ASIGNACIÓN DE VOLUNTARIOS (CHECKLIST MULTI + PREMIUN) */}
        {activeTab === "asignar" && canManage && (
          <div className="space-y-6 max-w-5xl mx-auto w-full">
            {/* Banner Premium Horizontal */}
            <div
              className="p-5 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border"
              style={{
                background: "linear-gradient(135deg, rgba(var(--accent-rgb), 0.1) 0%, rgba(var(--accent-rgb), 0.02) 100%)",
                borderColor: "var(--accent)",
              }}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                    Recomendación Inteligente (Premium)
                  </span>
                </div>
                <h4 className="text-sm font-bold">Motor de Matching por Habilidades</h4>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Analiza automáticamente los perfiles de los voluntarios y ordénalos por nivel de habilidades compatibles con esta tarea.
                </p>
              </div>
              <button
                onClick={() => setShowPlansModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] shrink-0"
                style={{ background: "var(--accent)" }}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Recomendar con IA
              </button>
            </div>

            {/* Buscador y Checklist de Voluntarios (Ancho completo) */}
            <div
              className="p-6 rounded-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <h3 className="font-bold mb-2">Selección de Voluntarios</h3>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Selecciona uno o varios voluntarios para asignarlos a esta tarea. Si aún no participan en el evento relacionado, la plataforma los registrará automáticamente.
              </p>

              {/* Buscador */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 w-4 h-4 opacity-50" />
                <input
                  type="text"
                  placeholder="Buscar voluntario por nombre o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border focus:outline-none transition-all"
                  style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
                />
              </div>

              {loadingMembers ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando voluntarios…</p>
              ) : filteredCandidates.length === 0 ? (
                <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>
                  No se encontraron voluntarios candidatos. Prueba con otro filtro.
                </p>
              ) : (
                <div className="space-y-2 mb-6">
                  {filteredCandidates.map((m) => {
                    const isAssigned = alreadyAssigned.has(m.usuario_id);
                    return (
                      <label
                        key={m.usuario_id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isAssigned ? "opacity-75 cursor-not-allowed" : "cursor-pointer hover:bg-black/5"
                        }`}
                        style={{
                          background: isAssigned ? "var(--bg-subtle)" : "var(--bg-card)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <input
                          type="checkbox"
                          disabled={isAssigned}
                          checked={isAssigned || selectedUserIds.includes(m.usuario_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds((prev) => [...prev, m.usuario_id]);
                            } else {
                              setSelectedUserIds((prev) => prev.filter((id) => id !== m.usuario_id));
                            }
                          }}
                          className="w-4 h-4 accent-[var(--accent)]"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium flex items-center gap-2">
                            {m.usuario_nombre || m.usuario_email || "Voluntario"}
                            {isAssigned ? (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                                style={{ background: "rgba(34,197,94,.1)", color: "#22c55e" }}
                              >
                                Ya asignado
                              </span>
                            ) : (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                                style={{ background: "rgba(59,130,246,.1)", color: "#3b82f6" }}
                              >
                                Disponible
                              </span>
                            )}
                          </span>
                          {!approvedInEvent.has(m.usuario_id) && (
                            <span className="block text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                              Se matriculará automáticamente en el evento `{event?.nombre}`
                            </span>
                          )}
                        </div>
                        {m.usuario_email && (
                          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                            {m.usuario_email}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  onClick={handleAssignMultiple}
                  disabled={selectedUserIds.length === 0 || assigningMultiple}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all flex items-center gap-2"
                  style={{ background: "var(--accent)" }}
                >
                  {assigningMultiple ? "Asignando..." : `Asignar a los (${selectedUserIds.length}) seleccionados`}
                </button>
                <button
                  onClick={() => {
                    setSelectedUserIds([]);
                    setActiveTab("detalle");
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showPlansModal && <PlansModal onClose={() => setShowPlansModal(false)} />}
        {showEditModal && (
          <EditTaskModal
            task={task}
            onClose={() => setShowEditModal(false)}
            onSave={(data) => editTaskMutation.mutate(data)}
            isSaving={editTaskMutation.isPending}
          />
        )}
      </div>
    </>
  );
}

function AssignmentCard({
  assignment,
  taskId,
  taskTitulo,
}: {
  assignment: Assignment;
  taskId: string;
  taskTitulo: string;
}) {
  const qc = useQueryClient();
  const { data: deliveries = [] } = useQuery({
    queryKey: ["deliveries", assignment.id],
    queryFn: () => assignmentsApi.listDeliveriesByAssignment(assignment.id),
    enabled: !!assignment.id,
  });

  const pendingDelivery = deliveries.find((d) => d.estado === "pendiente_revision" || !d.fecha_revision);

  return (
    <div
      className="p-4 rounded-xl"
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {assignment.usuario_nombre || assignment.usuario_email || "Participante"}
        </span>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            background:
              assignment.estado === "aprobada" || assignment.estado === "completada"
                ? "rgba(34,197,94,.15)"
                : assignment.estado === "devuelta"
                  ? "rgba(249,115,22,.15)"
                  : "var(--bg-card)",
            color:
              assignment.estado === "aprobada" || assignment.estado === "completada"
                ? "#22c55e"
                : assignment.estado === "devuelta"
                  ? "#f97316"
                  : "var(--text-muted)",
          }}
        >
          {assignStatusLabels[assignment.estado] ?? assignment.estado}
        </span>
      </div>
      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Asignado: {formatDate(assignment.fecha_asignacion)}
      </p>
      {deliveries.length > 0 && (
        <div className="mt-2 space-y-2">
          {deliveries.map((d) => (
            <DeliveryItem
              key={d.id}
              delivery={d}
              assignmentId={assignment.id}
              tareaTitulo={taskTitulo}
            />
          ))}
        </div>
      )}
      {pendingDelivery && (
        <Link
          href={`/dashboard/tasks/${taskId}?review=${assignment.id}`}
          className="inline-block mt-2 text-xs font-medium"
          style={{ color: "var(--accent)" }}
        >
          Revisar entrega →
        </Link>
      )}
    </div>
  );
}

function DeliveryItem({
  delivery,
  assignmentId,
  tareaTitulo,
}: {
  delivery: Delivery;
  assignmentId: string;
  tareaTitulo: string;
}) {
  const [showReview, setShowReview] = useState(false);
  const qc = useQueryClient();
  const showCelebration = useCelebrationStore((s) => s.show);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");

  const reviewMutation = useMutation({
    mutationFn: (estado: "aprobada" | "rechazada") =>
      assignmentsApi.reviewDelivery(delivery.id, {
        estado,
        feedback,
        rating: estado === "aprobada" ? rating : undefined,
      }),
    onSuccess: (data: DeliveryReviewResponse, estado) => {
      qc.invalidateQueries({ queryKey: ["deliveries", assignmentId] });
      qc.invalidateQueries({ queryKey: ["task-assignments"] });
      setShowReview(false);
      if (
        estado === "aprobada" &&
        (data.delta_xp != null || data.delta_elo != null || data.subio_nivel || (data.nuevas_insignias?.length ?? 0) > 0)
      ) {
        showCelebration({
          tarea_titulo: tareaTitulo,
          delta_elo: data.delta_elo,
          delta_xp: data.delta_xp,
          nuevas_insignias: data.nuevas_insignias,
          subio_nivel: data.subio_nivel,
          nivel_actual: data.nivel_actual,
          xp_en_nivel: data.xp_en_nivel,
          xp_para_siguiente_nivel: data.xp_para_siguiente_nivel,
        });
      }
    },
    onError: (err) => {
      toast.error(extractApiDetail(err, "No se pudo revisar la entrega."));
    },
  });

  const needsReview = delivery.estado === "pendiente_revision" || !delivery.fecha_revision;

  return (
    <div className="p-3 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs">
          Intento #{delivery.numero_intento} · {formatDate(delivery.fecha_entrega)}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{
            background:
              delivery.estado === "aprobada"
                ? "rgba(34,197,94,.15)"
                : delivery.estado === "rechazada"
                  ? "rgba(239,68,68,.15)"
                  : "var(--bg-subtle)",
            color:
              delivery.estado === "aprobada"
                ? "#22c55e"
                : delivery.estado === "rechazada"
                  ? "#ef4444"
                  : "var(--text-muted)",
          }}
        >
          {delivery.estado === "aprobada" && "Aprobada"}
          {delivery.estado === "rechazada" && "Rechazada"}
          {delivery.estado === "pendiente_revision" && "Pendiente"}
        </span>
      </div>
      {delivery.evidencia_url && (
        <a
          href={delivery.evidencia_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-xs underline"
          style={{ color: "var(--accent)" }}
        >
          Ver evidencia
        </a>
      )}
      {delivery.comentario && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          &quot;{delivery.comentario}&quot;
        </p>
      )}
      {needsReview && (
        <div className="mt-2">
          {!showReview ? (
            <button
              onClick={() => setShowReview(true)}
              className="text-xs font-medium"
              style={{ color: "var(--accent)" }}
            >
              Revisar entrega
            </button>
          ) : (
            <div className="mt-2 space-y-2">
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                  Rating (1-5)
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1 rounded text-xs"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} ⭐</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                  Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1 rounded text-xs resize-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => reviewMutation.mutate("aprobada")}
                  disabled={reviewMutation.isPending}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
                  style={{ background: "#22c55e", color: "white" }}
                >
                  <Check className="w-3 h-3" /> Aprobar
                </button>
                <button
                  onClick={() => reviewMutation.mutate("rechazada")}
                  disabled={reviewMutation.isPending}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
                  style={{ background: "#ef4444", color: "white" }}
                >
                  <X className="w-3 h-3" /> Rechazar
                </button>
                <button
                  onClick={() => setShowReview(false)}
                  className="px-2 py-1 rounded text-xs"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlansModal({ onClose }: { onClose: () => void }) {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["active-plans"],
    queryFn: () => subscriptionsApi.listPlans(),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full p-8 rounded-3xl shadow-2xl relative overflow-y-auto max-h-[90vh] no-scrollbar"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-black/5"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider" style={{ background: "rgba(var(--accent-rgb), 0.15)", color: "var(--accent)" }}>
            Planes y Precios
          </span>
          <h3 className="text-2xl font-bold mt-2">Lleva tu organización al siguiente nivel</h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Desbloquea la potencia de la Inteligencia Artificial y la Gamificación Avanzada.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
            Cargando planes activos...
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
            No hay planes activos configurados en el sistema.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isPro = plan.nombre.toLowerCase().includes("pro");
              const isGratis = plan.precio_mensual === 0;
              return (
                <div
                  key={plan.id}
                  className="p-6 rounded-2xl flex flex-col justify-between relative border transition-all hover:shadow-md"
                  style={{
                    background: "var(--bg-subtle)",
                    borderColor: isPro ? "var(--accent)" : "var(--border)",
                    borderWidth: isPro ? "2px" : "1px",
                  }}
                >
                  {isPro && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white px-3 py-0.5 rounded-full"
                      style={{ background: "var(--accent)" }}
                    >
                      RECOMENDADO
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-lg flex items-center gap-1">
                      {plan.nombre} {isPro && <span className="text-xs">✨</span>}
                    </h4>
                    {plan.descripcion && (
                      <p className="text-xs mb-4 mt-1" style={{ color: "var(--text-muted)" }}>
                        {plan.descripcion}
                      </p>
                    )}
                    <div className="text-3xl font-bold mb-4">
                      ${plan.precio_mensual}{" "}
                      <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                        / mes
                      </span>
                    </div>
                    <ul className="text-xs space-y-2 mb-6" style={{ color: "var(--text-muted)" }}>
                      <li className="flex items-center gap-1.5">✓ Hasta {plan.max_voluntarios} miembros</li>
                      <li className="flex items-center gap-1.5">✓ Hasta {plan.max_eventos} eventos / mes</li>
                      <li className="flex items-center gap-1.5">✓ Hasta {plan.max_tareas_mes} tareas / mes</li>
                      {plan.caracteristicas?.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          ✓ {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {isGratis ? (
                    <button
                      onClick={onClose}
                      className="w-full py-2.5 rounded-xl text-xs font-medium transition-all hover:bg-black/5"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                      Plan Activo
                    </button>
                  ) : (
                    <Link
                      href="/dashboard/subscriptions"
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-center text-white block hover:opacity-90 transition-all"
                      style={{ background: "var(--accent)" }}
                    >
                      Suscribirse
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>
    </div>
  );
}

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}

function EditTaskModal({ task, onClose, onSave, isSaving }: EditTaskModalProps) {
  const [titulo, setTitulo] = useState(task.titulo);
  const [descripcion, setDescripcion] = useState(task.descripcion || "");
  const [instrucciones, setInstrucciones] = useState(task.instrucciones || "");
  const [dificultad, setDificultad] = useState(task.dificultad || "media");
  const [vacantes, setVacantes] = useState(task.vacantes || 1);
  const [multiplicadorElo, setMultiplicadorElo] = useState(task.multiplicador_elo || 1);
  const [fechaVencimiento, setFechaVencimiento] = useState(
    toLocalDateTimeString(task.fecha_vencimiento)
  );
  const [requiereRevisionManual, setRequiereRevisionManual] = useState(task.requiere_revision_manual || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    onSave({
      titulo,
      descripcion: descripcion || null,
      instrucciones: instrucciones || null,
      dificultad,
      vacantes: Number(vacantes),
      multiplicador_elo: Number(multiplicadorElo),
      fecha_vencimiento: fechaVencimiento ? new Date(fechaVencimiento).toISOString() : null,
      requiere_revision_manual: requiereRevisionManual,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="max-w-xl w-full p-8 rounded-3xl shadow-2xl relative overflow-y-auto max-h-[90vh] no-scrollbar space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-black/5"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider" style={{ background: "rgba(var(--accent-rgb), 0.15)", color: "var(--accent)" }}>
            Configuración
          </span>
          <h3 className="text-xl font-bold mt-2">Editar Tarea</h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Actualiza los parámetros, plazos o el multiplicador de ELO de la tarea.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border focus:outline-none transition-all"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border focus:outline-none transition-all resize-none"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Instrucciones de Entrega</label>
            <textarea
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border focus:outline-none transition-all resize-none"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Dificultad</label>
              <select
                value={dificultad}
                onChange={(e) => setDificultad(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border focus:outline-none transition-all"
                style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Fecha de Vencimiento</label>
              <input
                type="datetime-local"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border focus:outline-none transition-all"
                style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Vacantes</label>
              <input
                type="number"
                min={1}
                max={100}
                value={vacantes}
                onChange={(e) => setVacantes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border focus:outline-none transition-all"
                style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Multiplicador ELO</label>
              <input
                type="number"
                step={0.1}
                min={0.1}
                max={5.0}
                value={multiplicadorElo}
                onChange={(e) => setMultiplicadorElo(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border focus:outline-none transition-all"
                style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={requiereRevisionManual}
              onChange={(e) => setRequiereRevisionManual(e.target.checked)}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>Requiere revisión manual del organizador</span>
          </label>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02]"
            style={{ background: "var(--accent)" }}
          >
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border hover:bg-black/5"
            style={{ borderColor: "var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
