"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Settings,
  Users,
  Sparkles,
} from "lucide-react";
import type {
  OrganizerOnboardingProgress,
  OrganizerOnboardingStepId,
} from "@/features/onboarding/lib/organizerOnboarding";

const STEP_ORDER: OrganizerOnboardingStepId[] = [
  "welcome",
  "profile",
  "team",
  "event",
  "task",
];

interface OrganizerOnboardingWizardProps {
  progress: OrganizerOnboardingProgress;
  onExit: (completed: boolean) => void;
  onComplete: () => void;
}

const STEP_TARGETS: Record<
  Exclude<OrganizerOnboardingStepId, "welcome">,
  { href: string; label: string; helper: string }
> = {
  profile: {
    href: "/dashboard/settings",
    label: "Ir a Configuración",
    helper: "Completa logo, descripción o términos para cerrar este paso.",
  },
  team: {
    href: "/dashboard/staff",
    label: "Ir a Miembros",
    helper: "Invita al menos un miembro adicional para completar este paso.",
  },
  event: {
    href: "/dashboard/events",
    label: "Ir a Eventos",
    helper: "Crea tu primer evento para habilitar flujo de voluntarios.",
  },
  task: {
    href: "/dashboard/tasks",
    label: "Ir a Tareas",
    helper: "Crea una tarea vinculada a tu evento para cerrar el onboarding.",
  },
};

export function OrganizerOnboardingWizard({
  progress,
  onExit,
  onComplete,
}: OrganizerOnboardingWizardProps) {
  const firstIncompleteIndex = useMemo(() => {
    const idx = progress.steps.findIndex((step) => !step.completed);
    return idx === -1 ? STEP_ORDER.length - 1 : idx;
  }, [progress.steps]);
  const [stepIndex, setStepIndex] = useState(firstIncompleteIndex);

  useEffect(() => {
    setStepIndex(firstIncompleteIndex);
  }, [firstIncompleteIndex]);
  const activeStepId = STEP_ORDER[stepIndex];
  const activeStep = progress.steps.find((step) => step.id === activeStepId)!;

  const goNext = () => {
    if (stepIndex < STEP_ORDER.length - 1) setStepIndex((v) => v + 1);
  };

  const goBack = () => {
    if (stepIndex > 0) setStepIndex((v) => v - 1);
  };

  const renderStep = () => {
    if (activeStepId === "welcome") {
      return (
        <div className="space-y-6">
          <div
            className="p-6 rounded-3xl"
            style={{ background: "linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,0))", border: "1px solid var(--border)" }}
          >
            <p className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "var(--accent)" }}>
              Modo organizador
            </p>
            <h2 className="text-3xl font-semibold mb-3">Activa tu operación en 4 pasos</h2>
            <p className="text-sm md:text-base max-w-2xl" style={{ color: "var(--text-muted)" }}>
              Este flujo te guía para dejar lista tu organización: configuración básica, equipo, primer evento y primera tarea.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: Settings,
                title: "Configura tu organización",
                description: "Define presentación y normas para dar confianza a tus voluntarios.",
              },
              {
                icon: Users,
                title: "Arma tu equipo",
                description: "Invita miembros para no gestionar todo tú solo.",
              },
              {
                icon: Calendar,
                title: "Publica tu primer evento",
                description: "Empieza a recibir participación con una convocatoria real.",
              },
              {
                icon: ClipboardList,
                title: "Define tareas",
                description: "Convierte tu evento en acciones concretas medibles.",
              },
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
    }

    const target = STEP_TARGETS[activeStepId as Exclude<OrganizerOnboardingStepId, "welcome">];
    return (
      <div
        className="p-6 rounded-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h3 className="text-xl font-semibold mb-2">{activeStep.title}</h3>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          {activeStep.description}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={target.href}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            {target.label} <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setStepIndex((current) => Math.min(current + 1, STEP_ORDER.length - 1))}
            className="px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "transparent", border: "1px solid var(--border)" }}
          >
            Lo haré luego
          </button>
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          {target.helper}
        </p>
      </div>
    );
  };

  const canContinue = activeStepId === "welcome" || activeStep.completed;
  const primaryLabel = progress.isComplete && stepIndex === STEP_ORDER.length - 1
    ? "Finalizar onboarding"
    : "Continuar";

  return (
    <div className="min-h-screen px-4 py-8 md:px-8" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="pointer-events-none fixed top-[12%] left-1/2 -translate-x-1/2 w-[42%] h-[28%] rounded-full blur-[120px] -z-10" style={{ background: "var(--glow-a)" }} />
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="p-5 rounded-3xl h-fit" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: "var(--accent)" }}>Onboarding</p>
          <h1 className="text-2xl font-semibold mb-2">Organizador</h1>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            Este flujo se muestra una sola vez por cuenta.
          </p>

          <div className="h-2 rounded-full mb-5" style={{ background: "var(--bg-subtle)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress.progressPercent}%`, background: "var(--accent)" }} />
          </div>

          <div className="space-y-2">
            {progress.steps.map((step, index) => {
              const isActive = index === stepIndex;
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
                Paso {stepIndex + 1} de {progress.totalSteps}
              </p>
              <h2 className="text-2xl font-semibold">{activeStep.title}</h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{activeStep.description}</p>
            </div>
            <div className="px-3 py-2 rounded-2xl text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
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
                disabled={stepIndex === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <ArrowLeft className="w-4 h-4" /> Atrás
              </button>
              <button
                onClick={() => onExit(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "transparent", border: "1px solid var(--border)" }}
              >
                Terminar después
              </button>
            </div>

            <button
              onClick={() => {
                if (progress.isComplete && stepIndex === STEP_ORDER.length - 1) {
                  onComplete();
                  return;
                }
                goNext();
              }}
              disabled={!canContinue}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              {primaryLabel}
              {progress.isComplete && stepIndex === STEP_ORDER.length - 1 ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {progress.isComplete && (
            <div
              className="mt-5 p-4 rounded-2xl text-sm flex items-center gap-2"
              style={{ background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.24)", color: "#166534" }}
            >
              <Sparkles className="w-4 h-4" />
              Ya cumpliste los pasos operativos. Puedes finalizar para no volver a ver este onboarding automáticamente.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
