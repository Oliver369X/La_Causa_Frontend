"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { auditApi } from "@/features/audit/api/auditApi";
import { TopBar } from "@/shared/ui/Sidebar";
import { History, Shield } from "lucide-react";
import { formatDate } from "@/shared/utils/utils";
import Link from "next/link";

export default function RoleHistoryPage() {
  const { activeOrgId } = useAuthStore();
  const { can } = usePermissions();
  const canView = can("viewAudit");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-role-history", activeOrgId],
    queryFn: () => auditApi.listRoleHistory(activeOrgId!),
    enabled: !!activeOrgId && canView,
  });

  return (
    <>
      <TopBar title="Historial de roles" />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <History className="w-6 h-6" style={{ color: "var(--accent)" }} />
            Asignación y creación de roles
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Registro de <code className="text-xs px-1 rounded" style={{ background: "var(--bg-subtle)" }}>rbac.role.assign</code>{" "}
            y <code className="text-xs px-1 rounded" style={{ background: "var(--bg-subtle)" }}>rbac.role.create</code> en la
            organización activa.
          </p>
          <p className="text-xs mt-2">
            <Link href="/dashboard/audit" className="underline font-medium" style={{ color: "var(--accent)" }}>
              Ver auditoría completa
            </Link>
          </p>
        </div>

        {!activeOrgId ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Seleccioná una organización en la barra lateral.</p>
        ) : !canView ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)" }}>No tenés permiso para ver el historial de roles.</p>
          </div>
        ) : isLoading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando…</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p style={{ color: "var(--text-muted)" }}>Aún no hay eventos de roles registrados.</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg-subtle)" }}>
                  <th className="text-left p-3 font-semibold">Fecha</th>
                  <th className="text-left p-3 font-semibold">Acción</th>
                  <th className="text-left p-3 font-semibold">Resultado</th>
                  <th className="text-left p-3 font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="p-3 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      {formatDate(row.created_at)}
                    </td>
                    <td className="p-3 font-mono text-xs break-all">{row.action}</td>
                    <td className="p-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: row.outcome === "success" ? "rgba(34,197,94,.15)" : "rgba(248,113,113,.12)",
                          color: row.outcome === "success" ? "#22c55e" : "#f87171",
                        }}
                      >
                        {row.outcome}
                      </span>
                    </td>
                    <td className="p-3 max-w-md break-words" style={{ color: "var(--text-muted)" }}>
                      {row.detail ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
