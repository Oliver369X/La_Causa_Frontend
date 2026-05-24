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
import { installBackendMocks, setAuthenticated } from "./mock-backend";

async function mockBackendApis(page: Page) {
  await installBackendMocks(page);
}

test.beforeEach(async ({ page }) => {
  await mockBackendApis(page);
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO 1 — Visitante explora la landing page completa
// ═════════════════════════════════════════════════════════════════════════════

test("Flujo 1 › Visitante navega la landing page de inicio a fin", async ({ page }) => {
  // ── Paso 1: Abrir la landing ──────────────────────────────────────────────
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);

  // ── Paso 2: Verificar el hero y hacer hover sobre los CTAs ───────────────
  await expect(page.getByRole("heading", { level: 1 })).toContainText("LA CAUSA Premium");
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

  await expect(page.getByText("Plan Semilla")).toBeVisible();
  await expect(page.getByText("Plan Pro")).toBeVisible();
  await expect(page.getByText("Plan Corporativo")).toBeVisible();

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
  const chatInput = page.getByPlaceholder(/Escribe, dicta o adjunta/i);
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
