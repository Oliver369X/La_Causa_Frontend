"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Users2, Plus, Trash2, UserPlus, Crown } from "lucide-react";
import { teamsApi, type Team, type CreateTeamData } from "@/features/assignments/api/assignmentsApi";
import { eventsApi, type Event } from "@/features/events/api/eventsApi";
import { useAuthStore } from "@/shared/store/authStore";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";

function TeamsPageContent() {
  const searchParams = useSearchParams();
  const eventoIdFromUrl = searchParams.get("evento_id");
  const { activeOrgId } = useAuthStore();

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventoIdFromUrl);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateTeamData>({ evento_id: "", nombre: "", descripcion: "" });
  const [showAddMember, setShowAddMember] = useState<Team | null>(null);

  const { data: eventsData = [] } = useQuery({
    queryKey: ["events", activeOrgId],
    queryFn: () => eventsApi.list(activeOrgId ?? undefined),
    enabled: !!activeOrgId,
  });
  useEffect(() => {
    if (Array.isArray(eventsData)) setEvents(eventsData);
  }, [eventsData]);

  useEffect(() => {
    if (eventoIdFromUrl) {
      setSelectedEventId(eventoIdFromUrl);
      setForm((f) => ({ ...f, evento_id: eventoIdFromUrl }));
    }
  }, [eventoIdFromUrl]);

  const loadTeams = () => {
    if (!selectedEventId) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    teamsApi
      .list(selectedEventId)
      .then(setTeams)
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  };

  useEffect(loadTeams, [selectedEventId]);

  const handleCreate = async () => {
    if (!form.nombre.trim() || !form.evento_id) return;
    setSaving(true);
    try {
      await teamsApi.create(form);
      setShowModal(false);
      setForm({ evento_id: selectedEventId ?? "", nombre: "", descripcion: "" });
      loadTeams();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const eventsForFilter = events.filter(
    (e) => e.estado === "publicado" || e.estado === "en_curso" || e.estado === "finalizado" || e.estado === "borrador"
  );

  return (
    <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Equipos
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Organiza voluntarios en equipos por evento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedEventId ?? ""}
            onChange={(e) => {
              const v = e.target.value || null;
              setSelectedEventId(v);
              setForm((f) => ({ ...f, evento_id: v ?? "" }));
            }}
            className="h-9 px-3 text-sm rounded-lg outline-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <option value="">Seleccionar evento</option>
            {eventsForFilter.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            disabled={!selectedEventId}
          >
            <Plus className="w-4 h-4" /> Nuevo equipo
          </Button>
        </div>
      </div>

      {!selectedEventId ? (
        <EmptyState
          title="Selecciona un evento"
          description="Los equipos pertenecen a un evento. Elige un evento para ver o crear equipos."
        />
      ) : loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : teams.length === 0 ? (
        <EmptyState
          title="Sin equipos en este evento"
          description="Crea equipos para organizar voluntarios aprobados."
          action={<Button size="sm" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Crear equipo</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              eventoId={selectedEventId}
              onAddMember={() => setShowAddMember(team)}
              onRefresh={loadTeams}
            />
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Crear equipo"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} loading={saving} disabled={!form.nombre.trim() || !form.evento_id}>
              Crear
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Evento *</label>
            <select
              value={form.evento_id}
              onChange={(e) => setForm((f) => ({ ...f, evento_id: e.target.value }))}
              className="w-full h-9 px-3 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="">Seleccionar evento</option>
              {eventsForFilter.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.nombre}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Nombre *</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Equipo Logística"
              className="w-full h-9 px-3 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Descripción</label>
            <input
              value={form.descripcion ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Opcional"
              className="w-full h-9 px-3 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
        </div>
      </Modal>

      {showAddMember && (
        <AddMemberModal
          team={showAddMember}
          eventoId={showAddMember.evento_id}
          onClose={() => setShowAddMember(null)}
          onSuccess={() => {
            setShowAddMember(null);
            loadTeams();
          }}
        />
      )}
    </div>
  );
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<div className="p-8"><Spinner size="lg" /></div>}>
      <TeamsPageContent />
    </Suspense>
  );
}

function TeamCard({
  team,
  eventoId,
  onAddMember,
  onRefresh,
}: {
  team: Team;
  eventoId: string;
  onAddMember: () => void;
  onRefresh: () => void;
}) {
  const [members, setMembers] = useState<{ usuario_id: string }[]>([]);

  useEffect(() => {
    teamsApi.listMembers(team.id).then(setMembers).catch(() => setMembers([]));
  }, [team.id]);

  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            <Users2 className="w-4 h-4" />
          </div>
          <p className="font-semibold text-sm">{team.nombre}</p>
        </div>
      </div>
      {team.descripcion && (
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{team.descripcion}</p>
      )}
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        {members.length} miembro{members.length !== 1 ? "s" : ""}
      </p>
      <Button variant="outline" size="xs" onClick={onAddMember}>
        <UserPlus className="w-3 h-3" /> Agregar miembro
      </Button>
    </Card>
  );
}

function AddMemberModal({
  team,
  eventoId,
  onClose,
  onSuccess,
}: {
  team: Team;
  eventoId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: applications = [] } = useQuery({
    queryKey: ["event-applications", eventoId],
    queryFn: () => eventsApi.listApplications(eventoId),
    enabled: !!eventoId,
  });
  const [members, setMembers] = useState<{ usuario_id: string }[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [esLider, setEsLider] = useState(false);
  const [saving, setSaving] = useState(false);

  const approved = applications.filter((a) => a.estado === "aprobado" || a.estado === "asistio");
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    teamsApi.listMembers(team.id).then((m) => {
      setMembers(m);
      setMemberIds(new Set(m.map((x) => x.usuario_id)));
    });
  }, [team.id]);

  const available = approved.filter((a) => !memberIds.has(a.usuario_id));

  const handleAdd = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await teamsApi.addMember(team.id, selected, esLider);
      onSuccess();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Agregar miembro a: ${team.nombre}`}
      footer={
          <>
            <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!selected}>
              Agregar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Voluntarios aprobados en este evento:
          </p>
          {available.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No hay voluntarios aprobados disponibles o ya están en el equipo.
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {available.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  >
                    <input
                      type="radio"
                      name="volunteer"
                      checked={selected === a.usuario_id}
                      onChange={() => setSelected(a.usuario_id)}
                    />
                    <div>
                      <span className="text-sm">
                        {a.usuario_nombre || a.usuario_email || `Usuario ${a.usuario_id.slice(0, 8)}…`}
                      </span>
                      {a.usuario_email && (
                        <span className="text-xs block" style={{ color: "var(--text-muted)" }}>{a.usuario_email}</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={esLider}
                  onChange={(e) => setEsLider(e.target.checked)}
                  className="rounded"
                />
                <Crown className="w-4 h-4" style={{ color: "var(--accent)" }} />
                Asignar como líder del equipo
              </label>
            </>
          )}
        </div>
    </Modal>
  );
}
