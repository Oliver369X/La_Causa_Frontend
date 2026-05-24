/**
 * QA producción — integraciones (S3 upload, matching, agente, Stripe API).
 * Requiere E2E_INTEGRATIONS=1 (agente además E2E_AGENT=1).
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

import {
  apiLogin,
  applyApiRewriteIfConfigured,
  assertDashboardShell,
  assertHealthyPage,
  isE2EAgentEnabled,
  isE2EIntegrationsEnabled,
  isProductionQaEnabled,
  prepareOrganizerSession,
  productionConfig,
  skipIfStripeNotConfigured,
} from "./production.qa.helpers";

test.describe("Producción — integraciones", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test.beforeEach(async ({ context }) => {
    test.skip(!isProductionQaEnabled(), "Definir E2E_MODE=real o E2E_PRODUCTION=1");
    test.skip(!isE2EIntegrationsEnabled(), "Definir E2E_INTEGRATIONS=1");
    await applyApiRewriteIfConfigured(context);
  });

  test("Stripe: publishable-key en API prod", async ({ request }) => {
    await skipIfStripeNotConfigured(request);
  });

  test("S3/Cloudinary: subir logo en settings", async ({ page }) => {
    await prepareOrganizerSession(page);
    await page.goto("/dashboard/settings");
    await assertDashboardShell(page);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-upload-"));
    const pngPath = path.join(tmpDir, "qa-logo.png");
    fs.writeFileSync(
      pngPath,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      )
    );

    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    await expect(fileInput).toBeAttached({ timeout: 15_000 });
    await fileInput.setInputFiles(pngPath);

    await expect(page.getByText(/subiendo/i)).toBeHidden({ timeout: 60_000 });
    await expect(page.getByText(/no se pudo|error al subir/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test("Matching ML: página de recomendaciones carga", async ({ page }) => {
    await prepareOrganizerSession(page);
    await page.goto("/dashboard/matching");
    await assertDashboardShell(page);
    await assertHealthyPage(page);
    await expect(
      page.getByText(/recomendaci|voluntario|matching|habilidades/i).first()
    ).toBeVisible({ timeout: 25_000 });
  });

  test("Agente IA: envía mensaje y recibe respuesta", async ({ page, request }) => {
    test.skip(!isE2EAgentEnabled(), "Definir E2E_AGENT=1 para probar LLM real");

    const cfg = await prepareOrganizerSession(page);
    const health = await request.get(`${cfg.backendUrl}/health`, { timeout: 15_000 });
    expect(health.ok()).toBe(true);

    await page.goto("/dashboard/agent");
    await expect(page.getByRole("heading", { name: "Agente IA" })).toBeVisible({
      timeout: 20_000,
    });

    const restricted = page.getByText(/acceso restringido|plan pro|actualiza tu plan/i);
    if (await restricted.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip(true, "Org sin plan de pago — agente restringido en Semilla");
    }

    const input = page.getByPlaceholder(/Escribe, dicta o adjunta/i);
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill("Resumen breve del estado de la organización en una frase.");
    await page.locator('button[type="submit"]').click();

    await expect(
      page.locator("motion.div").filter({ hasText: /organización|evento|voluntario|tarea|resumen/i }).first()
    ).toBeVisible({ timeout: 45_000 });
  });

  test("Feedback ML: ruta de evento carga o skip", async ({ page, request }) => {
    const cfg = await prepareOrganizerSession(page);
    let targetId = process.env.E2E_FEEDBACK_EVENT_ID?.trim();

    if (!targetId) {
      const auth = await apiLogin(request, cfg.email, cfg.password);
      const listRes = await request.get(`${cfg.backendUrl}/eventos?org_id=${cfg.orgId}`, {
        headers: auth.headers,
      });
      if (listRes.ok()) {
        const events = (await listRes.json()) as Array<{ id: string; estado: string }>;
        targetId = events.find((e) => e.estado === "finalizado")?.id;
      }
    }

    test.skip(!targetId, "Sin evento finalizado; define E2E_FEEDBACK_EVENT_ID");

    await page.goto(`/dashboard/events/${targetId}/feedback-ml`);
    await assertDashboardShell(page);
    await expect(
      page.getByText(/retroalimentación|feedback|puntaje|evaluación/i).first()
    ).toBeVisible({ timeout: 25_000 });
  });
});
