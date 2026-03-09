"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, LogOut, Trophy, UserPlus, X } from "lucide-react";
import type { MembershipRequest, Organization } from "@/features/organizations/api/organizationsApi";

interface OrganizationDiscoveryPanelProps {
  orgs: Organization[];
  isLoading?: boolean;
  misSolicitudes: MembershipRequest[];
  misOrgs: Organization[];
  onJoin: (orgId: string, acceptedTerms: boolean, message?: string) => void;
  onLeave?: (orgId: string) => void;
  joinPending?: boolean;
  leavingPending?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
  limit?: number;
  onExplore?: () => void;
}

export function OrganizationDiscoveryPanel({
  orgs,
  isLoading = false,
  misSolicitudes,
  misOrgs,
  onJoin,
  onLeave,
  joinPending = false,
  leavingPending = false,
  title = "Explorar organizaciones",
  description = "Explora organizaciones de voluntariado y solicita unirte.",
  emptyMessage = "No hay organizaciones disponibles aún.",
  limit,
  onExplore,
}: OrganizationDiscoveryPanelProps) {
  const [modalOrg, setModalOrg] = useState<Organization | null>(null);
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const visibleOrgs = useMemo(() => (limit ? orgs.slice(0, limit) : orgs), [limit, orgs]);

  const yaEsMiembro = (orgId: string) => misOrgs.some((org) => org.id === orgId);
  const tieneSolicitud = (orgId: string) =>
    misSolicitudes.some((solicitud) => solicitud.organizacion_id === orgId && ["pendiente", "aprobada"].includes(solicitud.estado));

  const puedeUnirse = (org: Organization) => !yaEsMiembro(org.id) && !tieneSolicitud(org.id);

  return (
    <>
      <div className="p-6 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>

        {isLoading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando...</p>
        ) : visibleOrgs.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
            <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)" }}>{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleOrgs.map((org) => (
              <div
                key={org.id}
                className="p-5 rounded-2xl flex flex-col"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
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
                    <h4 className="font-semibold text-sm">{org.nombre}</h4>
                    {org.sector ? (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{org.sector}</p>
                    ) : null}
                  </div>
                </div>

                <p className="text-xs mb-4 line-clamp-3" style={{ color: "var(--text-muted)" }}>
                  {org.descripcion || org.normas?.perfil_publico?.mision || "Sin descripción."}
                </p>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {org.slug ? (
                    <a
                      href={`/org/${org.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                      <ExternalLink className="w-3 h-3" /> Ver perfil
                    </a>
                  ) : null}

                  {org.sitio_web ? (
                    <a
                      href={org.sitio_web}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                      <ExternalLink className="w-3 h-3" /> Web
                    </a>
                  ) : null}

                  {puedeUnirse(org) ? (
                    <button
                      onClick={() => {
                        onExplore?.();
                        setModalOrg(org);
                      }}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      <UserPlus className="w-3 h-3" /> Unirme
                    </button>
                  ) : tieneSolicitud(org.id) ? (
                    <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-card)" }}>
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
                      {onLeave ? (
                        <button
                          onClick={() => {
                            if (confirm("¿Dejar esta organización?")) onLeave(org.id);
                          }}
                          disabled={leavingPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: "rgba(239,68,68,.15)", color: "#dc2626" }}
                        >
                          <LogOut className="w-3 h-3" /> Dejar
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOrg ? (
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
                  {modalOrg.normas.politicas.map((politica, index) => (
                    <li key={index}>{politica}</li>
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
                onClick={() => {
                  onJoin(modalOrg.id, aceptoTerminos, mensaje.trim() || undefined);
                  setModalOrg(null);
                  setAceptoTerminos(false);
                  setMensaje("");
                }}
                disabled={!aceptoTerminos || joinPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {joinPending ? "Enviando..." : "Enviar solicitud"}
              </button>
              <button
                onClick={() => setModalOrg(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
