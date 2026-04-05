"use client";

import { useState } from "react";
import { AlertTriangle, Send, CheckCircle } from "lucide-react";
import { incidentsApi, type CreateIncidentData, type IncidentTipo } from "@/features/incidents/api/incidentsApi";
import type { UUID } from "@/shared/types";
import { useAuthStore } from "@/shared/store/authStore";
import { eventsApi } from "@/features/events/api/eventsApi";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { TopBar } from "@/shared/ui/Sidebar";

const TIPO_OPTS: { value: IncidentTipo; label: string }[] = [
  { value: "logistica", label: "Logística" },
  { value: "seguridad", label: "Seguridad" },
  { value: "tecnico", label: "Técnico" },
  { value: "conducta", label: "Conducta" },
  { value: "otro", label: "Otro" },
];

const EMPTY: Omit<CreateIncidentData, "evento_id"> = {
  titulo: "",
  descripcion: "",
  tipo: "otro",
};

export default function IncidentsPage() {
  const { activeOrgId } = useAuthStore();
  const [form, setForm] = useState<CreateIncidentData & { evento_id: UUID | "" }>({ ...EMPTY, evento_id: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["events", activeOrgId],
    queryFn: () => eventsApi.list(activeOrgId ?? undefined),
    enabled: !!activeOrgId,
  });

  const handleSubmit = async () => {
    if (!form.evento_id) {
      setError("Selecciona un evento.");
      return;
    }
    if (form.titulo.trim().length < 5) {
      setError("El título debe tener al menos 5 caracteres.");
      return;
    }
    if (form.descripcion.trim().length < 10) {
      setError("La descripción debe tener al menos 10 caracteres.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await incidentsApi.report({ ...form, evento_id: form.evento_id as UUID });
      setSuccess(true);
      setForm({ ...EMPTY, evento_id: "" });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } };
      const detail = axiosErr?.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg ?? "").join(". "));
      } else {
        setError("Error al reportar el incidente. Intenta de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar title="Reporte de incidentes" />
      <div className="p-5 md:p-8 space-y-6 max-w-2xl" style={{ color: "var(--text)" }}>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
            Reporte de incidentes
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Reporta problemas ocurridos durante un evento. Los administradores de la organización recibirán una notificación automática.
          </p>
        </div>

        {success && (
          <div
            className="flex items-center gap-3 rounded-xl p-3 text-sm"
            style={{ background: "rgba(34,197,94,.08)", border: "1px solid #22c55e55" }}
          >
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <p>Incidente reportado. Los administradores fueron notificados.</p>
          </div>
        )}

        <Card>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Evento *</label>
              <select
                value={form.evento_id}
                onChange={(e) => setForm((f) => ({ ...f, evento_id: e.target.value as UUID }))}
                className="w-full h-9 px-3 text-sm rounded-lg outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">Seleccionar evento…</option>
                {loadingEvents ? (
                  <option disabled>Cargando…</option>
                ) : (
                  events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nombre} ({new Date(ev.fecha_inicio).toLocaleDateString()})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Título del incidente * <span className="font-normal">(mín. 5 caracteres)</span></label>
              <input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Resumen breve del problema"
                minLength={5}
                maxLength={200}
                className="w-full h-9 px-3 text-sm rounded-lg outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Descripción * <span className="font-normal">(mín. 10 caracteres)</span></label>
              <textarea
                rows={4}
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Describe el incidente con detalle: qué ocurrió, cuándo, quiénes estuvieron involucrados…"
                minLength={10}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none resize-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Tipo</label>
              <div className="flex flex-wrap gap-2">
                {TIPO_OPTS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setForm((f) => ({ ...f, tipo: t.value }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: form.tipo === t.value ? "var(--accent-soft)" : "var(--bg-subtle)",
                      color: form.tipo === t.value ? "var(--accent)" : "var(--text-muted)",
                      border: `1px solid ${form.tipo === t.value ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <Button onClick={handleSubmit} loading={saving} className="w-full">
              <Send className="w-4 h-4" /> Reportar incidente
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
