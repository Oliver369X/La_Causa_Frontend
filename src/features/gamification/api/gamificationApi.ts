import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

// ─ Types ──────────────────────────────────────────────────────────────────
/** Backend ProfileResponse fields; frontend maps for display. */
export interface CompetitiveProfile {
  usuario_id: UUID;
  nombre?: string;
  avatar_url?: string;
  bio?: string;
  puntos_elo?: number;
  rango?: string;
  nivel?: number;
  racha_dias: number;
  eventos_completados?: number;
  tareas_completadas: number;
  insignias_total?: number;
  ultimo_evento?: string;
  /** Backend raw fields */
  elo_score?: number;
  xp_total?: number;
}

export interface Badge {
  id: UUID;
  nombre?: string;
  descripcion?: string;
  imagen_url?: string;
  criterio?: string;
  puntos?: number;
  rareza?: "common" | "uncommon" | "rare" | "epic" | "legendary";
  fecha_obtencion?: string;
  insignia_id?: UUID;
}

export interface Medal {
  id: UUID;
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  puntos: number;
  activa: boolean;
}

export interface RankingEntry {
  posicion: number;
  usuario_id: UUID;
  nombre: string;
  avatar_url?: string;
  puntos_elo?: number;
  elo_score?: number;
  rango?: string;
  eventos_mes?: number;
  xp_total?: number;
  tareas_completadas?: number;
}

export interface Season {
  id: UUID;
  organizacion_id?: string | null;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
}

export interface EloRange {
  id: UUID;
  nombre: string;
  min_elo: number;
  max_elo: number;
  color: string;
  icono?: string;
}

export interface HistoricalRankingEntry {
  id: string;
  temporada_id: string;
  perfil_id: string;
  posicion_final: number;
  elo_final: number;
  xp_acumulada: number;
  created_at: string;
}

export interface ConfigGamificacionOrg {
  id: string;
  organizacion_id: string;
  duracion_temporada_meses: number;
  tipo_reset_elo: string;
  factor_reset_elo: number;
  xp_base_tarea: number;
  xp_curve_mode: string;
  elo_min_actividad_temporada: number;
  permite_ranking_por_categoria: boolean;
  penalizaciones: Record<string, { impacto_xp?: boolean; impacto_elo?: boolean; valor?: number; tolerancia_minutos?: number }>;
  created_at: string;
  updated_at: string;
}

export interface ConfigGamificacionOrgUpdate {
  duracion_temporada_meses?: number;
  tipo_reset_elo?: string;
  factor_reset_elo?: number;
  xp_base_tarea?: number;
  xp_curve_mode?: string;
  elo_min_actividad_temporada?: number;
  permite_ranking_por_categoria?: boolean;
  penalizaciones?: Record<string, { impacto_xp?: boolean; impacto_elo?: boolean; valor?: number; tolerancia_minutos?: number }>;
}

// ─ API ────────────────────────────────────────────────────────────────────
export const gamificationApi = {
  getProfile: async (userId: UUID): Promise<CompetitiveProfile> => {
    const { data } = await apiClient.get(EP.PROFILE_COMPETITIVE(userId));
    const raw = data as Record<string, unknown>;
    return {
      usuario_id: raw.usuario_id as UUID,
      nombre: raw.nombre as string | undefined,
      avatar_url: raw.avatar_url as string | undefined,
      bio: raw.bio as string | undefined,
      puntos_elo: (raw.puntos_elo ?? raw.elo_score ?? 0) as number,
      rango: (raw.rango ?? "Principiante") as string,
      nivel: (raw.nivel ?? Math.floor(((raw.xp_total as number) ?? 0) / 100) + 1) as number,
      racha_dias: (raw.racha_dias ?? 0) as number,
      eventos_completados: (raw.eventos_completados ?? 0) as number,
      tareas_completadas: (raw.tareas_completadas ?? 0) as number,
      insignias_total: (raw.insignias_total ?? 0) as number,
      elo_score: raw.elo_score as number | undefined,
      xp_total: raw.xp_total as number | undefined,
    };
  },

  getBadges: async (userId: UUID): Promise<Badge[]> => {
    const { data } = await apiClient.get<Badge[]>(EP.PROFILE_BADGES(userId));
    return data;
  },

  /** Solo visible para miembros de la organización. Requiere organizacion_id. */
  getDisponibilidad: async (userId: UUID, organizacionId: string): Promise<{ disponibilidad_estado: "disponible" | "no_disponible" | "previo_consulta" }> => {
    const { data } = await apiClient.get(EP.PROFILE_DISPONIBILIDAD(userId, organizacionId));
    return data as { disponibilidad_estado: "disponible" | "no_disponible" | "previo_consulta" };
  },

  listMedals: async (organizacionId?: string): Promise<Medal[]> => {
    const params = organizacionId ? { organizacion_id: organizacionId } : {};
    const { data } = await apiClient.get<Medal[]>(EP.MEDALS, { params });
    return data;
  },

  getRanking: async (organizacionId?: string): Promise<RankingEntry[]> => {
    const params = organizacionId ? { organizacion_id: organizacionId } : {};
    const { data } = await apiClient.get<RankingEntry[]>(EP.RANKING, { params });
    return data;
  },

  /** Ranking histórico por temporada (no por usuario). */
  getHistoricalRanking: async (seasonId: UUID): Promise<HistoricalRankingEntry[]> => {
    const { data } = await apiClient.get<HistoricalRankingEntry[]>(EP.RANKING_HISTORY(seasonId));
    return data;
  },

  getSeasons: async (organizacionId?: string): Promise<Season[]> => {
    const params = organizacionId ? { organizacion_id: organizacionId } : {};
    const { data } = await apiClient.get<Season[]>(EP.SEASONS, { params });
    return data;
  },

  /** Cerrar temporada: snapshot ranking, soft reset ELO. */
  closeSeason: async (seasonId: UUID): Promise<Season> => {
    const { data } = await apiClient.patch<Season>(EP.SEASON_CLOSE(seasonId));
    return data;
  },

  getConfigGamificacion: async (organizacionId: string): Promise<ConfigGamificacionOrg> => {
    const { data } = await apiClient.get<ConfigGamificacionOrg>(EP.CONFIG_GAMIFICACION(organizacionId));
    return data;
  },

  updateConfigGamificacion: async (
    organizacionId: string,
    payload: Partial<ConfigGamificacionOrgUpdate>
  ): Promise<ConfigGamificacionOrg> => {
    const { data } = await apiClient.patch<ConfigGamificacionOrg>(
      EP.CONFIG_GAMIFICACION(organizacionId),
      payload
    );
    return data;
  },

  getEloRanges: async (): Promise<EloRange[]> => {
    const { data } = await apiClient.get<EloRange[]>(EP.ELO_RANGES);
    return data;
  },

  listCertificates: async (userId?: string): Promise<Certificate[]> => {
    const params = userId ? { user_id: userId } : {};
    const { data } = await apiClient.get<Certificate[]>(EP.CERTIFICATES, { params });
    return data;
  },
};

export interface Certificate {
  id: string;
  usuario_id: string;
  organizacion_id: string;
  temporada_id?: string;
  titulo: string;
  descripcion?: string;
  horas_acreditadas: number;
  url_pdf?: string;
  codigo_validacion: string;
  fecha_emision: string;
}

// ── Medallas por evento ────────────────────────────────────────────────────
export interface EventoBadgeCreateData {
  nombre: string;
  descripcion: string;
  url_imagen: string;
  rareza?: string;
  tipo: string;
  puntos_bonus?: number;
  da_xp?: boolean;
}

export interface EventoBadgeAwardData {
  usuario_id: string;
  insignia_id: string;
}

export const eventBadgesApi = {
  list: async (eventId: string) => {
    const { data } = await apiClient.get(EP.EVENT_MEDALS(eventId));
    return data;
  },
  create: async (eventId: string, payload: EventoBadgeCreateData) => {
    const { data } = await apiClient.post(EP.EVENT_MEDALS(eventId), payload);
    return data;
  },
  award: async (eventId: string, payload: EventoBadgeAwardData) => {
    const { data } = await apiClient.post(EP.EVENT_MEDALS_AWARD(eventId), payload);
    return data;
  },
};
