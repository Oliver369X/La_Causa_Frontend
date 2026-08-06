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
  entidad_tipo?: string | null;
  entidad_id?: string | null;
  created_at: string;
}

/** Resuelve el destino de una notificación accionable desde cualquier vista. */
export function getNotificationHref(notification: Notification): string | null {
  if (notification.url_accion) return notification.url_accion;
  const entityType = notification.entidad_tipo;
  if ((entityType === "evento_feedback_ml") && notification.entidad_id) {
    return `/dashboard/events/${notification.entidad_id}/feedback-ml`;
  }
  if ((entityType === "evento_retro_voluntario") && notification.entidad_id) {
    return `/dashboard/events/${notification.entidad_id}/retro-voluntario`;
  }
  if (entityType === "tarea_asignacion") {
    return "/dashboard/tasks";
  }
  if (["tarea", "task"].includes(entityType ?? "")) {
    return notification.entidad_id
      ? `/dashboard/tasks/${notification.entidad_id}`
      : "/dashboard/tasks";
  }
  if (entityType === "recompensa") {
    const xp = notification.mensaje.match(/\+(\d+) XP/i)?.[1];
    const elo = notification.mensaje.match(/([+-]\d+) ELO/i)?.[1];
    const taskTitle = notification.mensaje.match(/de "([^"]+)"/)?.[1];
    const params = new URLSearchParams({ celebration: "reward" });
    if (xp) params.set("xp", xp);
    if (elo) params.set("elo", elo);
    if (taskTitle) params.set("task", taskTitle);
    return `/dashboard/gamification?${params.toString()}`;
  }
  if (entityType === "insignia" && notification.entidad_id) {
    return `/dashboard/gamification?badge_id=${notification.entidad_id}`;
  }
  if (entityType === "certificado" && notification.entidad_id) {
    return "/dashboard/certificates";
  }
  if (entityType === "evento_solicitud_recibida" && notification.entidad_id) {
    return `/dashboard/events/${notification.entidad_id}?tab=solicitudes`;
  }
  if (["evento_solicitud", "evento_solicitud_resultado"].includes(entityType ?? "") && notification.entidad_id) {
    return `/dashboard/events/${notification.entidad_id}`;
  }
  if (entityType === "solicitud_membresia" && notification.entidad_id) {
    return "/dashboard/volunteers";
  }
  return null;
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
    entidad_tipo: (raw.entidad_tipo as string | null | undefined) ?? null,
    entidad_id: (raw.entidad_id as string | null | undefined) ?? null,
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
