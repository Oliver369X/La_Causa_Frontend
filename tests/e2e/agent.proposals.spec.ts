import { expect, test } from "@playwright/test";
import { installBackendMocks, setAuthenticated, MOCK_ORG_ID } from "./mock-backend";

test.use({ timezoneId: "UTC" });

test("tarjeta de tarea incompleta: seleccionar evento, editar, guardar, crear o cancelar", async ({ page }) => {
  test.setTimeout(120_000);
  await installBackendMocks(page);
  await setAuthenticated(page);
  await page.addInitScript(() => {
    const auth = JSON.parse(localStorage.getItem("auth-storage")!);
    auth.state.activeOrgId = null;
    localStorage.setItem("auth-storage", JSON.stringify(auth));
    localStorage.setItem("agent-session:no-org", "task-session");
  });
  await page.route("**/api/agent/access*", route => route.fulfill({ json: { can_use: true, org_id: MOCK_ORG_ID } }));
  // The sidebar has not resolved a selection, but agent access resolves membership.
  await page.route(/\/organizaciones(?:\?.*)?$/, route => route.fulfill({ json: [] }));
  const drafts = ["task-1", "task-2"].map(id => ({
    id, kind: "create_task", status: "pending", revision: 1,
    payload: { evento_id: null as string | null, titulo: "", descripcion: "", instrucciones: "", dificultad: "media", vacantes: 1,
      fecha_inicio: null, fecha_vencimiento: null, requiere_evidencia: true, requiere_revision_manual: false },
    result: null as null | { tarea_id: string; evento_id: string; titulo: string },
  }));
  let creations = 0;
  await page.route("**/api/agent/usage*", route => route.fulfill({ json: { month_input_tokens: 0, month_output_tokens: 0, month_total_tokens: 0, month_cost_usd: 0, month_quota_tokens: 10000 } }));
  await page.route("**/api/agent/conversations/task-session/messages*", route => route.fulfill({ json: {
    session_id: "task-session", messages: [{ role: "assistant", content: "Completa la tarjeta y pulsa Crear tarea." }],
  } }));
  await page.route("**/api/agent/proposals?*", route => {
    expect(new URL(route.request().url()).searchParams.get("org_id")).toBe(MOCK_ORG_ID);
    return route.fulfill({ json: drafts });
  });
  await page.route("**/api/agent/proposal-options/events?*", route => route.fulfill({ json: [
    { id: "event-1", titulo: "Entorno de Pruebas", fecha_inicio: "2030-09-20T18:00:00-04:00", fecha_fin: "2030-09-20T23:00:00-04:00" },
  ] }));
  await page.route("**/api/agent/proposals/*/decision?*", async route => {
    const id = route.request().url().match(/proposals\/([^/]+)\//)![1];
    const p = drafts.find(p => p.id === id)!;
    const body = route.request().postDataJSON();
    if (body.decision === "cancel") p.status = "cancelled";
    else {
      p.payload = body.payload;
      if (body.decision === "confirm") {
        creations++;
        expect(body.payload).toMatchObject({ evento_id: "event-1", vacantes: 3, requiere_evidencia: false });
        p.status = "completed";
        p.result = { tarea_id: "created-task", evento_id: "event-1", titulo: body.payload.titulo };
      }
    }
    p.revision++;
    await route.fulfill({ json: p });
  });
  await page.goto("/dashboard/agent", { timeout: 60_000 });
  const first = page.getByRole("region", { name: "Propuesta de tarea" }).first();
  await expect(first.getByRole("button", { name: "Crear tarea", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("auth-storage")!).state.activeOrgId)).toBeNull();
  await first.getByRole("combobox", { name: "Evento *", exact: true }).selectOption("event-1");
  await first.getByLabel("Título de la tarea").fill("Preparar materiales");
  await first.getByLabel("Voluntarios necesarios").fill("3");
  await first.getByLabel("Requiere evidencia", { exact: true }).uncheck();
  await first.getByRole("button", { name: "Usar el horario del evento", exact: false }).click();
  await expect(first.getByPlaceholder("Seleccionar fecha y hora").first()).toHaveValue("20/09/2030 18:00");
  await first.screenshot({ path: test.info().outputPath("task-card.png") });
  await first.getByRole("button", { name: "Guardar propuesta" }).click();
  await expect.poll(() => drafts[0].revision).toBe(2);
  expect(creations).toBe(0);
  await page.reload();
  await expect(first.getByLabel("Título de la tarea")).toHaveValue("Preparar materiales");
  await first.getByRole("button", { name: "Crear tarea", exact: true }).click();
  await expect(first.getByRole("link", { name: "Abrir tarea" })).toHaveAttribute("href", "/dashboard/tasks/created-task");
  await page.getByRole("region", { name: "Propuesta de tarea" }).last().getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByText("Propuesta cancelada. No se creó la tarea.")).toBeVisible();
  expect(creations).toBe(1);
});

test("propuestas: precarga, edición, modal, cancelación y creación sin duplicar", async ({ page }) => {
  test.setTimeout(120_000);
  await installBackendMocks(page);
  await setAuthenticated(page);
  page.on("pageerror", error => console.error(error.message));
  await page.route("**/api/agent/usage*", route => route.fulfill({ json: {
    month_input_tokens: 0, month_output_tokens: 0, month_total_tokens: 0,
    month_cost_usd: 0, month_quota_tokens: 10000,
  } }));
  const proposals = Array.from({ length: 4 }, (_, index) => ({
    id: `proposal-${index}`, kind: "create_event", status: "pending", revision: 1,
    payload: { titulo: `Evento ${index + 1}`, descripcion: "Prueba de tarjetas", cupo_maximo: 20,
      fecha_inicio: "2030-09-20T18:00:00-04:00", fecha_fin: "2030-09-20T23:00:00-04:00" },
    result: null as null | { evento_id: string; titulo: string },
  }));
  let creations = 0;
  await page.addInitScript((org) => localStorage.setItem(`agent-session:${org}`, "proposal-session"), MOCK_ORG_ID);
  await page.route("**/api/agent/conversations/proposal-session/messages*", route => route.fulfill({ json: {
    session_id: "proposal-session", messages: [{ role: "assistant", content: "Revisa las propuestas del evento." }],
  } }));
  await page.route("**/api/agent/proposals?*", route => route.fulfill({ json: proposals }));
  await page.route("**/api/agent/proposals/*/decision?*", async route => {
    const id = route.request().url().match(/proposals\/([^/]+)\//)![1];
    const p = proposals.find(p => p.id === id)!;
    const body = route.request().postDataJSON();
    if (body.decision === "cancel") p.status = "cancelled";
    else {
      p.payload = body.payload;
      if (body.decision === "confirm") {
        creations++;
        p.status = "completed";
        p.result = { evento_id: "event-created", titulo: body.payload.titulo };
      }
    }
    p.revision++;
    await route.fulfill({ json: p });
  });
  await page.goto("/dashboard/agent", { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Crear evento", exact: true })).toHaveCount(3);
  await expect(page.getByLabel("Nombre del evento").first()).toHaveValue("Evento 1");
  await expect(page.getByPlaceholder("Seleccionar fecha y hora").first()).toHaveValue("20/09/2030 18:00");
  await page.getByLabel("Nombre del evento").first().fill("Evento editado");
  await page.getByRole("button", { name: "Ver todas (4)" }).click();
  await expect(page.getByRole("button", { name: "Crear evento", exact: true })).toHaveCount(4);
  await expect(page.getByLabel("Nombre del evento").first()).toHaveValue("Evento editado");
  await page.getByRole("button", { name: "Cancelar", exact: true }).last().click();
  await expect(page.getByText("Propuesta cancelada. No se creó el evento.")).toBeVisible();
  expect(creations).toBe(0);
  await page.getByRole("button", { name: "Crear evento", exact: true }).first().click();
  await expect(page.getByRole("link", { name: "Abrir evento" })).toBeVisible();
  expect(creations).toBe(1);
  await page.reload();
  await expect(page.getByRole("link", { name: "Abrir evento" })).toBeVisible();
  expect(creations).toBe(1);
});
