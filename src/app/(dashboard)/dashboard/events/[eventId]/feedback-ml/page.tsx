"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send, CheckCircle, AlertTriangle } from "lucide-react";
import { eventsApi } from "@/features/events/api/eventsApi";
import { retrospectivesApi, type FeedbackPayload } from "@/features/retrospectives/api/retrospectivesApi";
import { usePermissions } from "@/shared/hooks/usePermissions";
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

export default function EventFeedbackMLPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const { can, isSuperAdmin } = usePermissions();
  const canManage = isSuperAdmin || can("createEvents") || can("assignTasks");

  const [form, setForm] = useState<FeedbackPayload>(() => ({ ...EMPTY, evento_id: eventId }));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventsApi.getById(eventId),
    enabled: !!eventId,
  });

  const { data: obligations = [] } = useQuery({
    queryKey: ["feedback-obligations", eventId],
    queryFn: () => eventsApi.getMyFeedbackObligations(eventId),
    enabled: !!eventId,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["event-applications", eventId],
    queryFn: () => eventsApi.listApplications(eventId, "aprobado"),
    enabled: !!eventId && canManage,
  });

  const volunteers = applications.map((a) => ({
    id: a.usuario_id,
    nombre: a.usuario_nombre ?? a.usuario_email ?? a.usuario_id,
  }));

  const pendingMl = obligations.some((o) => o.tipo === "ml_eval" && o.estado === "pendiente");

  const handleSubmit = async () => {
    if (!form.voluntario_id.trim()) {
      setError("Seleccioná un voluntario aprobado en el evento.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await retrospectivesApi.submitFeedback({ ...form, evento_id: eventId });
      setSuccess(true);
      setForm({ ...EMPTY, evento_id: eventId });
    } catch {
      setError("No se pudo enviar. Verificá que tengas permiso de gestión y que el voluntario esté aprobado.");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <>
        <TopBar title="Retroalimentación ML" />
        <div className="p-6 md:p-8 max-w-lg">
          <Card className="p-6">
            <p className="text-sm" style={{ color: "var(--text)" }}>
              Solo el equipo de gestión de la organización puede enviar esta evaluación para el modelo de matching.
            </p>
            <Link href={`/dashboard/events/${eventId}`} className="mt-4 inline-block text-sm font-medium underline" style={{ color: "var(--accent)" }}>
              Volver al evento
            </Link>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Retroalimentación para matching" />
      <div className="p-5 md:p-8 space-y-6 max-w-2xl" style={{ color: "var(--text)" }}>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/events/${eventId}`}
            className="inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: "var(--accent)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Evento
          </Link>
        </div>

        {loadingEvent ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando…</p>
        ) : (
          <div>
            <h1 className="text-xl font-bold">Evaluación post-evento (ML)</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {event?.nombre} — señales para mejorar el matching futuro. Una entrada por voluntario que quieras etiquetar.
            </p>
          </div>
        )}

        {pendingMl && (
          <div
            className="flex items-start gap-3 rounded-xl p-3 text-sm"
            style={{ background: "rgba(234,179,8,.12)", border: "1px solid rgba(234,179,8,.35)" }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <p>Tenés una obligación pendiente de completar retroalimentación para este evento.</p>
          </div>
        )}

        {success && (
          <div
            className="flex items-center gap-3 rounded-xl p-3 text-sm"
            style={{ background: "rgba(34,197,94,.08)", border: "1px solid #22c55e55" }}
          >
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <p>Enviado. El modelo usará esta etiqueta en el próximo ciclo de entrenamiento.</p>
          </div>
        )}

        <Card>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Voluntario *</label>
              <select
                value={form.voluntario_id}
                onChange={(e) => setForm((f) => ({ ...f, voluntario_id: e.target.value }))}
                className="w-full h-10 px-3 text-sm rounded-lg outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">Seleccionar voluntario aprobado…</option>
                {volunteers.map((v) => (
                  <option key={v.id} value={v.id}>{v.nombre}</option>
                ))}
              </select>
              {volunteers.length === 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No hay participantes aprobados en este evento.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>¿El desempeño fue acorde al rol?</label>
              <div className="flex gap-3">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, fue_exitoso: val }))}
                    className="flex-1 h-10 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: form.fue_exitoso === val ? "var(--accent)" : "var(--bg-subtle)",
                      color: form.fue_exitoso === val ? "#fff" : "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {val ? "Sí" : "No"}
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
                rows={4}
                value={form.comentarios}
                onChange={(e) => setForm((f) => ({ ...f, comentarios: e.target.value }))}
                placeholder="Contexto útil para el modelo (logística, actitud, incidencias…)"
                className="w-full px-3 py-2.5 text-sm rounded-lg outline-none resize-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <Button onClick={handleSubmit} loading={saving} className="w-full">
              <Send className="w-4 h-4" /> Enviar evaluación
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
