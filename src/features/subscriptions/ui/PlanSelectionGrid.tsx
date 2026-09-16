"use client";

import { Check, Crown, Sparkles } from "lucide-react";
import type { Plan } from "@/features/subscriptions/api/subscriptionsApi";
import { formatBob } from "@/shared/config/pricingPlans";

export function PlanSelectionGrid({
  plans,
  selectedPlanId,
  onSelect,
  loading = false,
}: {
  plans: Plan[];
  selectedPlanId: string | null;
  onSelect: (planId: string) => void;
  loading?: boolean;
}) {
  if (loading) {
    return <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>Cargando planes…</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[...plans].sort((a, b) => Number(a.precio_mensual) - Number(b.precio_mensual)).map((plan) => {
        const selected = selectedPlanId === plan.id;
        const enterprise = plan.slug === "corp_tier" || /empres|corpor/i.test(plan.nombre);
        const professional = plan.slug === "pro_tier" || /profesional|\bpro\b/i.test(plan.nombre);
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            className="relative flex h-full flex-col rounded-3xl border p-6 text-left transition-all hover:-translate-y-1"
            style={{
              borderColor: selected ? "var(--accent)" : "var(--border)",
              background: selected ? "var(--accent-soft)" : "var(--bg-card)",
              boxShadow: selected ? "0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent)" : "none",
            }}
          >
            {professional && <span className="absolute right-4 top-4 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-black text-white">RECOMENDADO</span>}
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--bg-subtle)" }}>
              {enterprise ? <Crown className="h-5 w-5 text-amber-500" /> : <Sparkles className="h-5 w-5" style={{ color: "var(--accent)" }} />}
            </div>
            <h2 className="pr-16 text-lg font-bold">{plan.nombre}</h2>
            <p className="mt-2 min-h-10 text-xs" style={{ color: "var(--text-muted)" }}>{plan.descripcion}</p>
            <div className="my-5 text-3xl font-black">{formatBob(Number(plan.precio_mensual))}<span className="text-sm font-normal opacity-60">/mes</span></div>
            <ul className="mb-6 flex-1 space-y-2">
              {plan.caracteristicas.slice(0, 5).map((feature) => (
                <li key={feature} className="flex gap-2 text-xs"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />{feature}</li>
              ))}
            </ul>
            <span className="text-center text-xs font-bold" style={{ color: selected ? "var(--accent)" : "var(--text-muted)" }}>
              {selected ? "Plan seleccionado" : "Seleccionar plan"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
