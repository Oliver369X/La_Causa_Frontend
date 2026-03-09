import type { Event } from "@/features/events/api/eventsApi";
import type { Organization } from "@/features/organizations/api/organizationsApi";
import type { Task } from "@/features/tasks/api/tasksApi";
import type { Member } from "@/features/volunteers/api/volunteersApi";
import type { User } from "@/shared/store/authStore";

export type OrganizerOnboardingStepId =
  | "welcome"
  | "profile"
  | "team"
  | "event"
  | "task";

export interface OrganizerOnboardingStep {
  id: OrganizerOnboardingStepId;
  title: string;
  description: string;
  completed: boolean;
}

export interface OrganizerOnboardingProgress {
  steps: OrganizerOnboardingStep[];
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  isComplete: boolean;
  hasOrganization: boolean;
  hasEvent: boolean;
  hasTask: boolean;
}

function hasOrgProfileConfigured(org: Organization | null): boolean {
  if (!org) return false;
  return Boolean(
    org.logo_url ||
      org.descripcion?.trim() ||
      org.normas?.terminos_servicio ||
      org.normas?.perfil_publico?.mision
  );
}

export function getOrganizerOnboardingState(user: User | null) {
  return user?.perfil_extra?.organizer_onboarding_v1;
}

export function shouldShowOrganizerOnboarding(user: User | null, orgs: Organization[]): boolean {
  if (!user || user.tipo !== "organizador") return false;
  if (orgs.length === 0) return false;
  const state = getOrganizerOnboardingState(user);
  return !state?.completed_at;
}

export function buildOrganizerOnboardingProgress({
  user,
  orgs,
  org,
  members,
  events,
  tasks,
}: {
  user: User | null;
  orgs: Organization[];
  org: Organization | null;
  members: Member[];
  events: Event[];
  tasks: Task[];
}): OrganizerOnboardingProgress {
  const state = getOrganizerOnboardingState(user);
  const hasOrganization = orgs.length > 0;
  const hasEvent = events.length > 0;
  const hasTask = tasks.length > 0;
  const hasTeam = members.length > 1;

  const steps: OrganizerOnboardingStep[] = [
    {
      id: "welcome",
      title: "Bienvenida",
      description: "Conocer el flujo inicial para operar tu organización.",
      completed: Boolean(state?.started_at || state?.steps?.welcome_seen),
    },
    {
      id: "profile",
      title: "Perfil de organización",
      description: "Configurar descripción, logo y términos básicos.",
      completed: hasOrgProfileConfigured(org),
    },
    {
      id: "team",
      title: "Equipo y permisos",
      description: "Invitar al menos a un miembro para distribuir responsabilidades.",
      completed: hasTeam,
    },
    {
      id: "event",
      title: "Primer evento",
      description: "Crear tu primer evento para abrir participación.",
      completed: hasEvent,
    },
    {
      id: "task",
      title: "Primera tarea",
      description: "Crear una tarea vinculada a un evento para activar la operación.",
      completed: hasTask,
    },
  ];

  const completedCount = steps.filter((step) => step.completed).length;
  const totalSteps = steps.length;

  return {
    steps,
    completedCount,
    totalSteps,
    progressPercent: Math.round((completedCount / totalSteps) * 100),
    isComplete: completedCount === totalSteps,
    hasOrganization,
    hasEvent,
    hasTask,
  };
}
