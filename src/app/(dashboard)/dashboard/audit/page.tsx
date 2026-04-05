"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { auditApi } from "@/features/audit/api/auditApi";
import { TopBar } from "@/shared/ui/Sidebar";
import { ShieldCheck, Search } from "lucide-react";
import { formatDate } from "@/shared/utils/utils";

export default function AuditPage() {
  const { activeOrgId } = useAuthStore();
  const { isSuperAdmin } = usePermissions();
  const [actionFilter, setActionFilter] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", isSuperAdmin ? "global" : activeOrgId, actionFilter],
    queryFn: () =>
      isSuperAdmin
        ? auditApi.listGlobal({ action: actionFilter || undefined })
        : auditApi.list(activeOrgId!, { action: actionFilter || undefined }),
    enabled: isSuperAdmin || !!activeOrgId,
  });

  const outcomeColor: Record<string, string> = {
    success: "#22c55e",
    failure: "#ef4444",
    error:   "#f59e0b",
  };

  return (
    <>
      <TopBar title="Auditoría" />
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold">
              Bitácora de Auditoría{isSuperAdmin ? " (Global)" : ""}
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {isSuperAdmin
                ? "Registro de todas las acciones críticas de la plataforma"
                : "Registro de todas las acciones críticas de tu organización"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {([
              { label: "Todos", value: "" },
              { label: "Asig. roles", value: "rbac.role.assign" },
              { label: "Crear rol", value: "rbac.role.create" },
              { label: "Eventos", value: "event." },
              { label: "Tareas", value: "task." },
              { label: "Usuarios", value: "user." },
            ] as const).map((chip) => {
              const active = actionFilter === chip.value;
              return (
                <button
                  key={chip.value}
                  onClick={() => setActionFilter(chip.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: active ? "var(--accent)" : "var(--bg-subtle)",
                    color: active ? "#fff" : "var(--text-muted)",
                    border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Filtrar por acción..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
        </div>

        {/* Table */}
        {!isSuperAdmin && !activeOrgId ? (
          <div className="text-center py-20">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)" }}>Selecciona una organización para ver su auditoría.</p>
          </div>
        ) : isLoading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando logs...</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)" }}>No hay registros de auditoría.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
                  {(isSuperAdmin
                    ? ["Fecha", "Actor", "Acción", "Entidad", "Org", "Resultado"]
                    : ["Fecha", "Actor", "Acción", "Entidad", "Resultado"]
                  ).map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:opacity-90" style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{formatDate(log.created_at)}</td>
                    <td className="px-5 py-3 text-xs font-mono">{log.actor_user_id?.slice(0, 8) ?? "—"}…</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 rounded-md text-xs font-mono" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{log.entity_type}</td>
                    {isSuperAdmin && (
                      <td className="px-5 py-3 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        {log.organizacion_id?.slice(0, 8) ?? "—"}…
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <span
                        className="text-xs font-medium"
                        style={{ color: outcomeColor[log.outcome as keyof typeof outcomeColor] ?? "var(--text-muted)" }}
                        data-outcome={log.outcome}
                      >
                        {log.outcome}
                      </span>
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
