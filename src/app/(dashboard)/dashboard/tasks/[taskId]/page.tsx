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
import { volunteersApi } from "@/features/volunteers/api/volunteersApi";
import { TopBar } from "@/shared/ui/Sidebar";
import Link from "next/link";
import { ArrowLeft, UserPlus, Clock, AlertTriangle, Check, X } from "lucide-react";
import { formatDate } from "@/shared/utils/utils";
import { useState } from "react";
import { TaskInstructionsDisplay } from "@/features/tasks/ui/TaskInstructionsDisplay";
import { extractApiDetail } from "@/shared/utils/apiError";
import { toast } from "sonner";
import { usePermissions } from "@/shared/hooks/usePermissions";

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
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data: task, isLoading: loadingTask } = useQuery({
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

  if (!taskId) return null;

  if (loadingTask || !task) {
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

  const canManage = !isVolunteer && activeOrgId && event?.organizacion_id === activeOrgId;
  const isOverdue = task.fecha_vencimiento && new Date(task.fecha_vencimiento) < new Date();

  return (
    <>
      <TopBar title={task.titulo} />
      <div className="flex-1 p-8">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/dashboard/tasks${event?.id ? `?evento_id=${event.id}` : ""}`}
            className="p-2 rounded-full hover:opacity-80"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate">{task.titulo}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {event?.nombre ?? "Evento"}
            </p>
          </div>
        </div>

        <div
          className="p-6 rounded-2xl mb-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {task.dificultad && (
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={dificultadColors[task.dificultad] ?? { background: "var(--bg-subtle)", color: "var(--text-muted)" }}
              >
                {task.dificultad}
              </span>
            )}
            <span
              className="text-xs px-2 py-1 rounded-full"
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
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {task.vacantes} vacante{task.vacantes !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {task.fecha_vencimiento && (
            <div className="flex items-center gap-2 text-sm mb-2" style={{ color: "var(--text-muted)" }}>
              <Clock className="w-4 h-4" />
              Vence: {formatDate(task.fecha_vencimiento)}
              {isOverdue && (
                <span className="flex items-center gap-1 text-red-500">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Vencida
                </span>
              )}
            </div>
          )}

          {task.descripcion && (
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              {task.descripcion}
            </p>
          )}

          {task.instrucciones?.trim() && (
            <div className="mb-4">
              <TaskInstructionsDisplay text={task.instrucciones} heading="Instrucciones para voluntarios" />
            </div>
          )}

          {canManage && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "var(--accent)", color: "white" }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Asignar voluntario
              </button>
              <Link
                href={`/dashboard/events/${task.evento_id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                Ver evento
              </Link>
            </div>
          )}
        </div>

        {canManage && assignments.length > 0 && (
          <div
            className="p-6 rounded-2xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-semibold mb-4">Asignaciones</h3>
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
              onClick={() => setShowAssignModal(true)}
              className="mt-3 text-sm font-medium underline"
            >
              Asignar voluntario
            </button>
          </div>
        )}

        {showAssignModal && (
          <AssignModal
            taskId={taskId}
            eventId={task.evento_id}
            orgId={event?.organizacion_id ?? activeOrgId ?? ""}
            assignedUserIds={assignments.map((a) => a.usuario_id).filter(Boolean) as string[]}
            onClose={() => setShowAssignModal(false)}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["task-assignments", taskId] });
              qc.invalidateQueries({ queryKey: ["event-applications", task.evento_id] });
              setShowAssignModal(false);
            }}
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
          {assignment.usuario_nombre || assignment.usuario_email || (assignment.usuario_id ? `Usuario ${assignment.usuario_id.slice(0, 8)}…` : "—")}
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

function AssignModal({
  taskId,
  eventId,
  orgId,
  assignedUserIds,
  onClose,
  onSuccess,
}: {
  taskId: string;
  eventId: string;
  orgId: string;
  assignedUserIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["members", orgId],
    queryFn: () => volunteersApi.listMembers(orgId),
    enabled: !!orgId,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["event-applications", eventId],
    queryFn: () => eventsApi.listApplications(eventId),
    enabled: !!eventId,
  });

  const approvedInEvent = new Set(
    applications
      .filter((a) => a.estado === "aprobado" || a.estado === "asistio")
      .map((a) => a.usuario_id)
  );
  const alreadyAssigned = new Set(assignedUserIds);

  const candidates = members.filter(
    (m) =>
      m.estado_membresia === "activo" &&
      !m.es_propietario &&
      !alreadyAssigned.has(m.usuario_id)
  );

  const [selected, setSelected] = useState<string>("");
  const assignMutation = useMutation({
    mutationFn: (usuarioId: string) =>
      assignmentsApi.assign(taskId, { tipo: "individual", usuario_id: usuarioId }),
    onSuccess: () => onSuccess(),
    onError: (err: unknown) => {
      toast.error(extractApiDetail(err, "No se pudo asignar la tarea."));
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={onClose}
    >
      <div
        className="max-w-md w-full p-6 rounded-2xl max-h-[80vh] overflow-y-auto"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold mb-4">Asignar voluntario</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Voluntarios activos de tu organización. Si aún no están inscritos en el evento, se inscriben automáticamente al asignar.
        </p>
        {loadingMembers ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando voluntarios…</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No hay voluntarios disponibles. Aprueba solicitudes de membresía en Voluntarios o libera cupos de esta tarea.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {candidates.map((m) => (
              <label
                key={m.usuario_id}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                <input
                  type="radio"
                  name="volunteer"
                  checked={selected === m.usuario_id}
                  onChange={() => setSelected(m.usuario_id)}
                />
                <span className="text-sm flex-1 min-w-0">
                  {m.usuario_nombre || m.usuario_email || `Usuario ${m.usuario_id.slice(0, 8)}…`}
                  {!approvedInEvent.has(m.usuario_id) && (
                    <span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Se inscribirá en el evento al asignar
                    </span>
                  )}
                </span>
                {m.usuario_email && (
                  <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                    {m.usuario_email}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => selected && assignMutation.mutate(selected)}
            disabled={!selected || assignMutation.isPending}
            className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Asignar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
