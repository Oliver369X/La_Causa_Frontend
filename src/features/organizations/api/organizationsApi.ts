import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";

export interface Organization {
  id: string;
  slug?: string;
  nombre: string;
  descripcion?: string;
  sector?: string;
  pais?: string;
  sitio_web?: string;
  logo_url?: string;
  normas?: OrgNormas;
}

export interface MembershipRequest {
  id: string;
  organizacion_id: string;
  estado: string;
  mensaje?: string;
}

/** Config dinámica de la org: perfil público, términos, políticas (JSON flexible). */
export interface OrgNormas {
  terminos_servicio?: string;
  politicas?: string[];
  perfil_publico?: {
    mision?: string;
    vision?: string;
    objetivos?: string[];
    redes?: Record<string, string>;
    [key: string]: unknown;
  };
  visibilidad?: {
    mostrar_mision?: boolean;
    mostrar_vision?: boolean;
    mostrar_objetivos?: boolean;
    mostrar_redes?: boolean;
    mostrar_eventos?: boolean;
    /** Ranking de voluntarios de la org (ELO) en la página pública /org/[slug] */
    mostrar_ranking?: boolean;
    [key: string]: unknown;
  };
  personalizacion?: {
    color_primario?: string;
    color_secundario?: string;
    banner_url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CreateOrgData {
  nombre: string;
  descripcion?: string;
}

function toSlug(input: string): string {
  const normalized = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${normalized || "org"}-${suffix}`;
}

export const organizationsApi = {
  get: async (orgId: string): Promise<Organization> => {
    const { data } = await apiClient.get<Organization>(`/organizaciones/${orgId}`);
    return data;
  },

  update: async (orgId: string, payload: Partial<Organization>): Promise<Organization> => {
    const { data } = await apiClient.put<Organization>(`/organizaciones/${orgId}`, payload);
    return data;
  },

  listPublic: async (): Promise<Organization[]> => {
    const { data } = await apiClient.get<Organization[]>(EP.ORGS_PUBLICAS);
    return data;
  },

  getPublic: async (orgId: string): Promise<Organization> => {
    const { data } = await apiClient.get<Organization>(EP.ORG_PUBLIC(orgId));
    return data;
  },

  getPublicBySlug: async (slug: string): Promise<Organization> => {
    const { data } = await apiClient.get<Organization>(EP.ORG_PUBLIC_BY_SLUG(slug));
    return data;
  },

  solicitarUnirse: async (orgId: string, terminosAceptados: boolean, mensaje?: string) => {
    const { data } = await apiClient.post(EP.ORG_SOLICITUDES(orgId), {
      terminos_aceptados: terminosAceptados,
      mensaje: mensaje ?? undefined,
    });
    return data;
  },

  list: async (): Promise<Organization[]> => {
    const { data } = await apiClient.get<Organization[]>("/organizaciones");
    return data;
  },

  listMySolicitudes: async (): Promise<MembershipRequest[]> => {
    const { data } = await apiClient.get<MembershipRequest[]>(EP.SOLICITUDES_MIS);
    return data;
  },

  create: async (payload: CreateOrgData): Promise<Organization> => {
    const { data } = await apiClient.post<Organization>("/organizaciones", {
      ...payload,
      slug: toSlug(payload.nombre),
    });
    return data;
  },

  addMember: async (orgId: string, userId: string) => {
    const { data } = await apiClient.post(`/organizaciones/${orgId}/miembros`, { usuario_id: userId });
    return data;
  },

  /** Voluntario abandona una organización (o organizador elimina a un miembro). */
  leaveOrganization: async (orgId: string, userId: string) => {
    await apiClient.delete(EP.ORG_MEMBER(orgId, userId));
  },

  listSolicitudes: async (orgId: string) => {
    const { data } = await apiClient.get(EP.ORG_SOLICITUDES(orgId));
    return data;
  },

  reviewSolicitud: async (solicitudId: string, estado: "aprobada" | "rechazada") => {
    const { data } = await apiClient.patch(EP.SOLICITUD_REVIEW(solicitudId), { estado });
    return data;
  },
};
