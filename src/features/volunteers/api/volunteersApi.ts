import axios from "axios";
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
  id: string;
  usuario_id: string;
  organizacion_id: string;
  es_propietario: boolean;
  fecha_ingreso: string;
  estado_membresia: string;
  usuario_nombre?: string;
  usuario_email?: string;
}

export type Volunteer = Member;

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
    const { data } = await mlClient.post<MatchResponse>("/match", payload);
    return data;
  },
};
