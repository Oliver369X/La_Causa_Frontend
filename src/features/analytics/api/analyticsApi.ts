import { apiClient } from "@/shared/api/client";

export interface DashboardStats {
  total_volunteers: number;
  active_events: number;
  total_events: number;
  total_tasks: number;
  tasks_completed: number;
  tasks_pending: number;
  average_rating: number | null;
}

export interface DashboardComparison {
  current: DashboardStats;
  previous: DashboardStats;
  start_date: string;
  end_date: string;
  previous_start_date: string;
  previous_end_date: string;
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

  notifications: async (): Promise<Notification[]> => {
    const { data } = await apiClient.get<Notification[]>('/notificaciones');
    return data;
  },

  markRead: async (notifId: string): Promise<Notification> => {
    const { data } = await apiClient.patch<Notification>(`/notificaciones/${notifId}/leer`);
    return data;
  },
};
