"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ExternalLink,
  LogOut,
  Trophy,
  UserPlus,
  X,
  Search,
  ShieldCheck,
  Check,
  Clock,
  Globe,
  Sparkles,
  Users,
} from "lucide-react";
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
  isVolunteer?: boolean;
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
  description = "Explora organizaciones de voluntariado y solicita unirte. Deberás aceptar sus términos y políticas.",
  emptyMessage = "No hay organizaciones disponibles aún.",
  limit,
  onExplore,
  isVolunteer = true,
}: OrganizationDiscoveryPanelProps) {
  const [modalOrg, setModalOrg] = useState<Organization | null>(null);
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "disponibles" | "miembros" | "pendientes">("todos");
  const [selectedSector, setSelectedSector] = useState<string>("todos");

  /** Cierre con Escape y bloqueo de scroll del fondo cuando el modal está abierto. */
  useEffect(() => {
    if (!modalOrg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOrg(null);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modalOrg]);

  const yaEsMiembro = (orgId: string) =>
    misOrgs.some((org) => org.id === orgId) ||
    misSolicitudes.some((solicitud) => solicitud.organizacion_id === orgId && solicitud.estado === "aprobada");

  const tieneSolicitud = (orgId: string) =>
    misSolicitudes.some((solicitud) => solicitud.organizacion_id === orgId && ["pendiente", "aprobada"].includes(solicitud.estado));

  const puedeUnirse = (org: Organization) => !yaEsMiembro(org.id) && !tieneSolicitud(org.id);

  const esDuenio = (orgId: string) => {
    const org = misOrgs.find((o) => o.id === orgId);
    return org ? Boolean(org.soy_propietario) : false;
  };

  // Sectores disponibles
  const sectors = useMemo(() => {
    const set = new Set<string>();
    orgs.forEach((o) => {
      if (o.sector?.trim()) set.add(o.sector.trim());
    });
    return Array.from(set);
  }, [orgs]);

  // Filtrado reactivo
  const filteredOrgs = useMemo(() => {
    let result = orgs;

    // Filtro por estado
    if (statusFilter === "disponibles") {
      result = result.filter(puedeUnirse);
    } else if (statusFilter === "miembros") {
      result = result.filter((o) => yaEsMiembro(o.id));
    } else if (statusFilter === "pendientes") {
      result = result.filter((o) => tieneSolicitud(o.id) && !yaEsMiembro(o.id));
    }

    // Filtro por sector
    if (selectedSector !== "todos") {
      result = result.filter((o) => o.sector?.trim().toLowerCase() === selectedSector.toLowerCase());
    }

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.nombre.toLowerCase().includes(q) ||
          (o.sector && o.sector.toLowerCase().includes(q)) ||
          (o.descripcion && o.descripcion.toLowerCase().includes(q))
      );
    }

    return limit ? result.slice(0, limit) : result;
  }, [orgs, statusFilter, selectedSector, searchQuery, limit, misOrgs, misSolicitudes]);

  const countDisponibles = useMemo(() => orgs.filter(puedeUnirse).length, [orgs, misOrgs, misSolicitudes]);
  const countMiembros = useMemo(() => orgs.filter((o) => yaEsMiembro(o.id)).length, [orgs, misOrgs, misSolicitudes]);
  const countPendientes = useMemo(() => orgs.filter((o) => tieneSolicitud(o.id) && !yaEsMiembro(o.id)).length, [orgs, misOrgs, misSolicitudes]);

  return (
    <>
      <div className="space-y-6">
        {/* Header & Search Bar Container */}
        <div
          className="p-6 sm:p-8 rounded-3xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="p-2 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  <Building2 className="w-5 h-5" />
                </span>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                  {title}
                </h2>
              </div>
              <p className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
                {description}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold self-start md:self-auto">
              <span
                className="px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--g-energia)" }} />
                <span>{orgs.length} organizaciones activas</span>
              </span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="space-y-4">
            {/* Input Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, sector o palabras clave..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:opacity-75"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter("todos")}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: statusFilter === "todos" ? "var(--accent)" : "var(--bg-subtle)",
                    color: statusFilter === "todos" ? "#ffffff" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Todas ({orgs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("disponibles")}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: statusFilter === "disponibles" ? "var(--accent)" : "var(--bg-subtle)",
                    color: statusFilter === "disponibles" ? "#ffffff" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Disponibles ({countDisponibles})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("miembros")}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: statusFilter === "miembros" ? "var(--accent)" : "var(--bg-subtle)",
                    color: statusFilter === "miembros" ? "#ffffff" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Mis organizaciones ({countMiembros})
                </button>
                {countPendientes > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("pendientes")}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: statusFilter === "pendientes" ? "var(--accent)" : "var(--bg-subtle)",
                      color: statusFilter === "pendientes" ? "#ffffff" : "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    Solicitudes pendientes ({countPendientes})
                  </button>
                )}
              </div>

              {/* Sector selector */}
              {sectors.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Sector:</span>
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium outline-none cursor-pointer"
                    style={{
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="todos">Todos los sectores</option>
                    {sectors.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Organizations Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div
                key={k}
                className="h-56 rounded-2xl animate-pulse"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              />
            ))}
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div
            className="text-center py-16 px-4 rounded-3xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" style={{ color: "var(--text-muted)" }} />
            <h4 className="font-bold text-base mb-1" style={{ color: "var(--text)" }}>
              No se encontraron organizaciones
            </h4>
            <p className="text-xs max-w-sm mx-auto" style={{ color: "var(--text-muted)" }}>
              {searchQuery || statusFilter !== "todos" || selectedSector !== "todos"
                ? "Prueba ajustando los términos de búsqueda o los filtros seleccionados."
                : emptyMessage}
            </p>
            {(searchQuery || statusFilter !== "todos" || selectedSector !== "todos") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("todos");
                  setSelectedSector("todos");
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOrgs.map((org) => {
              const miembro = yaEsMiembro(org.id);
              const pendiente = tieneSolicitud(org.id) && !miembro;
              const unible = puedeUnirse(org);

              return (
                <motion.div
                  key={org.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Top row: Logo + Status Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt=""
                          className="w-13 h-13 rounded-2xl object-cover shrink-0 shadow-sm"
                          style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)" }}
                        />
                      ) : (
                        <div
                          className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                          style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
                        >
                          <Building2 className="w-6 h-6" style={{ color: "var(--accent)" }} />
                        </div>
                      )}

                      {miembro ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold"
                          style={{
                            background: "rgba(34,197,94,.12)",
                            color: "#16a34a",
                            border: "1px solid rgba(34,197,94,.25)",
                          }}
                        >
                          <Check className="w-3 h-3" /> Miembro activo
                        </span>
                      ) : pendiente ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold"
                          style={{
                            background: "rgba(245,158,11,.15)",
                            color: "#d97706",
                            border: "1px solid rgba(245,158,11,.3)",
                          }}
                        >
                          <Clock className="w-3 h-3" /> Solicitud enviada
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold"
                          style={{
                            background: "var(--bg-subtle)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          Abierta
                        </span>
                      )}
                    </div>

                    {/* Org Name & Sector */}
                    <div className="mb-2.5">
                      <h4 className="font-bold text-base truncate mb-1" style={{ color: "var(--text)" }} title={org.nombre}>
                        {org.nombre}
                      </h4>
                      {org.sector && (
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-md font-medium inline-block"
                          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                        >
                          {org.sector}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs line-clamp-3 leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
                      {org.descripcion || org.normas?.perfil_publico?.mision || "Organización de voluntariado activa en la comunidad."}
                    </p>
                  </div>

                  {/* Meta info & Action Footer */}
                  <div className="pt-3 mt-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between gap-2 mb-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {org.pais ? (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {org.pais}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> Comunidad activa
                        </span>
                      )}

                      {org.sitio_web && (
                        <a
                          href={org.sitio_web}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1"
                          style={{ color: "var(--accent)" }}
                        >
                          <ExternalLink className="w-3 h-3" /> Web oficial
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {unible ? (
                        isVolunteer ? (
                          <button
                            onClick={() => {
                              onExplore?.();
                              setModalOrg(org);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98"
                            style={{ background: "var(--accent)", color: "#ffffff" }}
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Solicitar unirme
                          </button>
                        ) : null
                      ) : pendiente ? (
                        <div
                          className="flex-1 py-2 text-center text-xs font-semibold rounded-xl"
                          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                        >
                          Solicitud en revisión
                        </div>
                      ) : (
                        <div className="flex-1 flex gap-2">
                          <Link
                            href={`/dashboard/organizaciones/${org.id}`}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{ background: "rgba(34,197,94,.12)", color: "#16a34a", border: "1px solid rgba(34,197,94,.25)" }}
                          >
                            <Trophy className="w-3.5 h-3.5" /> Panel miembro
                          </Link>
                          {onLeave && !esDuenio(org.id) ? (
                            <button
                              onClick={() => {
                                if (confirm(`¿Estás seguro de dejar ${org.nombre}?`)) onLeave(org.id);
                              }}
                              disabled={leavingPending}
                              className="p-2 rounded-xl text-xs font-medium hover:bg-red-500/10 transition-colors"
                              style={{ color: "#dc2626", border: "1px solid var(--border)" }}
                              title="Dejar organización"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      )}

                      {org.slug && (
                        <a
                          href={`/org/${org.slug}?returnTo=${encodeURIComponent(
                            typeof window !== "undefined" ? window.location.pathname + window.location.search : "/dashboard/organizaciones"
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                          title="Ver perfil público"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Perfil
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhanced Terms & Policies Acceptance Modal */}
      {modalOrg ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setModalOrg(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-org-title"
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                {modalOrg.logo_url ? (
                  <img src={modalOrg.logo_url} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
                    <Building2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
                  </div>
                )}
                <div>
                  <h3 id="join-org-title" className="font-bold text-base" style={{ color: "var(--text)" }}>
                    Unirme a {modalOrg.nombre}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Solicitud oficial de membresía como voluntario
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOrg(null)}
                className="p-1.5 rounded-lg hover:opacity-75 transition-opacity"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Compliance Banner */}
            <div
              className="p-3.5 rounded-2xl flex items-start gap-2.5 text-xs"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
              <span style={{ color: "var(--text)" }}>
                Debes leer y aceptar los términos de voluntariado y políticas de convivencia de esta organización antes de solicitar el ingreso.
              </span>
            </div>

            {/* Document Viewer Box */}
            <div
              className="p-4 rounded-2xl text-xs max-h-52 overflow-y-auto space-y-3 leading-relaxed"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <h5 className="font-bold text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Términos y Normas de Convivencia
              </h5>
              {modalOrg.normas?.terminos_servicio ? (
                <div className="whitespace-pre-wrap">{modalOrg.normas.terminos_servicio}</div>
              ) : (
                <p style={{ color: "var(--text-muted)" }}>
                  La organización solicita compromiso, respeto y puntualidad en todas sus actividades de voluntariado.
                </p>
              )}

              {modalOrg.normas?.politicas?.length ? (
                <div className="pt-2 border-t border-black/5 dark:border-white/5">
                  <h6 className="font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>
                    Políticas Específicas:
                  </h6>
                  <ul className="list-disc list-inside space-y-1">
                    {modalOrg.normas.politicas.map((pol, idx) => (
                      <li key={idx}>{pol}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Terms Checkbox */}
            <label
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              <input
                type="checkbox"
                checked={aceptoTerminos}
                onChange={(e) => setAceptoTerminos(e.target.checked)}
                className="mt-0.5 rounded cursor-pointer"
              />
              <span className="text-xs font-semibold select-none" style={{ color: "var(--text)" }}>
                He leído y acepto expresamente los términos de servicio y políticas de convivencia de {modalOrg.nombre}.
              </span>
            </label>

            {/* Motivation Message */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Mensaje para los organizadores (opcional)
              </label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={3}
                placeholder="¿Por qué deseas unirte? Cuéntales sobre tu motivación, habilidades o disponibilidad..."
                className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none resize-none transition-all"
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  onJoin(modalOrg.id, aceptoTerminos, mensaje.trim() || undefined);
                  setModalOrg(null);
                  setAceptoTerminos(false);
                  setMensaje("");
                }}
                disabled={!aceptoTerminos || joinPending}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 shadow-sm flex items-center justify-center gap-1.5"
                style={{ background: "var(--accent)", color: "#ffffff" }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                {joinPending ? "Enviando solicitud..." : "Confirmar y enviar solicitud"}
              </button>
              <button
                onClick={() => setModalOrg(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-colors"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
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
