import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

// ─ Types ──────────────────────────────────────────────────────────────────
export interface Plan {
  id: UUID;
  nombre: string;
  descripcion?: string;
  precio_mensual: number;
  max_voluntarios: number;
  max_eventos: number;
  caracteristicas: string[];
}

export interface Subscription {
  id: UUID;
  organizacion_id: UUID;
  plan_id: UUID;
  estado: "activa" | "cancelada" | "periodo_prueba" | "suspendida";
  fecha_inicio: string;
  fecha_fin?: string;
  auto_renovar: boolean;
}

export interface CreateSubscriptionData {
  organizacion_id: UUID;
  plan_id: UUID;
  metodo_pago?: string;
}

export interface CheckoutRequest {
  plan_id: UUID;
  organizacion_id: UUID;
  frecuencia?: "mensual" | "anual";
  success_url: string;
  cancel_url: string;
}

export interface CheckoutResponse {
  checkout_url: string;
}

// ─ API ────────────────────────────────────────────────────────────────────
export const subscriptionsApi = {
  listPlans: async (): Promise<Plan[]> => {
    const { data } = await apiClient.get<
      Array<{
        id: UUID;
        nombre: string;
        descripcion?: string;
        precio_mensual: number;
        max_voluntarios: number;
        max_eventos_mes: number;
        funciones?: Record<string, unknown>;
      }>
    >(EP.PLANS);
    return data.map((plan) => ({
      id: plan.id,
      nombre: plan.nombre,
      descripcion: plan.descripcion,
      precio_mensual: Number(plan.precio_mensual),
      max_voluntarios: plan.max_voluntarios,
      max_eventos: plan.max_eventos_mes,
      caracteristicas: Object.keys(plan.funciones ?? {}),
    }));
  },

  getOrgSubscription: async (orgId: UUID): Promise<Subscription | null> => {
    try {
      const { data } = await apiClient.get<Subscription>(EP.ORG_SUBSCRIPTION(orgId));
      return data;
    } catch {
      return null;
    }
  },

  subscribe: async (payload: CreateSubscriptionData): Promise<Subscription> => {
    const { data } = await apiClient.post<Subscription>(EP.SUBSCRIPTIONS, payload);
    return data;
  },

  /**
   * Create a Stripe Checkout Session.
   * Redirect the user to the returned checkout_url to complete payment.
   */
  createCheckoutSession: async (payload: CheckoutRequest): Promise<CheckoutResponse> => {
    const { data } = await apiClient.post<CheckoutResponse>(EP.STRIPE_CHECKOUT, payload);
    return data;
  },
};
