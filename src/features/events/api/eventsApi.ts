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

export interface VolunteerRetrospective {
  evento_id: string;
  usuario_id: string;
  que_bien: string;
  que_mejorar: string;
  accion: string;
  completado_at?: string | null;
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
  /** Campaña o proyecto (agrupación lógica, sin entidad separada). */
  campana?: string | null;
  ubicacion_geo?: { lat?: number; lng?: number; direccion?: string };
  temporada_id?: string | null;
  created_at?: string;
  updated_at?: string;
  mi_estado_solicitud?: string | null;
}

export interface CreateEventData {
  organizacion_id: string;
  nombre: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  cupo_maximo: number;
  campana?: string | null;
  ubicacion_geo?: { lat?: number; lng?: number; direccion?: string };
}

export interface UpdateEventData {
  nombre?: string;
  descripcion?: string;
  estado?: EventEstado;
  fecha_inicio?: string;
  fecha_fin?: string;
  cupo_maximo?: number;
  campana?: string | null;
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
  campana?: string | null;
  ubicacion_geo?: { lat?: number; lng?: number; direccion?: string };
  temporada_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Converts a datetime-local string ("YYYY-MM-DDTHH:mm") to a full ISO 8601
 * string with the local timezone offset ("YYYY-MM-DDTHH:mm:ss±HH:MM").
 * This ensures the backend (which uses UTC) receives the correct moment in time.
 */
function localToIso(datetimeLocal: string): string {
  const d = new Date(datetimeLocal);
  const off = -d.getTimezoneOffset(); // minutes
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${hh}:${mm}`
  );
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
    campana: dto.campana ?? undefined,
    ubicacion_geo: dto.ubicacion_geo,
    temporada_id: dto.temporada_id,
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

  /** Lista eventos. Sin orgId solo muestra eventos no-borrador (públicos). */
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
      fecha_inicio: localToIso(payload.fecha_inicio),
      fecha_fin: localToIso(payload.fecha_fin),
      cupo_maximo: payload.cupo_maximo,
      campana: payload.campana?.trim() || null,
      ubicacion_geo: payload.ubicacion_geo,
    });
    return toEvent(data);
  },

  update: async (eventId: string, payload: UpdateEventData): Promise<Event> => {
    const body: Record<string, unknown> = {};
    if (payload.nombre != null) body.titulo = payload.nombre;
    if (payload.descripcion != null) body.descripcion = payload.descripcion;
    if (payload.estado != null) body.estado = payload.estado;
    if (payload.fecha_inicio != null) body.fecha_inicio = localToIso(payload.fecha_inicio);
    if (payload.fecha_fin != null) body.fecha_fin = localToIso(payload.fecha_fin);
    if (payload.cupo_maximo != null) body.cupo_maximo = payload.cupo_maximo;
    if (payload.campana !== undefined) body.campana = payload.campana?.trim() || null;
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

  getMyFeedbackObligations: async (
    eventId: string
  ): Promise<Array<{ evento_id: string; tipo: string; estado: string }>> => {
    const { data } = await apiClient.get(`/eventos/${eventId}/mis-obligaciones-feedback`);
    return data;
  },

  submitVoluntarioRetro: async (
    eventId: string,
    payload: { que_bien: string; que_mejorar: string; accion: string }
  ): Promise<void> => {
    await apiClient.post(`/eventos/${eventId}/retro-voluntario`, payload);
  },

  getMyVoluntarioRetro: async (eventId: string): Promise<VolunteerRetrospective | null> => {
    try {
      const { data } = await apiClient.get<VolunteerRetrospective>(
        `/eventos/${eventId}/mi-retro-voluntario`,
      );
      return data;
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } })?.response?.status === 404) return null;
      throw error;
    }
  },

  listVolunteerRetrospectives: async (eventId: string): Promise<VolunteerRetrospective[]> => {
    const { data } = await apiClient.get<VolunteerRetrospective[]>(
      `/eventos/${eventId}/retros-voluntarios`
    );
    return data;
  },

  delete: async (eventId: string): Promise<void> => {
    await apiClient.delete(`/eventos/${eventId}`);
  },

  addOrganizer: async (eventId: string, userId: string): Promise<any> => {
    const { data } = await apiClient.post(`/eventos/${eventId}/organizadores/${userId}`);
    return data;
  },

  removeOrganizer: async (eventId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/eventos/${eventId}/organizadores/${userId}`);
  },
};
