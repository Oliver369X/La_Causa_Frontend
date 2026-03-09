import type { MembershipRequest, Organization } from "@/features/organizations/api/organizationsApi";
import type { UserSkill } from "@/features/skills/api/skillsApi";
import type { User, VolunteerOnboardingState } from "@/shared/store/authStore";

export const VOLUNTEER_ONBOARDING_MIN_SKILLS = 4;

export type VolunteerOnboardingStepId =
  | "welcome"
  | "profile"
  | "skills"
  | "platform"
  | "organizations";

export interface VolunteerOnboardingStep {
  id: VolunteerOnboardingStepId;
  title: string;
  description: string;
  completed: boolean;
}

export interface VolunteerOnboardingProgress {
  steps: VolunteerOnboardingStep[];
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  isComplete: boolean;
  hasOrganizations: boolean;
  hasRequests: boolean;
}

export function hasVolunteerBasicProfile(user: User | null): boolean {
  if (!user?.nombre?.trim()) return false;
  // La ubicación es opcional durante onboarding inicial.
  return true;
}

export function buildVolunteerOnboardingProgress({
  user,
  userSkills,
  organizations,
  solicitudes,
  session,
}: {
  user: User | null;
  userSkills: UserSkill[];
  organizations: Organization[];
  solicitudes: MembershipRequest[];
  session: VolunteerOnboardingState;
}): VolunteerOnboardingProgress {
  const hasOrganizations = organizations.length > 0;
  const hasRequests = solicitudes.some((solicitud) =>
    ["pendiente", "aprobada"].includes(solicitud.estado)
  );

  const steps: VolunteerOnboardingStep[] = [
    {
      id: "welcome",
      title: "Bienvenida",
      description: "Entender el recorrido inicial de la plataforma.",
      completed: Boolean(session.welcomeSeen),
    },
    {
      id: "profile",
      title: "Perfil",
      description: "Completar tu presentación, foto o ubicación.",
      completed: hasVolunteerBasicProfile(user),
    },
    {
      id: "skills",
      title: "Habilidades",
      description: `Añadir al menos ${VOLUNTEER_ONBOARDING_MIN_SKILLS} habilidades relevantes.`,
      completed: userSkills.length >= VOLUNTEER_ONBOARDING_MIN_SKILLS,
    },
    {
      id: "platform",
      title: "Cómo funciona",
      description: "Entender qué hace cada módulo y en qué orden lo vas a usar como voluntario.",
      completed: Boolean(session.platformSeen),
    },
    {
      id: "organizations",
      title: "Organizaciones",
      description: "Explorar organizaciones y quedar encaminado a la primera.",
      completed: Boolean(session.orgExplorerSeen || hasOrganizations || hasRequests),
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
    hasOrganizations,
    hasRequests,
  };
}

export function shouldAutoStartVolunteerOnboarding(
  progress: VolunteerOnboardingProgress,
  session: VolunteerOnboardingState
): boolean {
  if (session.completedAt) return false;
  if (progress.hasOrganizations || progress.hasRequests) return false;
  return !progress.isComplete;
}
