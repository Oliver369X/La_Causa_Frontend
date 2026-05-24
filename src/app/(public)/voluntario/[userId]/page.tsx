"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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

  const badgesForGrid: Badge[] = badges.map((b) => ({
    id: b.id,
    nombre: (b as { nombre?: string }).nombre ?? "Insignia",
    imagen_url: (b as { imagen_url?: string }).imagen_url,
    rareza: ((b as { rareza?: string }).rareza ?? "common") as Badge["rareza"],
  }));

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

  const displayProfile = {
    ...profile,
    nombre: profile.nombre ?? "Voluntario",
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    rango: profile.rango ?? "Principiante",
    puntos_elo: profile.puntos_elo ?? profile.elo_score ?? 0,
    nivel: profile.nivel ?? 1,
    racha_entregas: profile.racha_entregas ?? 0,
    insignias_total: profile.insignias_total ?? badges.length,
    eventos_completados: profile.eventos_completados ?? 0,
    tareas_completadas: profile.tareas_completadas ?? 0,
  };

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
          <BadgeGrid badges={badgesForGrid} />
        </div>
      </main>
    </div>
  );
}
