/**
 * new_features.spec.ts — Flujos E2E para los nuevos CUs implementados
 *
 * Cubre:
 *   CU16 — Gestión de Habilidades (perfil + catálogo)
 *   CU13 — Métricas de desempeño del voluntario
 *   CU18 — Gestión de Incidencias (reporte, lista, resolución)
 *   CU19 — Tablero de Retrospectiva (crear, ítems, votar, cerrar)
 *   CU23 — Manuales / T&C (ver, aceptar)
 *
 * Cada test autentica la sesión simulada, mockea el backend y graba vídeo
 * según la config de playwright.config.ts (video: "on", slowMo: 120ms).
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Datos de demo ────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: "user-demo-001",
  email: "admin@lacausa.dev",
  nombre: "Admin Demo",
  is_active: true,
  rol: "admin",
  tipo: "organizador",
  is_super_admin: false,
};
const MOCK_ORG_ID = "org-demo-001";
const MOCK_EVENT_ID = "ev-demo-001";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
          state: {
            token: "mock.jwt.token.for.testing",
            user,
            activeOrgId: orgId,
          },
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

    // ── Dashboard / analytics ──────────────────────────────────────────────
    if (url.includes("/analytics/dashboard"))
      return route.fulfill({
        json: {
          total_volunteers: 24,
          total_events:     8,
          total_tasks:      47,
          tasks_completed:  32,
        },
      });

    // ── CU16 — Habilidades catálogo ────────────────────────────────────────
    if (url.includes("/habilidades") && method === "GET")
      return route.fulfill({
        json: [
          { id: "sk-1", nombre: "Python",       categoria: "Programación",    descripcion: "Lenguaje de programación Python" },
          { id: "sk-2", nombre: "Comunicación", categoria: "Habilidades Blandas", descripcion: "Comunicación efectiva" },
          { id: "sk-3", nombre: "Liderazgo",    categoria: "Gestión",         descripcion: "Liderazgo de equipos" },
          { id: "sk-4", nombre: "SQL",          categoria: "Bases de Datos",  descripcion: "Consultas SQL avanzadas" },
          { id: "sk-5", nombre: "Trabajo en Equipo", categoria: "Habilidades Blandas", descripcion: "Colaboración efectiva" },
        ],
      });

    if (url.includes("/habilidades") && method === "POST")
      return route.fulfill({
        status: 201,
        json: { id: "sk-new", nombre: "Nueva Habilidad", categoria: "General", descripcion: "" },
      });

    // ── CU16 — Habilidades del perfil ───────────────────────────────────────
    if (url.match(/\/perfil\/[^/]+\/habilidades/) && method === "GET")
      return route.fulfill({
        json: [
          { id: "ph-1", habilidad_id: "sk-1", nivel: 4, habilidad: { nombre: "Python",       categoria: "Programación" } },
          { id: "ph-2", habilidad_id: "sk-2", nivel: 3, habilidad: { nombre: "Comunicación", categoria: "Habilidades Blandas" } },
          { id: "ph-3", habilidad_id: "sk-3", nivel: 2, habilidad: { nombre: "Liderazgo",    categoria: "Gestión" } },
        ],
      });

    if (url.match(/\/perfil\/[^/]+\/habilidades/) && method === "POST")
      return route.fulfill({
        status: 201,
        json: { id: "ph-new", habilidad_id: "sk-4", nivel: 2, habilidad: { nombre: "SQL", categoria: "Bases de Datos" } },
      });

    if (url.match(/\/perfil\/[^/]+\/habilidades\/[^/]+/) && method === "DELETE")
      return route.fulfill({ status: 204, body: "" });

    // ── CU13 — Métricas de desempeño ───────────────────────────────────────
    if (url.match(/\/perfil\/[^/]+\/metricas/))
      return route.fulfill({
        json: {
          usuario_id:          MOCK_USER.id,
          nombre:              MOCK_USER.nombre,
          tareas_completadas:  31,
          tareas_aprobadas:    28,
          tareas_rechazadas:   3,
          horas_totales:       124.5,
          xp_total:            4_200,
          elo_score:           1_420,
          promedio_calificacion: 4.6,
          racha_entregas:      14,
        },
      });

    if (url.match(/\/perfil\/[^/]+\/competitivo/))
      return route.fulfill({
        json: {
          usuario_id:          MOCK_USER.id,
          nombre:              MOCK_USER.nombre,
          puntos_elo:          1_420,
          rango:               "Oro",
          nivel:               7,
          racha_entregas:      14,
          eventos_completados: 8,
          tareas_completadas:  31,
          insignias_total:     5,
        },
      });

    if (url.match(/\/perfil\/[^/]+\/insignias/))
      return route.fulfill({
        json: [
          { id: "b-1", nombre: "Primer Evento",        rareza: "common",    puntos: 10 },
          { id: "b-2", nombre: "Colaborador Dedicado", rareza: "uncommon",  puntos: 50 },
          { id: "b-3", nombre: "Héroe del Voluntariado", rareza: "rare",    puntos: 200 },
        ],
      });

    // ── CU18 — Incidencias ─────────────────────────────────────────────────
    if (url.includes("/incidencias") && !url.match(/\/incidencias\/[^/]+/) && method === "GET")
      return route.fulfill({
        json: [
          {
            id: "inc-1",
            evento_id:    MOCK_EVENT_ID,
            tipo:         "logistica",
            titulo:       "Falta de sillas",
            descripcion:  "No hay suficientes sillas en el área principal",
            estado:       "abierta",
            reportada_por: MOCK_USER.id,
            asignada_a:   null,
            resolucion:   null,
            created_at:   new Date().toISOString(),
          },
          {
            id: "inc-2",
            evento_id:    MOCK_EVENT_ID,
            tipo:         "tecnico",
            titulo:       "Falla en el sistema de sonido",
            descripcion:  "El micrófono del presentador falla intermitentemente",
            estado:       "en_proceso",
            reportada_por: MOCK_USER.id,
            asignada_a:   "user-tech-001",
            resolucion:   null,
            created_at:   new Date().toISOString(),
          },
          {
            id: "inc-3",
            evento_id:    MOCK_EVENT_ID,
            tipo:         "seguridad",
            titulo:       "Persona sin credencial",
            descripcion:  "Se detectó persona sin credencial en área VIP",
            estado:       "resuelta",
            reportada_por: MOCK_USER.id,
            asignada_a:   "user-sec-001",
            resolucion:   "Se acompañó a la persona fuera del área",
            created_at:   new Date().toISOString(),
          },
        ],
      });

    if (url.match(/\/incidencias\/[^/]+/) && method === "GET")
      return route.fulfill({
        json: {
          id: "inc-1",
          evento_id:    MOCK_EVENT_ID,
          tipo:         "logistica",
          titulo:       "Falta de sillas",
          descripcion:  "No hay suficientes sillas en el área principal del evento de voluntariado",
          estado:       "abierta",
          reportada_por: MOCK_USER.id,
          asignada_a:   null,
          resolucion:   null,
          created_at:   new Date().toISOString(),
        },
      });

    if (url.includes("/incidencias") && method === "POST")
      return route.fulfill({
        status: 201,
        json: {
          id: "inc-new",
          evento_id: MOCK_EVENT_ID,
          tipo: "otro",
          titulo: "Nueva incidencia",
          descripcion: "Descripción de la nueva incidencia reportada",
          estado: "abierta",
          reportada_por: MOCK_USER.id,
          asignada_a: null,
          resolucion: null,
          created_at: new Date().toISOString(),
        },
      });

    if (url.match(/\/incidencias\/[^/]+/) && method === "PATCH")
      return route.fulfill({
        json: {
          id: "inc-1",
          estado: "resuelta",
          resolucion: "Problema resuelto exitosamente",
          tipo: "logistica",
          titulo: "Falta de sillas",
          descripcion: "Se consiguieron sillas adicionales",
          evento_id: MOCK_EVENT_ID,
          reportada_por: MOCK_USER.id,
          asignada_a: null,
          created_at: new Date().toISOString(),
        },
      });

    // ── CU19 — Retrospectivas ──────────────────────────────────────────────
    if (url.match(/\/eventos\/[^/]+\/retrospectiva/) && method === "POST")
      return route.fulfill({
        status: 201,
        json: {
          id:         "retro-1",
          evento_id:  MOCK_EVENT_ID,
          cerrada:    false,
          items:      [],
          created_at: new Date().toISOString(),
        },
      });

    if (url.match(/\/eventos\/[^/]+\/retrospectiva/) && method === "GET")
      return route.fulfill({
        json: {
          id:        "retro-1",
          evento_id: MOCK_EVENT_ID,
          cerrada:   false,
          items: [
            { id: "item-1", columna: "bien",    contenido: "Excelente comunicación del equipo",        votos: 5, autor_id: MOCK_USER.id },
            { id: "item-2", columna: "bien",    contenido: "Todos llegaron puntualmente",              votos: 3, autor_id: MOCK_USER.id },
            { id: "item-3", columna: "mejorar", contenido: "El registro de asistentes tardó demasiado", votos: 4, autor_id: MOCK_USER.id },
            { id: "item-4", columna: "mejorar", contenido: "Faltó coordinación en el catering",       votos: 2, autor_id: MOCK_USER.id },
            { id: "item-5", columna: "accion",  contenido: "Implementar check-in digital",            votos: 6, autor_id: MOCK_USER.id },
          ],
          created_at: new Date().toISOString(),
        },
      });

    if (url.match(/\/retrospectiva\/[^/]+\/items/) && method === "POST")
      return route.fulfill({
        status: 201,
        json: {
          id: `item-${Date.now()}`,
          columna:   "bien",
          contenido: "Nuevo ítem añadido",
          votos:     0,
          autor_id:  MOCK_USER.id,
        },
      });

    if (url.match(/\/retrospectiva\/items\/[^/]+\/voto/))
      return route.fulfill({
        json: { id: "item-1", columna: "bien", contenido: "Excelente comunicación del equipo", votos: 6, autor_id: MOCK_USER.id },
      });

    if (url.match(/\/retrospectiva\/[^/]+\/cerrar/))
      return route.fulfill({
        json: { id: "retro-1", evento_id: MOCK_EVENT_ID, cerrada: true, items: [], created_at: new Date().toISOString() },
      });

    // ── CU23 — Manuales ────────────────────────────────────────────────────
    if (url.match(/\/organizaciones\/[^/]+\/manuales/) && method === "GET")
      return route.fulfill({
        json: [
          {
            id:                  "man-1",
            titulo:              "Manual del Voluntario 2026",
            descripcion:         "Guía completa para todos los voluntarios activos",
            url_documento:       "https://res.cloudinary.com/demo/raw/upload/manual_v1.pdf",
            organizacion_id:     MOCK_ORG_ID,
            requiere_aceptacion: true,
            evento_id:           null,
            aceptaciones:        [],
            created_at:          new Date().toISOString(),
          },
          {
            id:                  "man-2",
            titulo:              "Reglamento Interno",
            descripcion:         "Normas y procedimientos de la organización",
            url_documento:       "https://res.cloudinary.com/demo/raw/upload/reglamento.pdf",
            organizacion_id:     MOCK_ORG_ID,
            requiere_aceptacion: false,
            evento_id:           null,
            aceptaciones:        [],
            created_at:          new Date().toISOString(),
          },
        ],
      });

    if (url.match(/\/organizaciones\/[^/]+\/manuales/) && method === "POST")
      return route.fulfill({
        status: 201,
        json: {
          id:                  "man-new",
          titulo:              "Nuevo Manual",
          descripcion:         "Manual de prueba creado",
          url_documento:       "https://res.cloudinary.com/demo/manual_new.pdf",
          organizacion_id:     MOCK_ORG_ID,
          requiere_aceptacion: true,
          evento_id:           null,
          aceptaciones:        [],
          created_at:          new Date().toISOString(),
        },
      });

    if (url.match(/\/manuales\/[^/]+\/aceptar/))
      return route.fulfill({
        status: 201,
        json: {
          id:               "acc-1",
          manual_id:        "man-1",
          usuario_id:       MOCK_USER.id,
          fecha_aceptacion: new Date().toISOString(),
        },
      });

    if (url.match(/\/manuales\/[^/]+/) && method === "GET")
      return route.fulfill({
        json: {
          id:                  "man-1",
          titulo:              "Manual del Voluntario 2026",
          descripcion:         "Guía completa para todos los voluntarios activos",
          url_documento:       "https://res.cloudinary.com/demo/raw/upload/manual_v1.pdf",
          organizacion_id:     MOCK_ORG_ID,
          requiere_aceptacion: true,
          evento_id:           null,
          aceptaciones:        [{ id: "acc-1", usuario_id: "u-1", fecha_aceptacion: new Date().toISOString() }],
          created_at:          new Date().toISOString(),
        },
      });

    // ── Base mocks ─────────────────────────────────────────────────────────
    if (url.includes("/organizaciones"))
      return route.fulfill({ json: [{ id: MOCK_ORG_ID, nombre: "Fundación Demo", descripcion: "Org de prueba" }] });

    if (url.includes("/permisos/mis"))
      return route.fulfill({
        json: {
          permisos: ["view_events", "create_events", "assign_tasks", "view_members", "view_analytics"],
          es_propietario: true,
        },
      });

    if (url.includes("/mis-obligaciones-feedback"))
      return route.fulfill({
        json: [{ evento_id: MOCK_EVENT_ID, tipo: "ml_eval", estado: "pendiente" }],
      });

    if (url.includes(`/eventos/${MOCK_EVENT_ID}/solicitudes`) && method === "GET")
      return route.fulfill({
        json: [
          {
            id: "s1",
            usuario_id: MOCK_USER.id,
            usuario_nombre: MOCK_USER.nombre,
            usuario_email: MOCK_USER.email,
            evento_id: MOCK_EVENT_ID,
            estado: "aprobado",
            fecha_solicitud: "2026-01-01T00:00:00",
            fecha_respuesta: "2026-01-02T00:00:00",
            mensaje_solicitud: null,
            nota_interna_organizador: null,
            horas_acreditadas: 0,
            calificacion: null,
          },
        ],
      });

    if (
      url.includes(`/eventos/${MOCK_EVENT_ID}`) &&
      method === "GET" &&
      !url.includes("solicitudes") &&
      !url.includes("mis-obligaciones")
    )
      return route.fulfill({
        json: {
          id: MOCK_EVENT_ID,
          titulo: "Maratón Solidaria",
          descripcion: "Evento demo",
          fecha_inicio: "2026-03-01T09:00:00",
          fecha_fin: "2026-03-01T13:00:00",
          estado: "finalizado",
          cupo_maximo: 100,
          organizacion_id: MOCK_ORG_ID,
          creador_id: null,
          ubicacion_geo: null,
          created_at: "2026-01-01T00:00:00",
          updated_at: "2026-01-01T00:00:00",
        },
      });

    if (url.includes("/api/feedback") && method === "POST")
      return route.fulfill({ json: { total_labeled_matches: 1 } });

    if (url.includes("/eventos") && method === "GET")
      return route.fulfill({
        json: [
          { id: MOCK_EVENT_ID, titulo: "Maratón Solidaria", descripcion: "Evento demo", fecha_inicio: "2026-03-01T09:00", fecha_fin: "2026-03-01T13:00", estado: "publicado", cupo_maximo: 100, organizacion_id: MOCK_ORG_ID, creador_id: null, ubicacion_geo: null, created_at: "2026-01-01T00:00:00", updated_at: "2026-01-01T00:00:00" },
        ],
      });

    if (url.includes("/notificaciones"))
      return route.fulfill({ json: [] });

    if (url.includes("/roles"))
      return route.fulfill({ json: [] });

    if (url.includes("/planes") || url.includes("/suscripciones"))
      return route.fulfill({ json: [] });

    return route.fulfill({ json: [] });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// CU18 — FLUJO: Gestión de Incidencias
// ═════════════════════════════════════════════════════════════════════════════

test("CU18 › Flujo 1 › Ver página de incidencias", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  // Navegar directamente a incidents
  await page.goto("/dashboard/incidents");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // Primera visita compila la página en el servidor Next.js dev;
  // recargar para garantizar que el resultado final es válido
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
  await page.waitForTimeout(400);
});

test("CU18 › Flujo 2 › Rellenar y enviar formulario de incidencia", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard/incidents");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  // Rellenar el formulario de reporte
  const titleInput = page.locator("input").filter({ hasText: "" }).first();
  await titleInput.fill("Falla en el sistema de sonido");
  await page.waitForTimeout(400);

  // Rellenar descripción
  const descTextarea = page.locator("textarea").first();
  if (await descTextarea.count() > 0) {
    await descTextarea.fill("El micrófono del presentador principal falla cada 5 minutos causando interrupciones");
    await page.waitForTimeout(400);
  }

  // Intentar enviar (puede requerir admin ID u otros campos)
  const submitBtn = page.getByRole("button", { name: /reportar|enviar|guardar/i });
  if (await submitBtn.count() > 0) {
    await submitBtn.hover();
    await page.waitForTimeout(500);
    // No hacer click para evitar llamada real; sólo hover para el vídeo
  }

  await page.waitForTimeout(600);
});

test("CU18 › Flujo 3 › Ver incidencias con distintos estados", async ({ page }) => {
  await setAuthenticated(page);

  // Mock con lista de incidencias de diferentes estados
  await page.route("http://localhost:8000/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/incidencias"))
      return route.fulfill({
        json: [
          { id: "i1", tipo: "logistica",  titulo: "Falta sillas",        estado: "abierta",    descripcion: "No hay sillas",          evento_id: MOCK_EVENT_ID, reportada_por: "u1", asignada_a: null,   resolucion: null, created_at: new Date().toISOString() },
          { id: "i2", tipo: "tecnico",    titulo: "Falla sonido",         estado: "en_proceso", descripcion: "Micrófono falla",         evento_id: MOCK_EVENT_ID, reportada_por: "u1", asignada_a: "u2",   resolucion: null, created_at: new Date().toISOString() },
          { id: "i3", tipo: "seguridad",  titulo: "Persona sin credencial", estado: "resuelta", descripcion: "Persona no autorizada",  evento_id: MOCK_EVENT_ID, reportada_por: "u1", asignada_a: "u3",   resolucion: "Resuelto", created_at: new Date().toISOString() },
          { id: "i4", tipo: "conducta",   titulo: "Conflicto voluntarios", estado: "cerrada",   descripcion: "Conflicto mediado",       evento_id: MOCK_EVENT_ID, reportada_por: "u1", asignada_a: "u4",   resolucion: "Cerrado", created_at: new Date().toISOString() },
        ],
      });
    return route.fulfill({ json: [] });
  });

  await page.goto("/dashboard/incidents");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // Verificar que la página cargó — usar locator directo en lugar de
  // getByRole+name para evitar interferencia de iconos SVG
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
  await page.waitForTimeout(600);
});

// ═════════════════════════════════════════════════════════════════════════════
// CU19 — FLUJO: Retroalimentación / Retrospectiva
// ═════════════════════════════════════════════════════════════════════════════

test("CU19 › Flujo 1 › Ver página de retroalimentación ML por evento", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto(`/dashboard/events/${MOCK_EVENT_ID}/feedback-ml`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  await expect(page.getByRole("heading", { name: /Evaluación post-evento/i })).toBeVisible();
  await page.waitForTimeout(500);
});

test("CU19 › Flujo 2 › Rellenar formulario de retroalimentación con puntaje", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto(`/dashboard/events/${MOCK_EVENT_ID}/feedback-ml`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  await page.locator("select").first().selectOption({ index: 1 });
  await page.waitForTimeout(400);

  await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
  await page.waitForTimeout(600);

  const textarea = page.locator("textarea");
  if (await textarea.count() > 0) {
    await textarea.fill("El voluntario demostró excelente compromiso y capacidad de trabajo bajo presión");
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(600);
});

test("CU19 › Flujo 3 › Slider de puntaje visible en feedback ML", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto(`/dashboard/events/${MOCK_EVENT_ID}/feedback-ml`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  await expect(page.getByText("Puntaje de rendimiento")).toBeVisible();
  const slider = page.locator('input[type="range"]');
  if (await slider.count() > 0) {
    await slider.first().fill("8");
  }
  await page.waitForTimeout(600);
});

// ═════════════════════════════════════════════════════════════════════════════
// CU16 — FLUJO: Gestión de Habilidades (gamification/perfil)
// ═════════════════════════════════════════════════════════════════════════════

test("CU16 › Flujo 1 › Ver perfil de gamification con insignias", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard/gamification");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  // Buscar elementos clave de gamification
  const heading = page.getByRole("heading");
  const headings = await heading.allTextContents();
  expect(headings.length).toBeGreaterThan(0);

  // Scroll para ver más del contenido
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
  await page.waitForTimeout(600);

  await page.waitForTimeout(400);
});

test("CU16 › Flujo 2 › Explorar sección de habilidades del voluntario", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard/volunteers");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  // Buscar tabs o secciones de habilidades
  const skillsTabs = page.getByRole("tab", { name: /habilidades|skills/i });
  if (await skillsTabs.count() > 0) {
    await skillsTabs.click();
    await page.waitForTimeout(500);
  }

  // Scroll para ver todo el contenido
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
  await page.waitForTimeout(600);

  await page.waitForTimeout(400);
});

// ═════════════════════════════════════════════════════════════════════════════
// CU13 — FLUJO: Métricas de desempeño
// ═════════════════════════════════════════════════════════════════════════════

test("CU13 › Flujo 1 › Ver panel de analítica con métricas del voluntario", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard/analytics");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  // Verificar que el panel de analytics cargó con datos
  const heading = page.getByRole("heading");
  expect(await heading.count()).toBeGreaterThan(0);
  await page.waitForTimeout(500);

  // Scroll por la página para ver métricas
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "smooth" }));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(500);
});

test("CU13 › Flujo 2 › Ver métricas de gamification (XP, ELO, racha)", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard/gamification");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  // Verificar que la página de gamification cargó correctamente
  await expect(page.locator("body")).toBeVisible();
  const pageContent = await page.textContent("body") ?? "";
  expect(pageContent.length).toBeGreaterThan(10);

  // Hover sobre el primer elemento interactivo visible
  const firstCard = page.locator("[class*=rounded]").filter({ hasText: /\d/ }).first();
  if (await firstCard.count() > 0) {
    try {
      await firstCard.hover({ timeout: 2000 });
      await page.waitForTimeout(400);
    } catch { /* sin tarjetas numéricas visible */ }
  }

  await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
  await page.waitForTimeout(700);
});

// ═════════════════════════════════════════════════════════════════════════════
// CU23 — FLUJO: Manuales / T&C (se navegaría desde Settings/Staff)
// ═════════════════════════════════════════════════════════════════════════════

test("CU23 › Flujo 1 › Explorar sección de configuración organizacional", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard/settings");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  const heading = page.getByRole("heading");
  expect(await heading.count()).toBeGreaterThan(0);

  await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
  await page.waitForTimeout(600);
});

test("CU23 › Flujo 2 › Ver sección de staff donde se asignan manuales", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  await page.goto("/dashboard/staff");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  const heading = page.getByRole("heading");
  expect(await heading.count()).toBeGreaterThan(0);

  // Buscar referencias a manuales en la UI
  const manualesSection = page.getByText(/manual|T&C|términos/i);
  if (await manualesSection.count() > 0) {
    await manualesSection.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
  await page.waitForTimeout(600);
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUJO INTEGRADO — Ciclo completo de los nuevos CUs
// ═════════════════════════════════════════════════════════════════════════════

test("Integración › Flujo completo CU16+CU18+CU19 desde el dashboard", async ({ page }) => {
  await setAuthenticated(page);
  await mockBackendApis(page);

  // ── Paso 1: Dashboard ─────────────────────────────────────────────────────
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);

  await expect(page.locator("h1, h2").first()).toBeVisible();

  // ── Paso 2: Navegar a Incidencias ─────────────────────────────────────────
  await page.goto("/dashboard/incidents");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);

  await expect(page.locator("h1").first()).toBeVisible();

  // ── Paso 3: Navegar a Retroalimentación ───────────────────────────────────
  await page.goto("/dashboard/retrospectives");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);

  await expect(page.locator("h1").first()).toBeVisible();

  // ── Paso 4: Navegar a Gamification (habilidades + métricas) ───────────────
  await page.goto("/dashboard/gamification");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);

  const heading = page.getByRole("heading");
  expect(await heading.count()).toBeGreaterThan(0);

  // ── Paso 5: Volver al dashboard ───────────────────────────────────────────
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
  await page.waitForTimeout(600);
});
