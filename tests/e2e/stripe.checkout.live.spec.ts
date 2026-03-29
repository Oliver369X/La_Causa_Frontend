import { expect, test } from "@playwright/test";

import { completeStripeTestCheckout } from "./stripeCheckoutHelpers";
import { liveConfig } from "./liveEnv";
import { pauseForVideoRecording, waitForAppPaint } from "./videoHelpers";

/**
 * E2E real: login → Suscripción → Stripe Checkout → tarjeta de prueba → vuelta al dashboard.
 *
 * Requiere:
 *   - Backend en E2E_BACKEND_URL (default http://localhost:8000) con Stripe configurado (sk_test, STRIPE_PRICE_*).
 *   - Usuario con permiso managePlans y LIVE_AGENT_ORG_ID con org válida.
 *   - Plan de pago en BD con slug = E2E_STRIPE_PLAN_SLUG (default pro_tier).
 *
 * Ejecutar (PowerShell, desde frontend/):
 *   $env:E2E_STRIPE="1"
 *   $env:LIVE_AGENT_EMAIL="..."
 *   $env:LIVE_AGENT_PASSWORD="..."
 *   $env:LIVE_AGENT_ORG_ID="uuid-org"
 *   npm run test:e2e:stripe:full
 *
 * Opcional: stripe listen --forward-to localhost:8000/stripe/webhook para activar suscripción en BD tras pagar.
 */
test.describe("Stripe Checkout — E2E real", () => {
  test.describe.configure({ timeout: 180_000 });

  test("login → elegir plan de pago → Checkout Stripe → 4242 → regreso a /dashboard/subscriptions", async ({
    page,
  }) => {
    test.skip(process.env.E2E_STRIPE !== "1", "Define E2E_STRIPE=1 para este flujo (y credenciales LIVE_AGENT_*).");

    let cfg: ReturnType<typeof liveConfig> & { planSlug: string };
    try {
      cfg = {
        ...liveConfig(),
        planSlug: (process.env.E2E_STRIPE_PLAN_SLUG || "pro_tier").trim(),
      };
    } catch {
      test.skip(true, "Faltan LIVE_AGENT_EMAIL, LIVE_AGENT_PASSWORD o LIVE_AGENT_ORG_ID.");
      return;
    }

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await waitForAppPaint(page);

    const emailIn = page.getByTestId("email-input");
    const passIn = page.getByTestId("password-input");
    await emailIn.click();
    await emailIn.pressSequentially(cfg.email, { delay: 75 });
    await passIn.click();
    await passIn.pressSequentially(cfg.password, { delay: 75 });
    await page.getByTestId("submit-login").click();
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 25_000 });
    await pauseForVideoRecording(page, 2000);

    await page.evaluate((orgId) => {
      const raw = localStorage.getItem("auth-storage");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.state = parsed.state || {};
      parsed.state.activeOrgId = orgId;
      localStorage.setItem("auth-storage", JSON.stringify(parsed));
    }, cfg.orgId);

    await page.goto("/dashboard/subscriptions", { waitUntil: "domcontentloaded" });
    await waitForAppPaint(page);
    await expect(page.getByRole("heading", { name: /Suscripción/i })).toBeVisible({ timeout: 20_000 });
    await pauseForVideoRecording(page, 1800);

    const subscribeBtn = page.getByTestId(`stripe-subscribe-${cfg.planSlug}`);
    await expect(subscribeBtn).toBeVisible({ timeout: 15_000 });
    await subscribeBtn.scrollIntoViewIfNeeded();
    await subscribeBtn.click();
    await pauseForVideoRecording(page, 1500);

    await completeStripeTestCheckout(page, { customerEmail: cfg.email });

    await expect(page).toHaveURL(/\/dashboard\/subscriptions/, { timeout: 120_000 });
    await waitForAppPaint(page);
    await pauseForVideoRecording(page, 4000);

    const planActivoVisible = await page
      .getByText(/Plan activo/i)
      .first()
      .isVisible({ timeout: 60_000 })
      .catch(() => false);
    if (!planActivoVisible) {
      test.info().annotations.push({
        type: "issue",
        description:
          "Stripe redirigió bien; si no ves plan activo, corre en otra terminal: stripe listen --forward-to localhost:8000/stripe/webhook",
      });
    }
  });
});
