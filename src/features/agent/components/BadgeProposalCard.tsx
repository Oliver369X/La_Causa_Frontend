"use client";
import { useState } from "react";
import Link from "next/link";
import { BadgeImageField } from "@/features/badges/ui/BadgeImageField";
import { CreationCard, creationStyles as editor } from "@/shared/ui/CreationCard";
import type { Draft, Proposal } from "./EventProposalPanel";
import type { ProposalEventOption } from "./TaskProposalCard";

export function BadgeProposalCard({ proposal, draft, onEdit, decide, busy, error, events, eventsError, retryEvents }: {
  proposal: Proposal; draft: Draft; onEdit: (draft: Draft) => void;
  decide: (decision: "save" | "confirm" | "cancel") => void; busy: boolean; error?: string;
  events: ProposalEventOption[]; eventsError: boolean; retryEvents: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const done = proposal.status !== "pending";
  const valid = draft.titulo.trim().length >= 2 && events.some(e => e.id === draft.evento_id)
    && Number.isInteger(draft.puntos_bonus ?? 0) && (draft.puntos_bonus ?? 0) >= 0;
  return <CreationCard kind="medal" label="Propuesta de medalla" status={done ? (proposal.status === "completed" ? "Creada" : proposal.status === "cancelled" ? "Cancelada" : "Vencida") : "Por confirmar"}>
    {done ? <div aria-live="polite">
      <h3>{draft.titulo || "Medalla"}</h3>
      {proposal.status === "completed" ? <Link href={`/dashboard/events/${proposal.result?.evento_id}/medallas`} className="text-[var(--accent)]">Ver medalla creada</Link>
        : <p>{proposal.status === "cancelled" ? "Propuesta cancelada. No se creó la medalla." : "La propuesta venció. Pide una nueva al agente."}</p>}
    </div> : <fieldset disabled={busy || uploading} className={editor.fields}>
      <label data-editor="title"><span>Nombre de la medalla</span><input value={draft.titulo} maxLength={100} placeholder="Nombre de tu medalla" onChange={e => onEdit({ ...draft, titulo: e.target.value })} /></label>
      <div data-editor="block">
        <BadgeImageField value={draft.url_imagen || ""} onChange={url => { setUploadError(""); onEdit({ ...draft, url_imagen: url }); }}
          uploading={uploading} onUploadingChange={setUploading} onError={setUploadError} disabled={busy} />
        {uploadError && <p role="alert" className="text-sm text-red-500">{uploadError}</p>}
      </div>
      <label>Evento<select value={draft.evento_id || ""} onChange={e => onEdit({ ...draft, evento_id: e.target.value || null })}>
        <option value="">Seleccionar evento</option>{events.map(e => <option key={e.id} value={e.id}>{e.titulo}</option>)}
      </select></label>
      {eventsError && <button type="button" onClick={retryEvents}>No se pudieron cargar los eventos. Reintentar</button>}
      <label>Rareza<select value={draft.rareza || "COMUN"} onChange={e => onEdit({ ...draft, rareza: e.target.value })}>
        {[["COMUN", "Común"], ["NORMAL", "Poco común"], ["RARO", "Raro"], ["MITICO", "Mítico"], ["LEGENDARIO", "Legendario"], ["UNICO", "Único"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>XP de recompensa<input type="number" min={0} step={1} value={draft.puntos_bonus ?? 0} onChange={e => onEdit({ ...draft, puntos_bonus: Number(e.target.value) })} /></label>
      <label>Mensaje al desbloquear<input maxLength={2000} value={draft.mensaje_personalizado || ""} onChange={e => onEdit({ ...draft, mensaje_personalizado: e.target.value })} /></label>
      <label data-editor="description">Descripción<textarea rows={3} maxLength={10000} value={draft.descripcion} onChange={e => onEdit({ ...draft, descripcion: e.target.value })} /></label>
      {draft.prompt_imagen && <p className={editor.hint}>Idea para la imagen: {draft.prompt_imagen}</p>}
      <p className={editor.hint}>Crear esta medalla no la entrega a ningún voluntario. Puedes cargar su imagen ahora o editarla después.</p>
      <div className={editor.actions}>
        <button type="button" disabled={!valid} onClick={() => decide("confirm")}>Crear medalla</button>
        <button type="button" onClick={() => decide("save")}>Guardar propuesta</button>
        <button type="button" onClick={() => decide("cancel")}>Cancelar</button>
      </div>
    </fieldset>}
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
  </CreationCard>;
}
