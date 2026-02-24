"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/features/auth/api/authApi";
import { AuthCard, Field, Input, SubmitBtn } from "@/shared/ui/AuthCard";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || token.length < 20) {
      setError("Enlace inválido. Solicita uno nuevo desde Recuperar contraseña.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("El enlace ha expirado o no es válido. Solicita uno nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthCard
        title="Contraseña actualizada"
        subtitle="Redirigiendo al login…"
        footer={
          <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>
            Ir a Iniciar sesión
          </Link>
        }
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Tu contraseña ha sido restablecida correctamente.
        </p>
      </AuthCard>
    );
  }

  if (!token || token.length < 20) {
    return (
      <AuthCard
        title="Enlace inválido"
        subtitle="Solicita un nuevo enlace de recuperación"
        footer={
          <Link href="/forgot-password" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>
            Recuperar contraseña
          </Link>
        }
      >
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          El enlace que seguiste no es válido o ha expirado. Por seguridad, los enlaces expiran en 1 hora.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full py-3 rounded-full font-semibold text-sm text-center"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Solicitar nuevo enlace
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Nueva contraseña"
      subtitle="Elige una contraseña segura"
      footer={
        <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>
          Volver al inicio de sesión
        </Link>
      }
    >
      {error && (
        <div className="mb-5 p-3.5 rounded-xl text-sm text-red-500"
             style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)" }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nueva contraseña">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirmar contraseña">
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
          />
        </Field>
        <SubmitBtn loading={loading} label="Restablecer contraseña" loadingLabel="Guardando…" />
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <p>Cargando…</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
