"use client";

import { useQuery } from "@tanstack/react-query";
import { subscriptionsApi } from "./api/subscriptionsApi";

export function useOrganizationBilling(orgId: string | null) {
  return useQuery({
    queryKey: ["org-subscription", orgId],
    queryFn: async () => {
      const [subscription, plans] = await Promise.all([
        subscriptionsApi.getOrgSubscription(orgId!),
        subscriptionsApi.listPlans(),
      ]);
      return { subscription, plans, plan: plans.find((p) => p.id === subscription?.plan_id) };
    },
    enabled: !!orgId,
    refetchInterval: 15_000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}
