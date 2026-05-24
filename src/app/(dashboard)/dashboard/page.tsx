"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { analyticsApi } from "@/features/analytics/api/analyticsApi";
import { TopBar } from "@/shared/ui/Sidebar";
import { GamificationPanel, ReporteDinamicoWidget, TaskAssignmentWidget } from "@/widgets";
import {
  BarChart3,
  CheckSquare,
  Calendar,
  Users,
  Compass,
  Sparkles,
  Building2,
  Repeat2,
  Target,
  Clock,
  GraduationCap,
  Timer,
} from "lucide-react";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { skillsApi } from "@/features/skills/api/skillsApi";
import { buildVolunteerOnboardingProgress } from "@/features/onboarding/lib/volunteerOnboarding";
import { buildOrganizerOnboardingProgress, shouldShowOrganizerOnboarding } from "@/features/onboarding/lib/organizerOnboarding";
import { eventsApi } from "@/features/events/api/eventsApi";
import { tasksApi } from "@/features/tasks/api/tasksApi";
import { volunteersApi } from "@/features/volunteers/api/volunteersApi";
import Link from "next/link";
import { usePermissions } from "@/shared/hooks/usePermissions";

export default function DashboardPage() {
  const { activeOrgId, user, volunteerOnboarding } = useAuthStore();
  const { isVolunteerExperience } = usePermissions();
  const isVolunteer = isVolunteerExperience;
  const isOrganizer = !isVolunteerExperience;

  const organizerDashRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      start: `${start.toISOString().slice(0, 10)}T00:00:00`,
      end: `${end.toISOString().slice(0, 10)}T23:59:59`,
    };
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", activeOrgId, isOrganizer ? organizerDashRange.start : "all"],
    queryFn: () =>
      isOrganizer
        ? analyticsApi.dashboard(activeOrgId!, organizerDashRange.start, organizerDashRange.end)
        : analyticsApi.dashboard(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: volunteerSkills = [] } = useQuery({
    queryKey: ["userSkills", user?.id],
    queryFn: () => skillsApi.getUserSkills(user!.id),
    enabled: isVolunteer && !!user?.id,
  });

  const { data: volunteerOrgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => organizationsApi.list(),
    enabled: isVolunteer && !!user?.id,
  });

  const { data: volunteerSolicitudes = [] } = useQuery({
    queryKey: ["mis-solicitudes"],
    queryFn: () => organizationsApi.listMySolicitudes(),
    enabled: isVolunteer && !!user?.id,
  });

  const { data: organizerOrgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => organizationsApi.list(),
    enabled: isOrganizer && !!user?.id,
  });

  const { data: organizerOrg } = useQuery({
    queryKey: ["org", activeOrgId],
    queryFn: () => organizationsApi.get(activeOrgId!),
    enabled: isOrganizer && !!activeOrgId,
  });

  const { data: organizerEvents = [] } = useQuery({
    queryKey: ["events", activeOrgId],
    queryFn: () => eventsApi.list(activeOrgId!),
    enabled: isOrganizer && !!activeOrgId,
  });

  const { data: organizerTasks = [] } = useQuery({
    queryKey: ["tasks", activeOrgId],
    queryFn: () => tasksApi.list(activeOrgId!),
    enabled: isOrganizer && !!activeOrgId,
  });

  const { data: organizerMembers = [] } = useQuery({
    queryKey: ["members", activeOrgId],
    queryFn: () => volunteersApi.listMembers(activeOrgId!),
    enabled: isOrganizer && !!activeOrgId,
  });

  const volunteerProgress = buildVolunteerOnboardingProgress({
    user,
    userSkills: volunteerSkills,
    organizations: volunteerOrgs,
    solicitudes: volunteerSolicitudes,
    session: volunteerOnboarding,
  });
  const organizerProgress = buildOrganizerOnboardingProgress({
    user,
    orgs: organizerOrgs,
    org: organizerOrg ?? null,
    members: organizerMembers,
    events: organizerEvents,
    tasks: organizerTasks,
  });
  const showOrganizerOnboardingCard = shouldShowOrganizerOnboarding(user, organizerOrgs);

  const topBarTitle = isVolunteer
    ? "Inicio · Voluntario"
    : isOrganizer
      ? "Inicio · Organización"
      : "Dashboard";

  const statCards = [
    { label: "Voluntarios", value: stats?.total_volunteers ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Eventos", value: stats?.total_events ?? 0, icon: Calendar, color: "text-purple-400" },
    { label: "Tareas", value: stats?.total_tasks ?? 0, icon: CheckSquare, color: "text-green-400" },
    { label: "Completadas", value: stats?.tasks_completed ?? 0, icon: BarChart3, color: "text-amber-400" },
  ];

  const fmtMtta = (seconds: number | null | undefined) => {
    if (seconds == null || !Number.isFinite(seconds)) return "—";
    if (seconds < 60) return `${seconds.toFixed(1)} s`;
    return `${(seconds / 60).toFixed(1)} min`;
  };

  const kpiCards = [
    {
      label: "Retención voluntarios",
      sub: "≥2 eventos / con ≥1 en el periodo",
      value:
        stats?.volunteer_retention_pct != null
          ? `${stats.volunteer_retention_pct.toFixed(1)}%`
          : "—",
      icon: Repeat2,
      color: "text-cyan-400",
    },
    {
      label: "Precisión asignación",
      sub: "Completadas exitosas / asignaciones activas",
      value:
        stats?.assignment_precision_pct != null
          ? `${stats.assignment_precision_pct.toFixed(1)}%`
          : "—",
      icon: Target,
      color: "text-rose-400",
    },
    {
      label: "Horas de impacto",
      sub: "Certificados (no revocados)",
      value: (stats?.impact_hours_total ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
      icon: Clock,
      color: "text-emerald-400",
    },
    {
      label: "MTTA auditoría",
      sub: "Media evidencia → revisión",
      value: fmtMtta(stats?.mtta_audit_seconds),
      icon: Timer,
      color: "text-orange-400",
    },
    {
      label: "Skills / voluntario",
      sub: "Nuevas skills registradas / voluntarios activos (ventana actual)",
      value:
        stats?.skills_new_avg_per_volunteer != null
          ? stats.skills_new_avg_per_volunteer.toFixed(2)
          : "—",
      icon: GraduationCap,
      color: "text-indigo-400",
    },
  ];

  return (
    <>
      <TopBar title={topBarTitle} />
      <div className="flex-1 p-8">
        {isVolunteer ? (
          <div className="space-y-6">
            <header className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--accent)" }}>
                Cuenta de voluntario
              </p>
              <h1 className="text-xl sm:text-2xl font-semibold">
                Hola{user?.nombre ? `, ${user.nombre}` : ""} — tu panel personal
              </h1>
              <p className="text-sm mt-2 max-w-2xl" style={{ color: "var(--text-muted)" }}>
                Aquí ves onboarding, gamificación y tareas vinculadas a tu perfil. Las métricas de organización (voluntarios, eventos agregados) están en la vista de organizador.
              </p>
            </header>
            {!volunteerProgress.isComplete && (
              <div
                className="p-6 rounded-2xl"
                style={{ background: "linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,0))", border: "1px solid var(--border)" }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5" style={{ color: "var(--accent)" }} />
                      <h2 className="text-lg font-semibold">Continúa tu onboarding</h2>
                    </div>
                    <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                      Llevas {volunteerProgress.completedCount} de {volunteerProgress.totalSteps} pasos completos. Termina tu perfil y explora organizaciones para aprovechar mejor la plataforma.
                    </p>
                    <div className="h-2 rounded-full max-w-md" style={{ background: "var(--bg-card)" }}>
                      <div className="h-full rounded-full" style={{ width: `${volunteerProgress.progressPercent}%`, background: "var(--accent)" }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/onboarding"
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: "var(--text)", color: "var(--bg)" }}
                    >
                      Continuar onboarding
                    </Link>
                    <Link
                      href="/dashboard/organizaciones"
                      className="px-5 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                      Explorar organizaciones
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div
                className="p-6 rounded-2xl"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <h2 className="text-lg font-semibold mb-2">Panel de Voluntario</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Aquí verás tus tareas, progreso, certificados y ranking personal.
                </p>
              </div>
              {!volunteerProgress.hasOrganizations && (
                <div
                  className="p-6 rounded-2xl"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Compass className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    <h2 className="text-lg font-semibold">Todavía no estás en una organización</h2>
                  </div>
                  <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                    Explora organizaciones públicas, revisa sus términos y envía tu primera solicitud cuando encuentres una causa que te interese.
                  </p>
                  <Link
                    href="/dashboard/organizaciones"
                    className="inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    Ver organizaciones
                  </Link>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GamificationPanel />
              <TaskAssignmentWidget />
            </div>
          </div>
        ) : !activeOrgId ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                 style={{ background: "var(--accent-soft)" }}>
              <BarChart3 className="w-8 h-8" style={{ color: "var(--accent)" }} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sin organización activa</h2>
            <p className="mb-6 max-w-sm" style={{ color: "var(--text-muted)" }}>
              Selecciona o crea una organización para ver las métricas.
            </p>
            <a
              href="/onboarding"
              className="px-6 py-3 rounded-full font-medium hover:opacity-80 transition-opacity"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              Crear organización
            </a>
          </div>
        ) : (
          <>
            <header className="rounded-2xl p-5 sm:p-6 mb-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
                  <Building2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--accent)" }}>
                    Panel de organización
                  </p>
                  <h1 className="text-xl sm:text-2xl font-semibold">
                    {organizerOrg?.nombre ?? "Resumen operativo"}
                  </h1>
                  <p className="text-sm mt-2 max-w-2xl" style={{ color: "var(--text-muted)" }}>
                    Métricas de tu equipo, tareas y reportes de la organización activa (últimos 30 días). Los voluntarios ven un inicio distinto, centrado en su perfil y causas.
                  </p>
                </div>
              </div>
            </header>

            {showOrganizerOnboardingCard && (
              <div
                className="p-6 rounded-2xl mb-8"
                style={{ background: "linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,0))", border: "1px solid var(--border)" }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5" style={{ color: "var(--accent)" }} />
                      <h2 className="text-lg font-semibold">Activa tu organización</h2>
                    </div>
                    <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                      Llevas {organizerProgress.completedCount} de {organizerProgress.totalSteps} pasos listos. Termina la configuración inicial para no volver a ver este onboarding.
                    </p>
                    <div className="h-2 rounded-full max-w-md" style={{ background: "var(--bg-card)" }}>
                      <div className="h-full rounded-full" style={{ width: `${organizerProgress.progressPercent}%`, background: "var(--accent)" }} />
                    </div>
                  </div>
                  <Link
                    href="/onboarding"
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold w-fit"
                    style={{ background: "var(--text)", color: "var(--bg)" }}
                  >
                    Continuar onboarding
                  </Link>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="p-5 rounded-2xl transition-colors hover:opacity-90"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{card.label}</p>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <p className="text-3xl font-bold">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                KPIs estratégicos
              </p>
              <p className="text-xs mb-4 max-w-4xl" style={{ color: "var(--text-muted)" }}>
                Métricas alineadas a retención, calidad de asignación, impacto auditado, tiempo de revisión y desarrollo de
                habilidades (misma ventana de 30 días que el resumen superior). Ajusta el rango en Reporte dinámico.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                {kpiCards.map((k) => (
                  <div
                    key={k.label}
                    className="p-4 rounded-2xl transition-colors hover:opacity-90"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium leading-tight" style={{ color: "var(--text-muted)" }}>
                        {k.label}
                      </p>
                      <k.icon className={`w-4 h-4 shrink-0 ${k.color}`} />
                    </div>
                    <p className="text-2xl font-bold tabular-nums mb-1">{k.value}</p>
                    <p className="text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
                      {k.sub}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Widgets row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <GamificationPanel />
              <TaskAssignmentWidget />
              <ReporteDinamicoWidget />
            </div>
          </>
        )}
      </div>
    </>
  );
}
