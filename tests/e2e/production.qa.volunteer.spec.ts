/**
 * QA producción — voluntario.
 */
import { expect, test } from "@playwright/test";

import {
  applyApiRewriteIfConfigured,
  assertDashboardShell,
  assertHealthyPage,
  isProductionQaEnabled,
  loginViaUI,
  volunteerCredentials,
} from "./production.qa.helpers";

test.setTimeout(120_000);

const VOLUNTEER_ROUTES: { path: string; label: string }[] = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/dashboard/organizaciones", label: "Explorar orgs" },
  { path: "/dashboard/events", label: "Eventos" },
  { path: "/dashboard/tasks", label: "Mis Tareas" },
  { path: "/dashboard/gamification", label: "Gamificación" },
  { path: "/dashboard/temporadas", label: "Temporadas" },
  { path: "/dashboard/certificates", label: "Certificados" },
  { path: "/dashboard/manuales", label: "Manuales" },
  { path: "/dashboard/settings", label: "Mi Perfil" },
];

test.describe("Producción — voluntario", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, context }) => {
    test.skip(!isProductionQaEnabled(), "Definir E2E_MODE=real o E2E_PRODUCTION=1");
    await applyApiRewriteIfConfigured(context);
    const creds = volunteerCredentials();
    await loginViaUI(page, creds);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "Cuenta voluntario en onboarding; completar registro primero");
    }
  });

  for (const { path, label } of VOLUNTEER_ROUTES) {
    test(`${label} (${path})`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await assertDashboardShell(page);
      await assertHealthyPage(page);
    });
  }

  test("eventos: lista sin expulsar a login", async ({ page }) => {
    await page.goto("/dashboard/events");
    await assertDashboardShell(page);
    await expect(page.getByRole("heading", { name: /eventos/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("tareas: sección visible", async ({ page }) => {
    await page.goto("/dashboard/tasks");
    await assertDashboardShell(page);
    await expect(
      page.getByText(/tareas|asignaciones|disponibles/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
