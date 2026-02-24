/**
 * integration.spec.ts — Tests de integración REAL frontend ↔ backend
 *
 * A diferencia de app.spec.ts y flows.spec.ts (que mockean el backend),
 * estos tests llaman al backend REAL en http://localhost:8000.
 *
 * Requisitos: backend corriendo en :8000 y frontend en :3001.
 * Si el backend no está disponible, cada test se salta automáticamente.
 *
 * Qué se verifica:
 *  - Los endpoints del backend responden correctamente
 *  - El frontend muestra los datos reales devueltos por el backend
 *  - El flujo auth completo (register → login → JWT) funciona en la UI
 *  - Las rutas protegidas requieren el token correcto
 */
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

// ─── Configuración ────────────────────────────────────────────────────────────

const BACKEND = "http://localhost:8000";

// Usuario temporal creado en cada suite (se genera con timestamp para evitar conflictos)
const TS   = Date.now();
const TEST_EMAIL    = `integration_${TS}@test.lacausa.dev`;
const TEST_PASSWORD = "IntegTest2026!";
const TEST_NOMBRE   = `TestUser_${TS}`;

// ─── Helper: verificar que el backend está activo ─────────────────────────────

async function backendIsUp(request: APIRequestContext): Promise<boolean> {
  try {
    const r = await request.get(`${BACKEND}/health`, { timeout: 5_000 });
    return r.ok();
  } catch {
    return false;
  }
}

// ─── Helper: registrar y hacer login, devuelve { token, userId, orgId | null } ─

async function fullRegisterLogin(request: APIRequestContext) {
  // Email único por llamada para evitar conflictos entre tests paralelos/secuenciales
  const id    = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  const email = `int_${id}@test.lacausa.dev`;
  const pwd   = "IntegTest2026!";

  // 1. Registrar
  const regRes = await request.post(`${BACKEND}/auth/register`, {
    data: { nombre: `TestUser_${id}`, email, password: pwd },
  });
  if (!regRes.ok()) {
    const body = await regRes.text();
    throw new Error(`Register failed ${regRes.status()}: ${body}`);
  }
  const regBody = await regRes.json();

  // 2. Login
  const loginRes = await request.post(`${BACKEND}/auth/login`, {
    data: { email, password: pwd },
  });
  expect(loginRes.ok()).toBe(true);
  const { access_token } = await loginRes.json();
  expect(access_token).toBeTruthy();

  return { token: access_token, userId: regBody.id as string };
}

// ─── Helper: inyectar JWT real en el navegador ────────────────────────────────

async function injectRealAuth(page: Page, token: string, user: object, orgId: string | null = null) {
  await page.context().addCookies([{
    name: "auth-session",
    value: token,
    domain: "localhost",
    path: "/",
    expires: Math.floor(Date.now() / 1000) + 7200,
  }]);
  await page.addInitScript(
    ({ t, u, o }) => {
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({ state: { token: t, user: u, activeOrgId: o }, version: 0 })
      );
    },
    { t: token, u: user, o: orgId }
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE A — Health & Conectividad básica
// ═════════════════════════════════════════════════════════════════════════════

test.describe("A › Backend: Health & Conectividad", () => {

  test("A1 › GET /health responde { status: 'ok' }", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const res  = await request.get(`${BACKEND}/health`);
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("ok");
  });

  test("A2 › CORS permite peticiones desde el origen del frontend", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const res = await request.get(`${BACKEND}/health`, {
      headers: { Origin: "http://localhost:3001" },
    });
    expect(res.ok()).toBe(true);
    const allowOrigin = res.headers()["access-control-allow-origin"];
    expect(allowOrigin).toBeTruthy();
  });

  test("A3 › Docs de OpenAPI accesibles en /docs", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const res = await request.get(`${BACKEND}/docs`);
    expect(res.ok()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE B — Autenticación real (register + login + me)
// ═════════════════════════════════════════════════════════════════════════════

test.describe("B › Auth: Register, Login y /auth/me", () => {

  test("B1 › POST /auth/register crea un usuario nuevo", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const email = `b1_${TS}@test.dev`;
    const res   = await request.post(`${BACKEND}/auth/register`, {
      data: { nombre: "B1 Tester", email, password: "TestPass1234!" },
    });
    const body  = await res.json();

    expect(res.status()).toBe(201);
    expect(body.email).toBe(email);
    expect(body.id).toBeTruthy();
    expect(body).not.toHaveProperty("password");   // nunca exponer contraseña
    expect(body).not.toHaveProperty("hashed_password");
  });

  test("B2 › POST /auth/login devuelve access_token válido", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    // Registrar primero
    const email = `b2_${TS}@test.dev`;
    await request.post(`${BACKEND}/auth/register`, {
      data: { nombre: "B2 Tester", email, password: "TestPass1234!" },
    });

    // Login
    const res  = await request.post(`${BACKEND}/auth/login`, {
      data: { email, password: "TestPass1234!" },
    });
    const body = await res.json();

    expect(res.ok()).toBe(true);
    expect(body.access_token).toBeTruthy();
    expect(body.token_type).toBe("bearer");
  });

  test("B3 › POST /auth/login devuelve 401 con contraseña incorrecta", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const email = `b3_${TS}@test.dev`;
    await request.post(`${BACKEND}/auth/register`, {
      data: { nombre: "B3 Tester", email, password: "TestPass1234!" },
    });

    const res = await request.post(`${BACKEND}/auth/login`, {
      data: { email, password: "WrongPassword!" },
    });

    expect(res.status()).toBe(401);
  });

  test("B4 › GET /auth/me devuelve el perfil del usuario autenticado", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const email = `b4_${TS}@test.dev`;
    await request.post(`${BACKEND}/auth/register`, {
      data: { nombre: "B4 Tester", email, password: "TestPass1234!" },
    });
    const loginRes  = await request.post(`${BACKEND}/auth/login`, {
      data: { email, password: "TestPass1234!" },
    });
    const { access_token } = await loginRes.json();

    const meRes  = await request.get(`${BACKEND}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const meBody = await meRes.json();

    expect(meRes.ok()).toBe(true);
    expect(meBody.email).toBe(email);
    expect(meBody.nombre).toBe("B4 Tester");
  });

  test("B5 › GET /auth/me devuelve 401 sin token", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const res = await request.get(`${BACKEND}/auth/me`);
    expect(res.status()).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE C — Organizaciones
// ═════════════════════════════════════════════════════════════════════════════

test.describe("C › Organizaciones: CRUD real", () => {

  test("C1 › POST /organizaciones crea una organización y la devuelve", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const { token } = await fullRegisterLogin(request);
    const slug = `org-integracion-${TS}`;

    const res  = await request.post(`${BACKEND}/organizaciones`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nombre: `Org_${TS}`, slug, descripcion: "Org de integración" },
    });
    const body = await res.json();

    expect(res.status()).toBe(201);
    expect(body.nombre).toBe(`Org_${TS}`);
    expect(body.id).toBeTruthy();
  });

  test("C2 › GET /organizaciones lista las organizaciones del usuario", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const { token } = await fullRegisterLogin(request);

    // Crear una org primero
    await request.post(`${BACKEND}/organizaciones`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nombre: `OrgList_${TS}`, slug: `org-list-${TS}`, descripcion: "Para listar" },
    });

    // Listar
    const res  = await request.get(`${BACKEND}/organizaciones`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();

    expect(res.ok()).toBe(true);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE D — Eventos (Planning Resources)
// ═════════════════════════════════════════════════════════════════════════════

test.describe("D › Eventos: CRUD real", () => {
  let orgId: string;
  let token: string;

  test.beforeEach(async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const auth = await fullRegisterLogin(request);
    token = auth.token;

    // Slug único por llamada para evitar conflicto de unicidad entre tests
    const runId = `${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    // Crear org para los eventos
    const orgRes = await request.post(`${BACKEND}/organizaciones`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nombre: `OrgEvento_${runId}`, slug: `org-ev-${runId}`, descripcion: "Para eventos" },
    });
    const orgBody = await orgRes.json();
    orgId = orgBody.id;
  });

  test("D1 › POST /eventos crea un evento", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const res  = await request.post(`${BACKEND}/eventos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        titulo: `Evento_${TS}`,
        descripcion: "Evento de integración",
        fecha_inicio: "2026-06-01T09:00:00",
        fecha_fin: "2026-06-01T13:00:00",
        organizacion_id: orgId,
        cupo_maximo: 30,
      },
    });
    const body = await res.json();

    expect(res.status()).toBe(201);
    expect(body.titulo).toBe(`Evento_${TS}`);
    expect(body.id).toBeTruthy();
    expect(body.organizacion_id).toBe(orgId);
  });

  test("D2 › GET /eventos lista los eventos de la organización", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    // Crear evento primero
    await request.post(`${BACKEND}/eventos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        titulo: `EventoList_${TS}`,
        descripcion: "Para listar",
        fecha_inicio: "2026-07-01T09:00:00",
        fecha_fin: "2026-07-01T13:00:00",
        organizacion_id: orgId,
        cupo_maximo: 20,
      },
    });

    const res  = await request.get(`${BACKEND}/eventos?org_id=${orgId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();

    expect(res.ok()).toBe(true);
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((e: { titulo: string }) => e.titulo === `EventoList_${TS}`)).toBe(true);
  });

  test("D3 › GET /eventos/{id} devuelve el evento correcto", async ({ request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const createRes = await request.post(`${BACKEND}/eventos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        titulo: `EventoById_${TS}`,
        descripcion: "Test por ID",
        fecha_inicio: "2026-08-01T09:00:00",
        fecha_fin: "2026-08-01T13:00:00",
        organizacion_id: orgId,
        cupo_maximo: 15,
      },
    });
    const { id } = await createRes.json();

    const res  = await request.get(`${BACKEND}/eventos/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();

    expect(res.ok()).toBe(true);
    expect(body.id).toBe(id);
    expect(body.titulo).toBe(`EventoById_${TS}`);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE E — Frontend + Backend REAL (sin mocks)
//   Verifica que la UI muestra datos reales del backend
// ═════════════════════════════════════════════════════════════════════════════

test.describe("E › UI + Backend real: el frontend muestra datos del backend", () => {

  test("E1 › Login real desde la UI: token del backend autentica la sesión", async ({ page, request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    // Crear usuario en el backend
    const email = `e1_${TS}@test.dev`;
    await request.post(`${BACKEND}/auth/register`, {
      data: { nombre: "E1 UI Tester", email, password: "UITest2026!" },
    });

    // Navegar al login y usar la UI real (sin inyectar token)
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await page.getByTestId("email-input").pressSequentially(email,        { delay: 40 });
    await page.getByTestId("password-input").pressSequentially("UITest2026!", { delay: 40 });
    await page.waitForTimeout(300);

    await page.getByTestId("submit-login").click();

    // Debe redirigir a /onboarding o /dashboard
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 10_000 });
    await page.waitForTimeout(600);
  });

  test("E2 › Dashboard: el frontend carga datos reales del backend", async ({ page, request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    // Autenticar via API y crear org
    const { token, userId } = await fullRegisterLogin(request);

    const orgRes = await request.post(`${BACKEND}/organizaciones`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nombre: `DashOrg_${TS}`, slug: `dash-org-${TS}`, descripcion: "Para dashboard" },
    });
    const { id: orgId, nombre: orgNombre } = await orgRes.json();

    // Obtener datos del usuario /auth/me para el localStorage
    const meRes  = await request.get(`${BACKEND}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = await meRes.json();

    // Inyectar token REAL del backend
    await injectRealAuth(page, token, user, orgId);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200); // tiempo para que la UI haga fetch real

    // La página no debe mostrar error de autenticación
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("link", { name: "La Causa AI" }).first()).toBeVisible();
    await page.waitForTimeout(400);
  });

  test("E3 › Eventos: el frontend lista eventos reales del backend", async ({ page, request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const { token } = await fullRegisterLogin(request);

    // Crear org y 2 eventos reales
    const orgRes = await request.post(`${BACKEND}/organizaciones`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nombre: `EventOrg_${TS}`, slug: `event-org-${TS}`, descripcion: "Eventos reales" },
    });
    const { id: orgId } = await orgRes.json();

    const nombreEvento1 = `EventoReal_A_${TS}`;
    const nombreEvento2 = `EventoReal_B_${TS}`;

    await request.post(`${BACKEND}/eventos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { titulo: nombreEvento1, descripcion: "Evento A real", fecha_inicio: "2026-09-01T09:00:00", fecha_fin: "2026-09-01T13:00:00", organizacion_id: orgId, cupo_maximo: 50 },
    });
    await request.post(`${BACKEND}/eventos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { titulo: nombreEvento2, descripcion: "Evento B real", fecha_inicio: "2026-09-05T10:00:00", fecha_fin: "2026-09-05T14:00:00", organizacion_id: orgId, cupo_maximo: 50 },
    });

    const meRes = await request.get(`${BACKEND}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const user  = await meRes.json();
    await injectRealAuth(page, token, user, orgId);

    await page.goto("/dashboard/events");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500); // esperar fetch real de eventos

    // Los eventos creados en el backend deben aparecer en la UI
    await expect(page.getByText(nombreEvento1)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(nombreEvento2)).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);
  });

  test("E4 › Crear evento desde la UI persiste en el backend", async ({ page, request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    const { token } = await fullRegisterLogin(request);
    const orgRes = await request.post(`${BACKEND}/organizaciones`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nombre: `CreateEvOrg_${TS}`, slug: `create-ev-org-${TS}`, descripcion: "Para crear evento" },
    });
    const { id: orgId } = await orgRes.json();

    const meRes = await request.get(`${BACKEND}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const user  = await meRes.json();
    await injectRealAuth(page, token, user, orgId);

    await page.goto("/dashboard/events");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(900);

    // Abrir formulario
    await page.getByRole("button", { name: /Nuevo evento/i }).click();
    await page.waitForTimeout(500);

    // Llenar el formulario con datos únicos
    const nuevoNombre = `EventoUI_${TS}`;
    const nombreInput = page.getByPlaceholder("Maratón de Solidaridad");
    await nombreInput.pressSequentially(nuevoNombre, { delay: 35 });
    await page.waitForTimeout(200);

    const descInput = page.getByPlaceholder("Descripción opcional");
    if (await descInput.isVisible()) {
      await descInput.pressSequentially("Creado desde la UI en test", { delay: 30 });
    }

    const fechaInicio = page.locator('input[type="datetime-local"]').first();
    if (await fechaInicio.isVisible()) await fechaInicio.fill("2026-10-01T09:00");
    const fechaFin = page.locator('input[type="datetime-local"]').nth(1);
    if (await fechaFin.isVisible())   await fechaFin.fill("2026-10-01T13:00");

    await page.waitForTimeout(400);

    // Enviar el formulario (petición REAL al backend)
    await page.getByRole("button", { name: /Crear evento|Guardar|Crear/i }).click();
    await page.waitForTimeout(1500);

    // Verificar que el backend creó el evento
    const eventosRes = await request.get(`${BACKEND}/eventos?org_id=${orgId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const eventos = await eventosRes.json();
    const creado  = eventos.find((e: { titulo: string }) => e.titulo === nuevoNombre);
    expect(creado).toBeTruthy();
    expect(creado.titulo).toBe(nuevoNombre);
  });

  test("E5 › Onboarding: crear org desde la UI aparece en el backend", async ({ page, request }) => {
    test.skip(!(await backendIsUp(request)), "Backend no disponible en :8000");

    // Inyectar token SIN orgId para ir al onboarding
    const { token } = await fullRegisterLogin(request);
    const meRes = await request.get(`${BACKEND}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const user  = await meRes.json();
    await injectRealAuth(page, token, user, null);

    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(700);

    const orgNombre  = `OrgOnboarding_${TS}`;
    const nombreInput = page.getByTestId("org-nombre-input");
    await nombreInput.pressSequentially(orgNombre, { delay: 50 });
    await page.waitForTimeout(400);

    const descInput = page.getByTestId("org-descripcion-input");
    if (await descInput.isVisible()) {
      await descInput.pressSequentially("Org creada desde onboarding UI", { delay: 35 });
      await page.waitForTimeout(300);
    }

    // Enviar (llamada REAL al backend)
    await page.getByTestId("create-org-btn").click();
    await page.waitForTimeout(1500);

    // Verificar en el backend que la org existe
    const orgsRes = await request.get(`${BACKEND}/organizaciones`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const orgs   = await orgsRes.json();
    const creada = orgs.find((o: { nombre: string }) => o.nombre === orgNombre);
    expect(creada).toBeTruthy();
    expect(creada.nombre).toBe(orgNombre);
  });
});
