import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";

export type EventEstado = "borrador" | "publicado" | "en_curso" | "finalizado" | "cancelado";

export interface EventApplication {
  id: string;
  usuario_id: string;
  evento_id: string;
  estado: string;
  mensaje_solicitud?: string;
  fecha_solicitud: string;
  fecha_respuesta?: string;
  nota_interna_organizador?: string;
  horas_acreditadas?: number;
  calificacion?: number;
  usuario_nombre?: string;
  usuario_email?: string;
}

export interface Event {
  id: string;
  organizacion_id: string;
  creador_id?: string;
  nombre: string;
  descripcion?: string;
  estado: EventEstado;
  fecha_inicio: string;
  fecha_fin: string;
  cupo_maximo: number;
  ubicacion_geo?: { lat?: number; lng?: number; direccion?: string };
  created_at?: string;
  updated_at?: string;
}

export interface CreateEventData {
  organizacion_id: string;
  nombre: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  cupo_maximo: number;
  ubicacion_geo?: { lat?: number; lng?: number; direccion?: string };
}

export interface UpdateEventData {
  nombre?: string;
  descripcion?: string;
  estado?: EventEstado;
  fecha_inicio?: string;
  fecha_fin?: string;
  cupo_maximo?: number;
  ubicacion_geo?: { lat?: number; lng?: number; direccion?: string };
}

interface BackendEvent {
  id: string;
  organizacion_id: string;
  creador_id?: string;
  titulo: string;
  descripcion?: string;
  estado: EventEstado;
  fecha_inicio: string;
  fecha_fin: string;
  cupo_maximo: number;
  ubicacion_geo?: { lat?: number; lng?: number; direccion?: string };
  created_at?: string;
  updated_at?: string;
}

function toEvent(dto: BackendEvent): Event {
  return {
    id: dto.id,
    organizacion_id: dto.organizacion_id,
    creador_id: dto.creador_id,
    nombre: dto.titulo,
    descripcion: dto.descripcion,
    estado: dto.estado,
    fecha_inicio: dto.fecha_inicio,
    fecha_fin: dto.fecha_fin,
    cupo_maximo: dto.cupo_maximo,
    ubicacion_geo: dto.ubicacion_geo,
    created_at: dto.created_at,
    updated_at: dto.updated_at,
  };
}

export const eventsApi = {
  /** Obtiene un evento por ID. */
  getById: async (eventId: string): Promise<Event> => {
    const { data } = await apiClient.get<BackendEvent>(`/eventos/${eventId}`);
    return toEvent(data);
  },

  /** Lista eventos. Si orgId es undefined, devuelve todos (para voluntario ver públicos). */
  list: async (orgId?: string): Promise<Event[]> => {
    const params = orgId ? { org_id: orgId } : {};
    const { data } = await apiClient.get<BackendEvent[]>('/eventos', { params });
    return data.map(toEvent);
  },

  apply: async (eventId: string, mensaje?: string): Promise<unknown> => {
    const { data } = await apiClient.post(`/eventos/${eventId}/solicitudes`, {
      mensaje_solicitud: mensaje ?? undefined,
    });
    return data;
  },

  listApplications: async (eventId: string, estado?: string): Promise<EventApplication[]> => {
    const params = estado ? { estado } : {};
    const { data } = await apiClient.get<EventApplication[]>(EP.EVENT_APPLICATIONS(eventId), {
      params: Object.keys(params).length ? params : undefined,
    });
    return data;
  },

  reviewApplication: async (
    solicitudId: string,
    payload: { estado: string; nota_interna_organizador?: string; horas_acreditadas?: number; calificacion?: number }
  ): Promise<EventApplication> => {
    const { data } = await apiClient.patch<EventApplication>(EP.APPLICATION(solicitudId), payload);
    return data;
  },

  create: async (payload: CreateEventData): Promise<Event> => {
    const { data } = await apiClient.post<BackendEvent>("/eventos", {
      organizacion_id: payload.organizacion_id,
      titulo: payload.nombre,
      descripcion: payload.descripcion,
      fecha_inicio: payload.fecha_inicio,
      fecha_fin: payload.fecha_fin,
      cupo_maximo: payload.cupo_maximo,
      ubicacion_geo: payload.ubicacion_geo,
    });
    return toEvent(data);
  },

  update: async (eventId: string, payload: UpdateEventData): Promise<Event> => {
    const body: Record<string, unknown> = {};
    if (payload.nombre != null) body.titulo = payload.nombre;
    if (payload.descripcion != null) body.descripcion = payload.descripcion;
    if (payload.estado != null) body.estado = payload.estado;
    if (payload.fecha_inicio != null) body.fecha_inicio = payload.fecha_inicio;
    if (payload.fecha_fin != null) body.fecha_fin = payload.fecha_fin;
    if (payload.cupo_maximo != null) body.cupo_maximo = payload.cupo_maximo;
    if (payload.ubicacion_geo != null) body.ubicacion_geo = payload.ubicacion_geo;
    const { data } = await apiClient.put<BackendEvent>(`/eventos/${eventId}`, body);
    return toEvent(data);
  },

  updateStatus: async (eventId: string, estado: EventEstado): Promise<Event> => {
    const { data } = await apiClient.put<BackendEvent>(`/eventos/${eventId}`, {
      estado,
    });
    return toEvent(data);
  },
};
