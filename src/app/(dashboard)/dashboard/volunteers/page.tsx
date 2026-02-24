"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { volunteersApi, type Member } from "@/features/volunteers/api/volunteersApi";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { TopBar } from "@/shared/ui/Sidebar";
import { Users, Crown, User2, Calendar, UserPlus, Check, X, Eye } from "lucide-react";
import Link from "next/link";

function MemberCard({ member, orgId }: { member: Member; orgId: string }) {
  const displayName = member.usuario_nombre || member.usuario_email || member.usuario_id;
  const initials = member.usuario_nombre
    ? member.usuario_nombre.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : (member.usuario_email || member.usuario_id).slice(0, 2).toUpperCase();
  const joined = new Date(member.fecha_ingreso).toLocaleDateString("es-BO", {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-2xl transition-colors hover:opacity-90"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Calendar className="w-3 h-3 shrink-0" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Ingresó {joined}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/perfil/${member.usuario_id}?org=${orgId}`}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--border)", color: "var(--accent)" }}
        >
          <Eye className="w-3 h-3" /> Ver perfil
        </Link>
        {member.es_propietario
          ? <Crown className="w-4 h-4 text-yellow-500" />
          : <User2 className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: member.estado_membresia === "activo" ? "var(--accent-soft)" : "var(--bg-subtle)",
            color: member.estado_membresia === "activo" ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          {member.estado_membresia}
        </span>
      </div>
    </div>
  );
}

interface Solicitud {
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

  const { data: solicitudes = [], isLoading: loadingSolicitudes } = useQuery({
    queryKey: ["solicitudes", activeOrgId],
    queryFn: () => organizationsApi.listSolicitudes(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: "aprobada" | "rechazada" }) =>
      organizationsApi.reviewSolicitud(id, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitudes", activeOrgId] });
      qc.invalidateQueries({ queryKey: ["members", activeOrgId] });
    },
  });

  const pendientes = (solicitudes as Solicitud[]).filter((s) => s.estado === "pendiente");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", activeOrgId],
    queryFn: () => volunteersApi.listMembers(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.usuario_nombre || "").toLowerCase().includes(q) ||
      (m.usuario_email || "").toLowerCase().includes(q) ||
      (m.usuario_id || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <TopBar title="Voluntarios" />
      <div className="flex-1 p-5 sm:p-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold">Miembros de la organización</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {members.length} voluntario{members.length !== 1 ? "s" : ""} registrados
            </p>
          </div>
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

        {/* Solicitudes pendientes */}
        {activeOrgId && pendientes.length > 0 && (
          <div className="mb-8 p-5 rounded-2xl" style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Solicitudes pendientes ({pendientes.length})
            </h3>
            <div className="space-y-3">
              {pendientes.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div>
                    <p className="text-sm font-medium">{s.usuario_nombre || s.usuario_email || s.usuario_id}</p>
                    {s.usuario_email && s.usuario_nombre && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.usuario_email}</p>
                    )}
                    {s.mensaje && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.mensaje}</p>}
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(s.fecha_solicitud).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => reviewMutation.mutate({ id: s.id, estado: "aprobada" })}
                      disabled={reviewMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      <Check className="w-3 h-3" /> Aprobar
                    </button>
                    <button
                      onClick={() => reviewMutation.mutate({ id: s.id, estado: "rechazada" })}
                      disabled={reviewMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                    >
                      <X className="w-3 h-3" /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
          {filtered.map((m) => <MemberCard key={m.id} member={m} orgId={activeOrgId!} />)}
        </div>
      </div>
    </>
  );
}
