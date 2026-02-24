/**
 * Manuals / Knowledge Base feature.
 * No dedicated backend endpoint yet — content is stored locally and
 * can be exported as PDF from the UI.
 */
import type { UUID } from "@/shared/types";

export type ManualCategory = "onboarding" | "operations" | "safety" | "hr" | "technical" | "other";

export interface ManualSection {
  id: UUID;
  titulo: string;
  contenido: string;
  orden: number;
}

export interface Manual {
  id: UUID;
  titulo: string;
  categoria: ManualCategory;
  descripcion?: string;
  version: string;
  publicado: boolean;
  secciones: ManualSection[];
  organizacion_id: UUID;
  autor_id: UUID;
  created_at: string;
  updated_at?: string;
}

/**
 * Stub implementation — returns empty arrays until a backend endpoint
 * is available. Replace async functions with real apiClient calls.
 */
export const manualsApi = {
  list: async (_orgId: UUID): Promise<Manual[]> => {
    return [];
  },

  get: async (_id: UUID): Promise<Manual | null> => {
    return null;
  },

  create: async (_payload: Omit<Manual, "id" | "created_at">): Promise<Manual> => {
    throw new Error("Manuals backend endpoint not yet implemented.");
  },
};
