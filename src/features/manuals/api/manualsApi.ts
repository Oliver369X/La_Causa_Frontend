import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";

export interface ManualAceptacion {
  id: string;
  manual_id: string;
  usuario_id: string;
  fecha_aceptacion: string;
}

export interface Manual {
  id: string;
  organizacion_id: string;
  evento_id: string | null;
  creado_por: string;
  titulo: string;
  descripcion: string;
  url_documento: string;
  requiere_aceptacion: boolean;
  created_at: string;
  aceptaciones: ManualAceptacion[];
}

export interface CreateManualPayload {
  titulo: string;
  descripcion: string;
  url_documento: string;
  requiere_aceptacion: boolean;
  evento_id?: string;
}

export const manualsApi = {
  list: async (orgId: string): Promise<Manual[]> => {
    const { data } = await apiClient.get<Manual[]>(EP.ORG_MANUALES(orgId));
    return data;
  },

  get: async (id: string): Promise<Manual> => {
    const { data } = await apiClient.get<Manual>(EP.MANUAL(id));
    return data;
  },

  create: async (orgId: string, payload: CreateManualPayload): Promise<Manual> => {
    const { data } = await apiClient.post<Manual>(EP.ORG_MANUALES(orgId), payload);
    return data;
  },

  accept: async (manualId: string): Promise<void> => {
    await apiClient.post(EP.MANUAL_ACCEPT(manualId));
  },
};
