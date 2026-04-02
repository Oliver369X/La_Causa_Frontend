import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

/** Respuesta de GET /permisos/mis — única fuente de verdad para UI y permisos efectivos. */
export interface PermisosContextResponse {
  permisos: string[];
  es_propietario: boolean;
}

export interface PermisosContext {
  permisos: string[];
  esPropietario: boolean;
}

export const permisosApi = {
  getMis: async (orgId: UUID): Promise<PermisosContext> => {
    const { data } = await apiClient.get<PermisosContextResponse>(EP.PERMISOS_MIS(orgId));
    return {
      permisos: data.permisos ?? [],
      esPropietario: Boolean(data.es_propietario),
    };
  },
};
