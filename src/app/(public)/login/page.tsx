"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/shared/store/authStore";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { AuthCard, Field, Input, SubmitBtn } from "@/shared/ui/AuthCard";
import { setAuthSessionCookie } from "@/shared/auth/sessionCookie";
import { suspend401SessionRedirect } from "@/shared/api/client";
import { API_BASE_URL } from "@/shared/config/env";
import { skillsApi } from "@/features/skills/api/skillsApi";
import { buildVolunteerOnboardingProgress, shouldAutoStartVolunteerOnboarding } from "@/features/onboarding/lib/volunteerOnboarding";

/** Mensaje usable según fallo HTTP/red (evita “credenciales” cuando el problema es CORS/red/build). */
function loginErrorMessage(err: unknown, apiMisconfiguredProduction: boolean): string {
  if (apiMisconfiguredProduction) {
    return "Esta compilación del front no tiene la URL pública del API (NEXT_PUBLIC_API_URL). Pedí un rebuild del front con ese valor HTTPS del backend.";
  }
    if (isAxiosError(err)) {
      const status = err.response?.status;
      const code = err.code;
      if (status === 429) return "Demasiados intentos. Esperá un minuto y probá de nuevo.";
      if (status === 404) {
        return "El login no llegó al API (404). Probablemente NEXT_PUBLIC_API_URL no apunta al backend o la ruta cambió.";
      }
      if (status === 401) return "Credenciales inválidas. Verifica tu email y contraseña.";
      if (status === 422 || status === 403) return "No se pudo iniciar sesión con esos datos. Revisá el formulario.";
    if (status === undefined || code === "ERR_NETWORK") {
      return "No hay respuesta del servidor (red, bloqueo o CORS). Si ya verificaste el backend, revisá que el front use la URL correcta del API.";
    }
  }
  return "Credenciales inválidas. Verifica tu email y contraseña.";
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const volunteerOnboarding = useAuthStore((s) => s.volunteerOnboarding);
  const resetVolunteerOnboarding = useAuthStore((s) => s.resetVolunteerOnboarding);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiMisconfiguredProduction, setApiMisconfiguredProduction] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);

  /** Leemos searchParams desde window.location para no envolver la página en <Suspense>
   *  (en Next 16 ese Suspense puede atascarse mostrando solo el fallback). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cb = new URLSearchParams(window.location.search).get("callbackUrl");
      if (cb) setCallbackUrl(cb);
    } catch {
      // ignore
    }
    if (process.env.NODE_ENV !== "production") return;
    const host = window.location.hostname;
    const localHosts = ["localhost", "127.0.0.1"];
    const looksWrong =
      API_BASE_URL === "" ||
      (API_BASE_URL.includes("localhost") && !localHosts.includes(host));
    setApiMisconfiguredProduction(looksWrong);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    /** Autocompletado / gestores de contraseña a veces llenan el DOM sin actualizar estado React hasta el blur */
    const emailFromDom = String(fd.get("email") ?? "").trim();
    const passwordFromDom = String(fd.get("password") ?? "");
    const loginEmail = emailFromDom || email.trim();
    const loginPassword = passwordFromDom || password;
    let resolvedUser: Awaited<ReturnType<typeof authApi.me>> | null = null;
    const release401Guard = suspend401SessionRedirect();
    try {
      if (!loginEmail || !loginPassword) {
        setError("Completá el email y la contraseña.");
        return;
      }
      // ── 1. Login  ─────────────────────────────────────────────────────────
      // Solo este paso lanza el error de "credenciales inválidas" si falla.
      const { access_token } = await authApi.login({ email: loginEmail, password: loginPassword });
      setAuthSessionCookie(access_token);

      // ── 2. Priming del store con datos básicos para que el interceptor
      //       inyecte el token en la llamada a /auth/me
      useAuthStore.getState().setAuth(access_token, {
        id: "", email: loginEmail, nombre: loginEmail, is_active: true,
      });

      // ── 3. Cargar perfil completo (fallo tolerado) ────────────────────────
      try {
        const user = await authApi.me();
        resolvedUser = user;
        setAuth(access_token, user);
      } catch {
        // /auth/me falló (p.ej. backend lento). El token ya está en el store;
        // el perfil se cargará en la siguiente navegación.
      }

      // ── 4. Auto-cargar la primera organización del usuario ───────────────
      //       Así el dashboard muestra métricas reales en vez de "Sin org".
      try {
        const orgs = await organizationsApi.list();
        if (orgs.length > 0) {
          useAuthStore.getState().setActiveOrg(orgs[0].id);
        }

        if (resolvedUser?.tipo === "voluntario" && resolvedUser.id) {
          const userSkills = await skillsApi.getUserSkills(resolvedUser.id);
          const misSolicitudes = await organizationsApi.listMySolicitudes();
          const progress = buildVolunteerOnboardingProgress({
            user: resolvedUser,
            userSkills,
            organizations: orgs,
            solicitudes: misSolicitudes,
            session: volunteerOnboarding,
          });

          if (shouldAutoStartVolunteerOnboarding(progress, volunteerOnboarding)) {
            router.push("/onboarding");
            return;
          }
        }
      } catch {
        // Sin orgs todavía — el dashboard mostrará el prompt de onboarding.
      }

      if (callbackUrl?.startsWith("/")) {
        router.push(callbackUrl);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError(loginErrorMessage(err, apiMisconfiguredProduction));
    } finally {
      release401Guard();
      setLoading(false);
      if (resolvedUser && resolvedUser.tipo !== "voluntario") {
        resetVolunteerOnboarding();
      }
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
      {apiMisconfiguredProduction && (
        <div
          className="mb-5 p-3.5 rounded-xl text-sm"
          role="alert"
          style={{
            background: "rgba(234,179,8,.1)",
            border: "1px solid rgba(234,179,8,.35)",
            color: "var(--text)",
          }}
        >
          El front compiló sin una URL válida del backend (NEXT_PUBLIC_API_URL). En producción hay que
          reconstruir la imagen con{" "}
          <code className="text-xs">--build-arg NEXT_PUBLIC_API_URL=https://api.tu-dominio…</code>.
        </div>
      )}
      {error && (
        <div className="mb-5 p-3.5 rounded-xl text-sm text-red-500"
             style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)" }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email">
          <Input data-testid="email-input" name="email" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
        </Field>
        <Field label="Contraseña">
          <Input data-testid="password-input" name="password" type="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
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
