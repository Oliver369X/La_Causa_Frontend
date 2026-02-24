import axios from "axios";
import { useAuthStore } from "@/shared/store/authStore";

// Agent router lives at /api/agent (not /api/v1)
const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/api\/v1\/?$/, "");

export const agentClient = axios.create({
  baseURL: `${SERVER_URL}/api/agent`,
  headers: { "Content-Type": "application/json" },
});

agentClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConfirmationPayload {
  confirmation_id: string;
  accion: string;
  descripcion: string;
  impacto: string[];
}

export interface ChatResponse {
  session_id: string;
  reply: string;
  actions_taken: string[];
  pending_confirmation: ConfirmationPayload | null;
}

export interface AgentAccessResponse {
  can_use: boolean;
  reason?: "voluntario" | "sin_plan_pago" | "sin_organizacion";
}

export const agentApi = {
  getAccess: async (orgId: string | null): Promise<AgentAccessResponse> => {
    const params = orgId ? { org_id: orgId } : {};
    const { data } = await agentClient.get<AgentAccessResponse>("/access", { params });
    return data;
  },

  chat: async (
    message: string,
    sessionId: string | null,
    orgId: string | null,
    confirmed?: boolean,
    confirmationId?: string
  ): Promise<ChatResponse> => {
    const { data } = await agentClient.post<ChatResponse>("/chat", {
      message,
      session_id: sessionId,
      org_id: orgId,
      confirmed: confirmed ?? false,
      confirmation_id: confirmationId ?? null,
    });
    return data;
  },
};
