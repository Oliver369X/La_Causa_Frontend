"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { suspend401SessionRedirect } from "@/shared/api/client";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/shared/store/authStore";
import { AuthCard, Field, Input, SubmitBtn } from "@/shared/ui/AuthCard";
import { setAuthSessionCookie } from "@/shared/auth/sessionCookie";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { subscriptionsApi } from "@/features/subscriptions/api/subscriptionsApi";
import { PlanSelectionGrid } from "@/features/subscriptions/ui/PlanSelectionGrid";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Tipo = "voluntario" | "organizador";

const TIPO_OPTIONS: { value: Tipo; label: string; icon: string; desc: string }[] = [
  {
    value: "voluntario",
    label: "Soy Voluntario",
    icon: "🙋",
    desc: "Quiero participar en causas y ganar experiencia",
  },
  {
    value: "organizador",
    label: "Tengo una ONG",
    icon: "🏢",
    desc: "Gestiono una organización y necesito voluntarios",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const resetVolunteerOnboarding = useAuthStore((s) => s.resetVolunteerOnboarding);
  const [tipo, setTipo] = useState<Tipo>("voluntario");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [organizerStep, setOrganizerStep] = useState<"details" | "plans">("details");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: subscriptionsApi.listPlans,
    enabled: tipo === "organizador",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const nombreVal = String(fd.get("nombre") ?? "").trim() || nombre.trim();
    const emailVal = String(fd.get("email") ?? "").trim() || email.trim();
    const passwordVal = String(fd.get("password") ?? "") || password;
    const organizationNameVal = String(fd.get("organizationName") ?? "").trim() || organizationName.trim();
    if (!nombreVal || !emailVal || !passwordVal) {
      setError("Completá todos los campos.");
      return;
    }
    if (passwordVal.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (tipo === "organizador" && !organizationNameVal) {
      setError("Ingresá el nombre de tu organización.");
      return;
    }
    if (tipo === "organizador" && organizerStep === "details") {
      setOrganizerStep("plans");
      return;
    }
    if (tipo === "organizador" && !selectedPlanId) {
      setError("Seleccioná un plan para continuar.");
      return;
    }

    setLoading(true);
    const release401Guard = suspend401SessionRedirect();
    let accountCreated = false;
    let createdOrganizationId: string | null = null;
    try {
      const registeredUser = await authApi.register({ nombre: nombreVal, email: emailVal, password: passwordVal, tipo });
      accountCreated = true;

      // Auto-login después del registro
      const { access_token } = await authApi.login({ email: emailVal, password: passwordVal });
      queryClient.clear();
      useAuthStore.getState().setActiveOrg(null);
      setAuthSessionCookie(access_token);
      setAuth(access_token, registeredUser);

      // Cargar perfil completo (fallo tolerado — el token ya está en el store)
      try {
        const user = await authApi.me();
        setAuth(access_token, user);
      } catch { /* perfil se cargará en próxima navegación */ }

      if (tipo === "voluntario") {
        resetVolunteerOnboarding();
        router.push("/onboarding");
        return;
      }

      const org = await organizationsApi.create({
        nombre: organizationNameVal,
        descripcion: organizationDescription.trim() || undefined,
      });
      createdOrganizationId = org.id;
      useAuthStore.getState().setActiveOrg(org.id);
      await queryClient.invalidateQueries({ queryKey: ["orgs"] });
      const plan = plans.find((item) => item.id === selectedPlanId);
      if (!plan) throw new Error("No se encontró el plan seleccionado.");

      if (Number(plan.precio_mensual) <= 0) {
        await subscriptionsApi.subscribe({ organizacion_id: org.id, plan_id: plan.id });
        await queryClient.invalidateQueries({ queryKey: ["org-subscription", org.id] });
        router.push("/onboarding");
        return;
      }

      const origin = window.location.origin;
      const { checkout_url } = await subscriptionsApi.createCheckoutSession({
        organizacion_id: org.id,
        plan_id: plan.id,
        frecuencia: "mensual",
        success_url: `${origin}/onboarding?checkout_org_id=${encodeURIComponent(org.id)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/subscriptions`,
      });
      window.location.href = checkout_url;
    } catch (err: unknown) {
      const detail = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : err instanceof Error ? err.message : null;
      const message = typeof detail === "string" ? detail : "No se pudo completar el registro. El email puede estar en uso.";
      if (createdOrganizationId) {
        toast.error(`${message} Puedes activar el plan desde Suscripciones.`);
        router.push("/dashboard/subscriptions");
      } else if (accountCreated) {
        toast.error(`${message} Tu cuenta fue creada; completa la organización en el onboarding.`);
        router.push("/onboarding");
      } else {
        setError(message);
      }
    } finally {
      release401Guard();
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={tipo === "organizador" && organizerStep === "plans" ? "Elige el plan de tu organización" : "Crear Cuenta"}
      subtitle={tipo === "organizador" && organizerStep === "plans" ? `${organizationName} · puedes cambiar de plan después` : "Configura tu cuenta y comienza el onboarding"}
      wide={tipo === "organizador" && organizerStep === "plans"}
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>
            Inicia sesión
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-5 p-3.5 rounded-xl text-sm text-red-500"
             style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)" }}>
          {error}
        </div>
      )}

      {/* ── Selector de tipo de cuenta ─────────────────── */}
      {organizerStep === "details" && <div className="mb-5 grid grid-cols-2 gap-3">
        {TIPO_OPTIONS.map((opt) => {
          const selected = tipo === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              data-testid={`tipo-${opt.value}`}
              onClick={() => {
                setTipo(opt.value);
                setOrganizerStep("details");
                setSelectedPlanId(null);
                setError("");
              }}
              className="flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all"
              style={{
                borderColor: selected ? "var(--accent)" : "var(--border)",
                background: selected ? "rgba(var(--accent-rgb),.08)" : "transparent",
              }}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className="text-xs opacity-60">{opt.desc}</span>
            </button>
          );
        })}
      </div>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {tipo === "organizador" && organizerStep === "plans" ? (
          <>
            <PlanSelectionGrid plans={plans} selectedPlanId={selectedPlanId} onSelect={setSelectedPlanId} loading={plansLoading} />
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => setOrganizerStep("details")} className="inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
                <ArrowLeft className="h-4 w-4" /> Cambiar datos
              </button>
              <SubmitBtn data-testid="submit-register" loading={loading} label="Crear cuenta y continuar →" loadingLabel="Creando cuenta y organización…" />
            </div>
            <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
              Semilla se activa inmediatamente. Los planes pagados continuarán en Stripe y regresarán al onboarding.
            </p>
          </>
        ) : <>
        <Field label="Nombre completo">
          <Input data-testid="nombre-input" name="nombre" type="text" autoComplete="name" value={nombre}
            onChange={(e) => setNombre(e.target.value)} placeholder="Ana García" />
        </Field>
        <Field label="Email">
          <Input data-testid="email-input" name="email" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
        </Field>
        <Field label="Contraseña">
          <Input data-testid="password-input" name="password" type="password" autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
        </Field>
        {tipo === "organizador" && (
          <>
            <Field label="Nombre de la organización">
              <Input name="organizationName" type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Fundación Esperanza" />
            </Field>
            <Field label="Descripción de la organización (opcional)">
              <textarea
                value={organizationDescription}
                onChange={(e) => setOrganizationDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                placeholder="¿Qué causa impulsa tu organización?"
              />
            </Field>
          </>
        )}
        <SubmitBtn data-testid="submit-register" loading={loading}
          label={tipo === "voluntario" ? "Ser Voluntario" : "Ver planes →"}
          loadingLabel="Creando cuenta…" />
        </>}
      </form>
    </AuthCard>
  );
}

