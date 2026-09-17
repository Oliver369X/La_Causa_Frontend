"use client";
import Link from "next/link";
import DatePicker from "react-datepicker";
import { es } from "date-fns/locale/es";
import { pickerDate, pickerISO } from "./proposalDates";
import type { Draft, Proposal } from "./EventProposalPanel";
import { CreationCard, creationStyles as editor } from "@/shared/ui/CreationCard";

export type ProposalEventOption = { id: string; titulo: string; fecha_inicio: string; fecha_fin: string | null };
const field = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 text-sm text-[var(--text)]";

export function TaskProposalCard({ proposal, draft, onEdit, decide, busy, error, events, eventsError, retryEvents }: {
  proposal: Proposal; draft: Draft; onEdit: (draft: Draft) => void;
  decide: (decision: "save" | "confirm" | "cancel") => void; busy: boolean; error?: string;
  events: ProposalEventOption[]; eventsError: boolean; retryEvents: () => void;
}) {
  const event = events.find(e => e.id === draft.evento_id);
  const start = draft.fecha_inicio ? new Date(draft.fecha_inicio).getTime() : null;
  const end = draft.fecha_vencimiento ? new Date(draft.fecha_vencimiento).getTime() : null;
  const valid = !!event && draft.titulo.trim().length >= 3 && Number.isInteger(draft.vacantes) &&
    (draft.vacantes ?? 0) >= 1 && (draft.vacantes ?? 0) <= 100 &&
    start !== null && end !== null && Number.isFinite(start) && Number.isFinite(end) &&
    end > start && start >= new Date(event.fecha_inicio).getTime() &&
    !!event.fecha_fin && end <= new Date(event.fecha_fin).getTime();
  const done = proposal.status !== "pending";
  return <CreationCard kind="task" label="Propuesta de tarea" status={done ? (proposal.status === "completed" ? "Creada" : proposal.status === "cancelled" ? "Cancelada" : "Vencida") : "Por confirmar"}>
    {done && <h3>{proposal.result?.titulo || draft.titulo || "Propuesta de tarea"}</h3>}
    {done ? <div aria-live="polite" className="text-sm">
      {proposal.status === "completed" && proposal.result?.tarea_id ? <>
        <p>Tarea creada. Todavía no se asignaron voluntarios.</p>
        <Link className="text-[var(--accent)] underline" href={`/dashboard/tasks/${proposal.result.tarea_id}`}>Abrir tarea</Link>
      </> : <p>{proposal.status === "cancelled" ? "Propuesta cancelada. No se creó la tarea." : "La propuesta venció. Pide una nueva al agente."}</p>}
    </div> : <>
      <fieldset disabled={busy} className={`${editor.fields} disabled:opacity-60`}>
        <label className="block text-sm">Evento *
          <select className={field} value={draft.evento_id || ""} onChange={e => onEdit({ ...draft, evento_id: e.target.value || null })}>
            <option value="">Selecciona un evento</option>
            {draft.evento_id && !event && <option value={draft.evento_id}>Evento no disponible; selecciona otro</option>}
            {events.map(e => <option key={e.id} value={e.id}>{e.titulo}</option>)}
          </select>
        </label>
        {eventsError && <button type="button" onClick={retryEvents} className="text-sm underline">No se pudieron cargar los eventos. Reintentar</button>}
        {!eventsError && events.length === 0 && <p className="text-xs">No hay eventos disponibles cargados. Necesitas un evento abierto o borrador de esta organización.</p>}
        <label data-editor="title"><span>Título de la tarea *</span>
          <input className={field} placeholder="Dale un nombre a tu tarea" maxLength={255} value={draft.titulo} onChange={e => onEdit({ ...draft, titulo: e.target.value })} />
        </label>
        <label data-editor="description">Descripción
          <textarea className={field} rows={2} maxLength={10000} value={draft.descripcion} onChange={e => onEdit({ ...draft, descripcion: e.target.value })} />
        </label>
        <label data-editor="description">Instrucciones
          <textarea className={field} rows={3} maxLength={10000} value={draft.instrucciones || ""} onChange={e => onEdit({ ...draft, instrucciones: e.target.value })} />
        </label>
        {draft.insignia_id && <div className="rounded-xl border border-[var(--border)] p-3 text-sm">
          <p>Medalla al completar: <strong>{draft.insignia_nombre || "Medalla seleccionada"}</strong></p>
          {draft.recomendacion_medalla && <p className="text-[var(--text-muted)]">{draft.recomendacion_medalla}</p>}
          <button type="button" onClick={() => onEdit({ ...draft, insignia_id: null, insignia_nombre: null, recomendacion_medalla: "" })} className="mt-2 text-[var(--accent)]">Quitar medalla de esta tarea</button>
        </div>}
        <div className={editor.fields} data-editor="block">
          <label className="block text-sm">Dificultad
            <select className={field} value={draft.dificultad || "media"} onChange={e => onEdit({ ...draft, dificultad: e.target.value as Draft["dificultad"] })}>
              <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
            </select>
          </label>
          <label className="block text-sm">Voluntarios necesarios *
            <input className={field} type="number" min={1} max={100} step={1} value={draft.vacantes ?? 1} onChange={e => onEdit({ ...draft, vacantes: Number(e.target.value) })} />
          </label>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Fechas opcionales · Hora de Bolivia (UTC−04:00)</p>
        <div className={editor.fields} data-editor="block">
          {([['fecha_inicio', 'Inicio de la tarea'], ['fecha_vencimiento', 'Vencimiento']] as const).map(([key, label]) => <label className="block text-sm" key={key}>{label}
            <DatePicker selected={pickerDate(draft[key] ?? null)} onChange={(date: Date | null) => onEdit({ ...draft, [key]: pickerISO(date) })}
              showTimeSelect timeIntervals={15} timeFormat="HH:mm" timeCaption="Hora" dateFormat="dd/MM/yyyy HH:mm" locale={es}
              placeholderText="Seleccionar fecha y hora" className={field} wrapperClassName="w-full"
              disabled={busy} isClearable showMonthDropdown showYearDropdown dropdownMode="select" />
          </label>)}
        </div>
        {event && <button type="button" className="text-xs text-[var(--accent)] underline" onClick={() => onEdit({ ...draft, fecha_inicio: event.fecha_inicio, fecha_vencimiento: event.fecha_fin })}>Usar el horario del evento (puedes editarlo)</button>}
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.requiere_evidencia ?? true} onChange={e => onEdit({ ...draft, requiere_evidencia: e.target.checked })} />Requiere evidencia</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.requiere_revision_manual ?? false} onChange={e => onEdit({ ...draft, requiere_revision_manual: e.target.checked })} />Requiere revisión manual</label>
        {!valid && <p className="text-xs text-[var(--text-muted)]">Selecciona un evento, escribe un título de al menos 3 caracteres y revisa las vacantes y fechas.</p>}
        <div className={editor.actions}>
          <button type="button" disabled={!valid} onClick={() => decide("confirm")} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-black disabled:opacity-40">{busy ? "Procesando…" : "Crear tarea"}</button>
          <button type="button" onClick={() => decide("save")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Guardar propuesta</button>
          <button type="button" onClick={() => decide("cancel")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Cancelar tarea</button>
        </div>
      </fieldset>
    </>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </CreationCard>;
}
