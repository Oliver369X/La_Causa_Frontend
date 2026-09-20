"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import DatePicker from "react-datepicker";
import { es } from "date-fns/locale/es";
import { useQueryClient } from "@tanstack/react-query";
import { agentClient } from "../api/agentApi";
import { Modal } from "@/shared/ui/Modal";
import { TaskProposalCard, type ProposalEventOption } from "./TaskProposalCard";
import { pickerDate, pickerISO } from "./proposalDates";
import "react-datepicker/dist/react-datepicker.css";
import { CreationCard, creationStyles as editor } from "@/shared/ui/CreationCard";
import { BadgeImageField } from "@/features/badges/ui/BadgeImageField";
import { EventLocationField, type EventLocation } from "./EventLocationField";
import { BadgeProposalCard } from "./BadgeProposalCard";
import { VolunteerSelector } from "@/features/volunteers/ui/VolunteerSelector";
import { TaskExplorer } from "@/features/tasks/ui/TaskExplorer";

type BrowsePanel = { id: string; trace_id?: string; kind: "browse_volunteers" | "browse_tasks" | "browse_evidence";
  payload: { evento_id?: string; tarea_id?: string; usuario_id?: string; query?: string } };
function ReadPanel({ panel, orgId }: { panel: BrowsePanel; orgId: string }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  return <div className="space-y-4 rounded-2xl border border-[var(--border)] p-4">
    <button type="button" aria-expanded={open} className="text-sm font-medium text-[var(--accent)]" onClick={() => { setOpen(v => !v); setDismissed(false); }}>{open ? "Ocultar detalles" : panel.kind === "browse_evidence" ? "Ver evidencias" : "Mostrar detalles"}</button>
    {!open && !dismissed && <button type="button" className="ml-4 text-sm text-[var(--text-muted)]" onClick={() => setDismissed(true)}>Ahora no, continuar por chat</button>}
    {dismissed && <p className="text-xs text-[var(--text-muted)]">Puedes seguir por mensaje o abrir la vista cuando quieras.</p>}
    {open && (panel.kind === "browse_volunteers"
      ? <VolunteerSelector compact orgId={orgId} eventId={panel.payload.evento_id} taskId={panel.payload.tarea_id} initialSearch={panel.payload.query} />
      : <TaskExplorer orgId={orgId} eventId={panel.payload.evento_id} taskId={panel.payload.tarea_id} userId={panel.payload.usuario_id} query={panel.payload.query} reviewMode={panel.kind === "browse_evidence"} />)}
  </div>;
}

export type Draft = {
  titulo: string; descripcion: string; fecha_inicio: string | null;
  fecha_fin?: string | null; cupo_maximo?: number | null;
  evento_id?: string | null; instrucciones?: string;
  dificultad?: "baja" | "media" | "alta" | "urgente"; vacantes?: number;
  fecha_vencimiento?: string | null; requiere_evidencia?: boolean; requiere_revision_manual?: boolean;
  insignia_id?: string | null; insignia_nombre?: string | null; recomendacion_medalla?: string;
  voluntario_id?: string | null; voluntario_nombre?: string | null;
  imagen_url?: string | null; ubicacion_geo?: EventLocation | null;
  url_imagen?: string; rareza?: string; puntos_bonus?: number; mensaje_personalizado?: string; criterio?: string; prompt_imagen?: string;
};
export type Proposal = {
  id: string; kind: "create_event" | "create_task" | "create_badge"; status: "review" | "pending" | "completed" | "cancelled" | "expired";
  revision: number; payload: Draft; result?: { evento_id: string; titulo: string; tarea_id?: string; insignia_id?: string; replacement_proposal_id?: string };
  trace_id?: string; expires_at?: string | null;
};

const fieldClass = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 text-sm text-[var(--text)]";

function EventProposalCard({ proposal, draft, onEdit, decide, busy, error }: {
  proposal: Proposal; draft: Draft; onEdit: (draft: Draft) => void;
  decide: (decision: "save" | "confirm" | "cancel") => void; busy: boolean; error?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const start = draft.fecha_inicio ? new Date(draft.fecha_inicio).getTime() : NaN;
  const end = draft.fecha_fin ? new Date(draft.fecha_fin).getTime() : NaN;
  const valid = draft.titulo.trim().length >= 3 && !!draft.cupo_maximo &&
    Number.isInteger(draft.cupo_maximo) && draft.cupo_maximo > 0 && start > Date.now() && end > start;
  const done = proposal.status !== "pending";
  return (
    <CreationCard kind="event" status={done ? (proposal.status === "completed" ? "Creado" : proposal.status === "cancelled" ? "Cancelado" : "Vencido") : "Por confirmar"}>
      {done && <h3>{proposal.result?.titulo || draft.titulo || "Propuesta de evento"}</h3>}
      {done ? <div aria-live="polite" className="text-sm">
        {proposal.status === "completed" && proposal.result ? <>
          <p>Evento creado como borrador.</p>
          <Link className="text-[var(--accent)] underline" href={`/dashboard/events/${proposal.result.evento_id}`}>Abrir evento</Link>
        </> : <p>{proposal.status === "cancelled" ? "Propuesta cancelada. No se creó el evento." : "La propuesta venció. Pide una nueva al agente."}</p>}
      </div> : <>
        <fieldset disabled={busy || uploading} className={`${editor.fields} disabled:opacity-60`}>
          <label data-editor="title"><span>Nombre del evento *</span>
            <input className={fieldClass} placeholder="Dale un nombre a tu evento" maxLength={255} value={draft.titulo} onChange={e => onEdit({ ...draft, titulo: e.target.value })} />
          </label>
          <div data-editor="block">
            <BadgeImageField label="Portada del evento" value={draft.imagen_url || ""}
              onChange={url => { setUploadError(""); onEdit({ ...draft, imagen_url: url || null }); }}
              uploading={uploading} onUploadingChange={setUploading} onError={setUploadError} disabled={busy} />
            {uploadError && <p role="alert" className="text-sm text-red-500">{uploadError}</p>}
          </div>
          <label data-editor="description">Descripción
            <textarea className={fieldClass} maxLength={10000} rows={3} value={draft.descripcion} onChange={e => onEdit({ ...draft, descripcion: e.target.value })} />
          </label>
          <p className="text-xs text-[var(--text-muted)]">Fecha y hora de Bolivia · America/La_Paz (UTC−04:00)</p>
          <div className={editor.fields} data-editor="block">
            {([['fecha_inicio', 'Inicio'], ['fecha_fin', 'Fin']] as const).map(([key, label]) => <label key={key} className="block text-sm">{label} *
              <DatePicker selected={pickerDate(draft[key] ?? null)} onChange={(date: Date | null) => onEdit({ ...draft, [key]: pickerISO(date) })}
                showTimeSelect timeIntervals={15} timeFormat="HH:mm" timeCaption="Hora" dateFormat="dd/MM/yyyy HH:mm" locale={es}
                placeholderText="Seleccionar fecha y hora" className={fieldClass} wrapperClassName="w-full"
                disabled={busy || uploading} isClearable showMonthDropdown showYearDropdown dropdownMode="select" />
            </label>)}
          </div>
          <label className="block text-sm">Cupos máximos *
            <input type="number" min={1} step={1} className={fieldClass} value={draft.cupo_maximo ?? ""}
              onChange={e => onEdit({ ...draft, cupo_maximo: e.target.value === "" ? null : Number(e.target.value) })} />
          </label>
          <div data-editor="block">
            <EventLocationField value={draft.ubicacion_geo ?? null} onChange={value => onEdit({ ...draft, ubicacion_geo: value })} disabled={busy || uploading} />
          </div>
          {!valid && <p className="text-xs text-[var(--text-muted)]">Completa nombre, cupos y fechas futuras; el fin debe ser posterior al inicio.</p>}
          <div className={editor.actions}>
            <button type="button" disabled={!valid} onClick={() => decide("confirm")} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-black disabled:opacity-40">{busy ? "Procesando…" : "Crear evento"}</button>
            <button type="button" onClick={() => decide("save")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Guardar propuesta</button>
            <button type="button" onClick={() => decide("cancel")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Cancelar</button>
          </div>
        </fieldset>
      </>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </CreationCard>
  );
}

export function EventProposalPanel({ sessionId, orgId, traceId, refreshKey, disabled, onAdjust }: {
  sessionId: string; orgId: string; traceId: string; refreshKey: number; disabled: boolean; onAdjust: () => void;
}) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [panels, setPanels] = useState<BrowsePanel[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [cancelTargets, setCancelTargets] = useState<Proposal[]>([]);
  const [batchMessage, setBatchMessage] = useState("");
  const batchLock = useRef(false);
  const returnToList = useRef(false);
  const [events, setEvents] = useState<ProposalEventOption[]>([]);
  const [eventsError, setEventsError] = useState(false);
  const hasTasks = proposals.some(p => (p.kind === "create_task" || p.kind === "create_badge") && p.status === "pending");
  const inFlight = useRef(false);
  const queryClient = useQueryClient();
  useEffect(() => {
    let alive = true;
    agentClient.get<(Proposal | BrowsePanel)[]>("/proposals", { params: { session_id: sessionId, org_id: orgId, trace_id: traceId } })
      .then(({ data }) => { if (alive) {
        setProposals(data.filter((p): p is Proposal => p.trace_id === traceId && ["create_event", "create_task", "create_badge"].includes(p.kind)));
        setPanels(data.filter((p): p is BrowsePanel => p.trace_id === traceId && ["browse_tasks", "browse_volunteers", "browse_evidence"].includes(p.kind)));
        setLoadError(false);
      } })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [sessionId, orgId, traceId, refreshKey, reload]);

  useEffect(() => {
    const active = proposals.filter(p => (p.status === "pending" || p.status === "review") && p.expires_at);
    if (!active.length) return;
    const next = Math.min(...active.map(p => new Date(p.expires_at!).getTime()));
    const timer = window.setTimeout(() => {
      setProposals(prev => prev.map(p => (p.status === "pending" || p.status === "review") && p.expires_at && new Date(p.expires_at).getTime() <= Date.now() ? { ...p, status: "expired" } : p));
      setEditing(null);
    }, Math.max(0, next - Date.now()) + 50);
    return () => window.clearTimeout(timer);
  }, [proposals]);

  useEffect(() => {
    if (!hasTasks) return;
    let alive = true;
    agentClient.get<ProposalEventOption[]>("/proposal-options/events", { params: { org_id: orgId } })
      .then(({ data }) => { if (alive) { setEvents(data); setEventsError(false); } })
      .catch(() => { if (alive) setEventsError(true); });
    return () => { alive = false; };
  }, [hasTasks, orgId, refreshKey, reload]);

  const decide = async (proposal: Proposal, decision: "prepare" | "save" | "confirm" | "cancel", batch = false): Promise<Proposal | undefined> => {
    if (inFlight.current || disabled || (batchLock.current && !batch)) return;
    inFlight.current = true;
    setBusy(proposal.id);
    setErrors(prev => ({ ...prev, [proposal.id]: "" }));
    try {
      const { data } = await agentClient.post<Proposal>(`/proposals/${proposal.id}/decision`, {
        decision, revision: proposal.revision,
        ...(decision === "cancel" || decision === "prepare" ? {} : { payload: drafts[proposal.id] || proposal.payload }),
      }, { params: { org_id: orgId } });
      setProposals(prev => prev.map(p => p.id === data.id ? data : p));
      setDrafts(prev => ({ ...prev, [data.id]: data.payload }));
      if (data.status === "completed" || data.status === "cancelled") setEditing(null);
      if (data.status === "completed") await queryClient.invalidateQueries();
      return data;
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      const message = typeof detail === "string" ? detail : Array.isArray(detail)
        ? detail.map((item: { loc?: (string | number)[]; msg?: string }) => `${item.loc?.join(" / ") || "Datos"}: ${item.msg || "Revisa este campo"}`).join(". ")
        : "No se pudo completar la operación. Tus cambios siguen aquí; puedes reintentar.";
      setErrors(prev => ({ ...prev, [proposal.id]: message }));
      if (!batch) setReload(n => n + 1);
    } finally { if (!batchLock.current) setBusy(null); inFlight.current = false; }
  };
  const runBatch = async (items: Proposal[], decision: "prepare" | "confirm" | "cancel") => {
    if (batchLock.current || inFlight.current || disabled) return;
    batchLock.current = true;
    setBusy("batch");
    let succeeded = 0;
    try {
      for (const p of items) {
        const result = await decide(p, decision, true);
        if (result?.status === (decision === "confirm" ? "completed" : decision === "prepare" ? "pending" : "cancelled")) succeeded++;
      }
      setBatchMessage(`${succeeded} de ${items.length} propuestas ${decision === "confirm" ? "creadas" : decision === "prepare" ? "preparadas" : "canceladas"}.${succeeded < items.length ? " Revisa los errores de cada tarjeta; las demás conservan sus cambios." : ""}`);
    } finally { batchLock.current = false; setBusy(null); setReload(n => n + 1); }
  };
  const goBack = () => {
    if (busy) return;
    setEditing(null);
    if (returnToList.current) setExpanded(true);
  };
  const renderEditor = (p: Proposal) => {
    const props = { proposal: p, draft: drafts[p.id] || p.payload,
      onEdit: (d: Draft) => setDrafts(prev => ({ ...prev, [p.id]: d })),
      decide: (d: "save" | "confirm" | "cancel") => { if (d === "cancel") setCancelTargets([p]); else void decide(p, d); },
      busy: busy !== null || disabled, error: errors[p.id] };
    if (p.kind === "create_badge") return <BadgeProposalCard key={p.id} {...props} events={events} eventsError={eventsError} retryEvents={() => setReload(n => n + 1)} />;
    return p.kind === "create_task"
      ? <TaskProposalCard key={p.id} {...props} events={events} eventsError={eventsError} retryEvents={() => setReload(n => n + 1)} />
      : <EventProposalCard key={p.id} {...props} />;
  };
  const render = (p: Proposal) => {
    const d = drafts[p.id] || p.payload;
    if (p.status === "review") return <div key={p.id} className="col-span-full space-y-2 border-l-2 border-[var(--border)] pl-4 text-sm">
      <h4 className="font-semibold">{d.titulo || "Propuesta por definir"}</h4>
      <p className="whitespace-pre-line text-[var(--text-muted)]">{d.descripcion || "Falta definir la descripción y el objetivo."}</p>
      {p.kind === "create_task" && <p>{d.vacantes ?? 1} voluntarios · Dificultad {d.dificultad || "media"}{d.voluntario_nombre ? ` · Asignar a: ${d.voluntario_nombre}` : ""}</p>}
      {d.instrucciones && <p className="whitespace-pre-line">{d.instrucciones}</p>}
      {d.insignia_id && <p className="text-[var(--accent)]">Medalla: {d.insignia_nombre || "Medalla seleccionada"}. {d.recomendacion_medalla}</p>}
      <p className="text-xs text-[var(--text-muted)]">Horario: {d.fecha_inicio ? new Date(d.fecha_inicio).toLocaleString("es-BO", { timeZone: "America/La_Paz" }) : "inicio por definir"} — {(d.fecha_fin || d.fecha_vencimiento) ? new Date((d.fecha_fin || d.fecha_vencimiento)!).toLocaleString("es-BO", { timeZone: "America/La_Paz" }) : "fin por definir"}</p>
      <button type="button" disabled={disabled || !!busy} onClick={() => setCancelTargets([p])} className="text-xs text-[var(--text-muted)] underline">Descartar esta propuesta</button>
      {errors[p.id] && <p role="alert" className="text-xs text-red-500">{errors[p.id]}</p>}
    </div>;
    if (p.status === "completed" || p.status === "cancelled" || p.status === "expired") return (
      <div key={p.id} className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm">
        <strong>{d.titulo || "Propuesta"}</strong><p className="text-xs text-[var(--text-muted)]">{p.result?.replacement_proposal_id ? "Actualizada · revisa la nueva propuesta más abajo" : p.status === "completed" ? "Completado" : p.status === "cancelled" ? "Cancelada · no se creó nada" : "Propuesta vencida · no se creó nada"}</p>
        {p.status === "completed" && p.result && <Link className="text-xs text-[var(--accent)]" href={p.kind === "create_task" ? `/dashboard/tasks/${p.result.tarea_id}` : p.kind === "create_badge" ? `/dashboard/events/${p.result.evento_id}/medallas` : `/dashboard/events/${p.result.evento_id}`}>{p.kind === "create_task" ? "Ver tarea" : p.kind === "create_event" ? "Ver evento" : "Ver medalla"}</Link>}
      </div>
    );
    if (p.status === "pending" && p.kind !== "create_task") return <div key={p.id} className="col-span-full">{renderEditor(p)}</div>;
    return <article key={p.id} className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3">
      <div className="flex justify-between gap-2 text-xs text-[var(--text-muted)]"><span>{p.kind === "create_task" ? "Tarea" : p.kind === "create_event" ? "Evento" : "Medalla"}</span><span>Borrador disponible</span></div>
      <h3 className="text-base font-semibold break-words">{d.titulo || "Nombre por definir"}</h3>
      {d.insignia_id && <p className="text-sm text-[var(--accent)]">Medalla: {d.insignia_nombre || "Medalla seleccionada"}. {d.recomendacion_medalla}</p>}
      <p className="text-sm text-[var(--text-muted)] whitespace-pre-line">{d.descripcion || "Descripción por definir"}</p>
      {p.kind === "create_task" && <p className="text-xs">{d.vacantes ?? 1} voluntarios · Dificultad {d.dificultad || "media"}{d.voluntario_nombre ? ` · Asignar a: ${d.voluntario_nombre}` : ""}</p>}
      <p className="text-xs text-[var(--text-muted)]">Inicio: {d.fecha_inicio ? new Date(d.fecha_inicio).toLocaleString("es-BO", { timeZone: "America/La_Paz" }) : "Por definir"}<br />Fin: {(d.fecha_vencimiento || d.fecha_fin) ? new Date((d.fecha_vencimiento || d.fecha_fin)!).toLocaleString("es-BO", { timeZone: "America/La_Paz" }) : "Por definir"}</p>
      {d.instrucciones && <details className="text-xs"><summary className="cursor-pointer text-[var(--accent)]">Instrucciones y requisitos</summary><p className="whitespace-pre-line mt-2">{d.instrucciones}</p></details>}
      <div className="flex gap-3 text-sm">
        {p.status === "pending" && <button type="button" disabled={disabled || !!busy} onClick={() => { returnToList.current = expanded; setExpanded(false); setEditing(p.id); }} className="rounded-lg bg-[var(--accent)] text-white px-3 py-2">Editar y crear</button>}
        <button type="button" disabled={disabled || !!busy} onClick={() => setCancelTargets([p])} className="text-[var(--text-muted)]">Cancelar tarea</button>
      </div>
      {errors[p.id] && <p role="alert" className="text-xs text-red-500">{errors[p.id]}</p>}
    </article>;
  };
  const reviewing = proposals.filter(p => p.status === "review");
  const pendingTasks = proposals.filter(p => p.status === "pending" && p.kind === "create_task");
  if (!proposals.length && !panels.length && !loadError) return null;
  return <div className="space-y-3 py-3" aria-label="Propuestas de este mensaje">
    {panels.map(panel => <ReadPanel key={panel.id} panel={panel} orgId={orgId} />)}
    {proposals.some(p => p.status === "review" || p.status === "pending") && <p className="text-xs text-[var(--text-muted)]">Disponible durante 10 minutos. Continuar o guardar el borrador renueva ese tiempo.</p>}
    {loadError && <button type="button" className="text-sm underline" onClick={() => setReload(n => n + 1)}>No se pudieron cargar las propuestas. Reintentar</button>}
    {!expanded && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">{proposals.slice(0, 3).map(render)}</div>}
    {reviewing.length > 0 && <div className="rounded-xl bg-[var(--bg-subtle)] p-4 space-y-3">
      <p className="text-sm">¿Quieres preparar las tarjetas de este plan? Todavía no se creará nada.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={disabled || !!busy} className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm" onClick={() => void runBatch(reviewing, "prepare")}>Sí, continuar</button>
        <button type="button" disabled={disabled || !!busy} className="text-sm text-red-500" onClick={() => setCancelTargets(reviewing)}>No, rechazar</button>
        <button type="button" disabled={disabled || !!busy} className="text-sm" onClick={onAdjust}>No, ajustar propuesta</button>
      </div>
    </div>}
    {batchMessage && <p role="status" className="text-sm">{batchMessage}</p>}
    {proposals.length > 1 && <button type="button" className="text-sm text-[var(--accent)] underline" onClick={() => setExpanded(true)}>Ver todas ({proposals.length})</button>}
    <Modal open={expanded} onClose={() => { if (!busy) setExpanded(false); }} title="Propuestas del agente" size="2xl" scrollable>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">{expanded && proposals.filter(p => p.status !== "cancelled").map(render)}</div>
      <div className="mt-6 border-t border-[var(--border)] pt-4 space-y-3">
        {reviewing.length > 0 && <button type="button" disabled={disabled || !!busy} onClick={() => void runBatch(reviewing, "prepare")} className="rounded-lg border border-[var(--border)] px-4 py-2">Sí, preparar tarjetas</button>}
        <p className="text-sm text-[var(--text-muted)]">Se crearán las tareas preparadas con sus cambios actuales. Si alguna tiene datos incompletos, conservará su borrador y mostrará el error.</p>
        <button type="button" disabled={disabled || !!busy || !pendingTasks.length} onClick={() => void runBatch(pendingTasks, "confirm")} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-white disabled:opacity-40">{busy ? "Procesando…" : `Aceptar todo (${pendingTasks.length})`}</button>
        {batchMessage && <p role="status">{batchMessage}</p>}
      </div>
    </Modal>
    <Modal open={!!editing} onClose={goBack} title="Editar propuesta de tarea" size="2xl" scrollable>
      <button type="button" disabled={!!busy} onClick={goBack} className="mb-4 text-sm text-[var(--accent)]">← Volver atrás (conservar cambios)</button>
      {editing && proposals.filter(p => p.id === editing).map(renderEditor)}
    </Modal>
    <Modal open={cancelTargets.length > 0} onClose={() => { if (!busy) setCancelTargets([]); }} title="¿Cancelar la propuesta?">
      <p>{cancelTargets.length === 1 ? "Se quitará de la lista de propuestas disponibles. No se creará la tarea, evento o medalla." : `Se quitarán ${cancelTargets.length} propuestas de la lista. No se creará nada.`} Esto no elimina tareas ya creadas.</p>
      <div className="mt-5 flex gap-3">
        <button type="button" disabled={!!busy || disabled} className="rounded-lg bg-red-600 px-4 py-2 text-white" onClick={async () => { await runBatch(cancelTargets.filter(p => p.status === "pending" || p.status === "review"), "cancel"); setCancelTargets([]); }}>Sí, cancelar</button>
        <button type="button" disabled={!!busy} className="rounded-lg border border-[var(--border)] px-4 py-2" onClick={() => setCancelTargets([])}>No, conservar</button>
      </div>
    </Modal>
  </div>;
}
