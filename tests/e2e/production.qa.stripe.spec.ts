/**
 * QA producción — Stripe Checkout (modo test, tarjeta 4242).
 * Requiere E2E_STRIPE=1 y E2E_PRODUCTION=1 (o E2E_MODE=real).
 */
import { expect, test } from "@playwright/test";

import { completeStripeTestCheckout } from "./stripeCheckoutHelpers";
import {
  applyApiRewriteIfConfigured,
  isE2EStripeEnabled,
  isProductionQaEnabled,
  loginViaUI,
  prepareOrganizerSession,
  productionConfig,
  fetchStripePublishableKey,
  resolvePaidPlanId,
  setActiveOrg,
  skipIfStripeNotConfigured,
} from "./production.qa.helpers";

test.describe("Producción — Stripe Checkout", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test.beforeEach(async ({ context }) => {
    test.skip(!isProductionQaEnabled(), "Definir E2E_MODE=real o E2E_PRODUCTION=1");
    test.skip(!isE2EStripeEnabled(), "Definir E2E_STRIPE=1 para checkout real");
    await applyApiRewriteIfConfigured(context);
  });

  test("GET /stripe/publishable-key responde en prod", async ({ request }) => {
    await skipIfStripeNotConfigured(request);
    const key = await fetchStripePublishableKey(request);
    expect(key).toMatch(/^pk_(test|live)_/);
  });

  test("login → suscripción Pro → Checkout 4242 → plan activo o sync", async ({
    page,
    request,
  }) => {
    await skipIfStripeNotConfigured(request);
    const cfg = await prepareOrganizerSession(page);
    const planId = await resolvePaidPlanId(request);

    await page.goto("/dashboard/subscriptions");
    await expect(page.getByRole("heading", { name: /Suscripción/i })).toBeVisible({
      timeout: 20_000,
    });

    const subscribeBtn = page.getByTestId(`stripe-subscribe-${planId}`);
    await expect(subscribeBtn).toBeVisible({ timeout: 15_000 });
    await subscribeBtn.scrollIntoViewIfNeeded();
    await subscribeBtn.click();

    await completeStripeTestCheckout(page, { customerEmail: cfg.email });

    await expect(page).toHaveURL(/\/dashboard\/subscriptions/, { timeout: 120_000 });

    const planActivo = page.getByText(/Plan activo|Plan actual/i).first();
    await expect(planActivo).toBeVisible({ timeout: 90_000 });
  });

  test("suscripciones: Plan Semilla no redirige a checkout.stripe.com", async ({
    page,
    request,
  }) => {
    const cfg = productionConfig();
    await loginViaUI(page, cfg);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "Cuenta organizador en onboarding");
    }
    await setActiveOrg(page, cfg.orgId);

    const plansRes = await request.get(`${cfg.backendUrl}/planes`);
    const plans = (await plansRes.json()) as Array<{ id: string; precio_mensual: number }>;
    const freePlan = plans.find((p) => Number(p.precio_mensual) <= 0);
    test.skip(!freePlan, "No hay plan gratuito en /planes");

    await page.goto("/dashboard/subscriptions");
    const freeBtn = page.getByTestId(`free-subscribe-${freePlan!.id}`);
    if (!(await freeBtn.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, "Botón plan gratuito no visible (ya activo o sin permiso)");
    }

    await freeBtn.click();
    await page.waitForTimeout(3_000);
    expect(page.url()).not.toMatch(/checkout\.stripe\.com/);
  });
});
