"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { volunteersApi, type Member, filterVolunteerMembers } from "@/features/volunteers/api/volunteersApi";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { TopBar } from "@/shared/ui/Sidebar";
import { Users, Crown, User2, Calendar, UserPlus, Eye, FileText, CheckSquare, Trophy, Download } from "lucide-react";
import Link from "next/link";
import { displayPersonName } from "@/shared/utils/utils";
import { downloadCsv } from "@/shared/lib/csvExport";
import { toast } from "sonner";
import { gamificationApi, type Badge, type CompetitiveProfile } from "@/features/gamification/api/gamificationApi";
import { ProfileBanner } from "@/features/gamification/ui/ProfileBanner";
import { BadgeGrid } from "@/features/gamification/ui/BadgeGrid";
import { VolunteerSummaryCard } from "@/features/volunteers/ui/VolunteerSummaryCard";
import { ListPagination } from "@/shared/ui/ListPagination";
import { Modal } from "@/shared/ui/Modal";

function roleLabel(member: Member): string {
  if (member.es_propietario) return "Propietario";
  const slug = (member.rol_slug || "voluntario").toLowerCase();
  if (slug === "organizador") return "Organizador";
  if (slug === "coordinador") return "Coordinador";
  if (slug === "admin") return "Admin";
  return "Voluntario";
}

function MemberCard({ member, orgId, onRequest }: { member: Member; orgId: string; onRequest?: () => void }) {
  const name = displayPersonName(member.usuario_nombre, member.usuario_email, "Voluntario");
  return <VolunteerSummaryCard name={name} avatar={member.usuario_avatar_url} email={member.usuario_email}
    rank={member.rango} xp={member.xp_total} elo={member.elo_score}
    detail={<>{roleLabel(member)} · {member.estado_membresia} · {member.tareas_completadas ?? 0} tareas completadas</>}>
    <Link className="text-sm text-[var(--accent)]" href={`/dashboard/perfil/${member.usuario_id}?org=${orgId}`}>Ver perfil</Link>
    {onRequest && <button className="text-sm text-[var(--accent)]" onClick={onRequest}>Ver solicitud</button>}
  </VolunteerSummaryCard>;
}

interface Solicitud {
  usuario_avatar_url?: string | null;
  xp_total?: number;
  elo_score?: number;
  rango?: string;
  id: string;
  usuario_id: string;
  organizacion_id: string;
  estado: string;
  mensaje?: string;
  fecha_solicitud: string;
  usuario_nombre?: string;
  usuario_email?: string;
}

export default function VolunteersPage() {
  const { activeOrgId } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => { setPage(1); setRequestPage(1); setHistoryPage(1); setSelectedSolicitud(null); }, [activeOrgId, search]);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [mensajeRespuesta, setMensajeRespuesta] = useState("");
  const [confirmacionEstado, setConfirmacionEstado] = useState<"aprobada" | "rechazada" | null>(null);

  const { data: solicitudes = [] } = useQuery({
    queryKey: ["solicitudes", activeOrgId],
    queryFn: () => organizationsApi.listSolicitudes(activeOrgId!),
    enabled: !!activeOrgId,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, estado, mensaje }: { id: string; estado: "aprobada" | "rechazada"; mensaje?: string }) =>
      organizationsApi.reviewSolicitud(id, estado, mensaje),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitudes", activeOrgId] });
      qc.invalidateQueries({ queryKey: ["members", activeOrgId] });
    },
  });

  const pendientes = (solicitudes as Solicitud[]).filter((s) => s.estado === "pendiente");
  const historialSolicitudes = (solicitudes as Solicitud[]).filter((s) => s.estado !== "pendiente");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", activeOrgId],
    queryFn: () => volunteersApi.listMembers(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const volunteers = filterVolunteerMembers(members);

  const { data: applicantProfile, isLoading: loadingApplicantProfile } = useQuery({
    queryKey: ["membership-applicant-profile", selectedSolicitud?.usuario_id, activeOrgId],
    queryFn: () => gamificationApi.getProfile(selectedSolicitud!.usuario_id, activeOrgId!),
    enabled: !!selectedSolicitud?.usuario_id && !!activeOrgId,
  });
  const { data: applicantBadges = [] } = useQuery({
    queryKey: ["membership-applicant-badges", selectedSolicitud?.usuario_id, activeOrgId],
    queryFn: () => gamificationApi.getBadges(selectedSolicitud!.usuario_id, activeOrgId!),
    enabled: !!selectedSolicitud?.usuario_id && !!activeOrgId,
  });

  const filtered = volunteers.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.usuario_nombre || "").toLowerCase().includes(q) ||
      (m.usuario_email || "").toLowerCase().includes(q)
    );
  });
  useEffect(() => {
    setPage(p => Math.min(p, Math.max(1, Math.ceil(filtered.length / 12))));
    setRequestPage(p => Math.min(p, Math.max(1, Math.ceil(pendientes.length / 12))));
    setHistoryPage(p => Math.min(p, Math.max(1, Math.ceil(historialSolicitudes.length / 12))));
  }, [filtered.length, pendientes.length, historialSolicitudes.length]);

  const exportVolunteersCsv = () => {
    downloadCsv(
      `voluntarios-${new Date().toISOString().slice(0, 10)}.csv`,
      ["nombre", "email", "rol", "estado", "fecha_ingreso", "es_propietario"],
      filtered.map((m) => [
        m.usuario_nombre ?? "",
        m.usuario_email ?? "",
        roleLabel(m),
        m.estado_membresia,
        m.fecha_ingreso,
        m.es_propietario,
      ]),
    );
    toast.success("CSV de voluntarios descargado");
  };

  return (
    <>
      <TopBar title="Voluntarios" />
      <div className="flex-1 p-5 sm:p-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold">Voluntarios de la organización</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {volunteers.length} voluntario{volunteers.length !== 1 ? "s" : ""} activos
              {members.length !== volunteers.length
                ? ` · ${members.length - volunteers.length} en staff`
                : ""}
            </p>
            <button type="button" aria-expanded={showHistory} className="mt-3 text-sm text-[var(--accent)]" onClick={() => setShowHistory(v => !v)}>
              {showHistory ? "Ocultar" : "Ver"} historial de solicitudes ({historialSolicitudes.length})
            </button>

          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={exportVolunteersCsv}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
            <input
              type="text"
              placeholder="Buscar por nombre o email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 rounded-xl text-sm outline-none w-full sm:w-56"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>

        {activeOrgId && showHistory && <section className="mb-8">
          <h3 className="font-semibold mb-4">Historial de solicitudes ({historialSolicitudes.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {historialSolicitudes.slice((historyPage - 1) * 12, historyPage * 12).map(s => <VolunteerSummaryCard key={s.id}
              name={displayPersonName(s.usuario_nombre, s.usuario_email, "Solicitante")} email={s.usuario_email}
              avatar={s.usuario_avatar_url} rank={s.rango} xp={s.xp_total} elo={s.elo_score} detail={<>{s.estado} · {s.mensaje || "Sin mensaje"}</>}>
              <button className="text-sm text-[var(--accent)]" onClick={() => { setSelectedSolicitud(s); setMensajeRespuesta(""); }}>Ver perfil y solicitud</button>
            </VolunteerSummaryCard>)}
          </div>
          <ListPagination page={historyPage} total={historialSolicitudes.length} onChange={setHistoryPage} />
        </section>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Voluntarios</p>
            <p className="text-2xl font-bold mt-1">{volunteers.length}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Activos</p>
            <p className="text-2xl font-bold mt-1">{volunteers.filter((m) => m.estado_membresia === "activo").length}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Solicitudes pendientes</p>
            <p className="text-2xl font-bold mt-1">{pendientes.length}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Filtrados</p>
            <p className="text-2xl font-bold mt-1">{filtered.length}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/dashboard/manuales"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <FileText className="w-3 h-3" /> Manuales pendientes
          </Link>
          <Link
            href="/dashboard/tasks"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <CheckSquare className="w-3 h-3" /> Tareas asignadas
          </Link>
          <Link
            href="/dashboard/gamification"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <Trophy className="w-3 h-3" /> Gamificación
          </Link>
        </div>

        {/* Solicitudes pendientes */}
        {activeOrgId && pendientes.length > 0 && <section className="mb-8">
          <h3 className="font-semibold mb-4">Solicitudes pendientes ({pendientes.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendientes.slice((requestPage - 1) * 12, requestPage * 12).map(s => <VolunteerSummaryCard key={s.id}
              name={displayPersonName(s.usuario_nombre, s.usuario_email, "Solicitante")} email={s.usuario_email}
              avatar={s.usuario_avatar_url} rank={s.rango} xp={s.xp_total} elo={s.elo_score} detail={<>{s.estado} · {s.mensaje || "Sin mensaje"}</>}>
              <button className="text-sm text-[var(--accent)]" onClick={() => { setSelectedSolicitud(s); setMensajeRespuesta(""); }}>Ver perfil y solicitud</button>
            </VolunteerSummaryCard>)}
          </div>
          <ListPagination page={requestPage} total={pendientes.length} onChange={setRequestPage} />
        </section>}
        {/* Empty / Loading states */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)" }} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                 style={{ background: "var(--accent-soft)" }}>
              <Users className="w-7 h-7" style={{ color: "var(--accent)" }} />
            </div>
            <p className="font-semibold mb-1">Sin voluntarios</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {search ? "No hay coincidencias" : "Invita miembros desde Configuración"}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.slice((page - 1) * 12, page * 12).map((m) => {
            const request = (solicitudes as Solicitud[]).find(s => s.usuario_id === m.usuario_id);
            return <MemberCard key={m.id} member={m} orgId={activeOrgId!} onRequest={request ? () => { setSelectedSolicitud(request); setMensajeRespuesta(""); } : undefined} />;
          })}
        </div>

        <ListPagination page={page} total={filtered.length} onChange={setPage} />
        <Modal
          open={!!selectedSolicitud}
          onClose={() => { setSelectedSolicitud(null); setMensajeRespuesta(""); }}
          title="Perfil del solicitante"
          description="Revisá su experiencia y gamificación antes de aceptar su ingreso a la organización."
          size="xl"
          scrollable
          footer={selectedSolicitud?.estado === "pendiente" ? <>
            <button onClick={() => setConfirmacionEstado("rechazada")} disabled={reviewMutation.isPending} className="px-4 py-2 rounded-xl text-sm" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>Rechazar</button>
            <button onClick={() => setConfirmacionEstado("aprobada")} disabled={reviewMutation.isPending} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}>Aprobar</button>
          </> : undefined}
        >
          {loadingApplicantProfile ? (
            <div className="h-72 rounded-2xl animate-pulse" style={{ background: "var(--bg-subtle)" }} />
          ) : applicantProfile ? (
            <div className="space-y-6">
              <ProfileBanner profile={applicantProfile as CompetitiveProfile} showcase />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl" style={{ background: "var(--bg-subtle)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Tareas aprobadas</p><p className="text-xl font-bold mt-1">{applicantProfile.tareas_completadas ?? 0}</p></div>
                <div className="p-3 rounded-xl" style={{ background: "var(--bg-subtle)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Experiencia</p><p className="text-xl font-bold mt-1">{applicantProfile.xp_total ?? 0} XP</p></div>
                <div className="p-3 rounded-xl" style={{ background: "var(--bg-subtle)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Racha</p><p className="text-xl font-bold mt-1">{applicantProfile.racha_entregas ?? 0}</p></div>
                <div className="p-3 rounded-xl" style={{ background: "var(--bg-subtle)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Insignias</p><p className="text-xl font-bold mt-1">{applicantProfile.insignias_total ?? applicantBadges.length}</p></div>
              </div>
              <div><h3 className="text-sm font-semibold mb-3">Medallas obtenidas</h3><BadgeGrid badges={applicantBadges as Badge[]} maxVisible={8} /></div>
              {selectedSolicitud?.mensaje && <div className="p-4 rounded-xl text-sm" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}><p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Mensaje para unirse</p>{selectedSolicitud.mensaje}</div>}
              <div><label className="block text-sm font-medium mb-2">Mensaje para el voluntario <span className="font-normal" style={{ color: "var(--text-muted)" }}>(opcional)</span></label><textarea value={mensajeRespuesta} onChange={(event) => setMensajeRespuesta(event.target.value)} rows={3} maxLength={2000} placeholder="Ej. Bienvenido/a al equipo, revisá los manuales al ingresar." className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }} /></div>
            </div>
          ) : <p className="text-sm" style={{ color: "var(--text-muted)" }}>No se pudo cargar el perfil de este solicitante.</p>}
        </Modal>

        <Modal
          open={!!confirmacionEstado && !!selectedSolicitud}
          onClose={() => setConfirmacionEstado(null)}
          title={confirmacionEstado === "aprobada" ? "Confirmar aprobación" : "Confirmar rechazo"}
          description={confirmacionEstado === "aprobada" ? "El voluntario será añadido a la organización y recibirá una notificación." : "El voluntario recibirá una notificación con el resultado de su solicitud."}
          footer={<><button onClick={() => setConfirmacionEstado(null)} className="px-4 py-2 rounded-xl text-sm" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>Volver</button><button onClick={() => { if (!selectedSolicitud || !confirmacionEstado) return; reviewMutation.mutate({ id: selectedSolicitud.id, estado: confirmacionEstado, mensaje: mensajeRespuesta }, { onSuccess: () => { setConfirmacionEstado(null); setSelectedSolicitud(null); setMensajeRespuesta(""); } }); }} disabled={reviewMutation.isPending} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: confirmacionEstado === "aprobada" ? "var(--accent)" : "#dc2626", color: "white" }}>{reviewMutation.isPending ? "Procesando…" : confirmacionEstado === "aprobada" ? "Sí, aprobar" : "Sí, rechazar"}</button></>}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Revisá el perfil y el mensaje antes de confirmar esta acción.</p>
        </Modal>
      </div>
    </>
  );
}
