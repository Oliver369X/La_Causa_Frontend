import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";

export interface Task {
  id: string;
  evento_id: string;
  titulo: string;
  descripcion?: string;
  instrucciones?: string;
  dificultad?: DificultadTarea;
  estado: "pending" | "in_progress" | "completed" | "cancelled";
  vacantes?: number;
  fecha_inicio?: string;
  fecha_vencimiento?: string;
  multiplicador_elo?: number;
  requiere_revision_manual?: boolean;
  created_at?: string;
}

export type DificultadTarea = "baja" | "media" | "alta" | "urgente";

export interface CreateTaskData {
  evento_id: string;
  titulo: string;
  descripcion?: string;
  instrucciones?: string;
  dificultad?: DificultadTarea;
  vacantes?: number;
  fecha_inicio?: string;
  fecha_vencimiento?: string;
  multiplicador_elo?: number;
  requiere_revision_manual?: boolean;
}

type BackendTaskStatus = "pendiente" | "en_progreso" | "revision" | "completada" | "bloqueada";

interface BackendTask {
  id: string;
  evento_id: string;
  titulo: string;
  descripcion?: string;
  instrucciones?: string;
  dificultad?: string;
  estado: BackendTaskStatus;
  vacantes?: number;
  fecha_inicio?: string;
  fecha_vencimiento?: string;
  multiplicador_elo?: number;
  requiere_revision_manual?: boolean;
  created_at?: string;
}

function toFrontendStatus(status: BackendTaskStatus): Task["estado"] {
  if (status === "pendiente") return "pending";
  if (status === "en_progreso" || status === "revision") return "in_progress";
  if (status === "completada") return "completed";
  return "cancelled";
}

function toBackendStatus(status: Task["estado"]): BackendTaskStatus {
  if (status === "pending") return "pendiente";
  if (status === "in_progress") return "en_progreso";
  if (status === "completed") return "completada";
  return "bloqueada";
}

function toTask(dto: BackendTask): Task {
  return {
    id: dto.id,
    evento_id: dto.evento_id,
    titulo: dto.titulo,
    descripcion: dto.descripcion,
    instrucciones: dto.instrucciones,
    dificultad: (dto.dificultad as DificultadTarea) ?? "media",
    estado: toFrontendStatus(dto.estado),
    vacantes: dto.vacantes ?? 1,
    fecha_inicio: dto.fecha_inicio,
    fecha_vencimiento: dto.fecha_vencimiento,
    multiplicador_elo: dto.multiplicador_elo ?? 1,
    requiere_revision_manual: dto.requiere_revision_manual ?? false,
    created_at: dto.created_at,
  };
}

export interface MyAssignment {
  id: string;
  tarea_id: string;
  tarea_titulo: string;
  evento_id: string;
  estado: string;
  fecha_asignacion: string;
  instrucciones?: string;
}

export interface TaskAvailable {
  id: string;
  evento_id: string;
  titulo: string;
  descripcion?: string;
  instrucciones?: string;
  estado: string;
  evento_titulo?: string;
  vacantes?: number;
  vacantes_ocupadas?: number;
}

export const tasksApi = {
  listAvailable: async (organizacionId: string): Promise<TaskAvailable[]> => {
    const { data } = await apiClient.get<TaskAvailable[]>(EP.TASKS_AVAILABLE, {
      params: { organizacion_id: organizacionId },
    });
    return data;
  },

  postular: async (taskId: string): Promise<unknown> => {
    const { data } = await apiClient.post(`/tareas/${taskId}/postular`);
    return data;
  },

  listMyAssignments: async (): Promise<MyAssignment[]> => {
    const { data } = await apiClient.get<MyAssignment[]>(EP.MY_ASSIGNMENTS);
    return data;
  },

  acceptAssignment: async (assignmentId: string): Promise<unknown> => {
    const { data } = await apiClient.patch(`/asignaciones/${assignmentId}`, {
      estado: "aceptada",
    });
    return data;
  },

  rejectAssignment: async (assignmentId: string, motivo?: string): Promise<unknown> => {
    const { data } = await apiClient.patch(`/asignaciones/${assignmentId}`, {
      estado: "rechazada",
      motivo_rechazo: motivo,
    });
    return data;
  },

  list: async (orgId?: string, eventoId?: string): Promise<Task[]> => {
    const params: Record<string, string> = {};
    if (orgId) params.organizacion_id = orgId;
    if (eventoId) params.evento_id = eventoId;
    const { data } = await apiClient.get<BackendTask[]>("/tareas", {
      params: Object.keys(params).length ? params : undefined,
    });
    return data.map(toTask);
  },

  create: async (payload: CreateTaskData): Promise<Task> => {
    const { data } = await apiClient.post<BackendTask>("/tareas", {
      evento_id: payload.evento_id,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      instrucciones: payload.instrucciones,
      dificultad: payload.dificultad ?? "media",
      vacantes: payload.vacantes ?? 1,
      fecha_inicio: payload.fecha_inicio,
      fecha_vencimiento: payload.fecha_vencimiento,
      multiplicador_elo: payload.multiplicador_elo ?? 1,
      requiere_revision_manual: payload.requiere_revision_manual ?? false,
    });
    return toTask(data);
  },

  listByEvent: async (eventoId: string): Promise<Task[]> => {
    const { data } = await apiClient.get<BackendTask[]>("/tareas", {
      params: { evento_id: eventoId },
    });
    return data.map(toTask);
  },

  getById: async (taskId: string): Promise<Task> => {
    const { data } = await apiClient.get<BackendTask>(EP.TASK(taskId));
    return toTask(data);
  },

  updateStatus: async (taskId: string, estado: Task["estado"]): Promise<Task> => {
    const { data } = await apiClient.put<BackendTask>(`/tareas/${taskId}`, {
      estado: toBackendStatus(estado),
    });
    return toTask(data);
  },
};
