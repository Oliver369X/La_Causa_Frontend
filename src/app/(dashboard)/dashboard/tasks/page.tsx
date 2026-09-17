"use client";
import { CreationCard, creationStyles as editor } from "@/shared/ui/CreationCard";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { tasksApi, type Task, type CreateTaskData, type MyAssignment, type TaskAvailable } from "@/features/tasks/api/tasksApi";
import { eventsApi, type Event } from "@/features/events/api/eventsApi";
import { DeliveryUpload } from "@/features/tasks/ui/DeliveryUpload";
import { TaskInstructionsDisplay } from "@/features/tasks/ui/TaskInstructionsDisplay";
import { InstructionTemplateLibrary } from "@/features/tasks/ui/InstructionTemplateLibrary";
import { TopBar } from "@/shared/ui/Sidebar";
import { formatDate, parseUTC, toLocalDateTimeString } from "@/shared/utils/utils";
import Link from "next/link";
import { toast } from "sonner";
import { extractApiDetail } from "@/shared/utils/apiError";
import { Plus, CheckSquare, Check, X, Clock, UserPlus, ImagePlus, AlertTriangle, Search, Trophy } from "lucide-react";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { gamificationApi, type Season, type OrgBadgeCatalogItem } from "@/features/gamification/api/gamificationApi";

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

function nowForDatetimeLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function isTaskVencida(task: Task): boolean {
  if (!task.fecha_vencimiento) return false;
  if (task.estado === "completed" || task.estado === "cancelled") return false;
  return parseUTC(task.fecha_vencimiento) < new Date();
}

function validateTaskDueDate(fechaVencimiento: string): string | null {
  const vencimiento = new Date(fechaVencimiento);
  if (Number.isNaN(vencimiento.getTime())) {
    return "La fecha de vencimiento no es válida.";
  }
  if (vencimiento < new Date()) {
    return "La fecha de vencimiento no puede estar en el pasado.";
  }
  return null;
}

function TaskBoardCard({
  task,
  statusMutation,
  vencida = false,
  eventName,
  seasonName,
}: {
  task: Task;
  statusMutation: { mutate: (args: { id: string; estado: Task["estado"] }) => void };
  vencida?: boolean;
  eventName?: string;
  seasonName?: string;
}) {
  return (
    <div
      className="p-4 rounded-xl transition-colors hover:opacity-90"
      style={{
        background: "var(--bg-subtle)",
        border: vencida ? "1px solid rgba(239,68,68,.35)" : "1px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <Link
          href={`/dashboard/tasks/${task.id}`}
          className="text-sm font-medium flex-1 min-w-0 hover:underline"
          style={{ color: "var(--text)" }}
        >
          {task.titulo}
        </Link>
        {vencida && (
          <span className="flex items-center gap-0.5 text-xs text-red-500 shrink-0" title="Vencida">
            <AlertTriangle className="w-3 h-3" />
          </span>
        )}
      </div>
      {(eventName || seasonName) && (
        <div className="flex flex-wrap gap-1.5 mb-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
          {eventName && <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card)" }}>Evento: {eventName}</span>}
          {seasonName && <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card)" }}>Temporada: {seasonName}</span>}
        </div>
      )}
      {task.descripcion && (
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          {task.descripcion}
        </p>
      )}
      {task.fecha_vencimiento && (
        <p
          className={`text-xs mb-1 ${vencida ? "text-red-500" : ""}`}
          style={!vencida ? { color: "var(--text-muted)" } : undefined}
        >
          Vence: {formatDate(task.fecha_vencimiento)}
        </p>
      )}
      <div className="flex gap-2 mt-2">
        <select
          value={task.estado}
          onChange={(e) =>
            statusMutation.mutate({ id: task.id, estado: e.target.value as Task["estado"] })
          }
          className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusConfig[s].label}
            </option>
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
  );
}

function TasksPageContent() {
  const searchParams = useSearchParams();
  const { activeOrgId, user } = useAuthStore();
  const { isVolunteerExperience, isOwner } = usePermissions();
  const isVolunteer = isVolunteerExperience;
  const qc = useQueryClient();
  const eventoIdFromUrl = searchParams.get("evento_id");
  const taskIdFromUrl = searchParams.get("task_id");
  const [showForm, setShowForm] = useState(!!eventoIdFromUrl);
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [badgeSearch, setBadgeSearch] = useState("");
  const [badgeRarity, setBadgeRarity] = useState("all");
  const [badgeDateOrder, setBadgeDateOrder] = useState<"recent" | "oldest">("recent");
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
    refetchInterval: isVolunteer ? 15000 : false,
    refetchOnWindowFocus: true,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events", activeOrgId],
    queryFn: () => eventsApi.list(activeOrgId!),
    enabled: !!activeOrgId && !isVolunteer,
  });
  const visibleMyAssignments = activeOrgId
    ? myAssignments.filter((assignment) => assignment.organizacion_id === activeOrgId)
    : myAssignments;

  const { data: seasons = [] } = useQuery<Season[]>({
    queryKey: ["seasons", activeOrgId],
    queryFn: () => gamificationApi.getSeasons(activeOrgId!),
    enabled: !!activeOrgId && !isVolunteer,
  });

  const { data: badges = [] } = useQuery<OrgBadgeCatalogItem[]>({
    queryKey: ["org-badges-for-task", activeOrgId],
    queryFn: () => gamificationApi.listOrgBadgeCatalog(activeOrgId!, { soloVisiblesCatalogo: false }),
    enabled: !!activeOrgId && !isVolunteer,
  });

  const selectedBadgeId = (formData as Record<string, string>).insignia_id ?? "";
  const selectedBadge = badges.find((badge) => badge.id === selectedBadgeId);
  const badgeRarities = Array.from(
    new Set(badges.map((badge) => badge.rareza?.trim()).filter(Boolean)),
  );
  const filteredBadges = badges
    .filter((badge) => !["sistema", "sistema_elo", "sistema_elo_org"].includes(badge.regla_asignacion ?? ""))
    .filter((badge) => {
      const matchesSearch = `${badge.nombre} ${badge.descripcion ?? ""}`
        .toLocaleLowerCase()
        .includes(badgeSearch.trim().toLocaleLowerCase());
      const matchesRarity = badgeRarity === "all" || badge.rareza === badgeRarity;
      return matchesSearch && matchesRarity;
    })
    .sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return badgeDateOrder === "recent" ? bDate - aDate : aDate - bDate;
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
      toast.error(extractApiDetail(err, "No se pudo crear la tarea."));
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

  const columns = STATUSES.filter((s) => s !== "cancelled");
  const minDateTimeLocal = nowForDatetimeLocal();
  const vencidas = tasks.filter(isTaskVencida);
  const activeTasks = tasks.filter((t) => !isTaskVencida(t));
  const taskContext = (task: Task) => {
    const event = events.find((item) => item.id === task.evento_id);
    const season = event?.temporada_id ? seasons.find((item) => item.id === event.temporada_id) : undefined;
    return { eventName: event?.nombre, seasonName: season?.nombre };
  };
  const taskGroups = Array.from(activeTasks.reduce((groups, task) => {
    const context = taskContext(task);
    const season = context.seasonName ?? "Sin temporada";
    const event = context.eventName ?? "Sin evento";
    const key = `${season}::${event}`;
    const group = groups.get(key) ?? { season, event, tasks: [] as Task[] };
    group.tasks.push(task);
    groups.set(key, group);
    return groups;
  }, new Map<string, { season: string; event: string; tasks: Task[] }>()).values());
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
          ) : visibleMyAssignments.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <CheckSquare className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)" }}>Aún no tienes tareas asignadas.</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Selecciona una organización y toma tareas disponibles, o postúlate a eventos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleMyAssignments.map((a: MyAssignment) => (
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
          <CreationCard kind="task" onClose={() => setShowForm(false)}>
            <div className={editor.fields}>
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
                <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Medalla por completar (opcional)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBadgePicker(true)}
                    className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-left hover:opacity-80 transition-opacity"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    {selectedBadge?.url_imagen ? (
                      <img src={selectedBadge.url_imagen} alt="" className="w-7 h-7 rounded-lg object-cover" />
                    ) : (
                      <Trophy className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                    )}
                    <span className="truncate">{selectedBadge?.nombre ?? "Buscar o agregar medalla"}</span>
                  </button>
                  {selectedBadgeId && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, insignia_id: undefined }))}
                      className="px-3 rounded-xl hover:opacity-80"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                      aria-label="Quitar medalla"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                  Selecciona una medalla desde el buscador para evitar listas demasiado largas.
                </p>
              </div>
              <div data-editor="title">
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
              <div data-editor="description">
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
              <div data-editor="description">
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
              {isOwner && (
                <>
                  <div>
                    <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Costo estimado (Bs)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={(formData.costo_estimado ?? "").toString()}
                      onChange={(e) => setFormData((prev) => ({ ...prev, costo_estimado: e.target.value === "" ? undefined : Number(e.target.value) }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Costo real (Bs)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Pendiente"
                      value={(formData.costo_real ?? "").toString()}
                      onChange={(e) => setFormData((prev) => ({ ...prev, costo_real: e.target.value === "" ? undefined : Number(e.target.value) }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Fecha vencimiento</label>
                <input
                  type="datetime-local"
                  min={minDateTimeLocal}
                  value={(formData as Record<string, string>).fecha_vencimiento ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fecha_vencimiento: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div className="md:col-span-2 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="req-evidence"
                  checked={(formData as { requiere_evidencia?: boolean }).requiere_evidencia !== false}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requiere_evidencia: e.target.checked }))}
                  className="mt-1"
                />
                <label htmlFor="req-evidence" className="text-sm cursor-pointer" style={{ color: "var(--text-muted)" }}>
                  <span className="font-medium" style={{ color: "var(--text)" }}>Requiere entrega de evidencia</span>
                  {" — "}Desactívalo si esta tarea se valida por asistencia, registro u otro control interno.
                </label>
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
            <div className={editor.actions}>
              <button
                onClick={() => {
                  const fd = formData as Record<string, string>;
                  if (!fd.evento_id || !fd.titulo?.trim()) {
                    toast.error("Selecciona un evento e ingresa un título.");
                    return;
                  }
                  if (fd.fecha_vencimiento?.trim()) {
                    const dateError = validateTaskDueDate(fd.fecha_vencimiento.trim());
                    if (dateError) {
                      toast.error(dateError);
                      return;
                    }
                  }
                  createMutation.mutate({
                    evento_id: fd.evento_id,
                    titulo: fd.titulo.trim(),
                    descripcion: fd.descripcion || undefined,
                    instrucciones: fd.instrucciones || undefined,
                    dificultad: (fd.dificultad as CreateTaskData["dificultad"]) || "media",
                    vacantes: Math.max(1, parseInt(fd.vacantes || "1", 10)),
                    fecha_vencimiento: fd.fecha_vencimiento?.trim() ? new Date(fd.fecha_vencimiento.trim()).toISOString() : undefined,
                    requiere_revision_manual: Boolean((formData as { requiere_revision_manual?: boolean }).requiere_revision_manual),
                    requiere_evidencia: (formData as { requiere_evidencia?: boolean }).requiere_evidencia !== false,
                    ...(isOwner ? {
                      costo_estimado: formData.costo_estimado ?? null,
                      costo_real: formData.costo_real ?? null,
                    } : {}),
                    insignia_id: fd.insignia_id || undefined,
                  });
                }}
                disabled={!(formData as Record<string, string>).evento_id || !(formData as Record<string, string>).titulo?.trim() || createMutation.isPending}
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
          </CreationCard>
        )}

        {showBadgePicker && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,.58)" }}
            onMouseDown={() => setShowBadgePicker(false)}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl p-6"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-lg font-semibold">Elegir medalla</h3>
                  <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    La medalla se entregará al voluntario cuando complete esta tarea.
                  </p>
                </div>
                <button type="button" onClick={() => setShowBadgePicker(false)} aria-label="Cerrar">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <label className="relative md:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <input
                    value={badgeSearch}
                    onChange={(event) => setBadgeSearch(event.target.value)}
                    placeholder="Buscar medalla..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                </label>
                <select
                  value={badgeRarity}
                  onChange={(event) => setBadgeRarity(event.target.value)}
                  className="px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <option value="all">Todas las rarezas</option>
                  {badgeRarities.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
                </select>
                <select
                  value={badgeDateOrder}
                  onChange={(event) => setBadgeDateOrder(event.target.value as "recent" | "oldest")}
                  className="px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <option value="recent">Más recientes</option>
                  <option value="oldest">Más antiguas</option>
                </select>
              </div>

              <div className="max-h-[48vh] overflow-y-auto space-y-2 pr-1">
                {filteredBadges.length === 0 ? (
                  <div className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    No se encontraron medallas con esos filtros.
                  </div>
                ) : filteredBadges.map((badge) => (
                  <button
                    type="button"
                    key={badge.id}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, insignia_id: badge.id }));
                      setShowBadgePicker(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:opacity-80 transition-opacity"
                    style={{
                      background: badge.id === selectedBadgeId ? "var(--bg-subtle)" : "transparent",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {badge.url_imagen ? (
                      <img src={badge.url_imagen} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--bg-subtle)" }}>
                        <Trophy className="w-5 h-5" />
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">{badge.nombre}</span>
                      <span className="block text-xs truncate" style={{ color: "var(--text-muted)" }}>{badge.descripcion}</span>
                    </span>
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      {badge.rareza}{badge.created_at ? ` · ${new Date(badge.created_at).toLocaleDateString("es-ES")}` : ""}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center gap-3 mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <Link
                  href="/dashboard/badges"
                  onClick={() => setShowBadgePicker(false)}
                  className="text-sm font-medium hover:underline"
                  style={{ color: "var(--text)" }}
                >
                  + Crear nueva medalla
                </Link>
                <button
                  type="button"
                  onClick={() => setShowBadgePicker(false)}
                  className="px-4 py-2 rounded-full text-sm"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando tareas...</p>
        ) : (
          <div className="space-y-8">
            {taskGroups.map((group) => (
              <section key={`${group.season}-${group.event}`} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{group.event}</h3>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Temporada: {group.season} · {group.tasks.length} tareas</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {columns.map((status) => {
                    const config = statusConfig[status];
                    const colTasks = group.tasks.filter((task) => task.estado === status);
                    return (
                      <div key={status} className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4" style={{ background: config.bg, color: config.color }}>
                          <CheckSquare className="w-3 h-3" /> {config.label} ({colTasks.length})
                        </div>
                        <div className="space-y-3">
                          {colTasks.map((task) => <TaskBoardCard key={task.id} task={task} statusMutation={statusMutation} {...taskContext(task)} />)}
                          {colTasks.length === 0 && <p className="text-center text-xs py-6" style={{ color: "var(--text-muted)" }}>Sin tareas</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
            <section className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4" style={{ background: "rgba(239,68,68,.12)", color: "#f87171" }}>
                <AlertTriangle className="w-3 h-3" /> Vencidas ({vencidas.length})
              </div>
              <div className="space-y-3">
                {vencidas.map((task) => <TaskBoardCard key={task.id} task={task} statusMutation={statusMutation} vencida {...taskContext(task)} />)}
                {vencidas.length === 0 && <p className="text-center text-xs py-6" style={{ color: "var(--text-muted)" }}>Sin tareas vencidas</p>}
              </div>
            </section>
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
