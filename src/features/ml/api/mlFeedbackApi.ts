/**
 * ML Feedback API — envía retroalimentación de inferencia al módulo ML.
 * Usado desde el Agente IA y otras UIs que usan el modelo.
 */
import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

export interface AgentFeedbackInferencePayload {
  source: "agent" | "ml_ui" | "other";
  session_id?: string;
  org_id?: UUID;
  user_id?: UUID;
  trace_id?: string;
  provider?: string;
  model_name?: string;
  inference_input: string;
  inference_output: string;
  helpful: boolean;
  score: number;
  comment?: string;
  error_type?: "factual" | "irrelevant" | "unsafe" | "other";
}

export interface AgentFeedbackInferenceResponse {
  status: string;
  feedback_id: UUID;
}

export const mlFeedbackApi = {
  submitInferenceFeedback: async (
    payload: AgentFeedbackInferencePayload
  ): Promise<AgentFeedbackInferenceResponse> => {
    const { data } = await apiClient.post<AgentFeedbackInferenceResponse>(
      EP.ML_FEEDBACK_INFERENCE,
      payload
    );
    return data;
  },
};
