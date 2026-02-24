"use client";

import { useState } from "react";
import { RotateCcw, Send, CheckCircle } from "lucide-react";
import { retrospectivesApi, type FeedbackPayload } from "@/features/retrospectives/api/retrospectivesApi";
import { useAuthStore } from "@/shared/store/authStore";
import { eventsApi } from "@/features/events/api/eventsApi";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { TopBar } from "@/shared/ui/Sidebar";

const EMPTY: FeedbackPayload = {
  evento_id: "",
  voluntario_id: "",
  fue_exitoso: true,
  puntaje_rendimiento: 5,
  habilidades_demostradas: [],
  comentarios: "",
};

export default function RetrospectivesPage() {
  const { user, activeOrgId } = useAuthStore();
  const [form, setForm] = useState<FeedbackPayload>({ ...EMPTY, voluntario_id: user?.id ?? "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { data: events = [] } = useQuery({
    queryKey: ["events", activeOrgId],
    queryFn: () => eventsApi.list(activeOrgId ?? undefined),
    enabled: !!activeOrgId,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["event-applications", form.evento_id],
    queryFn: () => eventsApi.listApplications(form.evento_id, "aprobado"),
    enabled: !!form.evento_id,
  });

  const volunteers = applications.map((a) => ({
    id: a.usuario_id,
    nombre: a.usuario_nombre ?? a.usuario_email ?? a.usuario_id,
  }));

  const handleSubmit = async () => {
    if (!form.evento_id.trim() || !form.voluntario_id.trim()) {
      setError("Evento y voluntario son requeridos.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await retrospectivesApi.submitFeedback(form);
      setSuccess(true);
      setForm({ ...EMPTY, voluntario_id: user?.id ?? "" });
    } catch {
      setError("Error al enviar retroalimentación. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar title="Retroalimentación" />
      <div className="p-5 md:p-8 space-y-6 max-w-2xl" style={{ color: "var(--text)" }}>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <RotateCcw className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Retroalimentación
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Envía señales de calidad al modelo de IA para mejorar el matching futuro. Selecciona evento y voluntario.
          </p>
        </div>

        {success && (
          <div
            className="flex items-center gap-3 rounded-xl p-3 text-sm"
            style={{ background: "rgba(34,197,94,.08)", border: "1px solid #22c55e55" }}
          >
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <p>Retroalimentación enviada correctamente. El modelo de IA se actualizará en el próximo ciclo.</p>
          </div>
        )}

        <Card>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Evento *</label>
              <select
                value={form.evento_id}
                onChange={(e) => setForm((f) => ({ ...f, evento_id: e.target.value, voluntario_id: "" }))}
                className="w-full h-9 px-3 text-sm rounded-lg outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">Seleccionar evento…</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nombre} ({new Date(ev.fecha_inicio).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Voluntario *</label>
              <select
                value={form.voluntario_id}
                onChange={(e) => setForm((f) => ({ ...f, voluntario_id: e.target.value }))}
                className="w-full h-9 px-3 text-sm rounded-lg outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">Seleccionar voluntario…</option>
                {volunteers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
              {form.evento_id && volunteers.length === 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No hay voluntarios aprobados en este evento.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>¿El matching fue exitoso?</label>
              <div className="flex gap-3">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    onClick={() => setForm((f) => ({ ...f, fue_exitoso: val }))}
                    className="flex-1 h-9 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: form.fue_exitoso === val ? "var(--accent)" : "var(--bg-subtle)",
                      color: form.fue_exitoso === val ? "#fff" : "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {val ? "✓ Sí" : "✗ No"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium flex justify-between" style={{ color: "var(--text-muted)" }}>
                <span>Puntaje de rendimiento</span>
                <span className="font-bold" style={{ color: "var(--text)" }}>{form.puntaje_rendimiento}/10</span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={form.puntaje_rendimiento}
                onChange={(e) => setForm((f) => ({ ...f, puntaje_rendimiento: Number(e.target.value) }))}
                className="w-full accent-[var(--accent)]"
              />
              <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <span>1 – Muy bajo</span>
                <span>10 – Excelente</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Comentarios</label>
              <textarea
                rows={3}
                value={form.comentarios}
                onChange={(e) => setForm((f) => ({ ...f, comentarios: e.target.value }))}
                placeholder="Notas adicionales sobre la participación…"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none resize-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <Button onClick={handleSubmit} loading={saving} className="w-full">
              <Send className="w-4 h-4" /> Enviar retroalimentación
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
