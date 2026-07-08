"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { gamificationApi } from "@/features/gamification/api/gamificationApi";
import { useAuthStore } from "@/shared/store/authStore";
import { TopBar } from "@/shared/ui/Sidebar";
import { Building2, Trophy, ExternalLink, ArrowLeft, LogOut } from "lucide-react";
import { OrgBadgeCatalogSection } from "@/features/badges/ui/OrgBadgeCatalogSection";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Spinner } from "@/shared/ui/Spinner";
import Link from "next/link";

export default function OrganizacionDetallePage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: org, isLoading: loadingOrg, error: errorOrg } = useQuery({
    queryKey: ["org", orgId],
    queryFn: () => organizationsApi.get(orgId),
    enabled: !!orgId,
  });

  const { data: ranking = [], isLoading: loadingRanking } = useQuery({
    queryKey: ["ranking", orgId],
    queryFn: () => gamificationApi.getRanking(orgId),
    enabled: !!orgId,
  });

  const { data: misOrgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => organizationsApi.list(),
    enabled: !!user?.id,
  });

  const soyMiembro = misOrgs.some((o) => o.id === orgId);

  const dejarOrgMutation = useMutation({
    mutationFn: () => organizationsApi.leaveOrganization(orgId, user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      const { activeOrgId, setActiveOrg } = useAuthStore.getState();
      if (activeOrgId === orgId) setActiveOrg(null);
      router.push("/dashboard/organizaciones");
    },
  });

  if (loadingOrg || !orgId) {
    return (
      <>
        <TopBar title="Organización" />
        <div className="flex-1 flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      </>
    );
  }

  if (errorOrg || !org) {
    return (
      <>
        <TopBar title="Organización" />
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4 px-5 text-center">
          <Building2 className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
          <div>
            <p className="font-medium mb-1">No eres miembro de esta organización</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Explora el perfil público o solicita unirte desde el catálogo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => router.push("/dashboard/organizaciones")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              <ArrowLeft className="w-4 h-4" /> Explorar organizaciones
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={org.nombre} />
      <div className="flex-1 p-5 md:p-8 max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/dashboard/organizaciones")}
          className="flex items-center gap-2 text-sm mb-6"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Volver a organizaciones
        </button>

        {/* Org header */}
        <div
          className="p-6 rounded-2xl mb-8 flex flex-col sm:flex-row sm:items-start gap-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {org.logo_url ? (
            <img src={org.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
              <Building2 className="w-8 h-8" style={{ color: "var(--accent)" }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-xl font-bold">{org.nombre}</h1>
              {soyMiembro && (
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(34,197,94,.15)", color: "#16a34a" }}
                >
                  Eres miembro
                  {org.mi_rol_slug || org.soy_propietario
                    ? ` · ${org.soy_propietario ? "Propietario" : org.mi_rol_slug === "organizador" ? "Organizador" : org.mi_rol_slug === "coordinador" ? "Coordinador" : org.mi_rol_slug === "admin" ? "Admin" : "Voluntario"}`
                    : ""}
                </span>
              )}
            </div>
            {org.sector && (
              <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>{org.sector}</p>
            )}
            {org.descripcion && (
              <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>{org.descripcion}</p>
            )}
            {org.sitio_web && (
              <a
                href={org.sitio_web}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium"
                style={{ color: "var(--accent)" }}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Sitio web
              </a>
            )}
            {soyMiembro && user?.id && (
              <button
                onClick={() => {
                  if (confirm("¿Dejar esta organización?")) dejarOrgMutation.mutate();
                }}
                disabled={dejarOrgMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium mt-3"
                style={{ background: "rgba(239,68,68,.15)", color: "#dc2626", border: "1px solid rgba(239,68,68,.3)" }}
              >
                <LogOut className="w-4 h-4" /> Dejar organización
              </button>
            )}
          </div>
        </div>

        <OrgBadgeCatalogSection
          organizacionId={orgId}
          userId={user?.id ?? null}
          title="Logros que podés conseguir"
          subtitle="Solo se listan medallas que la organización dejó visibles en catálogo; las «sorpresa» aparecen cuando se otorgan."
          variant="dashboard"
          anchorId="logros-org"
        />

        {/* Ranking */}
        <div className="mb-2 flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <h2 className="text-lg font-semibold">Ranking de voluntarios</h2>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Voluntarios de esta organización ordenados por ELO.
        </p>

        {loadingRanking ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : ranking.length === 0 ? (
          <div className="rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <EmptyState
              title="Sin voluntarios en el ranking"
              description="El ranking se actualiza cuando los voluntarios completan tareas."
            />
          </div>
        ) : (
          <ul className="divide-y rounded-2xl overflow-hidden" style={{ "--tw-divide-opacity": 1, borderColor: "var(--border)", background: "var(--bg-card)", border: "1px solid var(--border)" } as React.CSSProperties}>
            {ranking.map((entry) => (
              <li key={entry.usuario_id}>
                <Link
                  href={`/voluntario/${entry.usuario_id}?org=${orgId}&returnTo=${encodeURIComponent(`/dashboard/organizaciones/${orgId}`)}`}
                  className="flex items-center gap-4 px-5 py-4 hover:opacity-90 transition-opacity"
                  style={{ color: "var(--text)" }}
                >
                  <span
                    className="w-8 h-8 text-xs font-bold rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: entry.posicion <= 3 ? "var(--accent)" : "var(--bg-subtle)",
                      color: entry.posicion <= 3 ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {entry.posicion <= 3 ? ["🥇", "🥈", "🥉"][entry.posicion - 1] : entry.posicion}
                  </span>
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                      {entry.nombre[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.nombre}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {(entry.tareas_completadas ?? 0)} tareas completadas
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: "var(--accent)" }}>
                    {(entry.puntos_elo ?? entry.elo_score ?? 0)} ELO
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
