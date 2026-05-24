import { expect, test } from "@playwright/test";

import { liveConfig } from "./liveEnv";

test.describe("Live E2E - carril crítico real", () => {
  test("health backend real", async ({ request }) => {
    if (process.env.E2E_MODE !== "real") {
      test.skip(true, "Este spec solo se ejecuta en E2E_MODE=real");
    }
    const cfg = liveConfig();
    const health = await request.get(`${cfg.backendUrl}/health`, { timeout: 15_000 });
    expect(health.ok()).toBe(true);
  });

  test("login real por UI y acceso a dashboard", async ({ page }) => {
    if (process.env.E2E_MODE !== "real") {
      test.skip(true, "Este spec solo se ejecuta en E2E_MODE=real");
    }
    const cfg = liveConfig();

    await page.goto("/login");
    await page.getByTestId("email-input").fill(cfg.email);
    await page.getByTestId("password-input").fill(cfg.password);
    await page.getByTestId("submit-login").click();

    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.getByRole("link", { name: "La Causa AI" }).first()).toBeVisible({ timeout: 20_000 });
  });

  test("agente real responde con LLM real", async ({ page }) => {
    if (process.env.E2E_MODE !== "real") {
      test.skip(true, "Este spec solo se ejecuta en E2E_MODE=real");
    }
    const cfg = liveConfig();

    await page.goto("/login");
    await page.getByTestId("email-input").fill(cfg.email);
    await page.getByTestId("password-input").fill(cfg.password);
    await page.getByTestId("submit-login").click();
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });

    await page.evaluate((orgId) => {
      const raw = localStorage.getItem("auth-storage");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.state = parsed.state || {};
      parsed.state.activeOrgId = orgId;
      localStorage.setItem("auth-storage", JSON.stringify(parsed));
    }, cfg.orgId);

    await page.goto("/dashboard/agent");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Agente IA" })).toBeVisible({ timeout: 20_000 });

    const input = page.getByPlaceholder(/Escribe, dicta o adjunta/i);
    await input.fill("Resume el estado operativo actual y recomienda una acción concreta.");
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/Resume el estado operativo actual/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("div").filter({ hasText: /evento|voluntario|tarea|organización/i }).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
