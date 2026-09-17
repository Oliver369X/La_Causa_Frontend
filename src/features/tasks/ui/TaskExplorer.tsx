"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/shared/api/client";
import { Modal } from "@/shared/ui/Modal";
import { VolunteerSelector } from "@/features/volunteers/ui/VolunteerSelector";
import { EvidenceReviewList } from "@/features/assignments/ui/EvidenceReview";

type TaskItem = { id: string; evento_id: string; evento_nombre: string; titulo: string; descripcion?: string; estado: string; vencida: boolean;
  fecha_vencimiento?: string; por_revisar?: number; sin_entrega?: boolean; personas: { id: string; nombre: string; avatar_url?: string; estado: string; retrasado: boolean }[] };
const labels: Record<string, string> = { pendiente: "Pendientes", en_progreso: "En progreso", revision: "En revisión", completada: "Completadas", bloqueada: "Bloqueadas", cancelada: "Canceladas" };
const personLabels: Record<string, string> = { pendiente: "Por aceptar", aceptada: "En progreso", en_revision: "En revisión", aprobada: "Completada", completada: "Completada", rechazada: "Rechazada", devuelta: "Corrección solicitada" };
function remaining(task: TaskItem, now: number) {
  if (!task.fecha_vencimiento) return "Sin fecha límite";
  if (["completada", "cancelada"].includes(task.estado)) return "Finalizada";
  const minutes = Math.ceil((new Date(task.fecha_vencimiento).getTime() - now) / 60000);
  const duration = Math.abs(minutes);
  return `${minutes < 0 ? "Venció hace" : "Faltan"} ${Math.floor(duration / 1440)} d ${Math.floor(duration % 1440 / 60)} h ${duration % 60} min`;
}
export function TaskExplorer({ orgId, eventId, taskId, userId, query, reviewMode = false }: { orgId: string; eventId?: string; taskId?: string; userId?: string; query?: string; reviewMode?: boolean }) {
  const [tab, setTab] = useState("todas");
  const [overdue, setOverdue] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TaskItem | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const { data, isLoading, isFetching, isError, refetch } = useQuery({ queryKey: ["task-explorer", orgId, eventId, taskId, userId, query, reviewMode],
    staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true,
    queryFn: async () => (await apiClient.get<{ total: number; counts: Record<string, number>; items: TaskItem[] }>("/operaciones/evidencias", { params: { org_id: orgId, evento_id: eventId, tarea_id: taskId, usuario_id: userId, query } })).data });
  const filtered = (data?.items || []).filter(t => (tab === "todas" || t.estado === tab) && (!overdue || t.vencida));
  const current = data?.items.find(t => t.id === selected?.id) || selected;
  return <section className="space-y-4">
    <div className="flex justify-end"><button type="button" disabled={isFetching} onClick={() => void refetch()} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-50">{isFetching ? "Actualizando…" : "Actualizar"}</button></div>
    <div role="tablist" aria-label="Estado de las tareas" className="flex flex-wrap gap-2">
      {Object.entries({ todas: "Todas", ...labels }).map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key}
        className={`rounded-xl px-3 py-2 text-sm border border-[var(--border)] ${tab === key ? "bg-[var(--accent)] text-white" : ""}`}
        onClick={() => { setTab(key); setPage(1); }}>{label} ({key === "todas" ? data?.total ?? 0 : data?.counts[key] ?? 0})</button>)}
    </div>
    <label className="text-sm flex gap-2"><input type="checkbox" checked={overdue} onChange={e => { setOverdue(e.target.checked); setPage(1); }} />Solo vencidas ({data?.counts.vencida ?? 0})</label>
    {isLoading || isFetching ? <p role="status">Actualizando tareas y asignaciones…</p> : isError ? <button onClick={() => void refetch()}>No se pudieron cargar las tareas. Reintentar</button> : <>
      {!filtered.length && <p className="text-sm text-[var(--text-muted)]">No hay tareas con estos filtros.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.slice((page - 1) * 12, page * 12).map(task => <button key={task.id} onClick={() => setSelected(task)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left space-y-3 hover:border-[var(--accent)]">
          <span className="text-xs text-[var(--accent)]">{labels[task.estado] || task.estado}</span><h3 className="font-semibold">{task.titulo}</h3>
          {task.estado === "completada" && <div className="rounded-xl border border-emerald-500 bg-emerald-500/15 px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-300">Completada · Todas las entregas aprobadas</div>}
          <p className="text-xs text-[var(--text-muted)]">{task.evento_nombre}</p>
          <p className="text-xs">{task.sin_entrega ? "Sin entregas" : `${task.por_revisar ?? 0} entregas por revisar`}</p>
          <p className={`text-sm ${task.vencida ? "text-red-500" : "text-[var(--text-muted)]"}`}>{remaining(task, now)}</p>
          <div className="flex flex-wrap gap-2">{task.personas.slice(0, 3).map(p => <span key={p.id} className="flex items-center gap-1 text-xs">{p.avatar_url && <img src={p.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />}{p.nombre}</span>)}{task.personas.length > 3 && <span className="text-xs">+{task.personas.length - 3}</span>}</div>
          {!task.personas.length && <p className="text-xs">Sin asignaciones</p>}
        </button>)}
      </div>
      <div className="flex justify-end gap-4 text-sm"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button><span>{page} / {Math.max(1, Math.ceil(filtered.length / 12))}</span><button disabled={page * 12 >= filtered.length} onClick={() => setPage(p => p + 1)}>Siguiente</button></div>
    </>}
    <Modal open={!!current} onClose={() => setSelected(null)} title={current?.titulo} size="2xl" scrollable>
      {current && <div className="space-y-5"><p>{current.descripcion}</p><p>{remaining(current, now)}</p>
        <h4 className="font-semibold">Estado por persona</h4>
        {current.personas.map(p => <div key={p.id} className="flex justify-between gap-4 border-b border-[var(--border)] py-3"><span>{p.nombre}</span><span>{personLabels[p.estado] || p.estado}{p.retrasado ? " · Retrasado" : ""}</span></div>)}
        <Link href={`/dashboard/tasks/${current.id}`} className="text-[var(--accent)] underline">Ver tarea y entregas</Link>
        <EvidenceReviewList key={`evidence-${current.id}`} orgId={orgId} taskId={current.id} userId={userId} />
        {!reviewMode && <VolunteerSelector key={current.id} orgId={orgId} eventId={current.evento_id} taskId={current.id} />}
      </div>}
    </Modal>
  </section>;
}
