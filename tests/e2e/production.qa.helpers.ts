import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProductionConfig = {
  appBase: string;
  backendUrl: string;
  email: string;
  password: string;
  orgId: string;
  publicOrgSlug: string;
};

export function volunteerCredentials(): Pick<ProductionConfig, "email" | "password"> {
  return {
    email: process.env.LIVE_VOLUNTEER_EMAIL?.trim() || "voluntario.top@demo.com",
    password: process.env.LIVE_VOLUNTEER_PASSWORD?.trim() || "password123",
  };
}

export function productionConfig(): ProductionConfig {
  return {
    appBase:
      process.env.E2E_BASE_URL?.trim() ||
      "https://lacausa.aura.ia.bo",
    backendUrl:
      process.env.E2E_BACKEND_URL?.trim() ||
      "https://api.lacausa.aura.ia.bo",
    email:
      process.env.LIVE_AGENT_EMAIL?.trim() || "admin@voluntarios.app",
    password:
      process.env.LIVE_AGENT_PASSWORD?.trim() || "password123",
    orgId:
      process.env.LIVE_AGENT_ORG_ID?.trim() ||
      "ad421deb-891c-471b-95e8-5e806f7811a9",
    publicOrgSlug:
      process.env.E2E_PUBLIC_ORG_SLUG?.trim() || "causa-verde-andina",
  };
}

export function isProductionQaEnabled(): boolean {
  return process.env.E2E_MODE === "real" || process.env.E2E_PRODUCTION === "1";
}

export function isE2EStripeEnabled(): boolean {
  return process.env.E2E_STRIPE === "1";
}

export function isE2ERegisterEnabled(): boolean {
  return process.env.E2E_REGISTER === "1";
}

export function isE2EVolunteerFlowsEnabled(): boolean {
  return process.env.E2E_VOLUNTEER_FLOWS === "1";
}

export function isE2EIntegrationsEnabled(): boolean {
  return process.env.E2E_INTEGRATIONS === "1";
}

export function isE2EAgentEnabled(): boolean {
  return process.env.E2E_AGENT === "1";
}

export function uniqueTestEmail(prefix = "qa"): string {
  const domain =
    process.env.E2E_QA_EMAIL_DOMAIN?.trim() || "test.lacausa.dev";
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  return `${prefix}+${stamp}@${domain}`;
}

export function qaTestPassword(): string {
  return process.env.E2E_QA_PASSWORD?.trim() || "QaTest2026!Secure";
}

export type ApiAuth = {
  token: string;
  headers: Record<string, string>;
};

export async function apiRegister(
  request: APIRequestContext,
  opts: {
    nombre: string;
    email: string;
    password: string;
    tipo?: "voluntario" | "organizador";
  }
): Promise<{ id: string; email: string }> {
  const { backendUrl } = productionConfig();
  const res = await request.post(`${backendUrl}/auth/register`, {
    data: {
      nombre: opts.nombre,
      email: opts.email,
      password: opts.password,
      tipo: opts.tipo ?? "voluntario",
    },
  });
  if (!res.ok()) {
    throw new Error(`Register failed ${res.status()}: ${await res.text()}`);
  }
  return res.json() as Promise<{ id: string; email: string }>;
}

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<ApiAuth> {
  const { backendUrl } = productionConfig();
  const res = await request.post(`${backendUrl}/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`Login failed ${res.status()}: ${await res.text()}`);
  }
  const { access_token } = (await res.json()) as { access_token: string };
  return {
    token: access_token,
    headers: { Authorization: `Bearer ${access_token}` },
  };
}

export async function apiRegisterAndLogin(
  request: APIRequestContext,
  opts: {
    prefix?: string;
    tipo?: "voluntario" | "organizador";
    nombre?: string;
  } = {}
): Promise<ApiAuth & { email: string; password: string; userId: string }> {
  const email = uniqueTestEmail(opts.prefix ?? "qa");
  const password = qaTestPassword();
  const nombre = opts.nombre ?? `QA ${opts.prefix ?? "User"} ${Date.now()}`;
  const reg = await apiRegister(request, {
    nombre,
    email,
    password,
    tipo: opts.tipo,
  });
  const auth = await apiLogin(request, email, password);
  return { ...auth, email, password, userId: reg.id };
}

type BackendPlan = {
  id: string;
  slug?: string;
  nombre: string;
  precio_mensual: number;
};

export async function resolvePaidPlanId(
  request: APIRequestContext
): Promise<string> {
  const { backendUrl } = productionConfig();
  const slug = (process.env.E2E_STRIPE_PLAN_SLUG || "pro_tier").trim();
  const res = await request.get(`${backendUrl}/planes`);
  if (!res.ok()) {
    throw new Error(`GET /planes failed ${res.status()}`);
  }
  const plans = (await res.json()) as BackendPlan[];
  const bySlug = plans.find((p) => p.slug === slug);
  if (bySlug) return bySlug.id;
  const byPrice = plans.find((p) => Number(p.precio_mensual) === 140);
  if (byPrice) return byPrice.id;
  const anyPaid = plans.find((p) => Number(p.precio_mensual) > 0);
  if (!anyPaid) {
    throw new Error("No se encontró plan de pago en GET /planes");
  }
  return anyPaid.id;
}

function isoDate(d: Date): string {
  return d.toISOString();
}

export async function createEventViaApi(
  request: APIRequestContext,
  auth: ApiAuth,
  payload: {
    organizacion_id: string;
    titulo: string;
    fecha_inicio: Date;
    fecha_fin: Date;
    cupo_maximo?: number;
    descripcion?: string;
  }
): Promise<{ id: string; titulo: string; estado: string }> {
  const { backendUrl } = productionConfig();
  const res = await request.post(`${backendUrl}/eventos`, {
    headers: auth.headers,
    data: {
      organizacion_id: payload.organizacion_id,
      titulo: payload.titulo,
      descripcion: payload.descripcion ?? "Evento QA producción",
      fecha_inicio: isoDate(payload.fecha_inicio),
      fecha_fin: isoDate(payload.fecha_fin),
      cupo_maximo: payload.cupo_maximo ?? 25,
    },
  });
  if (!res.ok()) {
    throw new Error(`POST /eventos failed ${res.status()}: ${await res.text()}`);
  }
  return res.json() as Promise<{ id: string; titulo: string; estado: string }>;
}

export async function updateEventViaApi(
  request: APIRequestContext,
  auth: ApiAuth,
  eventId: string,
  data: Record<string, unknown>
): Promise<void> {
  const { backendUrl } = productionConfig();
  const res = await request.put(`${backendUrl}/eventos/${eventId}`, {
    headers: auth.headers,
    data,
  });
  if (!res.ok()) {
    throw new Error(`PUT /eventos/${eventId} failed ${res.status()}: ${await res.text()}`);
  }
}

export type VolunteerFlowEvents = {
  draftTitle: string;
  publishedTitle: string;
  inProgressTitle: string;
  finishedTitle: string;
  publishedId: string;
};

type BackendEventRow = { id: string; titulo: string; estado: string };

async function listOrgEvents(
  request: APIRequestContext,
  auth: ApiAuth,
  orgId: string
): Promise<BackendEventRow[]> {
  const { backendUrl } = productionConfig();
  const res = await request.get(`${backendUrl}/eventos?org_id=${orgId}`, {
    headers: auth.headers,
  });
  if (!res.ok()) {
    throw new Error(`GET /eventos failed ${res.status()}: ${await res.text()}`);
  }
  return res.json() as Promise<BackendEventRow[]>;
}

async function tryCreateEvent(
  request: APIRequestContext,
  auth: ApiAuth,
  payload: Parameters<typeof createEventViaApi>[2]
): Promise<{ id: string; titulo: string; estado: string } | null> {
  try {
    return await createEventViaApi(request, auth, payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("403") && /eventos|plan/i.test(msg)) {
      return null;
    }
    throw err;
  }
}

/** Crea eventos en distintos estados; si el plan no permite más, reutiliza eventos existentes de la org. */
export async function setupVolunteerFlowEvents(
  request: APIRequestContext,
  auth: ApiAuth,
  orgId: string
): Promise<VolunteerFlowEvents> {
  const ts = Date.now();
  let draftTitle = `QA Borrador ${ts}`;
  let publishedTitle = `QA Publicado ${ts}`;
  let inProgressTitle = `QA EnCurso ${ts}`;
  let finishedTitle = `QA Finalizado ${ts}`;

  const futureStart = new Date();
  futureStart.setDate(futureStart.getDate() + 5);
  futureStart.setHours(10, 0, 0, 0);
  const futureEnd = new Date(futureStart);
  futureEnd.setHours(14, 0, 0, 0);

  const now = new Date();
  const cursoStart = new Date(now);
  cursoStart.setDate(cursoStart.getDate() - 1);
  const cursoEnd = new Date(now);
  cursoEnd.setDate(cursoEnd.getDate() + 2);

  const pastStart = new Date();
  pastStart.setDate(pastStart.getDate() - 10);
  const pastEnd = new Date();
  pastEnd.setDate(pastEnd.getDate() - 5);

  let publishedId = "";

  const draft = await tryCreateEvent(request, auth, {
    organizacion_id: orgId,
    titulo: draftTitle,
    fecha_inicio: futureStart,
    fecha_fin: futureEnd,
  });

  const published = await tryCreateEvent(request, auth, {
    organizacion_id: orgId,
    titulo: publishedTitle,
    fecha_inicio: futureStart,
    fecha_fin: futureEnd,
  });
  if (published) {
    await updateEventViaApi(request, auth, published.id, { estado: "publicado" });
    publishedId = published.id;
  }

  const inProgress = await tryCreateEvent(request, auth, {
    organizacion_id: orgId,
    titulo: inProgressTitle,
    fecha_inicio: cursoStart,
    fecha_fin: cursoEnd,
  });
  if (inProgress) {
    await updateEventViaApi(request, auth, inProgress.id, { estado: "en_curso" });
  }

  const finished = await tryCreateEvent(request, auth, {
    organizacion_id: orgId,
    titulo: finishedTitle,
    fecha_inicio: pastStart,
    fecha_fin: pastEnd,
  });
  if (finished) {
    await updateEventViaApi(request, auth, finished.id, { estado: "finalizado" });
  }

  const needFallback = !draft || !published || !inProgress || !finished;
  if (needFallback) {
    const existing = await listOrgEvents(request, auth, orgId);
    const pick = (estado: string) => existing.find((e) => e.estado === estado);
    const draftRow = draft ?? pick("borrador");
    const pubRow = published ?? pick("publicado");
    const cursoRow = inProgress ?? pick("en_curso");
    const finRow = finished ?? pick("finalizado");

    if (!draftRow || !pubRow || !cursoRow || !finRow) {
      throw new Error(
        "No hay eventos en borrador/publicado/en_curso/finalizado para la org demo. Libera cupo del plan o ejecuta sync-plans-prod.sql."
      );
    }

    draftTitle = draftRow.titulo;
    publishedTitle = pubRow.titulo;
    inProgressTitle = cursoRow.titulo;
    finishedTitle = finRow.titulo;
    publishedId = pubRow.id;
  }

  return {
    draftTitle,
    publishedTitle,
    inProgressTitle,
    finishedTitle,
    publishedId,
  };
}

/** Tarjeta de evento en /dashboard/events por título (h3). */
export function eventCardByTitle(page: Page, title: string) {
  return page
    .getByRole("heading", { name: title, exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
}

/** Botón Postular (compatible con prod sin data-testid desplegado aún). */
export function postularButtonInCard(card: ReturnType<typeof eventCardByTitle>) {
  return card
    .getByTestId("event-apply-btn")
    .or(card.getByRole("button", { name: "Postular" }));
}

export async function fetchStripePublishableKey(
  request: APIRequestContext
): Promise<string> {
  const { backendUrl } = productionConfig();
  const res = await request.get(`${backendUrl}/stripe/publishable-key`, {
    timeout: 15_000,
  });
  if (!res.ok()) {
    throw new Error(`GET /stripe/publishable-key → ${res.status()}`);
  }
  const json = (await res.json()) as { publishable_key?: string };
  return (json.publishable_key ?? "").trim();
}

/** Omite el test si Stripe no está configurado en el backend de prod. */
export async function skipIfStripeNotConfigured(
  request: APIRequestContext
): Promise<void> {
  const key = await fetchStripePublishableKey(request);
  if (!key) {
    test.skip(true, "STRIPE_PUBLIC_KEY vacío en producción — configurar Stripe en el VPS");
  }
}

/** Reescribe peticiones del API embebido en el build (p. ej. dominio sin DNS) hacia el backend real. */
export async function applyApiRewriteIfConfigured(
  target: Page | BrowserContext
): Promise<void> {
  const rewriteTo = process.env.E2E_API_REWRITE_TO?.trim().replace(/\/+$/, "");
  if (!rewriteTo) return;

  const fromHosts = (process.env.E2E_API_REWRITE_FROM ?? "api.lacausa.aura.ia.bo")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  const handler = async (route: {
    request: () => { url: () => string };
    continue: (opts?: { url?: string }) => Promise<void>;
  }) => {
    const url = route.request().url();
    let next = url;
    for (const host of fromHosts) {
      if (url.includes(host)) {
        next = url.replace(`https://${host}`, rewriteTo).replace(`http://${host}`, rewriteTo);
        break;
      }
    }
    if (next === url) {
      await route.continue();
      return;
    }
    await route.continue({ url: next });
  };

  await target.route("**/*", handler);
}

export async function probeLoginApiReachability(page: Page): Promise<{
  reached: boolean;
  apiOrigin: string | null;
  status: number | null;
  pageError: string | null;
}> {
  let apiOrigin: string | null = null;
  let status: number | null = null;

  const onResponse = (res: { url: () => string; status: () => number }) => {
    if (res.url().includes("/auth/login")) {
      apiOrigin = new URL(res.url()).origin;
      status = res.status();
    }
  };
  page.on("response", onResponse);

  await page.goto("/login");
  await page.getByTestId("email-input").fill("probe@invalid.local");
  await page.getByTestId("password-input").fill("invalid-password-qa");
  await page.getByTestId("submit-login").click();
  await page.waitForTimeout(4_000);
  page.off("response", onResponse);

  const pageError = await page
    .locator("text=/servidor|CORS|NEXT_PUBLIC_API_URL|404/i")
    .first()
    .textContent()
    .catch(() => null);

  return {
    reached: apiOrigin !== null,
    apiOrigin,
    status,
    pageError: pageError?.trim() || null,
  };
}

export async function loginViaUI(
  page: Page,
  cfg: Pick<ProductionConfig, "email" | "password">
): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("email-input").fill(cfg.email);
  await page.getByTestId("password-input").fill(cfg.password);
  await page.getByTestId("submit-login").click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 45_000 });
}

export async function setActiveOrg(page: Page, orgId: string): Promise<void> {
  await page.evaluate((id) => {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      state?: { activeOrgId?: string };
    };
    parsed.state = parsed.state ?? {};
    parsed.state.activeOrgId = id;
    localStorage.setItem("auth-storage", JSON.stringify(parsed));
  }, orgId);
}

export async function assertNoAuthRedirect(page: Page): Promise<void> {
  await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });
  const url = page.url();
  expect(url, "no debe redirigir al onboarding tras login demo").not.toMatch(
    /\/onboarding/
  );
}

export async function assertDashboardShell(page: Page): Promise<void> {
  await assertNoAuthRedirect(page);
  await expect(
    page.getByRole("link", { name: /La Causa/i }).first()
  ).toBeVisible({ timeout: 20_000 });
}

/** Falla si el cuerpo visible parece un error de runtime o pantalla en blanco de login. */
export async function assertHealthyPage(page: Page): Promise<void> {
  const body = page.locator("body");
  await expect(body).not.toContainText(/Preparando el formulario/i);
  await expect(body).not.toContainText(/Application error/i);
  await expect(body).not.toContainText(/Internal Server Error/i);
  const text = (await body.innerText()).trim();
  expect(text.length, "la página no debe estar vacía").toBeGreaterThan(40);
}

export function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export async function assertLandingPricingBob(page: Page): Promise<void> {
  await page.goto("/");
  const pricing = page.locator("#pricing");
  await pricing.scrollIntoViewIfNeeded();
  await expect(
    pricing.getByRole("heading", { name: "LA CAUSA Premium", exact: true })
  ).toBeVisible({ timeout: 20_000 });
  await expect(pricing.getByText("Plan Semilla", { exact: true })).toBeVisible();
  await expect(pricing.getByText("Plan Pro", { exact: true })).toBeVisible();
  await expect(pricing.getByText("Plan Corporativo", { exact: true })).toBeVisible();
  await expect(pricing.getByText("Bs 140")).toBeVisible();
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/Iniciativa/);
  expect(body).not.toMatch(/Organización IA/);
  expect(body).not.toMatch(/\$49/);
}

export async function prepareOrganizerSession(page: Page): Promise<ProductionConfig> {
  const cfg = productionConfig();
  await loginViaUI(page, cfg);
  if (page.url().includes("/onboarding")) {
    throw new Error(
      "La cuenta demo terminó en /onboarding; usa un organizador con org ya creada."
    );
  }
  await setActiveOrg(page, cfg.orgId);
  return cfg;
}

/** Fechas para inputs datetime-local (crear evento en prod). */
export function eventDatetimeRange(): { start: string; end: string } {
  const start = new Date();
  start.setDate(start.getDate() + 2);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(14, 0, 0, 0);
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return { start: fmt(start), end: fmt(end) };
}
