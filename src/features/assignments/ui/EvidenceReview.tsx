"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp, ThumbsDown, AlertTriangle, Check, MessageSquare } from "lucide-react";
import { Modal } from "@/shared/ui/Modal";
import { apiClient } from "@/shared/api/client";
import { extractApiDetail } from "@/shared/utils/apiError";
import { formatDate } from "@/shared/utils/utils";
import type { Delivery } from "../api/assignmentsApi";
import { chooseAction, completeFeedback, initialDraft, replaceFeedback, type ReviewAction } from "./reviewDraft";

export type Evidence = Delivery & { nombre: string; vigente: boolean };
const actions: { key: ReviewAction; label: string; color: string; icon: typeof Check }[] = [
  { key: "aprobar", label: "Aprobar", color: "#16a34a", icon: ThumbsUp },
  { key: "advertencia", label: "Advertencia", color: "#d97706", icon: AlertTriangle },
  { key: "informacion", label: "Solicitar información", color: "#2563eb", icon: MessageSquare },
  { key: "rechazar", label: "Rechazar", color: "#dc2626", icon: ThumbsDown },
];
function safeUrl(raw: string) { try { const url = new URL(raw); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function EvidenceImage({ url, large = false }: { url: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const safe = safeUrl(url);
  if (!safe) return <div className="p-6 text-sm text-[var(--text-muted)]">Sin archivo adjunto</div>;
  if (failed) return <div className="p-6 text-sm">Archivo o enlace de evidencia{large && <a href={safe} target="_blank" rel="noopener noreferrer" className="block text-[var(--accent)] underline mt-2">Abrir archivo original</a>}</div>;
  return <img src={safe} alt="Evidencia de la entrega" onError={() => setFailed(true)} className={large ? "w-full max-h-[65vh] object-contain rounded-xl bg-black/5" : "h-36 w-full object-cover rounded-t-xl"} />;
}

export function EvidenceCard({ delivery, orgId, title, children }: { delivery: Evidence; orgId: string; title: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const qc = useQueryClient();
  const editable = delivery.vigente && delivery.estado === "pendiente_revision";
  const valid = draft.confirmed && completeFeedback(draft.action, draft.feedback) &&
    (!(draft.action === "aprobar" || draft.action === "rechazar") || rating !== null);
  async function submit() {
    if (!valid || !editable || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    const payload = { accion: draft.action, feedback: draft.feedback.trim(), rating: ["aprobar", "rechazar"].includes(draft.action!) ? rating : null };
    const signature = JSON.stringify(payload);
    if (!request.current || request.current.payload !== signature) request.current = { payload: signature, id: crypto.randomUUID() };
    try {
      await apiClient.post(`/operaciones/evidencias/${delivery.id}/revision`, { ...payload, request_id: request.current.id }, { params: { org_id: orgId } });
      setNotice(draft.action === "advertencia" || draft.action === "informacion" ? "Mensaje enviado. La entrega sigue pendiente de revisión." : "Revisión guardada y voluntario notificado.");
      request.current = null; setOpen(false); setDraft(initialDraft); setRating(null);
      await qc.invalidateQueries();
    } catch (e) { setError(extractApiDetail(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <>
    <button type="button" onClick={() => setOpen(true)} className="w-full overflow-hidden rounded-2xl border border-[var(--border)] text-left hover:border-[var(--accent)] bg-[var(--bg-card)]">
      <EvidenceImage url={delivery.evidencia_url} />
      <div className="p-3 space-y-1"><p className="font-semibold text-sm">{delivery.nombre}</p>
        <p className="text-xs text-[var(--text-muted)]">Intento {delivery.numero_intento} · {formatDate(delivery.fecha_entrega)}</p>
        <p className="text-xs">{delivery.estado === "pendiente_revision" ? "En revisión" : delivery.estado === "aprobada" ? "Aprobada" : "Rechazada"}{!delivery.vigente && " · Historial"}</p>
      </div>
    </button>
    {notice && <p role="status" className="text-sm text-[var(--accent)]">{notice}</p>}
    <Modal open={open} onClose={() => { if (!busy && !draft.replace) setOpen(false); }} title={`${title} · ${delivery.nombre}`} size="2xl" scrollable>
      <div className="space-y-5">
        <EvidenceImage key={delivery.evidencia_url} url={delivery.evidencia_url} large />
        <p className="text-xs text-[var(--text-muted)]">Intento {delivery.numero_intento} · {formatDate(delivery.fecha_entrega)}</p>
        <div><h4 className="font-semibold text-sm">Comentario del voluntario</h4><p className="whitespace-pre-wrap text-sm">{delivery.comentario || "Sin comentario."}</p></div>
        {children}
        {delivery.feedback && <div className="rounded-xl border border-[var(--border)] p-3"><h4 className="text-sm font-semibold">Feedback enviado anteriormente</h4><p className="whitespace-pre-wrap text-sm">{delivery.feedback}</p></div>}
        {!editable ? <p className="text-sm">{delivery.vigente ? "Esta entrega ya fue revisada." : "Este es un intento anterior; revisa la entrega más reciente."}{delivery.rating ? ` Calificación: ${delivery.rating}/5.` : ""}</p> : <>
          <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
            <legend className="font-semibold mb-2">Feedback y revisión</legend>
            <label className="block text-sm">Mensaje al voluntario<textarea value={draft.feedback} maxLength={5000} rows={4}
              placeholder="Selecciona una acción abajo para preparar el mensaje."
              onChange={e => setDraft(prev => ({ ...prev, feedback: e.target.value, confirmed: false }))}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3" /></label>
            <div><p className="text-sm mb-2">Calificación · obligatoria al aprobar o rechazar</p><div className="flex gap-2" role="group" aria-label="Calificación de 1 a 5">
              {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-pressed={rating === n} onClick={() => setRating(n)} className={`h-10 w-10 rounded-xl border border-[var(--border)] ${rating === n ? "bg-[var(--accent)] text-white" : ""}`}>{n}</button>)}
            </div></div>
            <p className="text-xs text-[var(--text-muted)]">Primer clic: prepara el mensaje. Complétalo y pulsa la misma acción otra vez para marcarla. Nada se envía todavía.</p>
            <div className="grid grid-cols-2 gap-3">
              {actions.map(({ key, label, color, icon: Icon }) => <button key={key} type="button" aria-pressed={draft.action === key && draft.confirmed}
                onClick={() => { setError(""); setDraft(prev => chooseAction(prev, key)); }}
                className="flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-semibold"
                style={{ borderColor: color, color: draft.action === key && draft.confirmed ? "white" : color, background: draft.action === key && draft.confirmed ? color : "transparent" }}>
                {draft.action === key && draft.confirmed ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}{label}
              </button>)}
            </div>
            {draft.action && !completeFeedback(draft.action, draft.feedback) && <p role="status" className="text-sm text-amber-600">Completa el motivo o mensaje; no basta con el texto inicial.</p>}
            {draft.action && completeFeedback(draft.action, draft.feedback) && !draft.confirmed && <p className="text-sm">Pulsa de nuevo «{actions.find(a => a.key === draft.action)?.label}» para marcar la decisión.</p>}
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            <button type="button" disabled={!valid} onClick={() => void submit()} className="w-full rounded-xl bg-[var(--accent)] p-4 text-white font-semibold disabled:opacity-40">{busy ? "Enviando…" : "Enviar feedback y revisión"}</button>
          </fieldset>
        </>}
      </div>
    </Modal>
    <Modal open={!!draft.replace} onClose={() => setDraft(prev => replaceFeedback(prev, false))} title="¿Sobrescribir tu mensaje?" size="sm">
      <p className="text-sm">Tu mensaje será sobrescrito. ¿Seguro que quieres cambiar?</p>
      <div className="flex gap-3 mt-5"><button type="button" className="rounded-xl bg-[var(--accent)] text-white px-4 py-2" onClick={() => setDraft(prev => replaceFeedback(prev, true))}>Sí, cambiar</button><button type="button" className="rounded-xl border border-[var(--border)] px-4 py-2" onClick={() => setDraft(prev => replaceFeedback(prev, false))}>No, conservar</button></div>
    </Modal>
  </>;
}

export function EvidenceReviewList({ orgId, taskId, userId }: { orgId: string; taskId: string; userId?: string }) {
  const [history, setHistory] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["evidence-list", orgId, taskId, userId],
    queryFn: async () => (await apiClient.get<{ items: { titulo: string; entregas: Evidence[] }[] }>("/operaciones/evidencias", { params: { org_id: orgId, tarea_id: taskId, usuario_id: userId } })).data });
  const task = data?.items[0];
  if (isLoading) return <p>Cargando evidencias…</p>;
  if (isError) return <button onClick={() => void refetch()}>No se pudieron cargar las evidencias. Reintentar</button>;
  return <section className="space-y-3"><h4 className="font-semibold">Evidencias por persona</h4>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={history} onChange={e => setHistory(e.target.checked)} />Mostrar intentos anteriores</label>
    {!task?.entregas.length && <p className="text-sm text-[var(--text-muted)]">Todavía no hay entregas para esta selección.</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{task?.entregas.filter(d => history || d.vigente).map(d => <div key={d.id}><EvidenceCard delivery={d} orgId={orgId} title={task.titulo} /></div>)}</div>
  </section>;
}
