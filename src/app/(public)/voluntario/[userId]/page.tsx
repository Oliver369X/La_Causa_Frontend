"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import { gamificationApi } from "@/features/gamification/api/gamificationApi";
import { ProfileBanner } from "@/features/gamification/ui/ProfileBanner";
import { BadgeGrid } from "@/features/gamification/ui/BadgeGrid";
import { skillsApi } from "@/features/skills/api/skillsApi";
import { useAuthStore } from "@/shared/store/authStore";
import { ArrowLeft, Calendar } from "lucide-react";
import { Spinner } from "@/shared/ui/Spinner";
import type { Badge } from "@/features/gamification/api/gamificationApi";

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

export default function VoluntarioPublicoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.userId as string;
  const orgId = searchParams.get("org");
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const { user } = useAuthStore();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => gamificationApi.getProfile(userId),
    enabled: !!userId,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ["badges", userId],
    queryFn: () => gamificationApi.getBadges(userId),
    enabled: !!userId,
  });

  const badgeOrganizationIds = Array.from(new Set(badges.map((badge) => badge.organizacion_id).filter(Boolean))) as string[];
  const organizationProfiles = useQueries({
    queries: badgeOrganizationIds.map((organizationId) => ({
      queryKey: ["profile", userId, organizationId],
      queryFn: () => gamificationApi.getProfile(userId, organizationId),
      enabled: !!userId,
    })),
  });
  const profileByOrganization = badgeOrganizationIds.map((organizationId, index) => ({
    organizationId,
    profile: organizationProfiles[index]?.data,
  })).filter((entry) => entry.profile);
  const selectedOrganizationProfile = profileByOrganization.find((entry) => entry.organizationId === orgId)
    ?? profileByOrganization.sort((a, b) => (b.profile?.puntos_elo ?? 0) - (a.profile?.puntos_elo ?? 0))[0];

  const { data: userSkills = [] } = useQuery({
    queryKey: ["userSkills", userId],
    queryFn: () => skillsApi.getUserSkills(userId),
    enabled: !!userId,
  });

  const { data: disponibilidad } = useQuery({
    queryKey: ["disponibilidad", userId, orgId],
    queryFn: () => gamificationApi.getDisponibilidad(userId, orgId!),
    enabled: !!userId && !!orgId && !!user?.id,
  });

  const { data: metrics } = useQuery({
    queryKey: ["profile-metrics", userId],
    queryFn: () => gamificationApi.getPerformanceMetrics(userId),
    enabled: !!userId,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["certificates", userId],
    queryFn: () => gamificationApi.listCertificates(userId),
    enabled: !!userId,
  });

  const badgesByOrganization = Array.from(
    badges.reduce((groups, badge) => {
      const organizationName = badge.organizacion_nombre ?? "Medallas generales";
      const group = groups.get(organizationName) ?? [];
      group.push(badge);
      groups.set(organizationName, group);
      return groups;
    }, new Map<string, typeof badges>()),
  );

  if (isLoading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <p style={{ color: "var(--text-muted)" }}>No se encontró el perfil.</p>
        <Link
          href={returnTo ?? (user ? "/dashboard" : "/")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: "var(--accent)", color: "white" }}
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
      </div>
    );
  }

  const currentProfile = selectedOrganizationProfile?.profile ?? profile;
  const displayProfile = {
    ...currentProfile,
    nombre: currentProfile.nombre ?? "Voluntario",
    avatar_url: currentProfile.avatar_url,
    bio: currentProfile.bio,
    rango: currentProfile.rango ?? "Principiante",
    puntos_elo: currentProfile.puntos_elo ?? currentProfile.elo_score ?? 0,
    nivel: currentProfile.nivel ?? 1,
    racha_entregas: currentProfile.racha_entregas ?? 0,
    insignias_total: currentProfile.insignias_total ?? badges.length,
    eventos_completados: currentProfile.eventos_completados ?? 0,
    tareas_completadas: currentProfile.tareas_completadas ?? 0,
    horas_totales_voluntario: currentProfile.horas_totales_voluntario ?? 0,
  };
  const currentBadge = badges.find((badge) =>
    badge.organizacion_id === selectedOrganizationProfile?.organizationId &&
    badge.nombre?.toUpperCase().startsWith(`${(displayProfile.rango ?? "").toUpperCase()}-`),
  ) ?? null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <header className="border-b" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href={returnTo ?? (user ? "/dashboard" : "/")}
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" /> {(returnTo || user) ? "Volver" : "Inicio"}
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-lg font-semibold mb-6" style={{ color: "var(--text-muted)" }}>
          Perfil competitivo
        </h1>
        <ProfileBanner
          profile={displayProfile}
          showcase
          metrics={metrics ?? null}
          certificatesCount={certificates.length}
          currentBadge={currentBadge}
          currentBadgeOrgName={currentBadge?.organizacion_nombre}
        />

        {disponibilidad && (
          <div className="mt-8">
            <h3 className="text-base font-semibold mb-4">Disponibilidad</h3>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <span
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  background: disponibilidad.disponibilidad_estado === "disponible" ? "rgba(34,197,94,.2)" : disponibilidad.disponibilidad_estado === "no_disponible" ? "rgba(239,68,68,.2)" : "var(--accent-soft)",
                  color: disponibilidad.disponibilidad_estado === "disponible" ? "#22c55e" : disponibilidad.disponibilidad_estado === "no_disponible" ? "#ef4444" : "var(--accent)",
                }}
              >
                {disponibilidad.disponibilidad_estado === "disponible" && "Disponible"}
                {disponibilidad.disponibilidad_estado === "no_disponible" && "No disponible"}
                {disponibilidad.disponibilidad_estado === "previo_consulta" && "Previo a consulta"}
              </span>
            </div>
          </div>
        )}

        {userSkills.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-semibold mb-4">Habilidades</h3>
            <div className="flex flex-wrap gap-2">
              {userSkills.map((us) => (
                <span
                  key={us.id}
                  className="px-3 py-1.5 rounded-full text-sm"
                  style={{ background: "var(--accent-soft)", border: "1px solid var(--border)", color: "var(--accent)" }}
                >
                  {us.habilidad?.nombre ?? us.habilidad_id} {us.nivel > 1 && `(nivel ${us.nivel})`}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-base font-semibold mb-4">Insignias</h3>
          <div className="space-y-6">
            {badgesByOrganization.map(([organizationName, organizationBadges]) => (
              <section key={organizationName}>
                <h4 className="text-sm font-semibold mb-3">{organizationName}</h4>
                <BadgeGrid badges={organizationBadges.map((badge) => ({ ...badge, rareza: (badge.rareza ?? "common") as Badge["rareza"] }))} />
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
