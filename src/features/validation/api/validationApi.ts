/**
 * Validation feature — wraps the delivery review workflow.
 * Re-uses EP from endpoints + assignmentsApi types.
 */
import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

export interface ValidationRequest {
  delivery_id: UUID;
  aprobado: boolean;
  comentario?: string;
}

export interface ValidationResult {
  id: UUID;
  entrega_id: UUID;
  revisor_id: UUID;
  aprobado: boolean;
  comentario?: string;
  fecha_revision: string;
}

export const validationApi = {
  reviewDelivery: async (deliveryId: UUID, data: Omit<ValidationRequest, "delivery_id">): Promise<ValidationResult> => {
    const { data: result } = await apiClient.patch<ValidationResult>(EP.DELIVERY_REVIEW(deliveryId), data);
    return result;
  },
};
