/**
 * app.spec.ts — Pruebas de páginas individuales
 *
 * Cubre: landing, autenticación, onboarding, protección de rutas y
 * smoke-tests de las páginas autenticadas con API mockeada.
 * Cada test incluye interacciones visuales para que los videos sean legibles.
 */
import { test, expect, type Page } from "@playwright/test";
import { installBackendMocks, setAuthenticated } from "./mock-backend";

/** Intercepta llamadas al backend (cualquier host de API) con datos de demo */
async function mockBackendApis(page: Page) {
  await installBackendMocks(page);
}

test.beforeEach(async ({ page }) => {
  await mockBackendApis(page);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Landing Page
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Landing Page", () => {
  test("muestra el hero con headline y CTAs principales", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("LA CAUSA Premium");
    await expect(page.getByRole("link", { name: /Prueba gratuita/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Iniciar Sesión/i  })).toBeVisible();

    await page.getByRole("link", { name: /Prueba gratuita/i }).hover();
    await page.waitForTimeout(400);
  });

  test("sección de features es visible y con scroll", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);

    await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
    await page.waitForTimeout(400);
    await page.locator("#features").scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    await expect(page.getByRole("heading", { name: "Matching IA"        })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Analítica Avanzada" })).toBeVisible();

    const firstCard = page.locator("#features").locator("[class*=rounded]").first();
    await firstCard.hover();
    await page.waitForTimeout(400);
  });

  test("sección de precios muestra los planes con hover", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    await page.locator("#pricing").scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    await expect(page.getByText("Plan Semilla")).toBeVisible();
    await expect(page.getByText("Plan Pro")).toBeVisible();
    await expect(page.getByText("Plan Corporativo")).toBeVisible();
    await expect(page.getByText("Bs 140")).toBeVisible();

    for (const card of await page.locator("#pricing [class*=rounded-3xl], #pricing [class*=rounded-2xl]").all()) {
      await card.hover();
      await page.waitForTimeout(200);
    }
  });

  test("navbar 'Iniciar Sesión' navega a /login con hover previo", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);

    const link = page.getByRole("link", { name: "Iniciar Sesión" });
    await link.hover();
    await page.waitForTimeout(300);
    await link.click();

    await expect(page).toHaveURL("/login");
    await page.waitForTimeout(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Autenticación
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Autenticación", () => {
  test("página de login muestra todos los campos del formulario", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page.getByTestId("email-input"   )).toBeVisible();
    await expect(page.getByTestId("password-input")).toBeVisible();
    await expect(page.getByTestId("submit-login"  )).toBeVisible();

    await page.getByTestId("email-input").click();
    await page.waitForTimeout(300);
  });

  test("página de registro muestra todos los campos con focus interactivo", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page.getByTestId("nombre-input"   )).toBeVisible();
    await expect(page.getByTestId("email-input"    )).toBeVisible();
    await expect(page.getByTestId("password-input" )).toBeVisible();
    await expect(page.getByTestId("submit-register")).toBeVisible();

    await page.getByTestId("nombre-input").click();
    await page.waitForTimeout(200);
    await page.getByTestId("email-input").click();
    await page.waitForTimeout(200);
    await page.getByTestId("password-input").click();
    await page.waitForTimeout(300);
  });

  test("login muestra error de credenciales inválidas (typing visible)", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);

    await page.getByTestId("email-input").click();
    await page.getByTestId("email-input").pressSequentially("noexiste@test.com", { delay: 40 });
    await page.waitForTimeout(200);
    await page.getByTestId("password-input").click();
    await page.getByTestId("password-input").pressSequentially("wrongpass123!", { delay: 40 });
    // ── Paso 2: Enviar y esperar respuesta del servidor ─────────────────────────────
    const [loginResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/auth/login"), { timeout: 15_000 }),
      page.getByTestId("submit-login").click(),
    ]);
    // El backend devuelve 401 para credenciales incorrectas
    expect([401, 422]).toContain(loginResponse.status());
    await page.waitForTimeout(500);

    await expect(page.getByText(/Credenciales|email y contrase/i)).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(700);
  });

  test("registro valida contraseña mínima de 8 caracteres", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);

    await page.getByTestId("nombre-input"  ).pressSequentially("Test User",    { delay: 40 });
    await page.waitForTimeout(150);
    await page.getByTestId("email-input"   ).pressSequentially("test@test.com",{ delay: 40 });
    await page.waitForTimeout(150);
    await page.getByTestId("password-input").pressSequentially("corto",        { delay: 40 });
    await page.waitForTimeout(300);

    await page.getByTestId("submit-register").click();

    const validity = await page
      .getByTestId("password-input")
      .evaluate((el: HTMLInputElement) => el.validity.tooShort);
    expect(validity).toBe(true);
    await page.waitForTimeout(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Onboarding
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Onboarding", () => {
  test("botón crear org está deshabilitado cuando el nombre está vacío", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const btn = page.getByTestId("create-org-btn");
    await expect(btn).toBeDisabled();
    await btn.hover();
    await page.waitForTimeout(400);
  });

  test("botón crear org se habilita al escribir el nombre", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);

    const input = page.getByTestId("org-nombre-input");
    await input.click();
    await input.pressSequentially("Mi Organización Demo", { delay: 50 });
    await page.waitForTimeout(400);

    await expect(page.getByTestId("create-org-btn")).toBeEnabled();
    await page.waitForTimeout(300);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Protección de rutas (sin sesión → redirige a /login)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Protección de rutas", () => {
  const protectedRoutes = [
    "/dashboard",
    "/dashboard/events",
    "/dashboard/tasks",
    "/dashboard/volunteers",
    "/dashboard/teams",
    "/dashboard/staff",
    "/dashboard/roles",
    "/dashboard/gamification",
    "/dashboard/certificates",
    "/dashboard/analytics",
    "/dashboard/communications",
    "/dashboard/retrospectives",
    "/dashboard/incidents",
    "/dashboard/subscriptions",
    "/dashboard/audit",
    "/dashboard/agent",
    "/dashboard/settings",
  ];

  for (const route of protectedRoutes) {
    test(`"${route}" redirige a /login sin autenticación`, async ({ page }) => {
      await page.context().clearCookies();
      await page.goto(route);
      await page.waitForTimeout(300);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Páginas autenticadas — smoke tests (mock de API)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Páginas autenticadas (smoke)", () => {
  test.beforeEach(async ({ page }) => {
    await setAuthenticated(page);
    await mockBackendApis(page);
  });

  test("Dashboard principal carga y muestra elementos clave", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    await expect(page.getByRole("link", { name: "La Causa AI" }).first()).toBeVisible();
    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("aside").first()).toBeVisible();
    await page.waitForTimeout(500);
  });

  test("Página de Eventos carga la lista mockeada", async ({ page }) => {
    await page.goto("/dashboard/events");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    await expect(page.getByText("Todos los eventos")).toBeVisible();
    await page.getByRole("button", { name: "En curso" }).click();
    await expect(page.getByText("Feria de Voluntariado")).toBeVisible();
    await page.getByRole("button", { name: "Próximos" }).click();
    await expect(page.getByText("Maratón Solidaria")).toBeVisible();
    await page.waitForTimeout(400);
  });

  test("Página de Gamificación muestra perfil competitivo y panel de sonidos", async ({ page }) => {
    await page.goto("/dashboard/gamification");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page.getByRole("heading", { name: /Mi perfil competitivo/i })).toBeVisible();
    await expect(page.getByText("Sonidos")).toBeVisible();
    await expect(page.getByRole("button", { name: /Activados|Desactivados/i })).toBeVisible();
    await expect(page.getByText("variante A / B / C")).not.toBeVisible();
    await page.waitForTimeout(500);
  });

  test("Página de Equipos muestra encabezado y botón de creación", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    await expect(page.getByRole("heading").filter({ hasText: /Equipos/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Nuevo equipo/i })).toBeVisible();
    await page.waitForTimeout(400);
  });

  test("Página de Staff muestra encabezado", async ({ page }) => {
    await page.goto("/dashboard/staff");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    await expect(page.getByRole("heading").filter({ hasText: /Staff/i })).toBeVisible();
    await page.waitForTimeout(400);
  });

  test("Página de Incidentes muestra formulario con opciones de severidad", async ({ page }) => {
    await page.goto("/dashboard/incidents");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    await expect(page.getByText("Reporte de incidentes")).toBeVisible();
    await expect(page.getByText("Baja"   )).toBeVisible();
    await expect(page.getByText("Media"  )).toBeVisible();
    await expect(page.getByText("Alta"   )).toBeVisible();
    await expect(page.getByText("Crítica")).toBeVisible();
    await page.waitForTimeout(400);
  });

  test("Retroalimentación ML por evento muestra formulario con puntaje", async ({ page }) => {
    await page.goto("/dashboard/events/ev-1/feedback-ml");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    await expect(page.getByRole("heading", { name: /Evaluación post-evento/i })).toBeVisible();
    await expect(page.getByText("Puntaje de rendimiento")).toBeVisible();
    await expect(page.getByRole("button", { name: /Enviar evaluación/i })).toBeVisible();
    await page.waitForTimeout(400);
  });

  test("Página del Agente IA muestra la interfaz de chat", async ({ page }) => {
    await page.goto("/dashboard/agent");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    await expect(page.getByRole("heading", { name: "Agente IA" })).toBeVisible();
    await expect(page.getByPlaceholder(/Escribe, dicta o adjunta/i)).toBeVisible();
    await page.waitForTimeout(400);
  });
});

