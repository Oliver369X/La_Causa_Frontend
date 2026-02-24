/**
 * flows.spec.ts — 10 flujos de usuario completos
 *
 * Cada flujo simula un caso de uso real de la plataforma, pasando por
 * múltiples pasos y pantallas para generar vídeos de evidencia legibles.
 *
 * Los flujos autenticados inyectan cookie + localStorage y mockean el
 * backend para que las páginas rendericen datos reales de demo.
 */
import { test, expect, type Page } from "@playwright/test";

// ─── Datos de demo compartidos ────────────────────────────────────────────────

const MOCK_USER = {
  id: "user-demo-001",
  email: "admin@lacausa.dev",
  nombre: "Admin Demo",
  is_active: true,
  rol: "admin",
};
const MOCK_ORG_ID = "org-demo-001";

// ─── Helpers reutilizables ────────────────────────────────────────────────────

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

async function mockBackendApis(page: Page) {
  await page.route("http://localhost:8000/**", async (route) => {
    const url    = route.request().url();
    const method = route.request().method();

    if (url.includes("/analytics/dashboard"))
      return route.fulfill({ json: { total_volunteers: 12, total_events: 5, total_tasks: 23, tasks_completed: 17 } });

    if (url.includes("/eventos") && method === "GET")
      return route.fulfill({
        json: [
          { id: "ev-1", titulo: "Maratón Solidaria",     descripcion: "Carrera benéfica anual",  fecha_inicio: "2026-03-01T09:00", fecha_fin: "2026-03-01T13:00", estado: "publicado",  cupo_maximo: 100, organizacion_id: MOCK_ORG_ID, creador_id: null, ubicacion_geo: null, created_at: "2026-01-01T00:00:00", updated_at: "2026-01-01T00:00:00" },
          { id: "ev-2", titulo: "Feria de Voluntariado", descripcion: "Stand de la org",          fecha_inicio: "2026-03-15T10:00", fecha_fin: "2026-03-15T18:00", estado: "en_curso",  cupo_maximo: 50,  organizacion_id: MOCK_ORG_ID, creador_id: null, ubicacion_geo: null, created_at: "2026-01-01T00:00:00", updated_at: "2026-01-01T00:00:00" },
          { id: "ev-3", titulo: "Taller de Habilidades", descripcion: "Formación voluntarios",  fecha_inicio: "2026-04-05T09:00", fecha_fin: "2026-04-05T17:00", estado: "borrador",  cupo_maximo: 30,  organizacion_id: MOCK_ORG_ID, creador_id: null, ubicacion_geo: null, created_at: "2026-01-01T00:00:00", updated_at: "2026-01-01T00:00:00" },
        ],
      });

    if (url.includes("/tareas"))
      return route.fulfill({
        json: [
          { id: "t-1", titulo: "Registrar participantes", estado: "pending",     organizacion_id: MOCK_ORG_ID },
          { id: "t-2", titulo: "Coordinar logística",     estado: "in_progress", organizacion_id: MOCK_ORG_ID },
          { id: "t-3", titulo: "Enviar notificaciones",   estado: "completed",   organizacion_id: MOCK_ORG_ID },
          { id: "t-4", titulo: "Preparar materiales",     estado: "pending",     organizacion_id: MOCK_ORG_ID },
        ],
      });

    if (url.includes("/perfil") && url.includes("/competitivo"))
      return route.fulfill({
        json: {
          usuario_id: MOCK_USER.id, nombre: MOCK_USER.nombre,
          puntos_elo: 1420, rango: "Oro", nivel: 7, racha_dias: 14,
          eventos_completados: 8, tareas_completadas: 31, insignias_total: 5,
        },
      });

    if (url.includes("/perfil") && url.includes("/insignias"))
      return route.fulfill({
        json: [
          { id: "b-1", nombre: "Primer Evento",          rareza: "common",    puntos: 10,  descripcion: "Completó su primer evento",             criterio: "1_event"    },
          { id: "b-2", nombre: "Colaborador Dedicado",   rareza: "uncommon",  puntos: 50,  descripcion: "10 eventos completados",                criterio: "10_events"  },
          { id: "b-3", nombre: "Héroe del Voluntariado", rareza: "rare",      puntos: 200, descripcion: "50 tareas completadas",                 criterio: "50_tasks"   },
          { id: "b-4", nombre: "Campeón Épico",          rareza: "epic",      puntos: 500, descripcion: "Racha de 30 días consecutivos",         criterio: "30_streak"  },
          { id: "b-5", nombre: "Leyenda Viva",           rareza: "legendary", puntos: 999, descripcion: "Top 1 del ranking durante un mes",      criterio: "top1_month" },
        ],
      });

    if (url.includes("/ranking") && !url.includes("historico"))
      return route.fulfill({
        json: [
          { posicion: 1, usuario_id: "u-a",        nombre: "Ana García",     puntos_elo: 1850, rango: "Diamante", eventos_mes: 4, avatar_url: null },
          { posicion: 2, usuario_id: "u-b",        nombre: "Carlos López",   puntos_elo: 1720, rango: "Platino",  eventos_mes: 3, avatar_url: null },
          { posicion: 3, usuario_id: MOCK_USER.id, nombre: MOCK_USER.nombre, puntos_elo: 1420, rango: "Oro",      eventos_mes: 2, avatar_url: null },
          { posicion: 4, usuario_id: "u-c",        nombre: "Laura Martínez", puntos_elo: 1300, rango: "Plata",    eventos_mes: 1, avatar_url: null },
        ],
      });

    if (url.includes("/notificaciones"))
      return route.fulfill({
        json: [
          { id: "n-1", titulo: "Nuevo evento asignado",  cuerpo: "Maratón Solidaria",        leida: false, created_at: new Date().toISOString() },
          { id: "n-2", titulo: "Tarea completada",        cuerpo: "Registrar participantes",  leida: true,  created_at: new Date().toISOString() },
          { id: "n-3", titulo: "Recordatorio de evento",  cuerpo: "Feria de Voluntariado",   leida: false, created_at: new Date().toISOString() },
        ],
      });

    if (url.includes("/api/agent/chat"))
      return route.fulfill({
        json: {
          respuesta:
            "¡Hola Admin Demo! Soy el agente IA de La Causa. Puedo ayudarte a gestionar voluntarios, crear eventos, asignar tareas y analizar el rendimiento del equipo. ¿En qué te ayudo hoy?",
          acciones_ejecutadas: [],
          pending_confirmation: null,
        },
      });

    if (url.includes("/roles"))
      return route.fulfill({
        json: [
          { id: "r-1", nombre: "Coordinador",       permisos: ["manage_events", "manage_tasks"] },
          { id: "r-2", nombre: "Voluntario Senior",  permisos: ["view_events", "complete_tasks"] },
          { id: "r-3", nombre: "Observador",         permisos: ["view_events"]                   },
        ],
      });

    if (url.includes("/organizaciones"))
      return route.fulfill({ json: [{ id: MOCK_ORG_ID, nombre: "Fundación Demo", descripcion: "Organización de prueba" }] });

    if (url.includes("/planes") || url.includes("/suscripciones"))
      return route.fulfill({ json: [{ id: "p-1", nombre: "Iniciativa", precio: 0, max_voluntarios: 20 }, { id: "p-2", nombre: "Organización IA", precio: 49, max_voluntarios: 200 }] });

    if (url.includes("/certificados") || url.includes("/medallas") || url.includes("/temporadas") || url.includes("/elo-rangos") || url.includes("/auditoria") || url.includes("/equipos"))
      return route.fulfill({ json: [] });

    return route.fulfill({ json: [] });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO 1 — Visitante explora la landing page completa
// ═════════════════════════════════════════════════════════════════════════════

test("Flujo 1 › Visitante navega la landing page de inicio a fin", async ({ page }) => {
  // ── Paso 1: Abrir la landing ──────────────────────────────────────────────
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);

  // ── Paso 2: Verificar el hero y hacer hover sobre los CTAs ───────────────
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Gestión inteligente");
  await page.getByRole("link", { name: /Prueba gratuita/i }).hover();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: /Iniciar Sesión/i  }).hover();
  await page.waitForTimeout(500);

  // ── Paso 3: Scroll suave a la sección Features ───────────────────────────
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
  await page.waitForTimeout(600);
  await page.locator("#features").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  await expect(page.getByRole("heading", { name: "Matching IA"        })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Analítica Avanzada" })).toBeVisible();

  // Hover sobre las features cards
  const featureCards = page.locator("#features [class*=rounded]").filter({ hasNot: page.locator("br") });
  for (const card of await featureCards.all()) {
    if (await card.isVisible()) {
      await card.hover();
      await page.waitForTimeout(250);
    }
  }

  // ── Paso 4: Scroll a la sección de Precios ───────────────────────────────
  await page.locator("#pricing").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  await expect(page.getByText("Iniciativa"     )).toBeVisible();
  await expect(page.getByText("Organización IA")).toBeVisible();

  for (const card of await page.locator("#pricing").locator("[class*=rounded-3xl], [class*=rounded-2xl]").all()) {
    if (await card.isVisible()) {
      await card.hover();
      await page.waitForTimeout(300);
    }
  }

  // ── Paso 5: Volver arriba y navegar al login ──────────────────────────────
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(600);

  await page.getByRole("link", { name: "Iniciar Sesión" }).click();
  await expect(page).toHaveURL("/login");
  await page.waitForTimeout(500);
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO 2 — Nuevo usuario: registro con validación del formulario
// ═════════════════════════════════════════════════════════════════════════════

test("Flujo 2 › Nuevo usuario completa el formulario de registro con validación", async ({ page }) => {
  await page.goto("/register");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  // ── Paso 1: Intentar enviar con contraseña corta ──────────────────────────
  await page.getByTestId("nombre-input").click();
  await page.getByTestId("nombre-input").pressSequentially("María José Vargas", { delay: 45 });
  await page.waitForTimeout(300);

  await page.getByTestId("email-input").click();
  await page.getByTestId("email-input").pressSequentially("maria@fundacion.org", { delay: 45 });
  await page.waitForTimeout(300);

  await page.getByTestId("password-input").click();
  await page.getByTestId("password-input").pressSequentially("abc", { delay: 60 });
  await page.waitForTimeout(400);

  await page.getByTestId("submit-register").click();
  await page.waitForTimeout(500);

  // Validación nativa de HTML5 impide el envío
  const tooShort = await page.getByTestId("password-input").evaluate((el: HTMLInputElement) => el.validity.tooShort);
  expect(tooShort).toBe(true);

  // ── Paso 2: Corregir la contraseña ───────────────────────────────────────
  await page.getByTestId("password-input").fill("");
  await page.getByTestId("password-input").pressSequentially("Voluntaria2024!", { delay: 45 });
  await page.waitForTimeout(500);

  // Botón debe estar habilitado
  await expect(page.getByTestId("submit-register")).toBeEnabled();
  await page.waitForTimeout(400);

  // ── Paso 3: Ver el link hacia login ──────────────────────────────────────
  const loginLink = page.getByRole("link", { name: /Iniciar sesión|login/i }).first();
  if (await loginLink.isVisible()) {
    await loginLink.hover();
    await page.waitForTimeout(400);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO 3 — Intento de login: credenciales erróneas y corrección visual
// ═════════════════════════════════════════════════════════════════════════════

test("Flujo 3 › Usuario intenta login con credenciales incorrectas y ve el error", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  // ── Paso 1: Escribir credenciales incorrectas ──────────────────────────────
  await page.getByTestId("email-input").click();
  await page.getByTestId("email-input").pressSequentially("hacker@fake.com", { delay: 50 });
  await page.waitForTimeout(300);

  await page.getByTestId("password-input").click();
  await page.getByTestId("password-input").pressSequentially("Password123!", { delay: 50 });
  await page.waitForTimeout(300);

  // ── Paso 2: Enviar y esperar el mensaje de error ──────────────────────────
  await page.getByTestId("submit-login").hover();
  await page.waitForTimeout(300);
  const [loginResponse] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes("/auth/login"), { timeout: 15_000 }),
    page.getByTestId("submit-login").click(),
  ]);
  expect([401, 422]).toContain(loginResponse.status());
  await page.waitForTimeout(500);

  await expect(page.getByText(/Credenciales|email y contrase/i)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1000); // dejar visible el error en el video

  // ── Paso 3: Limpiar y preparar campos correctos ───────────────────────────
  await page.getByTestId("email-input").fill("");
  await page.getByTestId("email-input").pressSequentially("admin@lacausa.dev", { delay: 45 });
  await page.waitForTimeout(300);

  await page.getByTestId("password-input").fill("");
  await page.getByTestId("password-input").pressSequentially("P@ssw0rdDemo!", { delay: 45 });
  await page.waitForTimeout(400);

  // Mostrar el botón activo antes de finalizar el flujo
  await page.getByTestId("submit-login").hover();
  await page.waitForTimeout(400);
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO 4 — Seguridad: múltiples rutas protegidas rechazan el acceso
// ═════════════════════════════════════════════════════════════════════════════

test("Flujo 4 › Seguridad — rutas protegidas redirigen a /login sin sesión", async ({ page }) => {
  await page.context().clearCookies();

  const rutas = [
    { path: "/dashboard",              label: "Dashboard principal"   },
    { path: "/dashboard/events",       label: "Gestión de eventos"    },
    { path: "/dashboard/gamification", label: "Gamificación"          },
    { path: "/dashboard/agent",        label: "Agente IA"             },
    { path: "/dashboard/analytics",    label: "Analítica"             },
  ];

  for (const { path } of rutas) {
    // Navegar a la ruta protegida
    await page.goto(path);
    await page.waitForTimeout(500);

    // Debe redirigir a /login
    await expect(page).toHaveURL(/\/login/);

    // Mostrar en pantalla que fue rechazada
    await expect(page.getByTestId("email-input")).toBeVisible();
    await page.waitForTimeout(400);
  }

  // Al final el usuario está en /login, listo para autenticarse
  await expect(page).toHaveURL(/\/login/);
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO 5 — Onboarding: crear la primera organización paso a paso
// ═════════════════════════════════════════════════════════════════════════════

test("Flujo 5 › Onboarding — usuario crea su primera organización", async ({ page }) => {
  // Autenticar SIN orgId para llegar al onboarding
  await page.context().addCookies([{
    name: "auth-session",
    value: "mock.jwt.token.for.testing",
    domain: "localhost",
    path: "/",
    expires: Math.floor(Date.now() / 1000) + 7200,
  }]);
  await page.addInitScript(
    ({ user }) => {
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({ state: { token: "mock.jwt.token.for.testing", user, activeOrgId: null }, version: 0 })
      );
    },
    { user: MOCK_USER }
  );

  await page.goto("/onboarding");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);

  // ── Paso 1: Verificar estado inicial (botón deshabilitado) ─────────────────
  const btn = page.getByTestId("create-org-btn");
  await expect(btn).toBeDisabled();
  await btn.hover();
  await page.waitForTimeout(500);

  // ── Paso 2: Escribir el nombre de la organización ─────────────────────────
  const nombreInput = page.getByTestId("org-nombre-input");
  await nombreInput.click();
  await nombreInput.pressSequentially("Fundación Esperanza Digital", { delay: 55 });
  await page.waitForTimeout(500);

  // Botón ahora habilitado
  await expect(btn).toBeEnabled();
  await page.waitForTimeout(300);

  // ── Paso 3: Agregar descripción ───────────────────────────────────────────
  const descInput = page.getByTestId("org-descripcion-input");
  if (await descInput.isVisible()) {
    await descInput.click();
    await descInput.pressSequentially("Educación digital para comunidades vulnerables", { delay: 40 });
    await page.waitForTimeout(500);
  }

  // ── Paso 4: Vista final del formulario completo ───────────────────────────
  await btn.hover();
  await page.waitForTimeout(600);
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO 6 — Dashboard principal: métricas, hover y widgets
// ═════════════════════════════════════════════════════════════════════════════

test("Flujo 6 › Dashboard principal — exploración de métricas y widgets", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000); // esperar a que los datos carguen

  // ── Paso 1: Verificar sidebar y título ────────────────────────────────────
  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByRole("link", { name: "La Causa AI" }).first()).toBeVisible();

  // ── Paso 2: Hover sobre cada item del menú lateral ───────────────────────
  const navLinks = page.locator("aside nav a");
  const allLinks = await navLinks.all();
  for (let i = 0; i < Math.min(6, allLinks.length); i++) {
    await allLinks[i].hover();
    await page.waitForTimeout(200);
  }

  // ── Paso 3: Verificar tarjetas de estadísticas ────────────────────────────
  await page.waitForTimeout(500);
  const statCards = page.locator("[class*=rounded-2xl]").filter({ hasText: /Voluntarios|Eventos|Tareas|Completadas/ });
  for (const card of await statCards.all()) {
    if (await card.isVisible()) {
      await card.hover();
      await page.waitForTimeout(300);
    }
  }

  // ── Paso 4: Scroll a la sección de widgets ────────────────────────────────
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "smooth" }));
  await page.waitForTimeout(700);
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO 7 — Gestión de eventos: listar y abrir el formulario de creación
// ═════════════════════════════════════════════════════════════════════════════

test("Flujo 7 › Eventos — listar eventos y abrir formulario de creación", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard/events");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);

  // ── Paso 1: Ver los eventos cargados desde el mock ────────────────────────
  await expect(page.getByText("Todos los eventos"    )).toBeVisible();
  await expect(page.getByText("Maratón Solidaria"    )).toBeVisible();
  await expect(page.getByText("Feria de Voluntariado" )).toBeVisible();

  // Hover sobre las event cards
  const cardsLocator = page.locator("[class*=rounded-2xl]").filter({ hasText: /Soli|Feria|Taller/ }).first();
  if (await cardsLocator.isVisible()) {
    await cardsLocator.hover();
    await page.waitForTimeout(400);
  }

  // ── Paso 2: Abrir el formulario de nuevo evento ───────────────────────────
  await page.getByRole("button", { name: /Nuevo evento/i }).hover();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Nuevo evento/i }).click();
  await page.waitForTimeout(600);

  // ── Paso 3: Llenar el formulario campo por campo ──────────────────────────
  const nombreEvento = page.getByPlaceholder("Maratón de Solidaridad");
  if (await nombreEvento.isVisible()) {
    await nombreEvento.click();
    await nombreEvento.pressSequentially("Jornada de Limpieza Comunitaria", { delay: 40 });
    await page.waitForTimeout(300);
  }

  const desc = page.getByPlaceholder("Descripción opcional");
  if (await desc.isVisible()) {
    await desc.click();
    await desc.pressSequentially("Limpieza del parque central con 30 voluntarios", { delay: 35 });
    await page.waitForTimeout(300);
  }

  // Fechas
  const fechaInicio = page.locator('input[type="datetime-local"]').first();
  if (await fechaInicio.isVisible()) {
    await fechaInicio.fill("2026-04-01T09:00");
    await page.waitForTimeout(200);
  }
  const fechaFin = page.locator('input[type="datetime-local"]').nth(1);
  if (await fechaFin.isVisible()) {
    await fechaFin.fill("2026-04-01T13:00");
    await page.waitForTimeout(200);
  }

  await page.waitForTimeout(500);

  // ── Paso 4: Cancelar (no enviar a la API real) ───────────────────────────
  await page.getByRole("button", { name: /Cancelar/i }).hover();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Cancelar/i }).click();
  await page.waitForTimeout(500);
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO 8 — Gamificación: perfil competitivo, ranking e insignias
// ═════════════════════════════════════════════════════════════════════════════

test("Flujo 8 › Gamificación — perfil, ranking y cambio a insignias", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard/gamification");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200); // los 3 queries tardan un momento

  // ── Paso 1: Verificar que el perfil cargó ────────────────────────────────
  await expect(page.getByRole("heading", { name: "Gamificación" })).toBeVisible();
  await page.waitForTimeout(400);

  // ── Paso 2: Ver el banner de perfil ──────────────────────────────────────
  const profileSection = page.locator("[class*=rounded-2xl]").filter({ hasText: /Oro|Diamante|Platino|ELO/ }).first();
  if (await profileSection.isVisible()) {
    await profileSection.hover();
    await page.waitForTimeout(400);
  }

  // ── Paso 3: Scroll al ranking ─────────────────────────────────────────────
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await page.waitForTimeout(600);

  // Ver entradas del ranking
  for (const nombre of ["Ana García", "Carlos López"]) {
    const entry = page.getByText(nombre);
    if (await entry.isVisible()) {
      await entry.hover();
      await page.waitForTimeout(300);
    }
  }

  // ── Paso 4: Cambiar a la pestaña "Insignias" ──────────────────────────────
  const insigniasTab = page.getByRole("button", { name: /Insignias/i });
  if (await insigniasTab.isVisible()) {
    await insigniasTab.hover();
    await page.waitForTimeout(300);
    await insigniasTab.click();
    await page.waitForTimeout(600);
  }

  // ── Paso 5: Ver la cuadrícula de insignias ────────────────────────────────
  for (const badge of ["Primer Evento", "Colaborador Dedicado"]) {
    const el = page.getByText(badge);
    if (await el.isVisible()) {
      await el.hover();
      await page.waitForTimeout(300);
    }
  }

  await page.waitForTimeout(500);
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO 9 — Reporte de incidente: formulario paso a paso con severidad
// ═════════════════════════════════════════════════════════════════════════════

test("Flujo 9 › Incidentes — usuario reporta un incidente paso a paso", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard/incidents");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);

  // ── Paso 1: Verificar que la página cargó ────────────────────────────────
  await expect(page.getByText("Reporte de incidentes")).toBeVisible();
  await page.waitForTimeout(400);

  // ── Paso 2: Escribir el título ───────────────────────────────────────────
  const titulo = page.getByPlaceholder("Resumen breve del problema");
  await titulo.click();
  await titulo.pressSequentially("Voluntario no asistió al evento asignado", { delay: 40 });
  await page.waitForTimeout(400);

  // ── Paso 3: Escribir la descripción ──────────────────────────────────────
  const desc = page.getByPlaceholder(/Describe el incidente/i);
  await desc.click();
  await desc.pressSequentially(
    "El voluntario Carlos García no se presentó el 1/03/2026 en la Maratón Solidaria. No respondió mensajes previos.",
    { delay: 25 }
  );
  await page.waitForTimeout(500);

  // ── Paso 4: Agregar ID del evento ─────────────────────────────────────────
  const eventoId = page.getByPlaceholder("UUID del evento relacionado");
  await eventoId.click();
  await eventoId.pressSequentially("ev-1", { delay: 50 });
  await page.waitForTimeout(300);

  // ── Paso 5: Recorrer todas las opciones de severidad ─────────────────────
  for (const sev of ["Baja", "Media", "Alta", "Crítica"]) {
    const btn = page.getByRole("button", { name: sev });
    await btn.hover();
    await page.waitForTimeout(200);
    await btn.click();
    await page.waitForTimeout(350);
  }

  // Dejar en "Alta" (valor final visible)
  await page.getByRole("button", { name: "Alta" }).click();
  await page.waitForTimeout(400);

  // ── Paso 6: Agregar ID del administrador ─────────────────────────────────
  const adminId = page.getByPlaceholder("UUID del administrador");
  await adminId.click();
  await adminId.pressSequentially("user-admin-001", { delay: 50 });
  await page.waitForTimeout(400);

  // ── Paso 7: Mostrar el botón de reporte activo ───────────────────────────
  await page.getByRole("button", { name: /Reportar incidente/i }).hover();
  await page.waitForTimeout(600);
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO 10 — Agente IA: conversación interactiva con respuesta mockeada
// ═════════════════════════════════════════════════════════════════════════════

test("Flujo 10 › Agente IA — conversación interactiva con la plataforma", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard/agent");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);

  // ── Paso 1: Ver la interfaz de chat ──────────────────────────────────────
  await expect(page.getByRole("heading", { name: "Agente IA" })).toBeVisible();
  const chatInput = page.locator('input[placeholder="Escribe tu mensaje\u2026"]');
  await expect(chatInput).toBeVisible();
  await page.waitForTimeout(500);

  // ── Paso 2: Escribir el primer mensaje ───────────────────────────────────
  await chatInput.click();
  await chatInput.pressSequentially(
    "¿Cuántos voluntarios están activos esta semana?",
    { delay: 45 }
  );
  await page.waitForTimeout(500);

  // ── Paso 3: Enviar el mensaje (Enter o botón Submit) ──────────────────────
  const sendBtn = page.locator('button[type="submit"]');
  await sendBtn.hover();
  await page.waitForTimeout(300);
  await sendBtn.click();
  await page.waitForTimeout(1500); // esperar la respuesta mockeada

  // ── Paso 4: Ver el mensaje del usuario en el chat ────────────────────────
  await expect(
    page.getByText("¿Cuántos voluntarios están activos esta semana?")
  ).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(500);

  // ── Paso 5: Ver la respuesta del agente ──────────────────────────────────
  await expect(
    page.getByText(/¡Hola Admin Demo!|Hola.*Puedo ayudarte/i)
  ).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(600);

  // ── Paso 6: Enviar un segundo mensaje ────────────────────────────────────
  await chatInput.click();
  await chatInput.pressSequentially(
    "Crea un evento de voluntariado para el 15 de abril",
    { delay: 45 }
  );
  await page.waitForTimeout(400);
  await sendBtn.click();
  await page.waitForTimeout(1200);

  // ── Paso 7: Scroll para ver la conversación ───────────────────────────────
  await page.evaluate(() => {
    const el = document.querySelector("[class*=overflow-y-auto]");
    if (el) el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(600);
});
