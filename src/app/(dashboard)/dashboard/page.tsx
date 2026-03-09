"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { analyticsApi } from "@/features/analytics/api/analyticsApi";
import { TopBar } from "@/shared/ui/Sidebar";
import { GamificationPanel, ReporteDinamicoWidget, TaskAssignmentWidget } from "@/widgets";
import { BarChart3, CheckSquare, Calendar, Users, Compass, Sparkles } from "lucide-react";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { skillsApi } from "@/features/skills/api/skillsApi";
import { buildVolunteerOnboardingProgress } from "@/features/onboarding/lib/volunteerOnboarding";
import { buildOrganizerOnboardingProgress, shouldShowOrganizerOnboarding } from "@/features/onboarding/lib/organizerOnboarding";
import { eventsApi } from "@/features/events/api/eventsApi";
import { tasksApi } from "@/features/tasks/api/tasksApi";
import { volunteersApi } from "@/features/volunteers/api/volunteersApi";
import Link from "next/link";

export default function DashboardPage() {
  const { activeOrgId, user, volunteerOnboarding } = useAuthStore();
  const isVolunteer = user?.tipo === "voluntario";
  const isOrganizer = user?.tipo === "organizador";

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", activeOrgId],
    queryFn: () => analyticsApi.dashboard(activeOrgId!),
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

  const statCards = [
    { label: "Voluntarios", value: stats?.total_volunteers ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Eventos", value: stats?.total_events ?? 0, icon: Calendar, color: "text-purple-400" },
    { label: "Tareas", value: stats?.total_tasks ?? 0, icon: CheckSquare, color: "text-green-400" },
    { label: "Completadas", value: stats?.tasks_completed ?? 0, icon: BarChart3, color: "text-amber-400" },
  ];

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 p-8">
        {isVolunteer ? (
          <div className="space-y-6">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
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
