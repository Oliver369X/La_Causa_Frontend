"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  adminApi,
  type AdminOrganization,
  type AdminUser,
  type AdminDashboard,
  type PlanResponse,
} from "@/features/admin/api/adminApi";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Spinner } from "@/shared/ui/Spinner";
import { Modal } from "@/shared/ui/Modal";
import { TopBar } from "@/shared/ui/Sidebar";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  Plus,
  Search,
} from "lucide-react";
import { formatDate } from "@/shared/utils/utils";

type TabId = "dashboard" | "orgs" | "users" | "audit" | "plans";

type Tab = { id: TabId; label: string; icon: React.ElementType };

const TABS: Tab[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orgs", label: "Organizaciones", icon: Building2 },
  { id: "users", label: "Usuarios", icon: Users },
  { id: "audit", label: "Auditoría", icon: ShieldCheck },
  { id: "plans", label: "Planes", icon: CreditCard },
];

export default function AdminSaaSPage() {
  const { isSuperAdmin } = usePermissions();
  const [tab, setTab] = useState<TabId>("dashboard");

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <Card className="p-6">
          <p className="text-sm">Esta sección requiere rol super-admin.</p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <TopBar title="Administración SaaS" />
      <div className="flex-1 p-5 md:p-8">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
          {TABS.map((t) => (
            <motion.button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0"
              style={{
                background: tab === t.id ? "var(--bg-card)" : "transparent",
                color: tab === t.id ? "var(--text)" : "var(--text-muted)",
                border: tab === t.id ? "1px solid var(--border)" : "1px solid transparent",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <AdminDashboardTab />
            </motion.div>
          )}
          {tab === "orgs" && (
            <motion.div key="orgs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <AdminOrgsTab />
            </motion.div>
          )}
          {tab === "users" && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <AdminUsersTab />
            </motion.div>
          )}
          {tab === "audit" && (
            <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <AdminAuditTab />
            </motion.div>
          )}
          {tab === "plans" && (
            <motion.div key="plans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <AdminPlansTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function AdminDashboardTab() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = [
    { label: "Organizaciones", value: data.total_organizaciones, sub: `${data.organizaciones_activas} activas` },
    { label: "Usuarios", value: data.total_usuarios, sub: `${data.usuarios_voluntarios} vol. / ${data.usuarios_organizadores} org.` },
    { label: "MRR", value: `Bs ${data.mrr.toFixed(2)}`, sub: "Ingresos recurrentes" },
    { label: "Orgs este mes", value: data.organizaciones_este_mes, sub: "" },
    { label: "Usuarios este mes", value: data.usuarios_este_mes, sub: "" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.25 }}
          >
            <Card className="p-4 g-progress-card">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              <p className="text-xl font-bold mt-1">{s.value}</p>
              {s.sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.sub}</p>}
            </Card>
          </motion.div>
        ))}
      </div>
      {Object.keys(data.suscripciones_por_plan).length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Suscripciones por plan</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.suscripciones_por_plan).map(([slug, count]) => (
              <Badge key={slug} label={`${slug}: ${count}`} variant="default" />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function AdminOrgsTab() {
  const [loading, setLoading] = useState(true);
  const [savingOrgId, setSavingOrgId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [onlyActive, setOnlyActive] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState<AdminOrganization | null>(null);
  const [createForm, setCreateForm] = useState({ nombre: "", slug: "", owner_email: "" });
  const [createSaving, setCreateSaving] = useState(false);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [planSaving, setPlanSaving] = useState<string | null>(null);

  const load = () => {
    adminApi
      .listOrganizations({ only_active: onlyActive || undefined })
      .then(setOrgs)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    setLoading(true);
  }, [onlyActive]);

  useEffect(() => {
    if (showPlanModal) {
      adminApi.listPlans().then(setPlans);
    }
  }, [showPlanModal]);

  const toggleOrg = async (org: AdminOrganization) => {
    setSavingOrgId(org.id);
    try {
      await adminApi.setOrganizationStatus(org.id, !org.activo);
      setOrgs((prev) => prev.map((item) => (item.id === org.id ? { ...item, activo: !item.activo } : item)));
    } finally {
      setSavingOrgId(null);
    }
  };

  const handleCreate = async () => {
    if (!createForm.nombre.trim() || !createForm.slug.trim()) return;
    setCreateSaving(true);
    try {
      await adminApi.createOrg({
        nombre: createForm.nombre.trim(),
        slug: createForm.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        owner_email: createForm.owner_email.trim() || undefined,
      });
      setShowCreate(false);
      setCreateForm({ nombre: "", slug: "", owner_email: "" });
      load();
    } finally {
      setCreateSaving(false);
    }
  };

  const handleSetPlan = async (orgId: string, planId: string) => {
    setPlanSaving(orgId);
    try {
      await adminApi.setOrgSubscription(orgId, planId);
      setShowPlanModal(null);
      load();
    } finally {
      setPlanSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm">Mostrar solo activas</span>
        </label>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Crear organización
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4">
          {orgs.map((org) => (
            <Card key={org.id} className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold">{org.nombre}</p>
                  <p className="text-xs opacity-70">{org.slug}</p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Badge label={org.activo ? "Activo" : "Inactivo"} variant={org.activo ? "success" : "warning"} />
                    {org.suscripcion?.plan_nombre ? (
                      <Badge label={`Plan: ${org.suscripcion.plan_nombre}`} variant="default" />
                    ) : (
                      <Badge label="Sin suscripción" variant="default" />
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPlanModal(org)}
                    disabled={planSaving !== null}
                  >
                    Cambiar plan
                  </Button>
                  <Button
                    size="sm"
                    variant={org.activo ? "outline" : "primary"}
                    loading={savingOrgId === org.id}
                    onClick={() => toggleOrg(org)}
                  >
                    {org.activo ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Crear organización"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createSaving} disabled={!createForm.nombre.trim() || !createForm.slug.trim()}>
              Crear
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              value={createForm.nombre}
              onChange={(e) => setCreateForm((f) => ({ ...f, nombre: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              placeholder="Mi Organización"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug (URL)</label>
            <input
              type="text"
              value={createForm.slug}
              onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              placeholder="mi-organizacion"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email del owner (opcional)</label>
            <input
              type="email"
              value={createForm.owner_email}
              onChange={(e) => setCreateForm((f) => ({ ...f, owner_email: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              placeholder="owner@ejemplo.com"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!showPlanModal}
        onClose={() => setShowPlanModal(null)}
        title={showPlanModal ? `Cambiar plan: ${showPlanModal.nombre}` : ""}
        size="md"
      >
        {showPlanModal && (
          <div className="space-y-2">
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSetPlan(showPlanModal.id, p.id)}
                disabled={planSaving !== null}
                className="w-full flex items-center justify-between p-3 rounded-xl border text-left hover:opacity-80 transition-opacity"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                <span>{p.nombre}</span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>Bs {Number(p.precio_mensual)}/mes</span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<string>("");
  const [estado, setEstado] = useState<boolean | "">("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi
      .listUsers({
        search: search || undefined,
        tipo: tipo || undefined,
        estado: estado === "" ? undefined : estado,
      })
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, tipo, estado]);

  const toggleUser = async (u: AdminUser) => {
    setSavingId(u.id);
    try {
      await adminApi.setUserStatus(u.id, !u.estado);
      setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, estado: !item.estado } : item)));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <option value="">Todos los tipos</option>
          <option value="voluntario">Voluntario</option>
          <option value="organizador">Organizador</option>
        </select>
        <select
          value={estado === "" ? "" : estado ? "activo" : "bloqueado"}
          onChange={(e) => setEstado(e.target.value === "" ? "" : e.target.value === "activo")}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
                {["Nombre", "Email", "Tipo", "Estado", "Registro", "Acciones"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-5 py-3">{u.nombre} {u.apellido || ""}</td>
                  <td className="px-5 py-3">{u.email}</td>
                  <td className="px-5 py-3">
                    <Badge label={u.tipo} variant="default" />
                  </td>
                  <td className="px-5 py-3">
                    <Badge label={u.estado ? "Activo" : "Bloqueado"} variant={u.estado ? "success" : "warning"} />
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(u.fecha_registro)}</td>
                  <td className="px-5 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={savingId === u.id}
                      onClick={() => toggleUser(u)}
                      disabled={savingId !== null}
                    >
                      {u.estado ? "Bloquear" : "Desbloquear"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="py-12 text-center" style={{ color: "var(--text-muted)" }}>No hay usuarios</div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminAuditTab() {
  return (
    <div className="py-8">
      <p className="mb-4" style={{ color: "var(--text-muted)" }}>
        Ver los logs de auditoría globales de toda la plataforma.
      </p>
      <Link href="/dashboard/audit">
        <Button variant="primary">
          <ShieldCheck className="w-4 h-4 mr-2" />
          Ir a Auditoría Global
        </Button>
      </Link>
    </div>
  );
}

function AdminPlansTab() {
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listPlans().then(setPlans).finally(() => setLoading(false));
  }, []);

  const togglePlan = async (planId: string, currentActivo: boolean) => {
    setSavingId(planId);
    try {
      await adminApi.setPlanStatus(planId, !currentActivo);
      setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, activo: !currentActivo } : p)));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Activa o desactiva planes. Crear nuevos planes requiere el endpoint POST /admin/planes.
      </p>
      <div className="grid gap-4">
        {plans.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{p.nombre}</p>
                <p className="text-xs opacity-70">Bs {Number(p.precio_mensual)}/mes · {p.max_voluntarios} vol. · {p.max_eventos_mes} eventos</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                loading={savingId === p.id}
                onClick={() => togglePlan(p.id, p.activo)}
              >
                {p.activo ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
