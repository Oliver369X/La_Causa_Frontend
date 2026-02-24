"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { useAuthStore } from "@/shared/store/authStore";
import { Input, Field } from "@/shared/ui/AuthCard";
import { Building2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const setActiveOrg = useAuthStore((s) => s.setActiveOrg);
  const user = useAuthStore((s) => s.user);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const createMutation = useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: (org) => {
      setActiveOrg(org.id);
      router.push("/dashboard");
    },
  });

  useEffect(() => {
    if (user?.tipo === "voluntario") {
      router.replace("/dashboard");
    }
  }, [router, user?.tipo]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 transition-colors duration-200"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="pointer-events-none fixed top-[10%] left-1/2 -translate-x-1/2 w-[40%] h-[30%] rounded-full blur-[120px] -z-10"
           style={{ background: "var(--glow-a)" }} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
               style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
            <Building2 className="w-8 h-8" style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-3xl font-bold mb-2">Crea tu organización</h1>
          <p style={{ color: "var(--text-muted)" }}>Es tu espacio de trabajo. Podrás invitar miembros después.</p>
        </div>

        <div className="rounded-3xl p-8 sm:p-10"
             style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {createMutation.isError && (
            <div className="mb-5 p-3.5 rounded-xl text-sm text-red-500"
                 style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)" }}>
              No se pudo crear la organización. Inténtalo de nuevo.
            </div>
          )}
          <div className="space-y-4">
            <Field label="Nombre de la organización *">
              <Input
                data-testid="org-nombre-input"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Fundación Esperanza"
              />
            </Field>
            <Field label="Descripción (opcional)">
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-colors"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                placeholder="Breve descripción de tu organización..."
              />
            </Field>
            <button
              data-testid="create-org-btn"
              onClick={() => createMutation.mutate({ nombre, descripcion })}
              disabled={!nombre.trim() || createMutation.isPending}
              className="w-full py-3 rounded-full font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              {createMutation.isPending ? "Creando…" : "Crear y continuar →"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
