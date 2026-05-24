import type { Page, Route } from "@playwright/test";

export const MOCK_USER = {
  id: "user-demo-001",
  email: "admin@lacausa.dev",
  nombre: "Admin Demo",
  is_active: true,
  rol: "admin",
  tipo: "organizador",
  is_super_admin: false,
};

export const MOCK_ORG_ID = "org-demo-001";

function shouldMockBackend(url: string): boolean {
  if (url.includes("localhost:3001") || url.includes("/_next/")) return false;
  return (
    url.includes("localhost:8000") ||
    url.includes("api.lacausa.aura.ia.bo") ||
    url.includes("sslip.io") ||
    url.includes("/auth/") ||
    url.includes("/eventos") ||
    url.includes("/tareas") ||
    url.includes("/api/agent") ||
    url.includes("/organizaciones") ||
    url.includes("/planes") ||
    url.includes("/suscripciones") ||
    url.includes("/permisos/") ||
    url.includes("/analytics/") ||
    url.includes("/notificaciones") ||
    url.includes("/incidentes") ||
    url.includes("/staff") ||
    url.includes("/miembros") ||
    url.includes("/roles") ||
    url.includes("/perfil") ||
    url.includes("/equipos") ||
    url.includes("/certificados") ||
    url.includes("/medallas") ||
    url.includes("/temporadas") ||
    url.includes("/elo-rangos") ||
    url.includes("/auditoria") ||
    url.includes("/api/feedback")
  );
}

const LA_CAUSA_PLANS = [
  {
    id: "p-1",
    nombre: "Plan Semilla",
    slug: "free_tier",
    precio_mensual: 0,
    max_voluntarios: 10,
    max_eventos_mes: 10,
    max_tareas_mes: 500,
    funciones: {},
  },
  {
    id: "p-2",
    nombre: "Plan Pro",
    slug: "pro_tier",
    precio_mensual: 140,
    max_voluntarios: 500,
    max_eventos_mes: 100,
    max_tareas_mes: 10000,
    funciones: {},
  },
  {
    id: "p-3",
    nombre: "Plan Corporativo",
    slug: "corp_tier",
    precio_mensual: 350,
    max_voluntarios: 20000,
    max_eventos_mes: 999,
    max_tareas_mes: 100000,
    funciones: {},
  },
];

const MOCK_EVENTS = [
  {
    id: "ev-1",
    titulo: "Maratón Solidaria",
    descripcion: "Carrera benéfica anual",
    fecha_inicio: "2099-03-01T09:00:00",
    fecha_fin: "2099-03-01T13:00:00",
    estado: "publicado",
    cupo_maximo: 100,
    organizacion_id: MOCK_ORG_ID,
    creador_id: null,
    ubicacion_geo: null,
    created_at: "2026-01-01T00:00:00",
    updated_at: "2026-01-01T00:00:00",
  },
  {
    id: "ev-2",
    titulo: "Feria de Voluntariado",
    descripcion: "Stand de la org",
    fecha_inicio: "2099-03-15T10:00:00",
    fecha_fin: "2099-03-15T18:00:00",
    estado: "en_curso",
    cupo_maximo: 50,
    organizacion_id: MOCK_ORG_ID,
    creador_id: null,
    ubicacion_geo: null,
    created_at: "2026-01-01T00:00:00",
    updated_at: "2026-01-01T00:00:00",
  },
  {
    id: "ev-3",
    titulo: "Taller de Habilidades",
    descripcion: "Formación voluntarios",
    fecha_inicio: "2099-04-05T09:00:00",
    fecha_fin: "2099-04-05T17:00:00",
    estado: "borrador",
    cupo_maximo: 30,
    organizacion_id: MOCK_ORG_ID,
    creador_id: null,
    ubicacion_geo: null,
    created_at: "2026-01-01T00:00:00",
    updated_at: "2026-01-01T00:00:00",
  },
];

async function handleMockRoute(route: Route): Promise<void> {
  const url = route.request().url();
  const method = route.request().method();

  if (url.includes("/auth/login") && method === "POST") {
    let email = "";
    try {
      const body = route.request().postDataJSON() as { email?: string; password?: string };
      email = body?.email ?? "";
      if (email === "noexiste@test.com" || body?.password === "wrongpass123!") {
        return route.fulfill({ status: 401, json: { detail: "Credenciales inválidas" } });
      }
    } catch {
      /* postData vacío */
    }
    return route.fulfill({
      json: { access_token: "mock.jwt.token.for.testing", token_type: "bearer" },
    });
  }

  if (url.includes("/auth/register") && method === "POST") {
    try {
      const body = route.request().postDataJSON() as { password?: string };
      if ((body?.password?.length ?? 0) < 8) {
        return route.fulfill({
          status: 422,
          json: { detail: "La contraseña debe tener al menos 8 caracteres" },
        });
      }
    } catch {
      /* noop */
    }
    return route.fulfill({
      json: { id: "new-user", email: "test@test.com", nombre: "Test User" },
    });
  }

  if (url.includes("/auth/me")) {
    return route.fulfill({ json: MOCK_USER });
  }

  if (url.includes("/api/agent/access")) {
    return route.fulfill({ json: { can_use: true } });
  }
  if (url.includes("/api/agent/conversations")) {
    return route.fulfill({ json: [] });
  }
  if (url.includes("/api/agent/usage")) {
    return route.fulfill({
      json: { messages_used: 0, messages_limit: 100, period: "month" },
    });
  }
  if (url.includes("/api/agent/chat")) {
    return route.fulfill({
      json: {
        respuesta: "¡Hola! Soy el agente IA de La Causa.",
        acciones_ejecutadas: [],
        pending_confirmation: null,
      },
    });
  }

  if (url.includes("/permisos/mis")) {
    return route.fulfill({
      json: {
        permisos: [
          "view_events",
          "create_events",
          "assign_tasks",
          "view_members",
          "view_analytics",
          "edit_org",
        ],
        es_propietario: true,
      },
    });
  }

  if (url.includes("/analytics/dashboard")) {
    return route.fulfill({
      json: { total_volunteers: 12, total_events: 5, total_tasks: 23, tasks_completed: 17 },
    });
  }

  if (url.includes("/eventos") && method === "GET") {
    return route.fulfill({ json: MOCK_EVENTS });
  }

  if (url.includes("/tareas")) {
    return route.fulfill({
      json: [
        {
          id: "t-1",
          titulo: "Registrar participantes",
          estado: "pending",
          organizacion_id: MOCK_ORG_ID,
        },
        {
          id: "t-2",
          titulo: "Coordinar logística",
          estado: "in_progress",
          organizacion_id: MOCK_ORG_ID,
        },
      ],
    });
  }

  if (url.includes("/organizaciones") && method === "POST") {
    return route.fulfill({
      json: { id: MOCK_ORG_ID, nombre: "Mi Organización", slug: "mi-org" },
    });
  }

  if (url.includes("/organizaciones")) {
    return route.fulfill({
      json: [{ id: MOCK_ORG_ID, nombre: "Fundación Demo", descripcion: "Organización de prueba" }],
    });
  }

  if (url.includes("/planes") || url.includes("/suscripciones")) {
    return route.fulfill({ json: LA_CAUSA_PLANS });
  }

  if (url.includes("/incidentes")) {
    return route.fulfill({ json: [] });
  }

  if (url.includes("/staff") || url.includes("/miembros")) {
    return route.fulfill({
      json: [
        {
          id: "m-1",
          usuario_id: MOCK_USER.id,
          nombre: MOCK_USER.nombre,
          email: MOCK_USER.email,
          rol: "admin",
        },
      ],
    });
  }

  if (url.includes("/perfil") && url.includes("/competitivo")) {
    return route.fulfill({
      json: {
        usuario_id: MOCK_USER.id,
        nombre: MOCK_USER.nombre,
        puntos_elo: 1420,
        rango: "Oro",
        nivel: 7,
        racha_entregas: 14,
        eventos_completados: 8,
        tareas_completadas: 31,
        insignias_total: 5,
      },
    });
  }

  if (url.includes("/perfil") && url.includes("/insignias")) {
    return route.fulfill({
      json: [
        {
          id: "b-1",
          nombre: "Primer Evento",
          rareza: "common",
          puntos: 10,
          descripcion: "Completó su primer evento",
          criterio: "1_event",
        },
      ],
    });
  }

  if (url.includes("/ranking") && !url.includes("historico")) {
    return route.fulfill({
      json: [
        {
          posicion: 1,
          usuario_id: "u-a",
          nombre: "Ana García",
          puntos_elo: 1850,
          rango: "Diamante",
          eventos_mes: 4,
          avatar_url: null,
        },
        {
          posicion: 3,
          usuario_id: MOCK_USER.id,
          nombre: MOCK_USER.nombre,
          puntos_elo: 1420,
          rango: "Oro",
          eventos_mes: 2,
          avatar_url: null,
        },
      ],
    });
  }

  if (url.includes("/notificaciones")) {
    return route.fulfill({ json: [] });
  }

  if (url.includes("/roles")) {
    return route.fulfill({
      json: [
        { id: "r-1", nombre: "Coordinador", permisos: ["manage_events"] },
        { id: "r-2", nombre: "Voluntario Senior", permisos: ["view_events"] },
      ],
    });
  }

  return route.fulfill({ json: [] });
}

export async function installBackendMocks(page: Page): Promise<void> {
  await page.route((url) => shouldMockBackend(url.href), handleMockRoute);
}

export async function setAuthenticated(page: Page): Promise<void> {
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
