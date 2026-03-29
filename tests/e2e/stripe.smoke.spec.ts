import { expect, test } from "@playwright/test";

import { pauseForVideoRecording, waitForAppPaint } from "./videoHelpers";

/**
 * Pruebas simples que **siempre se ejecutan** (no requieren E2E_STRIPE ni credenciales).
 * Sirven para comprobar Playwright + Next + vídeo con contenido real.
 *
 * El checkout completo con tarjeta está en stripe.checkout.live.spec.ts → npm run test:e2e:stripe:full
 *
 * Vídeo legible: `E2E_SLOW_MO` (default 320) y pausa final `E2E_VIDEO_PAUSE_MS` (default 3200).
 */
test.describe("Stripe / suscripciones — humo (UI)", () => {
  test("login: formulario visible y campos rellenables", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await waitForAppPaint(page);

    await expect(page).toHaveTitle(/La Causa|Causa|Login|Iniciar/i);
    const email = page.getByTestId("email-input");
    const password = page.getByTestId("password-input");
    await expect(email).toBeVisible({ timeout: 25_000 });
    await expect(password).toBeVisible();
    await expect(page.getByTestId("submit-login")).toBeVisible();

    await email.scrollIntoViewIfNeeded();
    await email.click();
    await email.pressSequentially("e2e-smoke@example.com", { delay: 90 });

    await password.click();
    await password.pressSequentially("SoloParaVideo123!", { delay: 90 });

    await expect(page.getByRole("heading", { name: /Iniciar/i })).toBeVisible();
    await pauseForVideoRecording(page);
  });

  test("ruta suscripciones: login o pantalla de planes", async ({ page }) => {
    await page.goto("/dashboard/subscriptions", { waitUntil: "domcontentloaded" });
    await waitForAppPaint(page);

    const loginGate = page.getByTestId("email-input");
    const subsScreen = page.getByText("Suscripción", { exact: true });
    const target = loginGate.or(subsScreen).first();
    await expect(target).toBeVisible({ timeout: 30_000 });
    await target.scrollIntoViewIfNeeded();
    await pauseForVideoRecording(page);
  });
});

test.describe("Stripe — API backend (sin navegador)", () => {
  test("GET /stripe/publishable-key responde", async ({ request }) => {
    const base = process.env.E2E_BACKEND_URL || "http://localhost:8000";
    const res = await request.get(`${base}/stripe/publishable-key`, { timeout: 15_000 });
    expect(res.ok(), `Backend en ${base} debe estar arriba`).toBeTruthy();
    const json = (await res.json()) as { publishable_key?: string };
    expect(json).toHaveProperty("publishable_key");
  });
});
