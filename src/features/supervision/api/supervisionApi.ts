/**
 * Supervision feature — re-exports the agent API for supervisory use cases
 * and adds analytics helpers for monitoring volunteer/task activity.
 */
export { agentApi } from "@/features/agent/api/agentApi";
export type { ChatMessage, ChatResponse, ConfirmationPayload } from "@/features/agent/api/agentApi";

import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

export interface SupervisionDashboard {
  org_id: UUID;
  total_voluntarios: number;
  voluntarios_activos: number;
  tareas_pendientes: number;
  tareas_vencidas: number;
  eventos_proximos: number;
  tasa_completado: number;
}

export const supervisionApi = {
  getDashboard: async (orgId: UUID): Promise<SupervisionDashboard> => {
    const { data } = await apiClient.get<SupervisionDashboard>(EP.ANALYTICS_DASHBOARD(orgId));
    return data;
  },
};
