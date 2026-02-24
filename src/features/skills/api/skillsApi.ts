import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";

export interface Skill {
  id: string;
  nombre: string;
  categoria?: string;
  tipo?: "hard" | "soft" | "transversal";
  descripcion?: string;
}

export interface UserSkill {
  id: string;
  usuario_id: string;
  habilidad_id: string;
  nivel: number;
  created_at?: string;
  habilidad?: { id: string; nombre: string; descripcion?: string };
}

export const skillsApi = {
  list: async (): Promise<Skill[]> => {
    const { data } = await apiClient.get<Skill[]>(EP.SKILLS);
    return data;
  },

  getUserSkills: async (userId: string): Promise<UserSkill[]> => {
    const { data } = await apiClient.get<UserSkill[]>(EP.USER_SKILLS(userId));
    return data;
  },

  addUserSkill: async (userId: string, habilidadId: string, nivel?: number): Promise<UserSkill> => {
    const { data } = await apiClient.post<UserSkill>(EP.USER_SKILLS(userId), {
      habilidad_id: habilidadId,
      nivel: nivel ?? 1,
    });
    return data;
  },

  removeUserSkill: async (userId: string, habilidadId: string): Promise<void> => {
    await apiClient.delete(EP.USER_SKILL_REMOVE(userId, habilidadId));
  },
};
