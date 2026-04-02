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

export interface AgentActionLog {
  tool: string;
  result: string;
  timestamp?: string;
}

export interface ConfirmationPayload {
  confirmation_id: string;
  accion: string;
  descripcion: string;
  impacto: string[];
}

export interface QuickReplyItem {
  id: string;
  label: string;
  send_text: string;
}

export interface ChatResponse {
  session_id: string;
  reply: string;
  tipo: string;
  actions_taken: AgentActionLog[];
  pending_confirmation: ConfirmationPayload | null;
  quick_replies: QuickReplyItem[];
  trace_id?: string;
  model_provider?: string;
  model_name?: string;
}

export interface AgentAccessResponse {
  can_use: boolean;
  reason?: "voluntario" | "sin_plan_pago" | "sin_organizacion";
}

export interface ConversationSummary {
  session_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationMessageOut {
  role: string;
  content: string;
  actions?: AgentActionLog[];
  quick_replies?: QuickReplyItem[];
}

export interface ConversationMessagesResponse {
  session_id: string;
  messages: ConversationMessageOut[];
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

  listConversations: async (orgId: string | null): Promise<ConversationSummary[]> => {
    const params = orgId ? { org_id: orgId } : {};
    const { data } = await agentClient.get<ConversationSummary[]>("/conversations", { params });
    return data;
  },

  getConversationMessages: async (
    sessionId: string,
    orgId: string | null
  ): Promise<ConversationMessagesResponse> => {
    const params = orgId ? { org_id: orgId } : {};
    const { data } = await agentClient.get<ConversationMessagesResponse>(
      `/conversations/${encodeURIComponent(sessionId)}/messages`,
      { params }
    );
    return data;
  },
};
