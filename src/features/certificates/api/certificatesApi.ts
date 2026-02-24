import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

// ─ Types ──────────────────────────────────────────────────────────────────

export interface PlantillaCertificado {
  id: UUID;
  organizacion_id: UUID;
  nombre: string;
  descripcion: string | null;
  html_template: string;
  configuracion: Record<string, unknown>;
  version: number;
  activa: boolean;
  requiere_aprobacion: boolean;
  estado: string;
  creado_por: UUID | null;
  aprobado_por: UUID | null;
  created_at: string;
  updated_at: string;
}

export interface PlantillaCertificadoCreate {
  nombre: string;
  descripcion?: string | null;
  html_template: string;
  configuracion?: Record<string, unknown>;
  requiere_aprobacion?: boolean;
}

export interface PlantillaCertificadoUpdate {
  nombre?: string;
  descripcion?: string | null;
  html_template?: string;
  configuracion?: Record<string, unknown>;
  activa?: boolean;
  requiere_aprobacion?: boolean;
  estado?: string;
}

/** Backend CertificateResponse — por temporada (fin de temporada). */
export interface Certificate {
  id: UUID;
  usuario_id: UUID;
  organizacion_id: UUID;
  temporada_id: UUID | null;
  plantilla_id?: UUID | null;
  evento_id?: UUID | null;
  titulo: string;
  descripcion: string | null;
  horas_acreditadas: number;
  url_pdf: string | null;
  codigo_validacion: UUID;
  fecha_emision: string;
  estado?: string;
  qr_code_url?: string | null;
  public_share_url?: string | null;
  gestion_periodo?: string | null;
}

export interface CreateCertificateData {
  usuario_id: UUID;
  organizacion_id: UUID;
  temporada_id?: UUID | null;
  titulo: string;
  descripcion?: string | null;
  horas_acreditadas?: number;
  url_pdf?: string | null;
}

export interface CertificateUpdateData {
  titulo?: string;
  descripcion?: string | null;
  horas_acreditadas?: number;
  url_pdf?: string | null;
  temporada_id?: UUID | null;
}

export interface CertificateVerification {
  valido: boolean;
  certificado?: Certificate;
  mensaje: string;
}

// ─ API ────────────────────────────────────────────────────────────────────
export const certificatesApi = {
  list: async (params?: { user_id?: UUID; temporada_id?: UUID; organizacion_id?: UUID }): Promise<Certificate[]> => {
    const { data } = await apiClient.get<Certificate[]>(EP.CERTIFICATES, { params: params ?? {} });
    return data;
  },

  get: async (id: UUID): Promise<Certificate> => {
    const { data } = await apiClient.get<Certificate>(EP.CERTIFICATE(id));
    return data;
  },

  create: async (payload: CreateCertificateData): Promise<Certificate> => {
    const { data } = await apiClient.post<Certificate>(EP.CERTIFICATES, payload);
    return data;
  },

  update: async (id: UUID, payload: CertificateUpdateData): Promise<Certificate> => {
    const { data } = await apiClient.patch<Certificate>(EP.CERTIFICATE(id), payload);
    return data;
  },

  delete: async (id: UUID): Promise<void> => {
    await apiClient.delete(EP.CERTIFICATE(id));
  },

  verify: async (code: string): Promise<Certificate> => {
    const { data } = await apiClient.get<Certificate>(EP.CERTIFICATE_VERIFY(code));
    return data;
  },

  share: async (id: UUID, canal: string): Promise<{ url: string; canal: string; mensaje_sugerido: string }> => {
    const { data } = await apiClient.post<{ url: string; canal: string; mensaje_sugerido: string }>(
      EP.CERTIFICATE_SHARE(id),
      { canal }
    );
    return data;
  },
};

// ─ Plantillas ───────────────────────────────────────────────────────────────
export const plantillasCertificadoApi = {
  list: async (orgId: UUID, soloActivas = false): Promise<PlantillaCertificado[]> => {
    const { data } = await apiClient.get<PlantillaCertificado[]>(EP.PLANTILLAS_CERT(orgId), {
      params: { solo_activas: soloActivas },
    });
    return data;
  },

  get: async (id: UUID): Promise<PlantillaCertificado> => {
    const { data } = await apiClient.get<PlantillaCertificado>(EP.PLANTILLA_CERT(id));
    return data;
  },

  create: async (orgId: UUID, payload: PlantillaCertificadoCreate): Promise<PlantillaCertificado> => {
    const { data } = await apiClient.post<PlantillaCertificado>(EP.PLANTILLAS_CERT(orgId), payload);
    return data;
  },

  update: async (id: UUID, payload: PlantillaCertificadoUpdate): Promise<PlantillaCertificado> => {
    const { data } = await apiClient.patch<PlantillaCertificado>(EP.PLANTILLA_CERT(id), payload);
    return data;
  },

  delete: async (id: UUID): Promise<void> => {
    await apiClient.delete(EP.PLANTILLA_CERT(id));
  },

  preview: async (id: UUID, datosPrueba: Record<string, string>): Promise<{ html: string; configuracion: Record<string, unknown> }> => {
    const { data } = await apiClient.post<{ html: string; configuracion: Record<string, unknown> }>(
      EP.PLANTILLA_PREVIEW(id),
      datosPrueba
    );
    return data;
  },
};
