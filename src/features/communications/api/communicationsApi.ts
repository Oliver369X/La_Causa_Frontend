import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

// ─ Types ──────────────────────────────────────────────────────────────────
export type NotificationType = "info" | "warning" | "success" | "error" | "event" | "task" | "system";

export interface Notification {
  id: UUID;
  destinatario_id?: UUID;
  usuario_id?: UUID;
  titulo: string;
  mensaje: string;
  tipo: NotificationType | string;
  leida?: boolean;
  estado?: string;
  url_accion?: string;
  created_at: string;
}

export interface CreateNotificationData {
  destinatario_id: UUID;
  titulo: string;
  mensaje: string;
  tipo?: NotificationType;
  url_accion?: string;
}

function normalizeNotification(raw: Record<string, unknown>): Notification {
  const leida = "leida" in raw && typeof raw.leida === "boolean"
    ? raw.leida
    : ("estado" in raw && raw.estado === "leida");
  return {
    id: raw.id as UUID,
    destinatario_id: (raw.destinatario_id ?? raw.usuario_id) as UUID,
    usuario_id: raw.usuario_id as UUID | undefined,
    titulo: raw.titulo as string,
    mensaje: raw.mensaje as string,
    tipo: (raw.tipo as string) ?? "system",
    leida,
    estado: raw.estado as string | undefined,
    url_accion: raw.url_accion as string | undefined,
    created_at: raw.created_at as string,
  };
}

// ─ API ────────────────────────────────────────────────────────────────────
export const communicationsApi = {
  list: async (): Promise<Notification[]> => {
    const { data } = await apiClient.get<Record<string, unknown>[]>(EP.NOTIFICATIONS);
    return (data ?? []).map(normalizeNotification);
  },

  send: async (payload: CreateNotificationData): Promise<Notification> => {
    const { data } = await apiClient.post<Notification>(EP.NOTIFICATIONS, payload);
    return data;
  },

  markRead: async (id: UUID): Promise<Notification> => {
    const { data } = await apiClient.patch<Notification>(EP.NOTIFICATION_READ(id));
    return data;
  },

  delete: async (id: UUID): Promise<void> => {
    await apiClient.delete(`${EP.NOTIFICATIONS}/${id}`);
  },

  markAllRead: async (ids: UUID[]): Promise<void> => {
    await Promise.all(ids.map((id) => apiClient.patch(EP.NOTIFICATION_READ(id))));
  },
};
