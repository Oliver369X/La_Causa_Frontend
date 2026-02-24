"use client";
import { useState, useEffect } from "react";
import { UserCheck, Mail, Shield, User } from "lucide-react";
import { staffApi, type StaffMember, type InviteMemberData } from "@/features/staff/api/staffApi";
import { rolesApi, type Role } from "@/features/roles/api/rolesApi";
import { useAuthStore } from "@/shared/store/authStore";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";

export default function StaffPage() {
  const { activeOrgId }  = useAuthStore();
  const { can }          = usePermissions();
  const canManage        = can("manageMembers");

  const [members, setMembers]     = useState<StaffMember[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState<InviteMemberData>({ email: "", rol_slug: "organizador" });

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
    staff:       "Staff",
    volunteer:   "Voluntario",
  };

  return (
    <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Staff / Coordinadores
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Organizadores y coordinadores que pueden gestionar eventos, tareas y solicitudes.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <Mail className="w-4 h-4" /> Invitar
          </Button>
        )}
      </div>

      {!activeOrgId ? (
        <EmptyState title="Sin organización" description="Selecciona una organización para ver el staff." />
      ) : loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : members.length === 0 ? (
        <EmptyState title="Sin miembros" description="Agrega organizadores o coordinadores para delegar la gestión." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Card key={m.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                       style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    {(m.nombre ?? m.usuario_id)[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{m.nombre ?? "—"}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{m.email ?? m.usuario_id}</p>
                  </div>
                </div>
                <Badge label={ROL_LABEL[m.rol] ?? m.rol} variant={ROL_VARIANT[m.rol] ?? "default"} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Desde {new Date(m.fecha_ingreso).toLocaleDateString("es-ES")}
                </p>
                {canManage && !m.es_propietario && (
                  <button
                    onClick={() => handleRemove(m.usuario_id)}
                    className="text-xs text-red-400 hover:text-red-500 transition-colors"
                  >
                    Remover
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Agregar organizador o coordinador"
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
              placeholder="coordinador@org.com"
              className="w-full h-9 px-3 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Rol</label>
            <select
              value={form.rol_slug ?? "organizador"}
              onChange={(e) => setForm((f) => ({ ...f, rol_slug: e.target.value as "admin" | "coordinador" | "organizador" }))}
              className="w-full h-9 px-3 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="organizador">Organizador</option>
              <option value="coordinador">Coordinador</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Organizadores y coordinadores pueden gestionar eventos, tareas y solicitudes.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
