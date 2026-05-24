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
    priceLabel: "Gratis",
    period: "",
    items: [
      "Funciones básicas",
      "Hasta 10 voluntarios",
      "Ideal para probar la plataforma",
    ],
    cta: "Comenzar gratis",
    highlight: false,
  },
  {
    name: "Plan Pro",
    priceLabel: "Bs 140",
    period: "/mes",
    items: [
      "Asignación con IA",
      "Almacenamiento en la nube (S3)",
      "Reportes dinámicos",
    ],
    cta: "Elegir Pro",
    highlight: true,
  },
  {
    name: "Plan Corporativo",
    priceLabel: "Bs 350",
    period: "/mes",
    items: [
      "Para empresas y RSE",
      "Soporte prioritario",
      "Integraciones",
    ],
    cta: "Contactar ventas",
    highlight: false,
  },
];

export function formatBob(amount: number): string {
  if (amount <= 0) return "Gratis";
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function bobToUsdHint(bob: number): string {
  if (bob <= 0) return "";
  const usd = (bob / BOB_PER_USD).toFixed(2);
  return `≈ US$ ${usd}/mes en Stripe`;
}
