/**
 * app.spec.ts — Pruebas de páginas individuales
 *
 * Cubre: landing, autenticación, onboarding, protección de rutas y
 * smoke-tests de las páginas autenticadas con API mockeada.
 * Cada test incluye interacciones visuales para que los videos sean legibles.
 */
import { test, expect, type Page } from "@playwright/test";

// ─── Datos de mock ────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: "user-demo-001",
  email: "admin@lacausa.dev",
  nombre: "Admin Demo",
  is_active: true,
  rol: "admin",
};
const MOCK_ORG_ID = "org-demo-001";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Inyecta cookie + localStorage para simular sesión autenticada */
async function setAuthenticated(page: Page) {
  await page.context().addCookies([
    {
      name: "auth-session",
      value: "mock.jwt.token.for.testing",
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 7200,
    },
  ]);
  await page.addInitScript(
    ({ user, orgId }) => {
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          state: { token: "mock.jwt.token.for.testing", user, activeOrgId: orgId },
          version: 0,
        })
      );
    },
    { user: MOCK_USER, orgId: MOCK_ORG_ID }
  );
}

/** Intercepta todas las llamadas al backend y devuelve datos de demo */
async function mockBackendApis(page: Page) {
  await page.route("http://localhost:8000/**", async (route) => {
    const url    = route.request().url();
    const method = route.request().method();

    if (url.includes("/analytics/dashboard"))
      return route.fulfill({ json: { total_volunteers: 12, total_events: 5, total_tasks: 23, tasks_completed: 17 } });
    if (url.includes("/eventos") && method === "GET")
      return route.fulfill({
        json: [
          { id: "ev-1", titulo: "Maratón Solidaria",     descripcion: "Carrera benéfica anual", fecha_inicio: "2026-03-01T09:00", fecha_fin: "2026-03-01T13:00", estado: "publicado",  cupo_maximo: 100, organizacion_id: MOCK_ORG_ID, creador_id: null, ubicacion_geo: null, created_at: "2026-01-01T00:00:00", updated_at: "2026-01-01T00:00:00" },
          { id: "ev-2", titulo: "Feria de Voluntariado", descripcion: "Stand de la org",        fecha_inicio: "2026-03-15T10:00", fecha_fin: "2026-03-15T18:00", estado: "en_curso",   cupo_maximo: 50,  organizacion_id: MOCK_ORG_ID, creador_id: null, ubicacion_geo: null, created_at: "2026-01-01T00:00:00", updated_at: "2026-01-01T00:00:00" },
        ],
      });
    if (url.includes("/tareas"))
      return route.fulfill({
        json: [
          { id: "t-1", titulo: "Registrar participantes", estado: "pending",     organizacion_id: MOCK_ORG_ID },
          { id: "t-2", titulo: "Coordinar logística",     estado: "in_progress", organizacion_id: MOCK_ORG_ID },
          { id: "t-3", titulo: "Enviar notificaciones",   estado: "completed",   organizacion_id: MOCK_ORG_ID },
        ],
      });
    if (url.includes("/perfil") && url.includes("/competitivo"))
      return route.fulfill({ json: { usuario_id: MOCK_USER.id, nombre: MOCK_USER.nombre, puntos_elo: 1420, rango: "Oro", nivel: 7, racha_entregas: 14, eventos_completados: 8, tareas_completadas: 31, insignias_total: 5 } });
    if (url.includes("/perfil") && url.includes("/insignias"))
      return route.fulfill({
        json: [
          { id: "b-1", nombre: "Primer Evento",          rareza: "common",    puntos: 10,  descripcion: "Completó su primer evento",        criterio: "1_event"   },
          { id: "b-2", nombre: "Colaborador Dedicado",   rareza: "uncommon",  puntos: 50,  descripcion: "10 eventos completados",           criterio: "10_events" },
          { id: "b-3", nombre: "Héroe del Voluntariado", rareza: "rare",      puntos: 200, descripcion: "50 tareas completadas",            criterio: "50_tasks"  },
          { id: "b-4", nombre: "Campeón Épico",          rareza: "epic",      puntos: 500, descripcion: "Racha de 30 días",                 criterio: "30_streak" },
          { id: "b-5", nombre: "Leyenda Viva",           rareza: "legendary", puntos: 999, descripcion: "Top 1 del ranking durante un mes", criterio: "top1_month"},
        ],
      });
    if (url.includes("/ranking") && !url.includes("historico"))
      return route.fulfill({
        json: [
          { posicion: 1, usuario_id: "u-a",        nombre: "Ana García",     puntos_elo: 1850, rango: "Diamante", eventos_mes: 4, avatar_url: null },
          { posicion: 2, usuario_id: "u-b",        nombre: "Carlos López",   puntos_elo: 1720, rango: "Platino",  eventos_mes: 3, avatar_url: null },
          { posicion: 3, usuario_id: MOCK_USER.id, nombre: MOCK_USER.nombre, puntos_elo: 1420, rango: "Oro",      eventos_mes: 2, avatar_url: null },
        ],
      });
    if (url.includes("/notificaciones"))
      return route.fulfill({
        json: [
          { id: "n-1", titulo: "Nuevo evento asignado", cuerpo: "Maratón Solidaria",       leida: false, created_at: new Date().toISOString() },
          { id: "n-2", titulo: "Tarea completada",       cuerpo: "Registrar participantes", leida: true,  created_at: new Date().toISOString() },
        ],
      });
    if (url.includes("/api/agent/chat"))
      return route.fulfill({ json: { respuesta: "¡Hola! Soy el agente IA de La Causa.", acciones_ejecutadas: [], pending_confirmation: null } });
    if (url.includes("/roles"))
      return route.fulfill({ json: [{ id: "r-1", nombre: "Coordinador", permisos: ["manage_events"] }, { id: "r-2", nombre: "Voluntario Senior", permisos: ["view_events"] }] });
    if (url.includes("/organizaciones"))
      return route.fulfill({ json: [{ id: MOCK_ORG_ID, nombre: "Fundación Demo", descripcion: "Organización de prueba" }] });
    if (url.includes("/planes") || url.includes("/suscripciones"))
      return route.fulfill({ json: [{ id: "p-1", nombre: "Iniciativa", precio: 0, max_voluntarios: 20 }, { id: "p-2", nombre: "Organización IA", precio: 49, max_voluntarios: 200 }] });
    return route.fulfill({ json: [] });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Landing Page
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Landing Page", () => {
  test("muestra el hero con headline y CTAs principales", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Gestión inteligente");
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

    await expect(page.getByText("Iniciativa"      )).toBeVisible();
    await expect(page.getByText("Organización IA" )).toBeVisible();

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

    await expect(page.getByText("Todos los eventos"   )).toBeVisible();
    await expect(page.getByText("Maratón Solidaria"   )).toBeVisible();
    await expect(page.getByText("Feria de Voluntariado")).toBeVisible();
    await page.waitForTimeout(400);
  });

  test("Página de Gamificación muestra el título y espera datos", async ({ page }) => {
    await page.goto("/dashboard/gamification");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page.getByRole("heading", { name: "Gamificación" })).toBeVisible();
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

  test("Página de Retroalimentación muestra formulario con slider de puntaje", async ({ page }) => {
    await page.goto("/dashboard/retrospectives");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    await expect(page.getByRole("heading").filter({ hasText: /Retroalimentación/i })).toBeVisible();
    await expect(page.getByText("Puntaje de rendimiento"    )).toBeVisible();
    await expect(page.getByRole("button", { name: /Enviar retroalimentación/i })).toBeVisible();
    await page.waitForTimeout(400);
  });

  test("Página del Agente IA muestra la interfaz de chat", async ({ page }) => {
    await page.goto("/dashboard/agent");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    await expect(page.getByRole("heading", { name: "Agente IA" })).toBeVisible();
    await expect(page.locator('input[placeholder="Escribe tu mensaje\u2026"]')).toBeVisible();
    await page.waitForTimeout(400);
  });
});

