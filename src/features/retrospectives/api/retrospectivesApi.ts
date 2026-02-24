/**
 * Retrospectives feature — uses the ML feedback endpoint to submit
 * event/task quality signals, and the agent for structured retrospective chat.
 */
import axios from "axios";
import { useAuthStore } from "@/shared/store/authStore";
import type { UUID } from "@/shared/types";

const SERVER_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
).replace(/\/api\/v1\/?$/, "");

const mlClient = axios.create({
  baseURL: `${SERVER_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

mlClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─ Types ──────────────────────────────────────────────────────────────────
export interface FeedbackPayload {
  evento_id: string;
  voluntario_id: string;
  fue_exitoso: boolean;
  puntaje_rendimiento?: number;
  habilidades_demostradas?: string[];
  comentarios?: string;
}

export interface FeedbackResponse {
  mensaje: string;
  actualizado: boolean;
}

export interface RetroEntry {
  id: UUID;
  evento_id: UUID;
  autor_id: UUID;
  que_salio_bien: string;
  que_mejorar: string;
  acciones: string;
  created_at: string;
}

// ─ API ────────────────────────────────────────────────────────────────────
export const retrospectivesApi = {
  submitFeedback: async (payload: FeedbackPayload): Promise<FeedbackResponse> => {
    const { data } = await mlClient.post<FeedbackResponse>("/feedback", {
      evento_id: payload.evento_id,
      voluntario_id: payload.voluntario_id,
      asistio: true,
      cumplio_rol: payload.fue_exitoso,
      rating: Math.min(4, Math.max(0, Math.round(((payload.puntaje_rendimiento ?? 5) - 1) / 9 * 4))),
      comentario: payload.comentarios || undefined,
    });
    return data;
  },

  /** Local-only retro entries (persisted via zustand/localStorage in the UI) */
  _placeholder: null as null,
};
