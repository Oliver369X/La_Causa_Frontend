/**
 * QA producción — voluntario postula a eventos (estados + happy path).
 * Setup vía API con organizador demo. Requiere E2E_VOLUNTEER_FLOWS=1.
 */
import { expect, test, type Page } from "@playwright/test";

import {
  applyApiRewriteIfConfigured,
  apiLogin,
  assertDashboardShell,
  eventCardByTitle,
  postularButtonInCard,
  isE2EVolunteerFlowsEnabled,
  isProductionQaEnabled,
  loginViaUI,
  productionConfig,
  setActiveOrg,
  setupVolunteerFlowEvents,
  type VolunteerFlowEvents,
  volunteerCredentials,
} from "./production.qa.helpers";

test.describe("Producción — voluntario flujos eventos", () => {
  test.describe.configure({ mode: "serial", timeout: 150_000 });

  let flowEvents: VolunteerFlowEvents;

  test.beforeAll(async ({ request }) => {
    test.skip(!isProductionQaEnabled(), "Definir E2E_MODE=real o E2E_PRODUCTION=1");
    test.skip(!isE2EVolunteerFlowsEnabled(), "Definir E2E_VOLUNTEER_FLOWS=1");

    const cfg = productionConfig();
    const adminAuth = await apiLogin(request, cfg.email, cfg.password);
    flowEvents = await setupVolunteerFlowEvents(request, adminAuth, cfg.orgId);
  });

  test.beforeEach(async ({ page, context }) => {
    test.skip(!isProductionQaEnabled(), "Definir E2E_MODE=real o E2E_PRODUCTION=1");
    test.skip(!isE2EVolunteerFlowsEnabled(), "Definir E2E_VOLUNTEER_FLOWS=1");
    await applyApiRewriteIfConfigured(context);

    const cfg = productionConfig();
    const vol = volunteerCredentials();
    await loginViaUI(page, vol);
    if (page.url().includes("/onboarding")) {
      test.skip(true, "Voluntario demo en onboarding");
    }
    await setActiveOrg(page, cfg.orgId);
  });

  async function openEventsTab(page: Page, tab: string) {
    await page.goto("/dashboard/events");
    await page.reload({ waitUntil: "domcontentloaded" });
    await assertDashboardShell(page);
    await page.getByRole("button", { name: tab }).click();
    await page.waitForTimeout(800);
  }

  test("próximos: borrador sin Postular, publicado con Postular", async ({ page }) => {
    await openEventsTab(page, "Próximos");

    const draftCard = eventCardByTitle(page, flowEvents.draftTitle);
    await expect(draftCard).toBeVisible({ timeout: 30_000 });
    await expect(postularButtonInCard(draftCard)).toHaveCount(0);

    const pubCard = eventCardByTitle(page, flowEvents.publishedTitle);
    await expect(pubCard).toBeVisible({ timeout: 30_000 });
    await expect(postularButtonInCard(pubCard)).toBeVisible({ timeout: 15_000 });
  });

  test("en curso: evento en_curso muestra Postular", async ({ page }) => {
    await openEventsTab(page, "En curso");

    const cursoCard = eventCardByTitle(page, flowEvents.inProgressTitle);
    await expect(cursoCard).toBeVisible({ timeout: 30_000 });
    await expect(postularButtonInCard(cursoCard)).toBeVisible({ timeout: 15_000 });
  });

  test("pasados: finalizado sin Postular", async ({ page }) => {
    await openEventsTab(page, "Pasados");

    const finCard = eventCardByTitle(page, flowEvents.finishedTitle);
    await expect(finCard).toBeVisible({ timeout: 30_000 });
    await expect(postularButtonInCard(finCard)).toHaveCount(0);
  });

  test("happy path: postular a evento publicado", async ({ page }) => {
    await openEventsTab(page, "Próximos");

    const pubCard = eventCardByTitle(page, flowEvents.publishedTitle);
    await expect(pubCard).toBeVisible({ timeout: 30_000 });
    await postularButtonInCard(pubCard).click();

    await expect(page.getByText("Postular al evento")).toBeVisible();
    await page
      .locator("textarea")
      .fill("Motivación E2E producción — quiero participar.");
    await page
      .getByTestId("event-apply-submit")
      .or(page.getByRole("button", { name: "Enviar solicitud" }))
      .click();

    await expect(page.getByText("Postular al evento")).not.toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/error|no se pudo/i)).not.toBeVisible();
  });
});
