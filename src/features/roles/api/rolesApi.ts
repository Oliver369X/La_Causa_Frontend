import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

// ─ Types ──────────────────────────────────────────────────────────────────
export interface Role {
  id: UUID;
  nombre: string;
  slug: string;
  descripcion?: string;
  permisos: string[];
  es_sistema?: boolean;
  created_at: string;
}

export interface CreateRoleData {
  nombre: string;
  descripcion?: string;
  permisos?: string[];
}

export interface AssignRoleData {
  usuario_id: UUID;
  rol_id: UUID;
  organizacion_id: UUID;
}

// ─ API ────────────────────────────────────────────────────────────────────
export const rolesApi = {
  list: async (): Promise<Role[]> => {
    const { data } = await apiClient.get<Role[]>(EP.ROLES);
    return data;
  },

  create: async (payload: CreateRoleData): Promise<Role> => {
    const { data } = await apiClient.post<Role>(EP.ROLES, payload);
    return data;
  },

  delete: async (id: UUID): Promise<void> => {
    await apiClient.delete(`${EP.ROLES}/${id}`);
  },

  assign: async (payload: AssignRoleData): Promise<void> => {
    await apiClient.post(EP.ROLES_ASSIGN, payload);
  },
};
