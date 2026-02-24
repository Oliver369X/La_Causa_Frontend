import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

export interface PermisosResponse {
  permisos: string[];
}

export const permisosApi = {
  getMis: async (orgId: UUID): Promise<string[]> => {
    const { data } = await apiClient.get<PermisosResponse>(EP.PERMISOS_MIS(orgId));
    return data.permisos ?? [];
  },
};
