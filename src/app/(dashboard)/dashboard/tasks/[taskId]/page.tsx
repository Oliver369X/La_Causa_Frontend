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
import { volunteersApi, filterVolunteerMembers, type MatchResponse } from "@/features/volunteers/api/volunteersApi";
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
import { Modal } from "@/shared/ui/Modal";
import { VolunteerSelector } from "@/features/volunteers/ui/VolunteerSelector";
import { EvidenceCard } from "@/features/assignments/ui/EvidenceReview";

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
  const { isVolunteerExperience, isOwner } = usePermissions();
  const isVolunteer = isVolunteerExperience;
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"detalle" | "asignar">("detalle");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [assigningMultiple, setAssigningMultiple] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);
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
  const canManageCosts = Boolean(isOwner || event?.responsable_financiero_id === user?.id);

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

  const matchMutation = useMutation({
    mutationFn: () => volunteersApi.matchTask(taskId),
    onSuccess: (result) => {
      setMatchResult(result);
      toast.success(`Matching completado: ${result.ranking.length} candidatos ordenados.`);
    },
    onError: (err) => {
      const message = extractApiDetail(err, "No se pudo ejecutar la recomendación inteligente.");
      toast.error(message);
      if (message.toLowerCase().includes("plan") || message.toLowerCase().includes("pago")) {
        setShowPlansModal(true);
      }
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
  const selfAssigned = Boolean(user?.id && alreadyAssigned.has(user.id));

  // Filtrar candidatos voluntarios según buscador
  const allVolunteerCandidates = filterVolunteerMembers(members);
  const filteredCandidates = allVolunteerCandidates.filter((m) => {
    const query = searchQuery.toLowerCase();
    const nombre = (m.usuario_nombre || "").toLowerCase();
    const email = (m.usuario_email || "").toLowerCase();
    return nombre.includes(query) || email.includes(query);
  });

  const rankingByVolunteer = new Map(
    (matchResult?.ranking ?? []).map((candidate, index) => [candidate.voluntario_id, { candidate, index }])
  );
  const displayCandidates = [...filteredCandidates].sort((a, b) => {
    const rankA = rankingByVolunteer.get(a.usuario_id)?.index;
    const rankB = rankingByVolunteer.get(b.usuario_id)?.index;
    if (rankA == null && rankB == null) return 0;
    if (rankA == null) return 1;
    if (rankB == null) return -1;
    return rankA - rankB;
  });

  const handleAssignMultiple = async () => {
    if (selectedUserIds.length === 0) return;
    setAssigningMultiple(true);
    let assignedCount = 0;
    let skippedCount = 0;
    try {
      // Procesar en serie para poder mostrar una confirmación independiente
      // cuando un voluntario ya esté registrado en otro evento superpuesto.
      for (const uId of selectedUserIds) {
        try {
          await assignmentsApi.assign(taskId, { tipo: "individual", usuario_id: uId });
          assignedCount += 1;
        } catch (err) {
          const detail = (err as any)?.response?.data?.detail;
          if (detail?.code !== "event_conflict") throw err;

          const shouldContinue = window.confirm(
            `${detail.message}\n\n¿Deseas continuar y registrar a este voluntario también en este evento?`
          );
          if (!shouldContinue) {
            skippedCount += 1;
            continue;
          }

          await assignmentsApi.assign(taskId, {
            tipo: "individual",
            usuario_id: uId,
            confirmar_conflicto_evento: true,
          });
          assignedCount += 1;
        }
      }
      if (assignedCount > 0) {
        toast.success(
          `${assignedCount} voluntario${assignedCount === 1 ? "" : "s"} asignado${assignedCount === 1 ? "" : "s"}.`
        );
      }
      if (skippedCount > 0) {
        toast.info(`${skippedCount} asignación${skippedCount === 1 ? "" : "es"} cancelada${skippedCount === 1 ? "" : "s"}.`);
      }
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

  const handleAssignSelf = async () => {
    if (!user?.id || selfAssigned) return;
    setAssigningMultiple(true);
    try {
      await assignmentsApi.assign(taskId, { tipo: "individual", usuario_id: user.id });
      toast.success("Te autoasignaste la tarea operativa. Ya podés registrar su ejecución.");
      qc.invalidateQueries({ queryKey: ["task-assignments", taskId] });
      qc.invalidateQueries({ queryKey: ["event-applications", task.evento_id] });
      setActiveTab("detalle");
    } catch (err) {
      toast.error(extractApiDetail(err, "No se pudo autoasignar la tarea."));
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
                    <AssignmentCard key={a.id} assignment={a} taskId={taskId} task={task} />
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
        {activeTab === "asignar" && canManage && activeOrgId && (
          <div className="space-y-5 max-w-6xl mx-auto w-full">
            <VolunteerSelector key={activeOrgId + taskId} orgId={activeOrgId} eventId={task.evento_id} taskId={taskId} />
            <button type="button" disabled={selfAssigned || assigningMultiple} onClick={handleAssignSelf} className="text-sm text-[var(--accent)] underline">{selfAssigned ? "Ya te la asignaste" : "Autoasignarme tarea operativa"}</button>
          </div>
        )}

        {showPlansModal && <PlansModal onClose={() => setShowPlansModal(false)} />}
        {showEditModal && (
          <EditTaskModal
            task={task}
            canManageCosts={canManageCosts}
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
  task,
}: {
  assignment: Assignment;
  taskId: string;
  task: Task;
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
              tarea={task}
              vigente={d.numero_intento === Math.max(...deliveries.map(item => item.numero_intento))}
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

function DeliveryItem({ delivery, tarea, vigente }: { delivery: Delivery; assignmentId: string; tarea: Task; vigente: boolean }) {
  const { activeOrgId } = useAuthStore();
  if (!activeOrgId) return <p>Selecciona la organización para revisar esta entrega.</p>;
  return <EvidenceCard orgId={activeOrgId} title={tarea.titulo} delivery={{ ...delivery, nombre: delivery.nombre || "Participante", vigente }}>
    <div className="rounded-xl border border-[var(--border)] p-4 text-sm">
      <h4 className="font-semibold mb-2">Costos de la tarea</h4>
      <p>Estimado: {tarea.costo_estimado != null ? "Bs " + Number(tarea.costo_estimado).toFixed(2) : "No definido"}</p>
      <p>Real: {tarea.costo_real != null ? "Bs " + Number(tarea.costo_real).toFixed(2) : "Pendiente"}</p>
    </div>
  </EvidenceCard>;
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
  canManageCosts: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}

function EditTaskModal({ task, canManageCosts, onClose, onSave, isSaving }: EditTaskModalProps) {
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
  const [requiereEvidencia, setRequiereEvidencia] = useState(task.requiere_evidencia !== false);
  const [costoEstimado, setCostoEstimado] = useState(task.costo_estimado?.toString() ?? "");
  const [costoReal, setCostoReal] = useState(task.costo_real?.toString() ?? "");

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
      requiere_evidencia: requiereEvidencia,
      ...(canManageCosts ? {
        costo_estimado: costoEstimado === "" ? null : Number(costoEstimado),
        costo_real: costoReal === "" ? null : Number(costoReal),
      } : {}),
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

          <div className="grid grid-cols-2 gap-4 p-3 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <div><label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Costo estimado (Bs)</label><input type="number" min="0" step="0.01" disabled={!canManageCosts} value={costoEstimado} onChange={(e) => setCostoEstimado(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 rounded-xl border disabled:opacity-60" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }} /></div>
              <div><label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Costo real (Bs)</label><input type="number" min="0" step="0.01" disabled={!canManageCosts} value={costoReal} onChange={(e) => setCostoReal(e.target.value)} placeholder="Pendiente" className="w-full px-3 py-2 rounded-xl border disabled:opacity-60" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }} /></div>
              <p className="col-span-2 text-[11px]" style={{ color: "var(--text-muted)" }}>{canManageCosts ? "Estos montos alimentan el presupuesto y reporte financiero del evento." : "Solo la organización o el responsable financiero puede editar los costos."}</p>
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
              checked={requiereEvidencia}
              onChange={(e) => setRequiereEvidencia(e.target.checked)}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>Requiere entrega de evidencia</span>
          </label>
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
