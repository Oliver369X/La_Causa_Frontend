"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, type Organization } from "@/features/organizations/api/organizationsApi";
import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import { useAuthStore } from "@/shared/store/authStore";
import { TopBar } from "@/shared/ui/Sidebar";
import Link from "next/link";
import { Building2, ExternalLink, UserPlus, X, CheckCircle, Trophy, LogOut } from "lucide-react";

interface Solicitud {
  id: string;
  organizacion_id: string;
  estado: string;
}

export default function ExplorarOrganizacionesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [modalOrg, setModalOrg] = useState<Organization | null>(null);
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["orgs-publicas"],
    queryFn: () => organizationsApi.listPublic(),
  });

  const { data: misSolicitudes = [] } = useQuery({
    queryKey: ["mis-solicitudes"],
    queryFn: async () => {
      const { data } = await apiClient.get<Solicitud[]>(EP.SOLICITUDES_MIS);
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: misOrgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => organizationsApi.list(),
    enabled: !!user?.id,
  });

  const unirseMutation = useMutation({
    mutationFn: (orgId: string) =>
      organizationsApi.solicitarUnirse(orgId, aceptoTerminos, mensaje.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mis-solicitudes"] });
      qc.invalidateQueries({ queryKey: ["orgs"] });
      setModalOrg(null);
      setAceptoTerminos(false);
      setMensaje("");
    },
  });

  const dejarOrgMutation = useMutation({
    mutationFn: (orgId: string) => organizationsApi.leaveOrganization(orgId, user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      qc.invalidateQueries({ queryKey: ["orgs-publicas"] });
    },
  });

  const yaEsMiembro = (orgId: string) =>
    misOrgs.some((o) => o.id === orgId);

  const tieneSolicitud = (orgId: string) =>
    misSolicitudes.some(
      (s) => s.organizacion_id === orgId && (s.estado === "pendiente" || s.estado === "aprobada")
    );

  const puedeUnirse = (org: Organization) =>
    !yaEsMiembro(org.id) && !tieneSolicitud(org.id);

  return (
    <>
      <TopBar title="Explorar organizaciones" />
      <div className="flex-1 p-5 md:p-8">
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Explora organizaciones de voluntariado y solicita unirte. Deberás aceptar sus términos y políticas.
        </p>

        {isLoading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando...</p>
        ) : orgs.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)" }}>No hay organizaciones disponibles aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {orgs.map((org) => (
              <div
                key={org.id}
                className="p-5 rounded-2xl flex flex-col"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start gap-3 mb-3">
                  {org.logo_url ? (
                    <img src={org.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
                      <Building2 className="w-6 h-6" style={{ color: "var(--accent)" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{org.nombre}</h3>
                    {org.sector && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{org.sector}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs mb-4 line-clamp-3" style={{ color: "var(--text-muted)" }}>
                  {org.descripcion || org.normas?.perfil_publico?.mision || "Sin descripción."}
                </p>
                <div className="flex gap-2 mt-auto">
                  {org.slug && (
                    <a
                      href={`/org/${org.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                    >
                      <ExternalLink className="w-3 h-3" /> Ver perfil
                    </a>
                  )}
                  {org.sitio_web && (
                    <a
                      href={org.sitio_web}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                    >
                      <ExternalLink className="w-3 h-3" /> Web
                    </a>
                  )}
                  {puedeUnirse(org) ? (
                    <button
                      onClick={() => setModalOrg(org)}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      <UserPlus className="w-3 h-3" /> Unirme
                    </button>
                  ) : tieneSolicitud(org.id) ? (
                    <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-subtle)" }}>
                      Solicitud enviada
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/organizaciones/${org.id}`}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "rgba(34,197,94,.15)", color: "#16a34a" }}
                      >
                        <Trophy className="w-3 h-3" /> Ver ranking
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("¿Dejar esta organización?")) dejarOrgMutation.mutate(org.id);
                        }}
                        disabled={dejarOrgMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "rgba(239,68,68,.15)", color: "#dc2626" }}
                      >
                        <LogOut className="w-3 h-3" /> Dejar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal términos y unirse */}
      {modalOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Unirme a {modalOrg.nombre}</h3>
              <button onClick={() => setModalOrg(null)} className="p-2 rounded-lg hover:bg-black/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Debes aceptar los términos y políticas de la organización antes de solicitar unirte.
            </p>

            <div
              className="mb-4 p-4 rounded-xl text-sm max-h-48 overflow-y-auto"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              {modalOrg.normas?.terminos_servicio ? (
                <div className="whitespace-pre-wrap">{modalOrg.normas.terminos_servicio}</div>
              ) : (
                <p style={{ color: "var(--text-muted)" }}>La organización no ha definido términos aún.</p>
              )}
              {modalOrg.normas?.politicas?.length ? (
                <ul className="mt-3 list-disc list-inside space-y-1">
                  {modalOrg.normas.politicas.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aceptoTerminos}
                onChange={(e) => setAceptoTerminos(e.target.checked)}
              />
              <span className="text-sm">Acepto los términos y políticas de {modalOrg.nombre}</span>
            </label>

            <div className="mb-4">
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Mensaje (opcional)</label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={2}
                placeholder="¿Por qué te gustaría unirte?"
                className="w-full px-4 py-2 rounded-xl text-sm outline-none resize-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => unirseMutation.mutate(modalOrg.id)}
                disabled={!aceptoTerminos || unirseMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {unirseMutation.isPending ? "Enviando..." : "Enviar solicitud"}
              </button>
              <button
                onClick={() => setModalOrg(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                Cancelar
              </button>
            </div>

            {unirseMutation.isError && (
              <p className="mt-3 text-sm text-red-500">
                {(unirseMutation.error as Error)?.message || "Error al enviar la solicitud."}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
