"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, CheckCircle, Sparkles, MessageSquare } from "lucide-react";
import { eventsApi } from "@/features/events/api/eventsApi";
import { extractApiDetail } from "@/shared/utils/apiError";
import { toast } from "sonner";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { TopBar } from "@/shared/ui/Sidebar";

export default function RetroVoluntarioPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const qc = useQueryClient();
  const [queBien, setQueBien] = useState("");
  const [queMejorar, setQueMejorar] = useState("");
  const [accion, setAccion] = useState("");

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventsApi.getById(eventId),
    enabled: !!eventId,
  });

  const { data: obligations = [] } = useQuery({
    queryKey: ["feedback-obligations", eventId],
    queryFn: () => eventsApi.getMyFeedbackObligations(eventId),
    enabled: !!eventId,
  });

  const { data: submittedRetro } = useQuery({
    queryKey: ["my-volunteer-retrospective", eventId],
    queryFn: () => eventsApi.getMyVoluntarioRetro(eventId),
    enabled: !!eventId,
  });

  const pendingVol = obligations.some((o) => o.tipo === "voluntario_retro" && o.estado === "pendiente");

  const submitMutation = useMutation({
    mutationFn: () =>
      eventsApi.submitVoluntarioRetro(eventId, {
        que_bien: queBien.trim(),
        que_mejorar: queMejorar.trim(),
        accion: accion.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback-obligations", eventId] });
      qc.invalidateQueries({ queryKey: ["my-volunteer-retrospective", eventId] });
      qc.invalidateQueries({ queryKey: ["retrospectiva", eventId] });
      qc.invalidateQueries({ queryKey: ["volunteer-retrospectives", eventId] });
      toast.success("¡Reflexión registrada con éxito!");
    },
    onError: (err: unknown) => {
      toast.error(extractApiDetail(err, "No se pudo enviar la retrospectiva."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queBien.trim() || !queMejorar.trim() || !accion.trim()) return;
    submitMutation.mutate();
  };

  return (
    <>
      <TopBar title="Tu retrospectiva" />
      <div className="p-5 md:p-8 space-y-6 max-w-2xl" style={{ color: "var(--text)" }}>
        <Link
          href={`/dashboard/events/${eventId}`}
          className="inline-flex items-center gap-1 text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Volver al evento
        </Link>

        {isLoading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando…</p>
        ) : (
          <div className="space-y-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: "var(--accent)" }} />
              Reflexión personal
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {event?.nombre} — completá las tres columnas tras el cierre del evento.
            </p>
          </div>
        )}

        {!pendingVol && !submittedRetro && !submitMutation.isSuccess && (
          <Card className="p-5 text-sm space-y-3" style={{ color: "var(--text-muted)" }}>
            <p>No tenés una retrospectiva obligatoria pendiente para este evento, o ya fue registrada.</p>
            <Link
              href={`/dashboard/events/${eventId}/retrospectiva`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "var(--accent)", color: "#ffffff" }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ver retrospectiva del evento
            </Link>
          </Card>
        )}

        {submitMutation.isSuccess && (
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 rounded-xl p-4 text-sm"
              style={{ background: "rgba(34,197,94,.08)", border: "1px solid #22c55e55" }}
            >
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-green-600 dark:text-green-400">¡Reflexión registrada con éxito!</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Tus respuestas se han añadido al tablero de retrospectiva del evento.
                </p>
              </div>
            </div>
            <Link
              href={`/dashboard/events/${eventId}/retrospectiva`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
              style={{ background: "var(--accent)", color: "#ffffff" }}
            >
              <Sparkles className="w-4 h-4" />
              Ver retrospectiva del evento
            </Link>
          </div>
        )}

        {submittedRetro && !submitMutation.isSuccess && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-5 h-5" />
                <p className="font-semibold text-sm">Tu reflexión ya fue registrada</p>
              </div>
              <Link
                href={`/dashboard/events/${eventId}/retrospectiva`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Ver tablero completo
              </Link>
            </div>
            <div className="p-3.5 rounded-xl space-y-1" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>¿Qué salió bien?</p>
              <p className="text-sm">{submittedRetro.que_bien}</p>
            </div>
            <div className="p-3.5 rounded-xl space-y-1" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>¿Qué mejorar?</p>
              <p className="text-sm">{submittedRetro.que_mejorar}</p>
            </div>
            <div className="p-3.5 rounded-xl space-y-1" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Acción propuesta</p>
              <p className="text-sm">{submittedRetro.accion}</p>
            </div>
          </Card>
        )}

        {(pendingVol || (!submittedRetro && !submitMutation.isSuccess)) && (
          <form onSubmit={handleSubmit}>
            <Card className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text)" }}>¿Qué salió bien? *</label>
                <textarea
                  required
                  rows={3}
                  value={queBien}
                  onChange={(e) => setQueBien(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none resize-none transition-all"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                  placeholder="Logros, clima del equipo, claridad de tareas…"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text)" }}>¿Qué mejorarías? *</label>
                <textarea
                  required
                  rows={3}
                  value={queMejorar}
                  onChange={(e) => setQueMejorar(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none resize-none transition-all"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                  placeholder="Fricciones, comunicación, recursos o logística…"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text)" }}>Una acción concreta para la próxima vez *</label>
                <textarea
                  required
                  rows={2}
                  value={accion}
                  onChange={(e) => setAccion(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none resize-none transition-all"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                  placeholder="Compromiso personal o recomendación para la organización…"
                />
              </div>
              {submitMutation.isError && (
                <p className="text-xs text-red-500">
                  {extractApiDetail(submitMutation.error, "No se pudo enviar. Intentá de nuevo.")}
                </p>
              )}
              <Button type="submit" className="w-full" loading={submitMutation.isPending}>
                <Send className="w-4 h-4" /> Enviar retrospectiva
              </Button>
            </Card>
          </form>
        )}
      </div>
    </>
  );
}
