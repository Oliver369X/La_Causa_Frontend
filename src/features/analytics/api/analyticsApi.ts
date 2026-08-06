import { apiClient } from "@/shared/api/client";

export interface DashboardStats {
  total_volunteers: number;
  active_events: number;
  total_events: number;
  total_tasks: number;
  tasks_completed: number;
  tasks_pending: number;
  average_rating: number | null;
  /** % voluntarios con ≥2 eventos aprobados en el periodo (sobre quienes tienen ≥1) */
  volunteer_retention_pct: number | null;
  /** Proxy: % asignaciones activas que culminan en tarea completada */
  assignment_precision_pct: number | null;
  /** Horas acreditadas en certificados (no revocados) en el periodo */
  impact_hours_total: number;
  /** Promedio segundos entre evidencia y revisión (entregas aprobadas) */
  mtta_audit_seconds: number | null;
  /** Skills nuevas en el periodo / voluntarios activos */
  skills_new_avg_per_volunteer: number | null;
}

export interface DashboardComparison {
  current: DashboardStats;
  previous: DashboardStats;
  start_date: string;
  end_date: string;
  previous_start_date: string;
  previous_end_date: string;
}

export interface EventAnalytics {
  evento_id: string;
  titulo: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  voluntarios_registrados: number;
  tareas_totales: number;
  tareas_completadas: number;
  entregas_aprobadas: number;
  entregas_rechazadas: number;
  horas_voluntarias: number;
  xp_generada: number;
  elo_maximo: number;
  mejor_voluntario: EventVolunteerAnalytics | null;
  gastos_por_moneda: Record<string, number>;
  tareas: EventTaskAnalytics[];
  voluntarios: EventVolunteerAnalytics[];
}

export interface EventTaskAnalytics {
  tarea_id: string;
  titulo: string;
  estado: string;
  asignaciones: number;
  completadas: number;
  gastos: Record<string, number>;
}

export interface EventVolunteerAnalytics {
  usuario_id: string;
  nombre: string;
  estado_evento: string;
  tareas_asignadas: number;
  tareas_completadas: number;
  elo: number;
  xp: number;
  calificacion: number | null;
  horas: number;
}

export interface EventExpense {
  id: string;
  evento_id: string;
  tarea_id?: string | null;
  categoria: string;
  descripcion: string;
  cantidad: number;
  costo_unitario: number;
  total: number;
  moneda: string;
  estado: string;
  comprobante_url?: string | null;
}

export interface Notification {
  id: string;
  usuario_id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

interface RawDashboardStats {
  total_eventos: number;
  eventos_activos: number;
  total_voluntarios: number;
  total_tareas: number;
  tareas_completadas: number;
  promedio_calificacion: number | null;
  tasa_retencion_voluntarios?: number | null;
  precision_asignacion_pct?: number | null;
  horas_impacto_acumuladas?: number;
  mtta_auditoria_segundos?: number | null;
  skills_nuevas_promedio_voluntario?: number | null;
}

interface RawDashboardComparison {
  periodo_actual: RawDashboardStats;
  periodo_anterior: RawDashboardStats;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_inicio_anterior: string;
  fecha_fin_anterior: string;
}

const toDashboardStats = (raw: RawDashboardStats): DashboardStats => {
  const totalTasks = raw.total_tareas ?? 0;
  const tasksCompleted = raw.tareas_completadas ?? 0;
  const tasksPending = Math.max(0, totalTasks - tasksCompleted);
  return {
    total_volunteers: raw.total_voluntarios ?? 0,
    active_events: raw.eventos_activos ?? 0,
    total_events: raw.total_eventos ?? 0,
    total_tasks: totalTasks,
    tasks_completed: tasksCompleted,
    tasks_pending: tasksPending,
    average_rating: raw.promedio_calificacion ?? null,
    volunteer_retention_pct: raw.tasa_retencion_voluntarios ?? null,
    assignment_precision_pct: raw.precision_asignacion_pct ?? null,
    impact_hours_total: Number(raw.horas_impacto_acumuladas ?? 0),
    mtta_audit_seconds: raw.mtta_auditoria_segundos ?? null,
    skills_new_avg_per_volunteer: raw.skills_nuevas_promedio_voluntario ?? null,
  };
};

export const analyticsApi = {
  dashboard: async (
    orgId: string,
    startDate?: string,
    endDate?: string
  ): Promise<DashboardStats> => {
    const { data } = await apiClient.get<RawDashboardStats>(`/analytics/dashboard/${orgId}`, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
    return toDashboardStats(data);
  },

  dashboardComparison: async (
    orgId: string,
    startDate: string,
    endDate: string
  ): Promise<DashboardComparison> => {
    const { data } = await apiClient.get<RawDashboardComparison>(
      `/analytics/dashboard/${orgId}/comparativo`,
      { params: { start_date: startDate, end_date: endDate } }
    );
    return {
      current: toDashboardStats(data.periodo_actual),
      previous: toDashboardStats(data.periodo_anterior),
      start_date: data.fecha_inicio,
      end_date: data.fecha_fin,
      previous_start_date: data.fecha_inicio_anterior,
      previous_end_date: data.fecha_fin_anterior,
    };
  },

  event: async (eventId: string): Promise<EventAnalytics> => {
    const { data } = await apiClient.get<EventAnalytics>(`/analytics/events/${eventId}`);
    return data;
  },

  listExpenses: async (eventId: string): Promise<EventExpense[]> => {
    const { data } = await apiClient.get<EventExpense[]>(`/eventos/${eventId}/gastos`);
    return data;
  },

  createExpense: async (eventId: string, payload: {
    categoria: string;
    descripcion: string;
    cantidad: number;
    costo_unitario: number;
    moneda?: string;
    tarea_id?: string | null;
    estado?: string;
  }): Promise<EventExpense> => {
    const { data } = await apiClient.post<EventExpense>(`/eventos/${eventId}/gastos`, payload);
    return data;
  },

  notifications: async (): Promise<Notification[]> => {
    const { data } = await apiClient.get<Notification[]>('/notificaciones');
    return data;
  },

  markRead: async (notifId: string): Promise<Notification> => {
    const { data } = await apiClient.patch<Notification>(`/notificaciones/${notifId}/leer`);
    return data;
  },
};
