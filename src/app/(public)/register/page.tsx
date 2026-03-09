"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/shared/store/authStore";
import { AuthCard, Field, Input, SubmitBtn } from "@/shared/ui/AuthCard";
import { setAuthSessionCookie } from "@/shared/auth/sessionCookie";

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
  const setAuth = useAuthStore((s) => s.setAuth);
  const resetVolunteerOnboarding = useAuthStore((s) => s.resetVolunteerOnboarding);
  const [tipo, setTipo] = useState<Tipo>("voluntario");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.register({ nombre, email, password, tipo });

      // Auto-login después del registro
      const { access_token } = await authApi.login({ email, password });
      setAuthSessionCookie(access_token);
      useAuthStore.getState().setAuth(access_token, { id: "", email, nombre, is_active: true });

      // Cargar perfil completo (fallo tolerado — el token ya está en el store)
      try {
        const user = await authApi.me();
        setAuth(access_token, user);
      } catch { /* perfil se cargará en próxima navegación */ }

      if (tipo === "voluntario") {
        resetVolunteerOnboarding();
      }
      router.push("/onboarding");
    } catch {
      setError("No se pudo crear tu cuenta. El email puede estar en uso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Crear Cuenta"
      subtitle="Comienza tu prueba gratuita"
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
      <div className="mb-5 grid grid-cols-2 gap-3">
        {TIPO_OPTIONS.map((opt) => {
          const selected = tipo === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              data-testid={`tipo-${opt.value}`}
              onClick={() => setTipo(opt.value)}
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
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre completo">
          <Input data-testid="nombre-input" type="text" value={nombre}
            onChange={(e) => setNombre(e.target.value)} required placeholder="Ana García" />
        </Field>
        <Field label="Email">
          <Input data-testid="email-input" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
        </Field>
        <Field label="Contraseña">
          <Input data-testid="password-input" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" />
        </Field>
        <SubmitBtn data-testid="submit-register" loading={loading}
          label={tipo === "voluntario" ? "Ser Voluntario" : "Crear mi ONG"}
          loadingLabel="Creando cuenta…" />
      </form>
    </AuthCard>
  );
}

