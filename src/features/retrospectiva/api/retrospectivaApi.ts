import { apiClient } from "@/shared/api/client";

export type ColumnaRetro = "bien" | "mejorar" | "accion";

export interface ItemRetro {
  id: string;
  retrospectiva_id: string;
  creado_por: string | null;
  es_anonimo: boolean;
  columna: ColumnaRetro;
  contenido: string;
  votos: number;
  created_at: string;
}

export interface Retrospectiva {
  id: string;
  evento_id: string;
  creada_por: string;
  cerrada: boolean;
  created_at: string;
  items: ItemRetro[];
}

export interface ItemRetroCreate {
  columna: ColumnaRetro;
  contenido: string;
  es_anonimo?: boolean;
}

export const retrospectivaApi = {
  getByEvent: async (eventId: string): Promise<Retrospectiva> => {
    const { data } = await apiClient.get<Retrospectiva>(`/eventos/${eventId}/retrospectiva`);
    return data;
  },

  create: async (eventId: string): Promise<Retrospectiva> => {
    const { data } = await apiClient.post<Retrospectiva>(`/eventos/${eventId}/retrospectiva`);
    return data;
  },

  addItem: async (retroId: string, payload: ItemRetroCreate): Promise<ItemRetro> => {
    const { data } = await apiClient.post<ItemRetro>(`/retrospectiva/${retroId}/items`, payload);
    return data;
  },

  voteItem: async (itemId: string): Promise<ItemRetro> => {
    const { data } = await apiClient.post<ItemRetro>(`/retrospectiva/items/${itemId}/voto`);
    return data;
  },

  close: async (retroId: string): Promise<Retrospectiva> => {
    const { data } = await apiClient.patch<Retrospectiva>(`/retrospectiva/${retroId}/cerrar`);
    return data;
  },
};
