import { apiClient } from "@/shared/api/client";

export interface AdminOrgSubscription {
  id: string;
  estado: string;
  frecuencia: string;
  plan_id: string | null;
  plan_slug: string | null;
  plan_nombre: string | null;
  precio_pactado: number;
}

export interface AdminOrganization {
  id: string;
  nombre: string;
  slug: string;
  activo: boolean;
  fecha_creacion: string;
  suscripcion: AdminOrgSubscription | null;
}

export interface AdminListOrgsParams {
  only_active?: boolean;
  plan_slug?: string;
  estado_sub?: string;
}

export interface AdminUser {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  tipo: string;
  estado: boolean;
  fecha_registro: string;
  ultimo_login: string | null;
}

export interface AdminUserOrg {
  id: string;
  nombre: string;
  slug: string;
  es_propietario: boolean;
  estado_membresia: string;
}

export interface AdminUserDetail extends AdminUser {
  organizaciones: AdminUserOrg[];
}

export const adminApi = {
  listOrganizations: async (params?: AdminListOrgsParams): Promise<AdminOrganization[]> => {
    const { data } = await apiClient.get<AdminOrganization[]>("/admin/organizaciones", {
      params: params ?? {},
    });
    return data;
  },

  setOrganizationStatus: async (orgId: string, activo: boolean): Promise<void> => {
    await apiClient.patch(`/admin/organizaciones/${orgId}/estado?activo=${activo}`);
  },

  listUsers: async (params?: {
    search?: string;
    tipo?: string;
    estado?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AdminUser[]> => {
    const { data } = await apiClient.get<AdminUser[]>("/admin/usuarios", { params: params ?? {} });
    return data;
  },

  getUser: async (userId: string): Promise<AdminUserDetail> => {
    const { data } = await apiClient.get<AdminUserDetail>(`/admin/usuarios/${userId}`);
    return data;
  },

  setUserStatus: async (userId: string, estado: boolean): Promise<void> => {
    await apiClient.patch(`/admin/usuarios/${userId}/estado?estado=${estado}`);
  },

  getDashboard: async (): Promise<AdminDashboard> => {
    const { data } = await apiClient.get<AdminDashboard>("/admin/dashboard");
    return data;
  },

  createOrg: async (payload: { nombre: string; slug: string; owner_email?: string }): Promise<AdminOrganization> => {
    const params = payload.owner_email ? { owner_email: payload.owner_email } : {};
    const { data } = await apiClient.post<AdminOrganization>("/admin/organizaciones", {
      nombre: payload.nombre,
      slug: payload.slug,
    }, { params });
    return data;
  },

  setOrgSubscription: async (orgId: string, planId: string): Promise<void> => {
    await apiClient.patch(`/admin/organizaciones/${orgId}/suscripcion?plan_id=${planId}`);
  },

  createPlan: async (payload: PlanCreatePayload): Promise<PlanResponse> => {
    const { data } = await apiClient.post<PlanResponse>("/admin/planes", payload);
    return data;
  },

  updatePlan: async (planId: string, payload: Partial<PlanCreatePayload> & { activo?: boolean }): Promise<PlanResponse> => {
    const { data } = await apiClient.put<PlanResponse>(`/admin/planes/${planId}`, payload);
    return data;
  },

  setPlanStatus: async (planId: string, activo: boolean): Promise<void> => {
    await apiClient.patch(`/admin/planes/${planId}/estado?activo=${activo}`);
  },

  listPlans: async (includeInactive = true): Promise<PlanResponse[]> => {
    const { data } = await apiClient.get<PlanResponse[]>("/admin/planes", {
      params: { include_inactive: includeInactive },
    });
    return data;
  },
};

export interface AdminDashboard {
  total_organizaciones: number;
  organizaciones_activas: number;
  organizaciones_inactivas: number;
  total_usuarios: number;
  usuarios_voluntarios: number;
  usuarios_organizadores: number;
  mrr: number;
  suscripciones_por_plan: Record<string, number>;
  organizaciones_este_mes: number;
  usuarios_este_mes: number;
}

export interface PlanCreatePayload {
  nombre: string;
  slug: string;
  descripcion?: string;
  precio_mensual?: number;
  precio_anual?: number;
  max_voluntarios?: number;
  max_eventos_mes?: number;
}

export interface PlanResponse {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  precio_mensual: number;
  precio_anual: number | null;
  max_voluntarios: number;
  max_eventos_mes: number;
  activo: boolean;
}
