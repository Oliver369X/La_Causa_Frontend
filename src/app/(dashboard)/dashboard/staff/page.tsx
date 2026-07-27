"use client";
import { useState, useEffect } from "react";
import { UserCheck, Mail, Shield, User, CalendarPlus } from "lucide-react";
import { staffApi, type StaffMember, type InviteMemberData } from "@/features/staff/api/staffApi";
import { eventsApi } from "@/features/events/api/eventsApi";
import { useAuthStore } from "@/shared/store/authStore";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function StaffPage() {
  const { activeOrgId }  = useAuthStore();
  const { can, isOwner, rolSlug, isSuperAdmin } = usePermissions();
  const canManage        = can("manageMembers") && (isOwner || rolSlug === "admin" || isSuperAdmin);

  const [members, setMembers]     = useState<StaffMember[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState<InviteMemberData>({ email: "", rol_slug: "organizador" });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "xp" | "elo" | "tasks">("recent");
  
  const qc = useQueryClient();
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<"organizador" | "voluntario">("voluntario");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [savingChanges, setSavingChanges] = useState(false);

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["org-events", activeOrgId],
    queryFn: () => eventsApi.list(activeOrgId ?? undefined),
    enabled: !!activeOrgId,
  });

  // Solo eventos publicados
  const activeEvents = events.filter((e) => e.estado === "publicado" || e.estado === "en_curso");

  const handleCardClick = (m: StaffMember) => {
    if (!canManage || m.rol === "owner") return;
    setEditingMember(m);
    setSelectedRole((ROL_SLUG_BY_MEMBER[m.rol] ?? "voluntario") as "organizador" | "voluntario");
    setSelectedEventId("");
  };

  const handleSaveChanges = async () => {
    if (!activeOrgId || !editingMember) return;
    setSavingChanges(true);
    try {
      // 1. Si el rol seleccionado es diferente al rol actual en la organización, actualizarlo
      const currentRoleSlug = ROL_SLUG_BY_MEMBER[editingMember.rol] ?? "voluntario";
      if (selectedRole !== currentRoleSlug) {
        await staffApi.update(activeOrgId, editingMember.usuario_id, { rol_slug: selectedRole });
      }

      // 2. Si se seleccionó un evento, asociar al miembro a ese evento
      if (selectedEventId) {
        await eventsApi.addOrganizer(selectedEventId, editingMember.usuario_id);
      }

      toast.success("Miembro actualizado correctamente.");
      setEditingMember(null);
      setSelectedEventId("");
      qc.invalidateQueries({ queryKey: ["org-events", "events"] });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Ocurrió un error al guardar los cambios.");
    } finally {
      setSavingChanges(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = (m.nombre || "").toLowerCase().includes(term);
    const emailMatch = (m.email || "").toLowerCase().includes(term);
    const roleMatch = (m.rol || "").toLowerCase().includes(term);
    return nameMatch || emailMatch || roleMatch;
  }).sort((a, b) => {
    if (sortBy === "xp") return (b.xp_total ?? 0) - (a.xp_total ?? 0);
    if (sortBy === "elo") return (b.elo_score ?? 1000) - (a.elo_score ?? 1000);
    if (sortBy === "tasks") return (b.tareas_completadas ?? 0) - (a.tareas_completadas ?? 0);
    return new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime();
  });

  const load = () => {
    if (!activeOrgId) return;
    setLoading(true);
    staffApi.list(activeOrgId)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeOrgId]);

  const handleInvite = async () => {
    if (!activeOrgId || !form.email.trim()) return;
    setSaving(true);
    try {
      await staffApi.invite(activeOrgId, form);
      setShowInvite(false);
      setForm({ email: "", rol_slug: "organizador" });
      load();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!activeOrgId || !confirm("¿Remover este miembro?")) return;
    await staffApi.remove(activeOrgId, userId).catch(() => {});
    load();
  };

  const handleRoleChange = async (userId: string, rol_slug: InviteMemberData["rol_slug"]) => {
    if (!activeOrgId || !rol_slug) return;
    setSaving(true);
    try {
      await staffApi.update(activeOrgId, userId, { rol_slug });
      load();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const ROL_VARIANT: Record<string, "success" | "info" | "purple" | "default"> = {
    owner:       "purple",
    admin:       "info",
    coordinador: "info",
    organizador: "success",
    staff:       "success",
    volunteer:   "default",
  };
  const ROL_LABEL: Record<string, string> = {
    owner:       "Dueño",
    admin:       "Admin",
    coordinador: "Coordinador",
    organizador: "Organizador",
    staff:       "Colaborador",
    volunteer:   "Voluntario",
  };

  const ROL_SLUG_BY_MEMBER: Record<string, string> = {
    owner: "organizador",
    volunteer: "voluntario",
    organizador: "organizador",
    coordinador: "coordinador",
    staff: "organizador",
  };

  return (
    <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Miembros de la organización
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Quién participa en la gestión y con qué rol (organizador o coordinador). Las invitaciones dependen de tus permisos.
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            La junta directiva no es un rol aparte en la plataforma: el propietario y los administradores de la organización suelen cubrir esa gobernanza; invitá coordinadores u organizadores para delegar la operación diaria.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowInvite(true)} className="self-start sm:self-auto">
            <Mail className="w-4 h-4" /> Invitar
          </Button>
        )}
      </div>

      {!activeOrgId ? (
        <EmptyState title="Sin organización" description="Selecciona una organización para ver a los miembros." />
      ) : loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : members.length === 0 ? (
        <EmptyState title="Sin miembros" description="Agrega organizadores o coordinadores para delegar la gestión." />
      ) : (
        <div className="space-y-4">
          {/* Barra de búsqueda interactiva */}
          <div className="max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar miembros por nombre o email..."
              className="w-full h-10 px-4 text-sm rounded-xl outline-none transition-all"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text)"
              }}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-10 px-3 text-sm rounded-xl outline-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <option value="recent">Ordenar por ingreso reciente</option>
            <option value="xp">Más experiencia</option>
            <option value="elo">Mayor ELO</option>
            <option value="tasks">Más tareas completadas</option>
          </select>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
              No se encontraron miembros que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((m) => {
                const isOwnerOrSelf = m.rol === "owner" || m.es_propietario;
                return (
                  <Card key={m.id}>
                    <div
                      onClick={() => handleCardClick(m)}
                      className={`h-full flex flex-col justify-between ${
                        canManage && !isOwnerOrSelf ? "cursor-pointer hover:opacity-90 transition-opacity" : ""
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                                 style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                              {(m.nombre ?? m.email ?? "M")[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{m.nombre ?? m.email ?? "Miembro"}</p>
                              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{m.email ?? "Sin email"}</p>
                            </div>
                          </div>
                          <Badge label={ROL_LABEL[m.rol] ?? m.rol} variant={ROL_VARIANT[m.rol] ?? "default"} />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Desde {new Date(m.fecha_ingreso).toLocaleDateString("es-ES")}
                        </p>
                        <div className="text-[10px] text-right" style={{ color: "var(--text-muted)" }}>
                          <div>{m.xp_total ?? 0} XP · {m.elo_score ?? 1000} ELO</div>
                          <div>{m.tareas_completadas ?? 0} tareas completadas</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManage && !isOwnerOrSelf && (
                            <span className="text-[10px]" style={{ color: "var(--accent)" }}>
                              Editar
                            </span>
                          )}
                          {canManage && !m.es_propietario && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(m.usuario_id);
                              }}
                              className="text-xs text-red-400 hover:text-red-500 transition-colors"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Agregar organizador o voluntario"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowInvite(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleInvite} loading={saving}>Invitar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="organizador@org.com"
              className="w-full h-9 px-3 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Rol</label>
            <select
              value={form.rol_slug ?? "organizador"}
              onChange={(e) => setForm((f) => ({ ...f, rol_slug: e.target.value as "organizador" | "voluntario" }))}
              className="w-full h-9 px-3 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="organizador">Organizador</option>
              <option value="voluntario">Voluntario</option>
            </select>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Organizadores pueden gestionar eventos, tareas y solicitudes, mientras que los voluntarios participan en ellos.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={editingMember !== null}
        onClose={() => {
          setEditingMember(null);
          setSelectedEventId("");
        }}
        title={`Asignar rol y evento a ${editingMember?.nombre || editingMember?.email || "miembro"}`}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingMember(null);
                setSelectedEventId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveChanges}
              loading={savingChanges}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Mientras no des clic en <strong>Guardar</strong>, no se aplicarán los cambios de rol ni se añadirá el usuario al evento seleccionado.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Rol en la Organización *
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as "organizador" | "voluntario")}
              className="w-full h-9 px-3 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="voluntario">Voluntario</option>
              <option value="organizador">Organizador</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Asignar a Evento (Opcional)
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="">No asignar a ningún evento...</option>
              {activeEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.nombre}
                </option>
              ))}
            </select>
            {activeEvents.length === 0 && (
              <p className="text-xs text-amber-500 mt-1">
                No hay eventos activos o publicados en esta organización.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
