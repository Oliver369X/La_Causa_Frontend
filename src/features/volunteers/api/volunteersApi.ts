import axios, { isAxiosError } from "axios";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/shared/store/authStore";

// ML router lives at /api/match (not /api/v1)
const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/api\/v1\/?$/, "");
const mlClient = axios.create({ baseURL: `${SERVER_URL}/api`, headers: { "Content-Type": "application/json" } });
mlClient.interceptors.request.use((config) => {
  const { token, activeOrgId } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (activeOrgId) config.headers["X-Org-Id"] = activeOrgId;
  return config;
});

export interface Member {
  usuario_avatar_url?: string | null;
  xp_total?: number;
  elo_score?: number;
  rango?: string;
  tareas_completadas?: number;
  id: string;
  usuario_id: string;
  organizacion_id: string;
  es_propietario: boolean;
  fecha_ingreso: string;
  /** Backend usa español: activo | suspendido | retirado */
  estado_membresia: string;
  /** Rol en la org: voluntario | coordinador | admin | organizador */
  rol_slug?: string | null;
  usuario_nombre?: string;
  usuario_email?: string;
}

export type Volunteer = Member;

/** Miembros con rol de voluntario (excluye staff/propietarios). */
export function isVolunteerMember(m: Member): boolean {
  if (m.es_propietario) return false;
  const slug = (m.rol_slug || "voluntario").toLowerCase();
  return slug === "voluntario";
}

export function filterVolunteerMembers(members: Member[]): Member[] {
  return members.filter(
    (m) => m.estado_membresia === "activo" && isVolunteerMember(m)
  );
}

export interface SkillRequirement {
  skill_id: string;
  skill_name: string;
  min_level: number;
  critical?: boolean;
}

export interface MatchRequest {
  evento_id: string;
  tipo_evento: string;
  skills_requeridas: SkillRequirement[];
  fecha: string;
  hora_inicio?: number;
  duracion_horas?: number;
  ubicacion_lat?: number;
  ubicacion_lon?: number;
  voluntarios_necesarios?: number;
  candidatos_ids: string[];
  force_phase?: 1 | 2 | 3;
}

export interface VolunteerMatchResult {
  voluntario_id: string;
  nombre: string;
  match_score: number;
  skills_cumplidas: string[];
  skills_faltantes: string[];
  confianza: "high" | "medium" | "low";
  explanation?: string;
  /** Sub-puntuaciones 0–100 (motor de ponderación explicable). */
  breakdown?: Partial<Record<string, number>> | null;
}

export interface MatchResponse {
  evento_id: string;
  fase_usada: number;
  total_candidatos: number;
  ranking: VolunteerMatchResult[];
  advertencias: string[];
}

export const volunteersApi = {
  listMembers: async (orgId: string): Promise<Volunteer[]> => {
    const { data } = await apiClient.get<Volunteer[]>(`/organizaciones/${orgId}/miembros`);
    return data;
  },

  match: async (payload: MatchRequest): Promise<MatchResponse> => {
    try {
      const { data } = await mlClient.post<MatchResponse>("/match", payload);
      return data;
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data) {
        const body = err.response.data as { detail?: unknown };
        const d = body.detail;
        if (Array.isArray(d)) {
          const msg = d
            .map(
              (x: { loc?: (string | number)[]; msg?: string }) =>
                `${(x.loc ?? []).join(".")}: ${x.msg ?? ""}`
            )
            .join("; ");
          throw new Error(msg || "Error de validación (422)");
        }
        if (typeof d === "string") throw new Error(d);
      }
      throw err;
    }
  },

  matchTask: async (taskId: string): Promise<MatchResponse> => {
    const { data } = await mlClient.post<MatchResponse>(`/match/task/${taskId}`);
    return data;
  },
};
