"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { Modal } from "@/shared/ui/Modal";
import { gamificationApi } from "@/features/gamification/api/gamificationApi";
import { ProfileBanner } from "@/features/gamification/ui/ProfileBanner";
import { assignmentsApi } from "@/features/assignments/api/assignmentsApi";
import { type MatchResponse } from "../api/volunteersApi";
import { extractApiDetail } from "@/shared/utils/apiError";

type Person = { id: string; nombre: string; avatar_url?: string; xp: number; rango: string; medalla_url?: string;
  tareas_activas: number; en_evento: boolean; asignable: boolean; asignado: boolean;
  compatibilidad_porcentaje?: number; skills_faltantes?: string[]; skills_cumplidas?: string[] };
type Recommendations = MatchResponse & { cupos_restantes: number; candidatos: Person[] };
type Props = { orgId: string; eventId?: string; taskId?: string; initialSearch?: string; compact?: boolean };
const button = "rounded-xl border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-40";

export function VolunteerSelector({ orgId, eventId, taskId, initialSearch = "", compact = false }: Props) {
  return <VolunteerSelectorContent key={`${orgId}:${eventId}:${taskId}`} {...{ orgId, eventId, taskId, initialSearch, compact }} />;
}

function VolunteerSelectorContent({ orgId, eventId, taskId, initialSearch = "", compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [conflict, setConflict] = useState("");
  const conflictResolver = useRef<((answer: boolean) => void) | null>(null);
  useEffect(() => () => { conflictResolver.current?.(false); }, []);
  const [scope, setScope] = useState(eventId || taskId ? "evento" : "organizacion");
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, Person>>({});
  const [profileId, setProfileId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestId = useRef<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [matching, setMatching] = useState<Recommendations | null>(null);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const [assignedPeople, setAssignedPeople] = useState<Person[]>([]);
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["candidate-cards", orgId, eventId, taskId, scope, search, page],
    queryFn: async () => (await apiClient.get<{ total: number; items: Person[] }>("/operaciones/candidatos", {
      params: { org_id: orgId, evento_id: eventId, tarea_id: taskId, scope, search, page },
    })).data,
  });
  const profile = useQuery({ queryKey: ["candidate-profile", orgId, profileId],
    queryFn: () => gamificationApi.getProfile(profileId!, orgId), enabled: !!profileId });

  async function act(kind: "manual" | "matching" | "auto") {
    if (!taskId || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setNotice("");
    try {
      if (kind === "matching") {
        const { data: recommendations } = await apiClient.get<Recommendations>(`/operaciones/tareas/${taskId}/recomendaciones`, { params: { org_id: orgId } });
        setMatching(recommendations); setShowAllRecommendations(false);
      } else if (kind === "auto") {
        setNotice("La IA elegirá automáticamente según compatibilidad y carga, asignará las vacantes disponibles y enviará las notificaciones. No necesitas confirmar otra vez.");
        const { data: recommendations } = await apiClient.get<Recommendations>(`/operaciones/tareas/${taskId}/recomendaciones`, { params: { org_id: orgId } });
        setMatching(recommendations); setShowAllRecommendations(false);
        const messages: string[] = [];
        const amount = Math.min(recommendations.cupos_restantes, recommendations.candidatos.length);
        if (!amount) setNotice("No hay cupos restantes o candidatos habilitados para asignar.");
        for (let index = 0; index < amount; index++) {
          requestId.current ||= crypto.randomUUID();
          const { data: result } = await apiClient.post<{ message: string; asignado: boolean; persona?: Person }>(`/operaciones/tareas/${taskId}/asignar-ia`, null,
            { params: { org_id: orgId, request_id: requestId.current } });
          requestId.current = null;
          messages.push(result.message); setNotice(messages.join("\n\n"));
          if (result.persona) {
            const person = result.persona;
            setAssignedPeople(prev => [...prev.filter(p => p.id !== person.id), person]);
            setSelected(prev => { const next = { ...prev }; delete next[person.id]; return next; });
            setMatching(prev => prev && ({ ...prev, cupos_restantes: Math.max(0, prev.cupos_restantes - 1), candidatos: prev.candidatos.filter(p => p.id !== person.id) }));
          }
          if (!result.asignado) break;
        }
      } else {
        let count = 0;
        const failures: string[] = [];
        for (const person of Object.values(selected)) {
          try {
            try {
              await assignmentsApi.assign(taskId, { tipo: "individual", usuario_id: person.id });
            } catch (e) {
              const detail = (e as { response?: { data?: { detail?: { code?: string; message?: string } } } }).response?.data?.detail;
              if (detail?.code !== "event_conflict") throw e;
              setConflict(`${person.nombre}: ${detail.message}`);
              const accepted = await new Promise<boolean>(resolve => { conflictResolver.current = resolve; });
              if (!accepted) continue;
              await assignmentsApi.assign(taskId, { tipo: "individual", usuario_id: person.id, confirmar_conflicto_evento: true });
            }
            count++;
            setAssignedPeople(prev => [...prev.filter(p => p.id !== person.id), { ...person, asignado: true, en_evento: true }]);
            setSelected(prev => { const next = { ...prev }; delete next[person.id]; return next; });
          } catch (e) { failures.push(`${person.nombre}: ${extractApiDetail(e)}`); }
        }
        setNotice(`${count} asignaciones procesadas. Cada asignación nueva envía una notificación.`);
        if (failures.length) setError(failures.join("\n"));
        setMatching(null);
      }
      if (kind !== "matching") await qc.invalidateQueries();
    } catch (e) { setError(extractApiDetail(e)); }
    finally { if (kind !== "matching") void qc.invalidateQueries({ queryKey: ["candidate-cards"] }); busyRef.current = false; setBusy(false); }
  }
  const matchMap = new Map(matching?.ranking.map((m, i) => [m.voluntario_id, { ...m, position: i + 1 }]));
  const people = [...(data?.items || [])].sort((a, b) => (matchMap.get(a.id)?.position ?? Infinity) - (matchMap.get(b.id)?.position ?? Infinity));

  const renderCard = (person: Person, position?: number) => <article key={person.id} className={`relative rounded-2xl border p-4 space-y-3 ${selected[person.id] ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
          <img src={person.medalla_url || `/medals/${person.rango.toLowerCase()}.png`} alt={person.rango} title={`Rango de esta organización: ${person.rango}`}
            className="absolute right-3 top-3 h-12 w-12 object-contain" />
          <div className="flex gap-3 items-center pr-12">
            {person.avatar_url ? <img src={person.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" /> : <span className="w-11 h-11 rounded-full bg-[var(--accent-soft)] grid place-items-center">{person.nombre.charAt(0)}</span>}
            <div><h4 className="font-semibold text-sm">{person.nombre}</h4><p className="text-xs text-[var(--text-muted)]">{person.xp.toLocaleString()} XP</p></div>
          </div>
          <p className="text-sm">{person.tareas_activas} tareas activas · {person.en_evento ? "Inscrito" : "Fuera del evento"}</p>
          {(person.compatibilidad_porcentaje !== undefined || matchMap.has(person.id)) && <div className="text-xs text-[var(--accent)] space-y-1">
            <p className="font-semibold">{position ? `Recomendado #${position} · ` : ""}Compatibilidad {person.compatibilidad_porcentaje ?? Math.round(Math.max(0, Math.min(100, matchMap.get(person.id)!.match_score * (matching?.fase_usada === 1 ? 1 : 100))) * 10) / 10}%</p>
            {matching?.advertencias.some(w => w.includes("no tiene habilidades")) ? <p>Basado en disponibilidad, experiencia y carga; sin habilidades requeridas definidas.</p> : person.skills_faltantes?.length ? <p>Por reforzar: {person.skills_faltantes.join(", ")}</p> : person.skills_cumplidas?.length ? <p>Habilidades compatibles: {person.skills_cumplidas.join(", ")}</p> : null}
          </div>}
          <div className="flex items-center justify-between gap-2">
            {taskId && <label className="flex gap-2 text-xs items-center"><input type="checkbox" checked={!!selected[person.id]} disabled={busy || !person.asignable || person.asignado}
              onChange={e => setSelected(prev => { const next = { ...prev }; if (e.target.checked) next[person.id] = person; else delete next[person.id]; return next; })} />{person.asignado ? "Ya asignado" : "Seleccionar"}</label>}
            <button type="button" className="text-sm text-[var(--accent)] underline" onClick={() => setProfileId(person.id)}>Ver perfil</button>
          </div>
        </article>;
  const cards = people.map(person => renderCard(person));
  return <section className="space-y-4" aria-label="Selección de voluntarios">
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Origen de los voluntarios">
      {[["evento", "En el evento"], ["organizacion", "Mi organización"], ["plataforma", "Plataforma"]].map(([key, label]) =>
        <button key={key} type="button" role="tab" aria-selected={scope === key} disabled={key === "evento" && !eventId && !taskId}
          className={`${button} ${scope === key ? "bg-[var(--accent)] text-white" : ""}`}
          onClick={() => { setScope(key); setPage(1); }}>{label}</button>)}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <input aria-label="Buscar voluntarios" placeholder="Buscar por nombre" value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }} className={`${button} bg-[var(--bg)] flex-1 min-w-40`} />
      <span className="text-sm text-[var(--text-muted)]">{data?.total ?? 0} personas</span>
    </div>
    {scope === "plataforma" && <p className="text-xs text-[var(--text-muted)]">Para asignar, la persona debe pertenecer a la organización o estar aprobada en el evento. No se incorporan miembros sin su solicitud.</p>}
    {taskId && <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={busy} onClick={() => void act("matching")}>Matching ML</button>
      <button type="button" className={`${button} bg-[var(--accent-soft)]`} disabled={busy} onClick={() => void act("auto")}>Asignar con IA y notificar</button>
      <button type="button" className={`${button} bg-[var(--accent)] text-white`} disabled={busy || !Object.keys(selected).length} onClick={() => void act("manual")}>Asignar seleccionados ({Object.keys(selected).length})</button>
      <p className="basis-full text-xs text-[var(--text-muted)]">Matching ML muestra los mejores candidatos según los cupos restantes; no asigna. Asignar con IA elige automáticamente, cubre los cupos posibles y envía las notificaciones sin otra confirmación.</p>
    </div>}
    {busy && <p role="status">Procesando…</p>}
    {!!assignedPeople.length && <div className="rounded-2xl border border-[var(--accent)] p-4 space-y-3"><h3 className="font-semibold">Voluntarios asignados · {assignedPeople.length}</h3><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{assignedPeople.map(person => renderCard(person))}</div></div>}
    {notice && <p role="status" className="whitespace-pre-line rounded-xl bg-[var(--accent-soft)] p-3 text-sm">{notice}</p>}
    {error && <p role="alert" className="whitespace-pre-line text-sm text-red-500">{error}</p>}
    {matching && <div className="rounded-xl border border-[var(--border)] p-3 text-sm space-y-2">
      <p>Matching ML · {matching.total_candidatos} candidatos evaluados · Fase {matching.fase_usada}</p>
      {matching.advertencias.map(w => <p key={w} className="text-[var(--text-muted)]">{w}</p>)}
      <p className="font-semibold">{matching.cupos_restantes} cupos restantes · {Math.min(matching.cupos_restantes, matching.candidatos.length)} recomendados</p>
      <p className="text-xs text-[var(--text-muted)]">Candidatos de tu organización, aunque aún no estén inscritos. Ordenados por compatibilidad y carga. El porcentaje no es una garantía de éxito.</p>
      {!matching.cupos_restantes ? <p>La tarea no tiene cupos disponibles.</p> : !matching.candidatos.length ? <p>No hay candidatos habilitados. Revisa disponibilidad y carga.</p> : <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{matching.candidatos.slice(0, showAllRecommendations ? undefined : matching.cupos_restantes).map((person, index) => renderCard(person, index + 1))}</div>
        {matching.candidatos.length > matching.cupos_restantes && <button className={button} onClick={() => setShowAllRecommendations(value => !value)}>{showAllRecommendations ? "Ver solo recomendados" : `Ver más candidatos (${matching.candidatos.length - matching.cupos_restantes})`}</button>}
      </>}
    </div>}
    {isLoading ? <p role="status">Cargando voluntarios…</p> : isError ? <button className={button} onClick={() => void refetch()}>No se pudieron cargar. Reintentar</button> : <>
      {!people.length && <p className="text-sm text-[var(--text-muted)]">No hay personas en esta selección.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {compact ? cards.slice(0, 3) : cards}
        {compact && people.length > 3 && <button className={button} onClick={() => setExpanded(true)}>Ver más voluntarios ({data?.total})</button>}
        <Modal open={expanded} onClose={() => setExpanded(false)} title="Voluntarios disponibles" size="2xl" scrollable><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{cards}</div><button className={button} onClick={() => setExpanded(false)}>Listo ({Object.keys(selected).length} seleccionados)</button></Modal>
      </div>
      <nav className="flex justify-end items-center gap-3" aria-label="Páginas de voluntarios">
        <button className={button} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
        <span className="text-sm">{page} / {Math.max(1, Math.ceil((data?.total ?? 0) / 24))}</span>
        <button className={button} disabled={page * 24 >= (data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>Siguiente</button>
      </nav>
    </>}
    <Modal open={!!profileId} onClose={() => setProfileId(null)} title="Perfil del voluntario" size="2xl" scrollable>
      {profile.isLoading ? <p>Cargando perfil…</p> : profile.isError ? <p role="alert">No se pudo cargar el perfil.</p> : profile.data && <><ProfileBanner profile={profile.data} showcase />{profile.data.bio && <p className="mt-4">{profile.data.bio}</p>}</>}
    </Modal>
    <Modal open={!!conflict} onClose={() => { setConflict(""); conflictResolver.current?.(false); }} title="Coincidencia de horarios">
      <p>{conflict}</p><p className="mt-3">¿Quieres continuar con esta asignación?</p>
      <div className="flex gap-3 mt-4"><button className={button} onClick={() => { setConflict(""); conflictResolver.current?.(true); }}>Continuar</button><button className={button} onClick={() => { setConflict(""); conflictResolver.current?.(false); }}>No asignar</button></div>
    </Modal>
  </section>;
}
