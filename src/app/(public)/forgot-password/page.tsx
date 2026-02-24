"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/features/auth/api/authApi";
import { AuthCard, Field, Input, SubmitBtn } from "@/shared/ui/AuthCard";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch {
      setError("No pudimos procesar la solicitud. Verifica tu email e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthCard
        title="Correo enviado"
        subtitle="Revisa tu bandeja de entrada"
        footer={
          <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>
            Volver al inicio de sesión
          </Link>
        }
      >
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Si existe una cuenta con <strong>{email}</strong>, recibirás un correo con un enlace para restablecer tu contraseña.
          Revisa también la carpeta de spam.
        </p>
        <Link
          href="/login"
          className="block w-full py-3 rounded-full font-semibold text-sm text-center"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Ir a Iniciar sesión
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Ingresa tu email y te enviaremos un enlace"
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
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tu@email.com"
          />
        </Field>
        <SubmitBtn loading={loading} label="Enviar enlace" loadingLabel="Enviando…" />
      </form>
    </AuthCard>
  );
}
