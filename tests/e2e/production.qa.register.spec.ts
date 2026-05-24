/**
 * QA producción — registro + onboarding (mutación permitida con emails únicos).
 * Requiere E2E_REGISTER=1.
 */
import { expect, test } from "@playwright/test";

import {
  applyApiRewriteIfConfigured,
  assertDashboardShell,
  assertHealthyPage,
  isE2ERegisterEnabled,
  isProductionQaEnabled,
  productionConfig,
  qaTestPassword,
  uniqueTestEmail,
} from "./production.qa.helpers";

test.describe("Producción — registro y onboarding", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeEach(async ({ context }) => {
    test.skip(!isProductionQaEnabled(), "Definir E2E_MODE=real o E2E_PRODUCTION=1");
    test.skip(!isE2ERegisterEnabled(), "Definir E2E_REGISTER=1");
    await applyApiRewriteIfConfigured(context);
  });

  test("organizador: register → crear org → dashboard", async ({ page }) => {
    const email = uniqueTestEmail("org");
    const password = qaTestPassword();
    const orgName = `QA Org ${Date.now()}`;

    await page.goto("/register");
    await page.getByTestId("tipo-organizador").click();
    await page.getByTestId("nombre-input").fill(`Organizador QA`);
    await page.getByTestId("email-input").fill(email);
    await page.getByTestId("password-input").fill(password);
    await page.getByTestId("submit-register").click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 45_000 });

    await page.getByTestId("org-nombre-input").fill(orgName);
    const desc = page.locator("textarea").first();
    if (await desc.isVisible()) {
      await desc.fill("Organización creada por E2E producción");
    }
    await page.getByTestId("create-org-btn").click();

    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 60_000 });
    if (page.url().includes("/onboarding")) {
      await page.goto("/dashboard");
    }
    await assertDashboardShell(page);

    await page.goto("/dashboard/settings");
    await assertHealthyPage(page);
  });

  test("voluntario: register → onboarding → explorar orgs", async ({ page }) => {
    const email = uniqueTestEmail("vol");
    const password = qaTestPassword();
    const cfg = productionConfig();

    await page.goto("/register");
    await page.getByTestId("tipo-voluntario").click();
    await page.getByTestId("nombre-input").fill("Voluntario QA");
    await page.getByTestId("email-input").fill(email);
    await page.getByTestId("password-input").fill(password);
    await page.getByTestId("submit-register").click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 45_000 });

    const continuar = page.getByRole("button", { name: /continuar|siguiente|empezar/i }).first();
    if (await continuar.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await continuar.click();
    }

    await page.goto("/dashboard/organizaciones");
    await assertDashboardShell(page);
    await expect(
      page.getByText(/explorar organizaciones|organizaciones/i).first()
    ).toBeVisible({ timeout: 20_000 });

    const unirme = page.getByRole("button", { name: /unirme/i }).first();
    if (await unirme.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await unirme.click();
      const terms = page.getByRole("checkbox").first();
      if (await terms.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await terms.check();
      }
      const enviar = page.getByRole("button", { name: /enviar solicitud|solicitar/i }).first();
      if (await enviar.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await enviar.click();
        await expect(
          page.getByText(/solicitud enviada|pendiente/i).first()
        ).toBeVisible({ timeout: 20_000 });
      }
    } else {
      const demoLink = page.locator(`a[href*="/org/${cfg.publicOrgSlug}"]`).first();
      await expect(demoLink.or(page.getByText(/solicitud enviada|miembro/i).first())).toBeVisible({
        timeout: 15_000,
      });
    }
  });
});
