import { expect, test } from "@playwright/test";

import { liveConfig } from "./liveEnv";

test.describe("Live E2E - flujo real login -> dashboard -> agent", () => {
  test("usa backend real y proveedor LLM real sin mocks", async ({ page, request }) => {
    if (process.env.E2E_MODE !== "real") {
      test.skip(true, "Este spec solo se ejecuta en E2E_MODE=real");
    }

    const cfg = liveConfig();
    const health = await request.get(`${cfg.backendUrl}/health`, { timeout: 15_000 });
    expect(health.ok()).toBe(true);

    await page.goto("/login");
    await page.getByTestId("email-input").fill(cfg.email);
    await page.getByTestId("password-input").fill(cfg.password);
    await page.getByTestId("submit-login").click();

    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });

    // Forzamos org activa del tenant de pruebas para flujo determinista.
    await page.evaluate((orgId) => {
      const raw = localStorage.getItem("auth-storage");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.state = parsed.state || {};
      parsed.state.activeOrgId = orgId;
      localStorage.setItem("auth-storage", JSON.stringify(parsed));
    }, cfg.orgId);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    await page.goto("/dashboard/agent");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Agente IA" })).toBeVisible({ timeout: 20_000 });

    const input = page.locator('input[placeholder="Escribe tu mensaje…"]');
    await expect(input).toBeVisible({ timeout: 20_000 });
    await input.fill("Dame un resumen corto del estado de mi organización y sugiere una siguiente acción.");
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/Dame un resumen corto/i)).toBeVisible({ timeout: 20_000 });
    // Verifica una respuesta real del asistente (sin depender de texto exacto).
    await expect(page.locator("div").filter({ hasText: /organización|evento|voluntario|tarea/i }).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
