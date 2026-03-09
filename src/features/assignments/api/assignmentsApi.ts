import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

// ─ Types (aligned with backend) ────────────────────────────────────────────
export type EstadoAsignacion =
  | "pendiente"
  | "aceptada"
  | "rechazada"
  | "en_revision"
  | "aprobada"
  | "devuelta"
  | "completada";

export type EstadoEntrega = "pendiente_revision" | "aprobada" | "rechazada";

export interface Assignment {
  id: UUID;
  tarea_id: UUID;
  tipo: "individual" | "equipo";
  usuario_id: UUID | null;
  equipo_id: UUID | null;
  asignada_por: UUID | null;
  estado: EstadoAsignacion;
  intento_actual: number;
  fecha_asignacion: string;
  fecha_respuesta: string | null;
  fecha_aprobacion: string | null;
  motivo_rechazo: string | null;
  usuario_nombre?: string;
  usuario_email?: string;
}

export interface CreateAssignmentData {
  tipo?: "individual" | "equipo";
  usuario_id?: UUID;
  equipo_id?: UUID;
}

export interface UpdateAssignmentData {
  estado: EstadoAsignacion;
  motivo_rechazo?: string;
}

export interface Delivery {
  id: UUID;
  tarea_asignacion_id: UUID;
  enviado_por: UUID;
  revisado_por: UUID | null;
  numero_intento: number;
  fecha_entrega: string;
  evidencia_url: string;
  comentario: string | null;
  fecha_revision: string | null;
  estado: EstadoEntrega;
  feedback: string | null;
  rating: number | null;
  created_at: string;
}

export interface CreateDeliveryData {
  evidencia_url: string;
  comentario?: string;
}

export interface DeliveryReviewData {
  estado: "aprobada" | "rechazada";
  feedback?: string;
  rating?: number;
}

export interface DeliveryReviewResponse extends Delivery {
  delta_elo?: number;
  delta_xp?: number;
  nuevas_insignias?: Array<{ id: UUID; nombre: string; imagen_url?: string }>;
  subio_nivel?: boolean;
  nivel_actual?: number;
  xp_en_nivel?: number;
  xp_para_siguiente_nivel?: number;
}

export interface Team {
  id: UUID;
  nombre: string;
  evento_id: UUID;
  descripcion?: string;
  created_at: string;
}

export interface CreateTeamData {
  evento_id: UUID;
  nombre: string;
  descripcion?: string;
}

export interface TeamMember {
  id: UUID;
  equipo_id: UUID;
  usuario_id: UUID;
  es_lider: boolean;
  fecha_ingreso: string;
}

// ─ API ────────────────────────────────────────────────────────────────────
export const assignmentsApi = {
  // Assignments
  listByTask: async (taskId: UUID): Promise<Assignment[]> => {
    const { data } = await apiClient.get<Assignment[]>(EP.TASK_ASSIGNMENTS(taskId));
    return data;
  },

  assign: async (taskId: UUID, payload: CreateAssignmentData): Promise<Assignment> => {
    const { data } = await apiClient.post<Assignment>(EP.TASK_ASSIGNMENTS(taskId), payload);
    return data;
  },

  update: async (id: UUID, payload: UpdateAssignmentData): Promise<Assignment> => {
    const { data } = await apiClient.patch<Assignment>(EP.ASSIGNMENT(id), payload);
    return data;
  },

  // Deliveries
  submitDelivery: async (
    assignmentId: UUID,
    payload: CreateDeliveryData
  ): Promise<Delivery> => {
    const { data } = await apiClient.post<Delivery>(EP.ASSIGNMENT_DELIVERY(assignmentId), payload);
    return data;
  },

  listDeliveriesByAssignment: async (assignmentId: UUID): Promise<Delivery[]> => {
    const { data } = await apiClient.get<Delivery[]>(EP.ASSIGNMENT_DELIVERIES(assignmentId));
    return data;
  },

  reviewDelivery: async (
    deliveryId: UUID,
    payload: DeliveryReviewData
  ): Promise<DeliveryReviewResponse> => {
    const { data } = await apiClient.patch<DeliveryReviewResponse>(
      EP.DELIVERY_REVIEW(deliveryId),
      payload
    );
    return data;
  },
};

export const teamsApi = {
  list: async (eventoId?: string): Promise<Team[]> => {
    const params = eventoId ? { evento_id: eventoId } : {};
    const { data } = await apiClient.get<Team[]>(EP.TEAMS, {
      params: Object.keys(params).length ? params : undefined,
    });
    return data;
  },

  create: async (payload: CreateTeamData): Promise<Team> => {
    const { data } = await apiClient.post<Team>(EP.TEAMS, payload);
    return data;
  },

  addMember: async (teamId: UUID, usuarioId: UUID, esLider = false): Promise<{ id: UUID; equipo_id: UUID; usuario_id: UUID; es_lider: boolean; fecha_ingreso: string }> => {
    const { data } = await apiClient.post(EP.TEAM_MEMBERS(teamId), { usuario_id: usuarioId, es_lider: esLider });
    return data;
  },

  listMembers: async (teamId: UUID): Promise<{ usuario_id: UUID }[]> => {
    const { data } = await apiClient.get(EP.TEAM_MEMBERS(teamId));
    return data;
  },

  get: async (id: UUID): Promise<Team> => {
    const { data } = await apiClient.get<Team>(EP.TEAM(id));
    return data;
  },
};
