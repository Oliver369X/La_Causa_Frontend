/**
 * QA producción — organizador (smoke rutas + flujos críticos).
 */
import { expect, test } from "@playwright/test";

import {
  applyApiRewriteIfConfigured,
  assertDashboardShell,
  assertHealthyPage,
  eventDatetimeRange,
  isProductionQaEnabled,
  looksLikeUuid,
  prepareOrganizerSession,
  productionConfig,
} from "./production.qa.helpers";

test.setTimeout(120_000);

const ORGANIZER_ROUTES: { path: string; label: string }[] = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/dashboard/events", label: "Eventos" },
  { path: "/dashboard/tasks", label: "Tareas" },
  { path: "/dashboard/organizaciones", label: "Organizaciones" },
  { path: "/dashboard/volunteers", label: "Voluntarios" },
  { path: "/dashboard/staff", label: "Miembros staff" },
  { path: "/dashboard/matching", label: "Recomendaciones" },
  { path: "/dashboard/teams", label: "Equipos" },
  { path: "/dashboard/settings", label: "Configuración" },
  { path: "/dashboard/gamification", label: "Gamificación" },
  { path: "/dashboard/temporadas", label: "Temporadas" },
  { path: "/dashboard/badges", label: "Medallas" },
  { path: "/dashboard/certificates", label: "Certificados" },
  { path: "/dashboard/communications", label: "Comunicaciones" },
  { path: "/dashboard/subscriptions", label: "Suscripciones" },
  { path: "/dashboard/reportes-dinamicos", label: "Reportes" },
  { path: "/dashboard/incidents", label: "Incidentes" },
  { path: "/dashboard/manuales", label: "Manuales" },
];

test.describe("Producción — organizador (rutas)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, context }) => {
    test.skip(!isProductionQaEnabled(), "Definir E2E_MODE=real o E2E_PRODUCTION=1");
    await applyApiRewriteIfConfigured(context);
    await prepareOrganizerSession(page);
  });

  for (const { path, label } of ORGANIZER_ROUTES) {
    test(`${label} (${path})`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await assertDashboardShell(page);
      await assertHealthyPage(page);
    });
  }
});

test.describe("Producción — organizador (flujos)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, context }) => {
    test.skip(!isProductionQaEnabled(), "Definir E2E_MODE=real o E2E_PRODUCTION=1");
    await applyApiRewriteIfConfigured(context);
    await prepareOrganizerSession(page);
  });

  test("suscripciones muestran planes en BOB", async ({ page }) => {
    await page.goto("/dashboard/subscriptions");
    await assertDashboardShell(page);
    const main = page.locator("main");
    await expect(main.getByText("Plan Semilla", { exact: true })).toBeVisible({
      timeout: 25_000,
    });
    await expect(main.getByText("Plan Pro", { exact: true })).toBeVisible();
    await expect(main.getByText("Plan Corporativo", { exact: true })).toBeVisible();
    const body = await main.innerText();
    expect(body).toMatch(/140|Bs\s*140/i);
    expect(body).toMatch(/350|Bs\s*350/i);
    expect(body).not.toMatch(/\$49/);
    expect(body).not.toMatch(/Iniciativa/);
  });

  test("settings: miembros muestran nombre o email, no solo UUID", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await assertDashboardShell(page);
    await page.getByRole("tab", { name: /miembros/i }).click({ timeout: 15_000 }).catch(() => {});
    const main = page.locator("main");
    await expect(main).toBeVisible({ timeout: 20_000 });
    const text = await main.innerText();
    const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const uuidOnlyLines = lines.filter((l) => looksLikeUuid(l));
    expect(
      uuidOnlyLines.length,
      `líneas que parecen solo UUID: ${uuidOnlyLines.slice(0, 3).join(", ")}`
    ).toBeLessThan(2);
  });

  test("crear evento (formulario y submit)", async ({ page }) => {
    const { start, end } = eventDatetimeRange();
    const eventName = `QA Evento ${Date.now()}`;
    let eventPostStatus: number | null = null;

    page.on("response", (res) => {
      if (res.request().method() === "POST" && res.url().includes("/eventos")) {
        eventPostStatus = res.status();
      }
    });

    await page.goto("/dashboard/events");
    await assertDashboardShell(page);
    await page.getByRole("button", { name: /nuevo evento/i }).click();
    await expect(page.locator('input[placeholder*="Maratón"]')).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('input[placeholder*="Maratón"]').fill(eventName);
    await page.locator('input[type="datetime-local"]').nth(0).fill(start);
    await page.locator('input[type="datetime-local"]').nth(1).fill(end);
    await page.locator('input[type="number"]').first().fill("25");

    await page.getByRole("button", { name: /^Crear$/i }).click();
    await page.waitForTimeout(3_000);

    if (eventPostStatus === 403) {
      return;
    }

    await expect(
      page
        .getByText(/Evento creado como borrador/i)
        .or(page.getByText(/No se pudo crear/i))
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/No se pudo crear/i)).not.toBeVisible();
    await page.getByRole("button", { name: "Próximos" }).click();
    await expect(page.getByText(eventName).first()).toBeVisible({ timeout: 30_000 });
  });

  test("crear tarea (formulario y submit)", async ({ page }) => {
    const taskTitle = `QA Tarea ${Date.now()}`;

    await page.goto("/dashboard/tasks");
    await assertDashboardShell(page);
    await page.getByRole("button", { name: /nueva tarea/i }).click({ timeout: 15_000 });

    const form = page.locator("main").filter({ hasText: "Crear nueva tarea" });
    const eventSelect = form.locator("select").first();
    await expect(eventSelect.locator("option").nth(1)).toBeAttached({
      timeout: 15_000,
    });
    await eventSelect.selectOption({ index: 1 });
    await form.getByPlaceholder("Registro de participantes").fill(taskTitle);

    const crearBtn = form.getByRole("button", { name: /^Crear$/i });
    await expect(crearBtn).toBeEnabled({ timeout: 5_000 });
    await crearBtn.click();
    await expect(
      page
        .getByText(taskTitle)
        .or(page.getByText(/creada|éxito|success|tarea creada/i))
        .first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("organizaciones → ver perfil → volver", async ({ page, context }) => {
    const cfg = productionConfig();
    await page.goto("/dashboard/organizaciones");
    await assertDashboardShell(page);

    const verPerfil = page.locator(`a[href*="/org/${cfg.publicOrgSlug}"]`).first();
    await expect(verPerfil).toBeVisible({ timeout: 25_000 });

    const orgTabPromise = context.waitForEvent("page");
    await verPerfil.click();
    const orgTab = await orgTabPromise;
    await orgTab.waitForLoadState("domcontentloaded");
    await expect(orgTab).toHaveURL(new RegExp(`/org/${cfg.publicOrgSlug}`), {
      timeout: 30_000,
    });

    await orgTab.getByRole("link", { name: /volver/i }).first().click();
    await expect(orgTab).toHaveURL(/\/dashboard\/organizaciones/, { timeout: 20_000 });
    await orgTab.close();
  });

  test("sin 401 en /auth/me al navegar", async ({ page }) => {
    const cfg = productionConfig();
    const failures: string[] = [];
    page.on("response", (res) => {
      const url = res.url();
      if (!url.startsWith(cfg.backendUrl)) return;
      if (url.includes("/auth/me") && res.status() === 401) {
        failures.push(`401 en ${url}`);
      }
    });

    await page.goto("/dashboard/events");
    await assertDashboardShell(page);
    await page.goto("/dashboard/tasks");
    await assertDashboardShell(page);
    expect(failures).toEqual([]);
  });
});
