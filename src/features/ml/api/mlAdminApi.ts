import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";

export interface MLPhaseStatus {
  available: boolean;
  type: string;
  requires_training: boolean;
  description?: string;
  min_samples_needed?: number;
  current_samples?: number;
  ready_to_train?: boolean;
}

export interface MLStatusResponse {
  active_phase: number;
  total_labeled_matches: number;
  phases: {
    phase_1: MLPhaseStatus;
    phase_2: MLPhaseStatus;
    phase_3: MLPhaseStatus;
  };
}

export interface RetrainResponse {
  status: string;
  message: string;
  phase: number;
  trained_samples: number;
  used_synthetic: boolean;
  details?: Record<string, unknown> | null;
}

export interface SyntheticGenerateResponse {
  status: string;
  generated_samples: number;
  total_labeled_matches: number;
  message: string;
}

export const mlAdminApi = {
  getStatus: async (): Promise<MLStatusResponse> => {
    const { data } = await apiClient.get<MLStatusResponse>(EP.ML_STATUS);
    return data;
  },

  retrainPhase: async (
    phase: 2 | 3,
    opts?: { bootstrap_samples?: number; seed?: number }
  ): Promise<RetrainResponse> => {
    const { data } = await apiClient.post<RetrainResponse>(
      EP.ML_RETRAIN(phase),
      null,
      {
        params: {
          bootstrap_samples: opts?.bootstrap_samples ?? 300,
          seed: opts?.seed ?? 42,
        },
      }
    );
    return data;
  },

  generateSynthetic: async (
    samples: number,
    seed = 42
  ): Promise<SyntheticGenerateResponse> => {
    const { data } = await apiClient.post<SyntheticGenerateResponse>(
      EP.ML_SYNTHETIC_GENERATE,
      { samples, seed }
    );
    return data;
  },
};
