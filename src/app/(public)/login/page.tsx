"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/shared/store/authStore";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { AuthCard, Field, Input, SubmitBtn } from "@/shared/ui/AuthCard";
import { setAuthSessionCookie } from "@/shared/auth/sessionCookie";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // ── 1. Login  ─────────────────────────────────────────────────────────
      // Solo este paso lanza el error de "credenciales inválidas" si falla.
      const { access_token } = await authApi.login({ email, password });

      // ── 2. Priming del store con datos básicos para que el interceptor
      //       inyecte el token en la llamada a /auth/me
      useAuthStore.getState().setAuth(access_token, {
        id: "", email, nombre: email, is_active: true,
      });

      // ── 3. Cargar perfil completo (fallo tolerado) ────────────────────────
      try {
        const user = await authApi.me();
        setAuth(access_token, user);
      } catch {
        // /auth/me falló (p.ej. backend lento). El token ya está en el store;
        // el perfil se cargará en la siguiente navegación.
      }

      setAuthSessionCookie();

      // ── 4. Auto-cargar la primera organización del usuario ───────────────
      //       Así el dashboard muestra métricas reales en vez de "Sin org".
      try {
        const orgs = await organizationsApi.list();
        if (orgs.length > 0) {
          useAuthStore.getState().setActiveOrg(orgs[0].id);
        }
      } catch {
        // Sin orgs todavía — el dashboard mostrará el prompt de onboarding.
      }

      router.push("/dashboard");
    } catch {
      // Solo llega aquí si el paso de LOGIN falló (401 / 422)
      setError("Credenciales inválidas. Verifica tu email y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Iniciar Sesión"
      subtitle="Bienvenido de vuelta"
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>
            Regístrate gratis
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <Input data-testid="email-input" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
        </Field>
        <Field label="Contraseña">
          <Input data-testid="password-input" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
        </Field>
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <SubmitBtn data-testid="submit-login" loading={loading} label="Iniciar Sesión" loadingLabel="Entrando…" />
      </form>
    </AuthCard>
  );
}
