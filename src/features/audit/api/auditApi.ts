import { apiClient } from "@/shared/api/client";

export interface AuditLog {
  id: string;
  actor_user_id?: string;
  organizacion_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  outcome: string;
  detail?: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
}

export interface AuditFilters {
  actor_user_id?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface GlobalAuditFilters {
  organizacion_id?: string;
  actor_user_id?: string;
  action?: string;
  outcome?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = {
  list: async (orgId: string, filters: AuditFilters = {}): Promise<AuditLog[]> => {
    const { data } = await apiClient.get<AuditLog[]>(`/auditoria/${orgId}`, {
      params: filters,
    });
    return data;
  },

  listGlobal: async (filters: GlobalAuditFilters = {}): Promise<AuditLog[]> => {
    const { data } = await apiClient.get<AuditLog[]>("/admin/auditoria", {
      params: filters,
    });
    return data;
  },
};
