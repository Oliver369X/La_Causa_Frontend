/**
 * QA producción — bloque público (sin sesión).
 */
import { expect, test } from "@playwright/test";

import {
  applyApiRewriteIfConfigured,
  assertHealthyPage,
  assertLandingPricingBob,
  assertNoAuthRedirect,
  assertDashboardShell,
  isProductionQaEnabled,
  loginViaUI,
  probeLoginApiReachability,
  productionConfig,
} from "./production.qa.helpers";

test.setTimeout(120_000);

test.describe("Producción — diagnóstico", () => {
  test.beforeEach(() => {
    test.skip(!isProductionQaEnabled(), "Definir E2E_MODE=real o E2E_PRODUCTION=1");
  });

  test("el front puede contactar el API (login devuelve respuesta HTTP)", async ({
    page,
    context,
    request,
  }) => {
    const cfg = productionConfig();
    await applyApiRewriteIfConfigured(context);

    const probe = await probeLoginApiReachability(page);
    if (!probe.reached) {
      const hint =
        "El build del front no alcanza su API. " +
        `Reconstruir con NEXT_PUBLIC_API_URL=${cfg.backendUrl} o E2E_API_REWRITE_TO=${cfg.backendUrl}. ` +
        (probe.pageError ? `Mensaje en UI: ${probe.pageError}` : "");
      expect(probe.reached, hint).toBe(true);
    }

    expect(probe.status).not.toBeNull();
    const health = await request.get(`${cfg.backendUrl}/health`, { timeout: 20_000 });
    expect(health.ok(), `${cfg.backendUrl}/health`).toBeTruthy();
  });
});

test.describe("Producción — páginas públicas", () => {
  test.beforeEach(async ({ context }) => {
    test.skip(!isProductionQaEnabled(), "Definir E2E_MODE=real o E2E_PRODUCTION=1");
    await applyApiRewriteIfConfigured(context);
  });

  test("landing carga", async ({ page }) => {
    await page.goto("/");
    await assertHealthyPage(page);
    await expect(page.getByRole("link", { name: /iniciar sesión/i }).first()).toBeVisible();
  });

  test("precios LA CAUSA Premium en BOB (sin textos legacy)", async ({ page }) => {
    await assertLandingPricingBob(page);
  });

  test("login y registro renderizan formulario", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("email-input")).toBeVisible();
    await expect(page.getByTestId("submit-login")).toBeVisible();

    await page.goto("/register");
    await expect(page.getByTestId("email-input")).toBeVisible();
    await expect(page.getByTestId("submit-register")).toBeVisible();
  });

  test("forgot-password y reset-password cargan", async ({ page }) => {
    await page.goto("/forgot-password");
    await assertHealthyPage(page);
    await page.goto("/reset-password");
    await assertHealthyPage(page);
  });

  test("perfil público de organización", async ({ page }) => {
    const { publicOrgSlug } = productionConfig();
    await page.goto(`/org/${publicOrgSlug}`);
    await expect(page.locator("body")).not.toContainText(/^Cargando\.\.\.$/m, {
      timeout: 30_000,
    });
    await expect(page.getByText(/Causa Verde|Fundación/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await assertHealthyPage(page);
  });

  test("credenciales demo entran al dashboard", async ({ page }) => {
    const cfg = productionConfig();
    await loginViaUI(page, cfg);
    await page.goto("/dashboard");
    await assertNoAuthRedirect(page);
    await assertDashboardShell(page);
  });
});
