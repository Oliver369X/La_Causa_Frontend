"use client";

import Link from "next/link";
import { useAuthStore } from "@/shared/store/authStore";
import { TopBar } from "@/shared/ui/Sidebar";
import { KeyRound, Mail, Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

function copyTextToClipboard(text: string, successMessage = "Copiado al portapapeles") {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(successMessage),
    () => toast.error("No se pudo copiar. Copia manualmente.")
  );
}

export default function VolunteerAccountSettingsPage() {
  const { user } = useAuthStore();

  if (!user || user.tipo !== "voluntario") {
    return (
      <>
        <TopBar title="Ajustes" />
        <div className="flex-1 p-6 max-w-3xl mx-auto">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Esta sección es para voluntarios.{" "}
            <Link href="/dashboard/settings" className="font-medium" style={{ color: "var(--accent)" }}>
              Volver a configuración
            </Link>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Ajustes de cuenta" />
      <div className="flex-1 p-5 sm:p-8 max-w-3xl mx-auto w-full space-y-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-medium mb-2"
          style={{ color: "var(--accent)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Volver a perfil y datos
        </Link>

        <div
          className="p-4 sm:p-5 rounded-2xl"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Cuenta y seguridad
          </h2>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Correo, identificador y contraseña. El tema y cerrar sesión siguen en el pie del menú lateral.
          </p>
        </div>

        <div
          className="p-6 rounded-2xl space-y-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <h3 className="font-semibold">Tu cuenta</h3>
          </div>

          <div
            className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-xl"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <Mail className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Correo de acceso</p>
              <p className="text-sm font-mono break-all">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              Cuenta de voluntario
            </span>
            <button
              type="button"
              onClick={() => copyTextToClipboard(user.id, "ID de usuario copiado")}
              className="text-xs px-3 py-1.5 rounded-lg font-mono"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Copiar mi ID
            </button>
          </div>

          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--accent)" }}
          >
            <KeyRound className="w-4 h-4 shrink-0" />
            Recuperar contraseña
          </Link>
        </div>
      </div>
    </>
  );
}
