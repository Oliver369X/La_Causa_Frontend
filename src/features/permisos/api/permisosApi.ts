import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

/** Respuesta de GET /permisos/mis — única fuente de verdad para UI y permisos efectivos. */
export interface PermisosContextResponse {
  permisos: string[];
  es_propietario: boolean;
  rol_slug?: string | null;
  puede_gestionar?: boolean;
}

export interface PermisosContext {
  permisos: string[];
  esPropietario: boolean;
  rolSlug: string | null;
  puedeGestionar: boolean;
}

export const permisosApi = {
  getMis: async (orgId: UUID): Promise<PermisosContext> => {
    const { data } = await apiClient.get<PermisosContextResponse>(EP.PERMISOS_MIS(orgId));
    return {
      permisos: data.permisos ?? [],
      esPropietario: Boolean(data.es_propietario),
      rolSlug: data.rol_slug ?? null,
      puedeGestionar: Boolean(data.puede_gestionar),
    };
  },
};
