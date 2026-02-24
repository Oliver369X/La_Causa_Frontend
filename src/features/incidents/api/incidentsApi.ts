/**
 * Incidents feature — reporta incidencias al backend.
 * El backend notifica automáticamente a los admins de la organización del evento.
 */
import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentTipo = "logistica" | "seguridad" | "tecnico" | "conducta" | "otro";
export type IncidentStatus = "open" | "in_review" | "resolved" | "closed";

export interface Incident {
  id: UUID;
  titulo: string;
  descripcion: string;
  evento_id?: UUID;
  reportado_por: UUID;
  severidad: IncidentSeverity;
  estado: IncidentStatus;
  created_at: string;
  updated_at?: string;
}

export interface CreateIncidentData {
  evento_id: UUID;
  titulo: string;
  descripcion: string;
  tipo?: IncidentTipo;
  severidad?: IncidentSeverity;
}

export interface IncidentResponse {
  id: UUID;
  evento_id: UUID;
  reportada_por: UUID;
  tipo: string;
  titulo: string;
  descripcion: string;
  estado: string;
  created_at: string;
  updated_at: string;
}

/**
 * Reporta una incidencia. El backend notifica automáticamente a los admins de la org del evento.
 */
export const incidentsApi = {
  report: async (payload: CreateIncidentData): Promise<IncidentResponse> => {
    const { data } = await apiClient.post<IncidentResponse>(EP.INCIDENCIAS, {
      evento_id: payload.evento_id,
      tipo: payload.tipo ?? "otro",
      titulo: payload.titulo,
      descripcion: payload.descripcion,
    });
    return data;
  },
};
