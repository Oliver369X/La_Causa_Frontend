"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Sparkles, Star, Target } from "lucide-react";
import type { MembershipRequest, Organization } from "@/features/organizations/api/organizationsApi";
import type { Skill, UserSkill } from "@/features/skills/api/skillsApi";
import type { DisponibilidadEstado, User } from "@/shared/store/authStore";
import type { VolunteerOnboardingProgress, VolunteerOnboardingStepId } from "@/features/onboarding/lib/volunteerOnboarding";
import { VOLUNTEER_ONBOARDING_MIN_SKILLS } from "@/features/onboarding/lib/volunteerOnboarding";
import { VolunteerProfileBasicsCard } from "@/features/volunteers/ui/VolunteerProfileBasicsCard";
import { VolunteerAvailabilitySelector } from "@/features/volunteers/ui/VolunteerAvailabilitySelector";
import { VolunteerSkillsManager } from "@/features/volunteers/ui/VolunteerSkillsManager";
import { OrganizationDiscoveryPanel } from "@/features/organizations/ui/OrganizationDiscoveryPanel";

const STEP_ORDER: VolunteerOnboardingStepId[] = [
  "welcome",
  "profile",
  "skills",
  "platform",
  "organizations",
];

interface VolunteerOnboardingWizardProps {
  user: User;
  progress: VolunteerOnboardingProgress;
  displayName: string;
  setDisplayName: (value: string) => void;
  apellido: string;
  setApellido: (value: string) => void;
  bio: string;
  setBio: (value: string) => void;
  onSaveProfile: () => void;
  saveProfilePending?: boolean;
  onAvatarFile: (file: File) => void;
  avatarPending?: boolean;
  onUseLocation: () => void;
  locationPending?: boolean;
  disponibilidadEstado: DisponibilidadEstado;
  onChangeDisponibilidad: (value: DisponibilidadEstado) => void;
  userSkills: UserSkill[];
  allSkills: Skill[];
  loadingSkills?: boolean;
  loadingAllSkills?: boolean;
  addSkillPending?: boolean;
  removeSkillPending?: boolean;
  onAddSkill: (skillId: string) => void;
  onRemoveSkill: (skillId: string) => void;
  orgs: Organization[];
  orgsLoading?: boolean;
  misSolicitudes: MembershipRequest[];
  misOrgs: Organization[];
  joinPending?: boolean;
  onJoinOrg: (orgId: string, acceptedTerms: boolean, message?: string) => void;
  onWelcomeSeen: () => void;
  onPlatformSeen: () => void;
  onOrganizationsSeen: () => void;
  onExit: (completed: boolean) => void;
}

export function VolunteerOnboardingWizard({
  user,
  progress,
  displayName,
  setDisplayName,
  apellido,
  setApellido,
  bio,
  setBio,
  onSaveProfile,
  saveProfilePending = false,
  onAvatarFile,
  avatarPending = false,
  onUseLocation,
  locationPending = false,
  disponibilidadEstado,
  onChangeDisponibilidad,
  userSkills,
  allSkills,
  loadingSkills = false,
  loadingAllSkills = false,
  addSkillPending = false,
  removeSkillPending = false,
  onAddSkill,
  onRemoveSkill,
  orgs,
  orgsLoading = false,
  misSolicitudes,
  misOrgs,
  joinPending = false,
  onJoinOrg,
  onWelcomeSeen,
  onPlatformSeen,
  onOrganizationsSeen,
  onExit,
}: VolunteerOnboardingWizardProps) {
  const firstIncompleteIndex = useMemo(() => {
    const index = progress.steps.findIndex((step) => !step.completed);
    return index === -1 ? STEP_ORDER.length - 1 : index;
  }, [progress.steps]);

  const [stepIndex, setStepIndex] = useState(firstIncompleteIndex);
  const effectiveStepIndex = progress.isComplete
    ? STEP_ORDER.length - 1
    : stepIndex;
  const activeStepId = STEP_ORDER[effectiveStepIndex];
  const activeStep = progress.steps.find((step) => step.id === activeStepId)!;

  useEffect(() => {
    if (activeStepId === "organizations") {
      onOrganizationsSeen();
    }
  }, [activeStepId, onOrganizationsSeen]);

  const goNext = () => {
    if (effectiveStepIndex < STEP_ORDER.length - 1) {
      setStepIndex(effectiveStepIndex + 1);
    }
  };

  const goBack = () => {
    if (effectiveStepIndex > 0) {
      setStepIndex(effectiveStepIndex - 1);
    }
  };

  const renderStep = () => {
    switch (activeStepId) {
      case "welcome":
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl" style={{ background: "linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,0))", border: "1px solid var(--border)" }}>
              <p className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "var(--accent)" }}>
                Nuevo recorrido
              </p>
              <h2 className="text-3xl font-semibold mb-3">Bienvenido, {user.nombre.split(" ")[0] || "voluntario"}</h2>
              <p className="text-sm md:text-base max-w-2xl" style={{ color: "var(--text-muted)" }}>
                En pocos pasos vas a dejar listo tu perfil, tus habilidades y tu primer acercamiento a organizaciones,
                sin perderte dentro de la plataforma.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: Target, title: "Perfil claro", description: "Cuéntale a la plataforma quién eres y cómo te gusta ayudar." },
                { icon: Star, title: "Habilidades útiles", description: "Agrega lo que sabes para recibir mejores tareas y eventos." },
                { icon: Compass, title: "Ruta simple", description: "Conoce dónde ver organizaciones, progreso y certificados." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-5 rounded-2xl"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <item.icon className="w-5 h-5 mb-3" style={{ color: "var(--accent)" }} />
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case "profile":
        return (
          <div className="space-y-6">
            <VolunteerProfileBasicsCard
              user={user}
              displayName={displayName}
              setDisplayName={setDisplayName}
              apellido={apellido}
              setApellido={setApellido}
              bio={bio}
              setBio={setBio}
              onSave={onSaveProfile}
              savePending={saveProfilePending}
              onAvatarFile={onAvatarFile}
              avatarPending={avatarPending}
              onUseLocation={onUseLocation}
              locationPending={locationPending}
              title="Tu perfil"
              description="Completa lo esencial para que la plataforma y las organizaciones entiendan mejor tu perfil."
              saveLabel="Guardar y continuar"
            />
            <VolunteerAvailabilitySelector
              value={disponibilidadEstado}
              onChange={onChangeDisponibilidad}
              description="Esto ayuda a que después te contacten y asignen actividades con más contexto."
            />
          </div>
        );

      case "skills":
        return (
          <VolunteerSkillsManager
            userSkills={userSkills}
            allSkills={allSkills}
            loadingSkills={loadingSkills}
            loadingAllSkills={loadingAllSkills}
            addPending={addSkillPending}
            removePending={removeSkillPending}
            onAddSkill={onAddSkill}
            onRemoveSkill={onRemoveSkill}
            highlightMin={VOLUNTEER_ONBOARDING_MIN_SKILLS}
            description={`Agrega al menos ${VOLUNTEER_ONBOARDING_MIN_SKILLS} habilidades para arrancar con un perfil más completo.`}
          />
        );

      case "platform":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: "Dashboard",
                description: "Es tu punto de control: retomas el onboarding, ves qué te falta y entras rápido a organizaciones, eventos y tareas.",
              },
              {
                title: "Organizaciones",
                description: "Buscas organizaciones, revisas su misión y términos, y envías una solicitud para unirte a la que mejor encaje contigo.",
              },
              {
                title: "Gamificación",
                description: "Tu participación suma experiencia (XP), medallas y certificados; así construyes tu historial como voluntario.",
              },
              {
                title: "Eventos y tareas",
                description: "Cuando aprueben tu solicitud, podrás postular a eventos y completar tareas asignadas por la organización.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-2xl"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <Sparkles className="w-5 h-5 mb-3" style={{ color: "var(--accent)" }} />
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{item.description}</p>
              </div>
            ))}
          </div>
        );

      case "organizations":
        return (
          <OrganizationDiscoveryPanel
            orgs={orgs}
            isLoading={orgsLoading}
            misSolicitudes={misSolicitudes}
            misOrgs={misOrgs}
            onJoin={onJoinOrg}
            joinPending={joinPending}
            title="Tu siguiente paso"
            description="Explora organizaciones para encontrar tu primera causa. Si todavía no quieres postularte, puedes seguir al dashboard y retomarlo después."
            limit={6}
            onExplore={onOrganizationsSeen}
          />
        );
    }
  };

  const handlePrimary = () => {
    if (activeStepId === "welcome") {
      onWelcomeSeen();
      goNext();
      return;
    }

    if (activeStepId === "platform") {
      onPlatformSeen();
      goNext();
      return;
    }

    if (activeStepId === "organizations") {
      onExit(progress.isComplete);
      return;
    }

    goNext();
  };

  const canContinue =
    activeStepId === "welcome" ||
    activeStepId === "platform" ||
    activeStepId === "organizations" ||
    (activeStepId === "profile" && Boolean(displayName.trim())) ||
    activeStep.completed;

  const primaryLabel =
    activeStepId === "welcome"
      ? "Empezar"
      : activeStepId === "organizations"
        ? progress.isComplete
          ? "Ir al dashboard"
          : "Seguir por ahora"
        : "Continuar";

  const secondaryLabel =
    activeStepId === "organizations"
      ? progress.isComplete
        ? undefined
        : "Terminar después"
      : activeStepId === "welcome"
        ? undefined
        : "Saltar por ahora";

  return (
    <div className="min-h-screen px-4 py-8 md:px-8" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="pointer-events-none fixed top-[12%] left-1/2 -translate-x-1/2 w-[42%] h-[28%] rounded-full blur-[120px] -z-10" style={{ background: "var(--glow-a)" }} />
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="p-5 rounded-3xl h-fit" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: "var(--accent)" }}>Onboarding</p>
          <h1 className="text-2xl font-semibold mb-2">Activa tu cuenta</h1>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            Avanza paso a paso. Puedes salir y continuar luego desde tu dashboard.
          </p>

          <div className="h-2 rounded-full mb-5" style={{ background: "var(--bg-subtle)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress.progressPercent}%`, background: "var(--accent)" }}
            />
          </div>

          <div className="space-y-2">
            {progress.steps.map((step, index) => {
              const isActive = index === effectiveStepIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => setStepIndex(index)}
                  className="w-full text-left p-3 rounded-2xl transition-all"
                  style={{
                    background: isActive ? "var(--accent-soft)" : "transparent",
                    border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                      style={{
                        background: step.completed ? "rgba(34,197,94,.16)" : "var(--bg-subtle)",
                        color: step.completed ? "#16a34a" : "var(--text-muted)",
                      }}
                    >
                      {step.completed ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{step.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="p-6 md:p-8 rounded-3xl" style={{ background: "rgba(0,0,0,.03)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: "var(--accent)" }}>
                Paso {effectiveStepIndex + 1} de {progress.totalSteps}
              </p>
              <h2 className="text-2xl font-semibold">{activeStep.title}</h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{activeStep.description}</p>
            </div>
            <div
              className="px-3 py-2 rounded-2xl text-sm"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              {progress.completedCount}/{progress.totalSteps} completos
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStepId}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex gap-3">
              <button
                onClick={goBack}
                disabled={effectiveStepIndex === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <ArrowLeft className="w-4 h-4" /> Atrás
              </button>

              {secondaryLabel ? (
                <button
                  onClick={() => onExit(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "transparent", border: "1px solid var(--border)" }}
                >
                  {secondaryLabel}
                </button>
              ) : null}
            </div>

            <button
              onClick={handlePrimary}
              disabled={!canContinue}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              {primaryLabel} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
