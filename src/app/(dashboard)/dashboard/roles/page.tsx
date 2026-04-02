"use client";
import { useState, useEffect } from "react";
import { Shield, Plus, Trash2 } from "lucide-react";
import { rolesApi, type Role, type CreateRoleData } from "@/features/roles/api/rolesApi";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";

const DEFAULT_PERMISOS = [
  "view_events", "create_events", "edit_events", "delete_events",
  "view_tasks", "assign_tasks",
  "view_members", "manage_members",
  "view_audit", "view_analytics",
];

export default function RolesPage() {
  const { isSuperAdmin } = usePermissions();
  const canManage = isSuperAdmin;

  const [roles, setRoles]     = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState<CreateRoleData>({ nombre: "", descripcion: "", permisos: [] });

  const loadRoles = () => {
    setLoading(true);
    rolesApi.list()
      .then(setRoles)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isSuperAdmin) loadRoles();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="p-5 md:p-8">
        <Card className="p-6">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            La definición de roles (crear, editar catálogo) es solo para administradores de la plataforma.
            En cada organización los roles disponibles son los del sistema (organizador, coordinador, voluntario, etc.).
          </p>
        </Card>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      await rolesApi.create(form);
      setShowModal(false);
      setForm({ nombre: "", descripcion: "", permisos: [] });
      loadRoles();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este rol?")) return;
    await rolesApi.delete(id).catch(() => {});
    loadRoles();
  };

  const togglePerm = (perm: string) => {
    setForm((f) => ({
      ...f,
      permisos: f.permisos?.includes(perm)
        ? f.permisos.filter((p) => p !== perm)
        : [...(f.permisos ?? []), perm],
    }));
  };

  return (
    <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Roles y Permisos
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Catálogo global de roles (super-admin). Las organizaciones asignan roles fijos del sistema a sus miembros.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nuevo rol
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : roles.length === 0 ? (
        <EmptyState
          title="Sin roles personalizados"
          description="Crea roles para delimitar permisos dentro de tu equipo."
          action={canManage ? (
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> Crear primer rol
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id}>
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-sm">{role.nombre}</p>
                {canManage && !role.es_sistema && (
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    title="Eliminar rol"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </div>
              {role.descripcion && (
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{role.descripcion}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {(role.permisos ?? []).map((p) => (
                  <Badge key={p} label={p} variant="default" />
                ))}
                {(!role.permisos || role.permisos.length === 0) && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Sin permisos</span>
                )}
                {role.es_sistema && (
                  <Badge label="Sistema" variant="default" />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Crear nuevo rol"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} loading={saving}>Crear rol</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Nombre del rol *</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Coordinador de campo"
              className="w-full h-9 px-3 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Descripción</label>
            <input
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Opcional"
              className="w-full h-9 px-3 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Permisos</label>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
              {DEFAULT_PERMISOS.map((p) => (
                <label key={p} className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={form.permisos?.includes(p) ?? false}
                    onChange={() => togglePerm(p)}
                    className="rounded accent-[var(--accent)]"
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
