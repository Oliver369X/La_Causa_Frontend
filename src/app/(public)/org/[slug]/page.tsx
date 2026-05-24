"use client";

import React, { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { organizationsApi, type Organization } from "@/features/organizations/api/organizationsApi";
import { gamificationApi } from "@/features/gamification/api/gamificationApi";
import { eventsApi } from "@/features/events/api/eventsApi";
import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import { useAuthStore } from "@/shared/store/authStore";
import { Building2, ExternalLink, UserPlus, ArrowLeft, X, Facebook, Instagram, Twitter, Linkedin, Calendar, Trophy } from "lucide-react";
import { OrgBadgeCatalogSection } from "@/features/badges/ui/OrgBadgeCatalogSection";

const PRIVATE_HOST_RE = /^(localhost|127\.|0\.0\.0\.0|::1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i;

function isPublicHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!u.hostname) return false;
    return !PRIVATE_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

interface Solicitud {
  id: string;
  organizacion_id: string;
  estado: string;
}

function safeReturnTo(value: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value.trim());
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("://")) return null;
  return decoded;
}

export default function OrgPublicPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const { user } = useAuthStore();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const backHref = returnTo ?? (user ? "/dashboard/organizaciones" : "/");
  const backLabel = (returnTo || user) ? "Volver" : "Inicio";
  const qc = useQueryClient();
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [showUnirseModal, setShowUnirseModal] = useState(false);

  const { data: org, isLoading, error } = useQuery({
    queryKey: ["org-public", slug],
    queryFn: () => organizationsApi.getPublicBySlug(slug),
    enabled: !!slug,
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

  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos-publicos", org?.id],
    queryFn: () => eventsApi.list(org!.id),
    enabled: !!org?.id && (org.normas?.visibilidad?.mostrar_eventos !== false),
  });

  const { data: ranking = [], isLoading: loadingRanking } = useQuery({
    queryKey: ["ranking-public", org?.id],
    queryFn: () => gamificationApi.getRanking(org!.id),
    enabled: !!org?.id && org.normas?.visibilidad?.mostrar_ranking !== false,
  });

  const unirseMutation = useMutation({
    mutationFn: (orgId: string) =>
      organizationsApi.solicitarUnirse(orgId, aceptoTerminos, mensaje.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mis-solicitudes"] });
      setShowUnirseModal(false);
      setAceptoTerminos(false);
      setMensaje("");
    },
  });

  const eventosPublicos = eventos.filter(
    (e) => e.estado !== "borrador" && e.estado !== "cancelado"
  ).slice(0, 5);

  const yaEsMiembro = (orgId: string) => misOrgs.some((o) => o.id === orgId);
  const tieneSolicitud = (orgId: string) =>
    misSolicitudes.some(
      (s) => s.organizacion_id === orgId && (s.estado === "pendiente" || s.estado === "aprobada")
    );
  const puedeUnirse = (org: Organization) =>
    !yaEsMiembro(org.id) && !tieneSolicitud(org.id);

  if (isLoading || !slug) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <div className="animate-pulse text-sm" style={{ color: "var(--text-muted)" }}>
          Cargando...
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <p style={{ color: "var(--text-muted)" }}>Organización no encontrada.</p>
        <Link
          href={user ? "/dashboard/organizaciones" : "/"}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: "var(--accent)", color: "white" }}
        >
          <ArrowLeft className="w-4 h-4" /> {user ? "Volver" : "Volver al inicio"}
        </Link>
      </div>
    );
  }

  const colorPrimario = org.normas?.personalizacion?.color_primario ?? "var(--accent)";
  const colorSecundario = org.normas?.personalizacion?.color_secundario ?? colorPrimario;
  const bannerUrl = org.normas?.personalizacion?.banner_url as string | undefined;
  const mostrarMision = org.normas?.visibilidad?.mostrar_mision !== false;
  const mostrarVision = org.normas?.visibilidad?.mostrar_vision !== false;
  const mostrarObjetivos = org.normas?.visibilidad?.mostrar_objetivos !== false;
  const mostrarRanking = org.normas?.visibilidad?.mostrar_ranking !== false;
  const objetivos = Array.isArray(org.normas?.perfil_publico?.objetivos)
    ? (org.normas?.perfil_publico?.objetivos as string[]).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Banner opcional */}
      {bannerUrl && (
        <div className="w-full h-40 sm:h-52 overflow-hidden">
          <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      {/* Header simple */}
      <header className="sticky top-0 z-10 border-b" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href={backHref} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </Link>
          {user ? (
            <Link href="/dashboard" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
              Ir al dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero: logo + nombre + descripción */}
        <section
          className="rounded-2xl p-6 sm:p-8 mb-8"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt=""
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
              >
                <Building2 className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: colorPrimario }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{org.nombre}</h1>
              {org.slug && (
                <p className="text-xs mb-2" style={{ color: colorSecundario }}>
                  @{org.slug}
                </p>
              )}
              {org.sector && (
                <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                  {org.sector}
                  {org.pais && ` · ${org.pais}`}
                </p>
              )}
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {org.descripcion || "Organización de voluntariado."}
              </p>
              {mostrarMision && org.normas?.perfil_publico?.mision && (
                <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  <span className="font-medium" style={{ color: "var(--text)" }}>Misión: </span>
                  {org.normas.perfil_publico.mision}
                </p>
              )}
              {mostrarVision && org.normas?.perfil_publico?.vision && (
                <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  <span className="font-medium" style={{ color: "var(--text)" }}>Visión: </span>
                  {org.normas.perfil_publico.vision}
                </p>
              )}
              {org.sitio_web && (
                <a
                  href={org.sitio_web}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium"
                  style={{ color: colorPrimario }}
                >
                  <ExternalLink className="w-4 h-4" /> Sitio web
                </a>
              )}
              {(() => {
                const mostrarRedes = org.normas?.visibilidad?.mostrar_redes !== false;
                const r = org.normas?.perfil_publico?.redes as Record<string, string> | undefined;
                const redesList = r && typeof r === "object"
                  ? Object.entries(r).filter(([, v]) => typeof v === "string" && v.trim() && isPublicHttpUrl(v))
                  : [];
                if (!mostrarRedes || redesList.length === 0) return null;
                const icons: Record<string, React.ReactElement> = {
                  facebook: <Facebook className="w-4 h-4" />,
                  instagram: <Instagram className="w-4 h-4" />,
                  twitter: <Twitter className="w-4 h-4" />,
                  linkedin: <Linkedin className="w-4 h-4" />,
                };
                return (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {redesList.map(([key, url]) => (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm"
                        style={{ color: colorPrimario }}
                        title={key}
                      >
                        {icons[key] ?? <ExternalLink className="w-4 h-4" />}
                        {key}
                      </a>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {mostrarObjetivos && objetivos.length > 0 && (
          <section
            className="rounded-2xl p-6 mb-8"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-semibold mb-4">Objetivos</h2>
            <ul className="space-y-2 list-disc pl-5">
              {objetivos.map((obj, idx) => (
                <li key={`${idx}-${obj}`} className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {obj}
                </li>
              ))}
            </ul>
          </section>
        )}

        <OrgBadgeCatalogSection
          organizacionId={org.id}
          userId={user?.id ?? null}
          title="Reconocimientos a los que podés aspirar"
          subtitle="Unite como voluntario y participá en tareas y eventos para desbloquear estas medallas. Si iniciás sesión, verás cuáles ya conseguiste."
          accentColor={colorPrimario}
          variant="public"
        />

        {/* Ranking de voluntarios (misma API que el detalle privado de org: filtrado por organización) */}
        {mostrarRanking && (
          <section
            className="rounded-2xl p-6 mb-8"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: colorPrimario }} />
              Ranking de voluntarios
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Posiciones según ELO en esta organización. Toca un nombre para ver el perfil público.
            </p>
            {loadingRanking ? (
              <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
                Cargando ranking…
              </p>
            ) : ranking.length === 0 ? (
              <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>
                Aún no hay voluntarios con actividad suficiente en el ranking.
              </p>
            ) : (
              <ul className="divide-y rounded-xl overflow-hidden" style={{ borderColor: "var(--border)", border: "1px solid var(--border)" }}>
                {ranking.slice(0, 20).map((entry) => (
                  <li key={entry.usuario_id}>
                    <Link
                      href={`/voluntario/${entry.usuario_id}?org=${org.id}&returnTo=${encodeURIComponent(`/org/${slug}`)}`}
                      className="flex items-center gap-4 px-4 py-3 hover:opacity-90 transition-opacity"
                      style={{ color: "var(--text)" }}
                    >
                      <span
                        className="w-8 h-8 text-xs font-bold rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: entry.posicion <= 3 ? colorPrimario : "var(--bg-subtle)",
                          color: entry.posicion <= 3 ? "#fff" : "var(--text-muted)",
                        }}
                      >
                        {entry.posicion <= 3 ? ["🥇", "🥈", "🥉"][entry.posicion - 1] : entry.posicion}
                      </span>
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: "var(--accent-soft)", color: colorPrimario }}
                        >
                          {entry.nombre[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.nombre}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {entry.tareas_completadas ?? 0} tareas · {entry.rango ?? "—"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: colorPrimario }}>
                        {entry.puntos_elo ?? entry.elo_score ?? 0} ELO
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Actividades / Eventos recientes */}
        {org.normas?.visibilidad?.mostrar_eventos !== false && eventosPublicos.length > 0 && (
          <section
            className="rounded-2xl p-6 mb-8"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: colorPrimario }} />
              Actividades recientes
            </h2>
            <ul className="space-y-3">
              {eventosPublicos.map((ev) => (
                <li
                  key={ev.id}
                  className="p-4 rounded-xl"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  <p className="font-medium text-sm">{ev.nombre}</p>
                  {ev.descripcion && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                      {ev.descripcion}
                    </p>
                  )}
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                    {new Date(ev.fecha_inicio).toLocaleDateString("es")} - {new Date(ev.fecha_fin).toLocaleDateString("es")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA: Unirse */}
        <section className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4">¿Te gustaría unirte?</h2>
          {!user ? (
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              Inicia sesión o regístrate para solicitar unirte a esta organización como voluntario.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {!user ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: colorPrimario, color: "white" }}
              >
                <UserPlus className="w-4 h-4" /> Iniciar sesión para unirte
              </Link>
            ) : puedeUnirse(org) ? (
              <button
                onClick={() => setShowUnirseModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: colorPrimario, color: "white" }}
              >
                <UserPlus className="w-4 h-4" /> Solicitar unirme
              </button>
            ) : tieneSolicitud(org.id) ? (
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-subtle)" }}>
                Solicitud enviada
              </span>
            ) : (
              <Link
                href={`/dashboard/organizaciones/${org.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(34,197,94,.15)", color: "#16a34a" }}
              >
                Ya eres miembro · Ver ranking
              </Link>
            )}
          </div>
        </section>
      </main>

      {/* Modal términos y unirse */}
      {showUnirseModal && org && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Unirme a {org.nombre}</h3>
              <button onClick={() => setShowUnirseModal(false)} className="p-2 rounded-lg hover:bg-black/5">
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
              {org.normas?.terminos_servicio ? (
                <div className="whitespace-pre-wrap">{org.normas.terminos_servicio}</div>
              ) : (
                <p style={{ color: "var(--text-muted)" }}>La organización no ha definido términos aún.</p>
              )}
              {org.normas?.politicas?.length ? (
                <ul className="mt-3 list-disc list-inside space-y-1">
                  {org.normas.politicas.map((p: string, i: number) => (
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
              <span className="text-sm">Acepto los términos y políticas de {org.nombre}</span>
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
                onClick={() => unirseMutation.mutate(org.id)}
                disabled={!aceptoTerminos || unirseMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: colorPrimario, color: "white" }}
              >
                {unirseMutation.isPending ? "Enviando..." : "Enviar solicitud"}
              </button>
              <button
                onClick={() => setShowUnirseModal(false)}
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
    </div>
  );
}
