"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { useCelebrationStore } from "@/shared/store/celebrationStore";
import { tasksApi, type Task, type CreateTaskData, type MyAssignment, type TaskAvailable } from "@/features/tasks/api/tasksApi";
import { eventsApi, type Event } from "@/features/events/api/eventsApi";
import { DeliveryUpload } from "@/features/tasks/ui/DeliveryUpload";
import { TaskInstructionsDisplay } from "@/features/tasks/ui/TaskInstructionsDisplay";
import { InstructionTemplateLibrary } from "@/features/tasks/ui/InstructionTemplateLibrary";
import { TopBar } from "@/shared/ui/Sidebar";
import { formatDate } from "@/shared/utils/utils";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, CheckSquare, Check, X, Clock, UserPlus, ImagePlus, AlertTriangle } from "lucide-react";

const STATUSES: Task["estado"][] = ["pending", "in_progress", "completed", "cancelled"];

const statusConfig: Record<Task["estado"], { label: string; color: string; bg: string }> = {
  pending:     { label: "Pendiente",   color: "#f59e0b", bg: "rgba(245,158,11,.12)"  },
  in_progress: { label: "En progreso", color: "#60a5fa", bg: "rgba(96,165,250,.12)"  },
  completed:   { label: "Completada",  color: "#34d399", bg: "rgba(52,211,153,.12)"  },
  cancelled:   { label: "Cancelada",   color: "#f87171", bg: "rgba(248,113,113,.12)" },
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

function TasksPageContent() {
  const searchParams = useSearchParams();
  const { activeOrgId, user } = useAuthStore();
  const isVolunteer = user?.tipo === "voluntario";
  const qc = useQueryClient();
  const eventoIdFromUrl = searchParams.get("evento_id");
  const taskIdFromUrl = searchParams.get("task_id");
  const [showForm, setShowForm] = useState(!!eventoIdFromUrl);
  const [formData, setFormData] = useState<Partial<CreateTaskData>>(
    eventoIdFromUrl ? { evento_id: eventoIdFromUrl } : {}
  );

  useEffect(() => {
    if (eventoIdFromUrl) {
      setFormData((p) => ({ ...p, evento_id: eventoIdFromUrl }));
      setShowForm(true);
    }
  }, [eventoIdFromUrl]);

  const { data: myAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["myAssignments"],
    queryFn: () => tasksApi.listMyAssignments(),
    enabled: isVolunteer,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events", activeOrgId],
    queryFn: () => eventsApi.list(activeOrgId!),
    enabled: !!activeOrgId && !isVolunteer,
  });

  const eventsForTasks = (events as Event[]).filter(
    (e) => e.estado === "publicado" || e.estado === "en_curso" || e.estado === "borrador"
  );

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks", activeOrgId, eventoIdFromUrl],
    queryFn: () => tasksApi.list(activeOrgId!, eventoIdFromUrl ?? undefined),
    enabled: !!activeOrgId && !isVolunteer,
  });

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", activeOrgId] });
      setShowForm(false);
      setFormData({});
    },
    onError: (err: unknown) => {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string }; status?: number } }).response?.data?.detail
          : null;
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 403 && typeof detail === "string") {
        toast.error(detail);
      }
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: Task["estado"] }) =>
      tasksApi.updateStatus(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", activeOrgId] }),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => tasksApi.acceptAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myAssignments"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => tasksApi.rejectAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myAssignments"] }),
  });

  const [deliveryAssignment, setDeliveryAssignment] = useState<MyAssignment | null>(null);

  const { data: availableTasks = [], isLoading: loadingAvailable } = useQuery({
    queryKey: ["tasksAvailable", activeOrgId],
    queryFn: () => tasksApi.listAvailable(activeOrgId!),
    enabled: isVolunteer && !!activeOrgId,
  });

  const postularMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.postular(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAssignments"] });
      qc.invalidateQueries({ queryKey: ["tasksAvailable", activeOrgId] });
    },
  });

  const prevEstadosRef = useRef<Record<string, string>>({});
  const celebratedRef = useRef<Set<string>>(new Set());
  const showCelebration = useCelebrationStore((s) => s.show);

  useEffect(() => {
    if (!isVolunteer || loadingAssignments) return;
    for (const a of myAssignments) {
      if (a.estado !== "aprobada") continue;
      const prev = prevEstadosRef.current[a.id];
      if (prev != null && prev !== "aprobada" && !celebratedRef.current.has(a.id)) {
        celebratedRef.current.add(a.id);
        showCelebration({ tarea_titulo: a.tarea_titulo, delta_elo: 50, delta_xp: 100 });
        break;
      }
    }
    prevEstadosRef.current = Object.fromEntries(myAssignments.map((a) => [a.id, a.estado]));
  }, [isVolunteer, loadingAssignments, myAssignments, showCelebration]);

  const columns = STATUSES.filter((s) => s !== "cancelled");
  const isLoading = isVolunteer ? loadingAssignments : loadingTasks;

  if (isVolunteer) {
    return (
      <>
        <TopBar title="Mis Tareas" />
        <div className="flex-1 p-8">
          <h2 className="text-xl font-semibold mb-1">Mis asignaciones</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Tareas que te han asignado o que has tomado.
          </p>
          {isLoading ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando...</p>
          ) : myAssignments.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <CheckSquare className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)" }}>Aún no tienes tareas asignadas.</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Selecciona una organización y toma tareas disponibles, o postúlate a eventos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myAssignments.map((a: MyAssignment) => (
                <div
                  key={a.id}
                  className="p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{a.tarea_titulo}</h3>
                    {a.instrucciones?.trim() && (
                      <div className="mt-3 max-h-[min(280px,45vh)] overflow-y-auto pr-1">
                        <TaskInstructionsDisplay
                          text={a.instrucciones}
                          variant="compact"
                          heading="Qué debes hacer"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      <Clock className="w-3 h-3" />
                      Asignada: {new Date(a.fecha_asignacion).toLocaleDateString("es-ES")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: a.estado === "pendiente" ? "rgba(245,158,11,.15)" : "var(--bg-subtle)",
                        color: a.estado === "pendiente" ? "#f59e0b" : "var(--text-muted)",
                      }}
                    >
                      {assignStatusLabels[a.estado] ?? a.estado}
                    </span>
                    {a.estado === "pendiente" && (
                      <>
                        <button
                          onClick={() => acceptMutation.mutate(a.id)}
                          disabled={acceptMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                          style={{ background: "var(--accent)", color: "white" }}
                        >
                          <Check className="w-3 h-3" /> Aceptar
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(a.id)}
                          disabled={rejectMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                        >
                          <X className="w-3 h-3" /> Rechazar
                        </button>
                      </>
                    )}
                    {(a.estado === "aceptada" || a.estado === "devuelta") && (
                      <button
                        onClick={() => setDeliveryAssignment(a)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "var(--accent)", color: "white" }}
                      >
                        <ImagePlus className="w-3 h-3" />
                        {a.estado === "devuelta" ? "Reenviar evidencia" : "Entregar evidencia"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeOrgId && (
            <div className="mt-12">
              <h3 className="text-lg font-semibold mb-2">Tareas disponibles</h3>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                Tareas de eventos donde estás aprobado. Selecciona una para ganar experiencia.
              </p>
              {loadingAvailable ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando...</p>
              ) : availableTasks.length === 0 ? (
                <div className="py-8 rounded-2xl text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay tareas disponibles. Postúlate a eventos y espera aprobación.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableTasks.map((t: TaskAvailable) => (
                    <div
                      key={t.id}
                      className="p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{t.titulo}</h4>
                        {t.evento_titulo && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Evento: {t.evento_titulo}</p>
                        )}
                        {t.descripcion && (
                          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{t.descripcion}</p>
                        )}
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                          {(t.vacantes_ocupadas ?? 0)}/{(t.vacantes ?? 1)} vacantes
                        </p>
                      </div>
                      <button
                        onClick={() => postularMutation.mutate(t.id)}
                        disabled={postularMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 shrink-0"
                        style={{ background: "var(--accent)", color: "white" }}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Tomar tarea
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {deliveryAssignment && (
            <DeliveryUpload
              assignmentId={deliveryAssignment.id}
              tareaTitulo={deliveryAssignment.tarea_titulo}
              instrucciones={deliveryAssignment.instrucciones}
              onClose={() => setDeliveryAssignment(null)}
              onSuccess={() => {
                setDeliveryAssignment(null);
                qc.invalidateQueries({ queryKey: ["myAssignments"] });
              }}
            />
          )}
        </div>
      </>
    );
  }

  if (!activeOrgId) {
    return (
      <>
        <TopBar title="Tareas" />
        <div className="flex-1 flex items-center justify-center py-24">
          <p style={{ color: "var(--text-muted)" }}>Selecciona una organización para ver tareas.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Tareas" />
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold">Tablero de tareas</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{tasks.length} tareas en total</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            <Plus className="w-4 h-4" />
            Nueva tarea
          </button>
        </div>

        {showForm && (
          <div className="mb-8 p-6 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="font-semibold mb-5">Crear nueva tarea</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Evento *</label>
                <select
                  value={(formData as Record<string, string>).evento_id ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, evento_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <option value="">Seleccionar evento</option>
                  {eventsForTasks.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.nombre}</option>
                  ))}
                </select>
                {eventsForTasks.length === 0 && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Crea un evento primero.</p>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Título *</label>
                <input
                  type="text"
                  placeholder="Registro de participantes"
                  value={(formData as Record<string, string>).titulo ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Descripción</label>
                <input
                  type="text"
                  placeholder="Descripción opcional"
                  value={(formData as Record<string, string>).descripcion ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Instrucciones para el voluntario</label>
                <p className="text-xs mb-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Escribe un paso por línea, o usa{" "}
                  <code className="px-1 rounded" style={{ background: "var(--bg-subtle)" }}>1.</code>{" "}
                  <code className="px-1 rounded" style={{ background: "var(--bg-subtle)" }}>2.</code> para numerar. Las viñetas con{" "}
                  <code className="px-1 rounded" style={{ background: "var(--bg-subtle)" }}>- </code> también se verán como lista.
                </p>
                <textarea
                  placeholder={"1. Llegar 15 min antes\n2. Firmar lista en recepción\n- Traer chaleco naranja"}
                  value={(formData as Record<string, string>).instrucciones ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, instrucciones: e.target.value }))}
                  rows={6}
                  className="w-full min-h-[140px] px-4 py-3 rounded-xl text-sm outline-none resize-y font-mono leading-relaxed"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
                <div className="mt-3">
                  <InstructionTemplateLibrary
                    orgId={activeOrgId}
                    currentText={(formData as Record<string, string>).instrucciones ?? ""}
                    onApply={(next) =>
                      setFormData((prev) => ({ ...prev, instrucciones: next }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Dificultad</label>
                <select
                  value={(formData as Record<string, string>).dificultad ?? "media"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dificultad: e.target.value as CreateTaskData["dificultad"] }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Vacantes</label>
                <input
                  type="number"
                  min={1}
                  placeholder="1"
                  value={(formData as Record<string, string>).vacantes ?? "1"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, vacantes: parseInt(e.target.value, 10) || 1 }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Fecha vencimiento</label>
                <input
                  type="datetime-local"
                  value={(formData as Record<string, string>).fecha_vencimiento ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fecha_vencimiento: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div className="md:col-span-2 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="req-revision-manual"
                  checked={Boolean((formData as { requiere_revision_manual?: boolean }).requiere_revision_manual)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requiere_revision_manual: e.target.checked }))}
                  className="mt-1"
                />
                <label htmlFor="req-revision-manual" className="text-sm cursor-pointer" style={{ color: "var(--text-muted)" }}>
                  <span className="font-medium" style={{ color: "var(--text)" }}>Revisión manual obligatoria</span>
                  {" — "}Las entregas con evidencia no se auto-aprueban; el equipo debe revisar (CU25).
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  const fd = formData as Record<string, string>;
                  if (!fd.evento_id) return;
                  createMutation.mutate({
                    evento_id: fd.evento_id,
                    titulo: fd.titulo || "",
                    descripcion: fd.descripcion || undefined,
                    instrucciones: fd.instrucciones || undefined,
                    dificultad: (fd.dificultad as CreateTaskData["dificultad"]) || "media",
                    vacantes: Math.max(1, parseInt(fd.vacantes || "1", 10)),
                    fecha_vencimiento: fd.fecha_vencimiento || undefined,
                    requiere_revision_manual: Boolean((formData as { requiere_revision_manual?: boolean }).requiere_revision_manual),
                  });
                }}
                disabled={!(formData as Record<string, string>).evento_id || !(formData as Record<string, string>).titulo}
                className="px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                style={{ background: "var(--text)", color: "var(--bg)" }}
              >
                Crear
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando tareas...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {columns.map((status) => {
              const config = statusConfig[status];
              const colTasks = tasks.filter((t) => t.estado === status);
              return (
                <div key={status} className="rounded-2xl p-4"
                   style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
                    style={{ background: config.bg, color: config.color }}
                  >
                    <CheckSquare className="w-3 h-3" />
                    {config.label} ({colTasks.length})
                  </div>
                  <div className="space-y-3">
                    {colTasks.map((task) => {
                      const isOverdue = task.fecha_vencimiento && new Date(task.fecha_vencimiento) < new Date();
                      return (
                      <div key={task.id} className="p-4 rounded-xl transition-colors hover:opacity-90"
                           style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <Link
                            href={`/dashboard/tasks/${task.id}`}
                            className="text-sm font-medium flex-1 min-w-0 hover:underline"
                            style={{ color: "var(--text)" }}
                          >
                            {task.titulo}
                          </Link>
                          {isOverdue && (
                            <span className="flex items-center gap-0.5 text-xs text-red-500 shrink-0" title="Vencida">
                              <AlertTriangle className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        {task.descripcion && <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{task.descripcion}</p>}
                        {task.fecha_vencimiento && (
                          <p className={`text-xs mb-1 ${isOverdue ? "text-red-500" : ""}`} style={!isOverdue ? { color: "var(--text-muted)" } : undefined}>
                            Vence: {formatDate(task.fecha_vencimiento)}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <select
                            value={task.estado}
                            onChange={(e) => statusMutation.mutate({ id: task.id, estado: e.target.value as Task["estado"] })}
                            className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{statusConfig[s].label}</option>
                            ))}
                          </select>
                          <Link
                            href={`/dashboard/tasks/${task.id}`}
                            className="px-2 py-1.5 rounded-lg text-xs font-medium shrink-0"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                          >
                            Ver
                          </Link>
                        </div>
                      </div>
                    );})}
                    {colTasks.length === 0 && (
                      <p className="text-center text-xs py-6" style={{ color: "var(--text-muted)" }}>Sin tareas</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<><TopBar title="Tareas" /><div className="flex-1 p-8"><p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando...</p></div></>}>
      <TasksPageContent />
    </Suspense>
  );
}
