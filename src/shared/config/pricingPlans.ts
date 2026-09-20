/**
 * LA CAUSA Premium — precios públicos en bolivianos (BOB).
 * Stripe usa precios en USD equivalentes (~Bs ÷ 7); ver docs/stripe/catalogo-y-mvp.md
 */
export const BOB_PER_USD = 7;

export type PublicPlanCard = {
  name: string;
  priceLabel: string;
  period: string;
  items: string[];
  cta: string;
  highlight: boolean;
};

export const LANDING_PRICING_PLANS: PublicPlanCard[] = [
  {
    name: "Plan Semilla",
    priceLabel: "Bs 0",
    period: "/mes",
    items: [
      "Gestión de eventos y asignación manual",
      "Hasta 20 voluntarios y 2 eventos por mes",
      "Validación digital básica y gamificación estándar",
    ],
    cta: "Comenzar gratis",
    highlight: false,
  },
  {
    name: "Profesional",
    priceLabel: "Bs 140",
    period: "/mes",
    items: [
      "Todo el Plan Semilla + IA predictiva",
      "Hasta 200 voluntarios y 30 eventos por mes",
      "Dashboards BI y manuales operativos",
      "Soporte prioritario",
    ],
    cta: "Elegir Profesional",
    highlight: true,
  },
  {
    name: "Empresarial",
    priceLabel: "Bs 350",
    period: "/mes",
    items: [
      "Todo el plan Profesional + multi-evento simultáneo",
      "Voluntarios ilimitados y 100 eventos por mes",
      "Reportes avanzados y agente especializado",
      "SLA garantizado",
    ],
    cta: "Contactar ventas",
    highlight: false,
  },
];

export function formatBob(amount: number): string {
  return `Bs ${new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 }).format(amount)}`;
}

