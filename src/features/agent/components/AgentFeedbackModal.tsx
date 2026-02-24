"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { mlFeedbackApi } from "@/features/ml/api/mlFeedbackApi";
import { useAuthStore } from "@/shared/store/authStore";

interface AgentFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  inferenceInput: string;
  inferenceOutput: string;
  sessionId: string | null;
  orgId: string | null;
}

const ERROR_TYPES = [
  { value: "factual", label: "Información incorrecta" },
  { value: "irrelevant", label: "Respuesta irrelevante" },
  { value: "unsafe", label: "Contenido inapropiado" },
  { value: "other", label: "Otro" },
] as const;

export function AgentFeedbackModal({
  open,
  onClose,
  onSuccess,
  inferenceInput,
  inferenceOutput,
  sessionId,
  orgId,
}: AgentFeedbackModalProps) {
  const { user } = useAuthStore();
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [errorType, setErrorType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (helpful === null) {
      setError("Indica si la respuesta te fue útil.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await mlFeedbackApi.submitInferenceFeedback({
        source: "agent",
        session_id: sessionId ?? undefined,
        org_id: orgId ?? undefined,
        user_id: user?.id,
        inference_input: inferenceInput,
        inference_output: inferenceOutput,
        helpful,
        score,
        comment: comment.trim() || undefined,
        error_type: errorType ? (errorType as "factual" | "irrelevant" | "unsafe" | "other") : undefined,
      });
      onSuccess?.();
      onClose();
      setHelpful(null);
      setScore(5);
      setComment("");
      setErrorType(null);
    } catch {
      setError("Error al enviar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setHelpful(null);
    setScore(5);
    setComment("");
    setErrorType(null);
    setError("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="¿Te fue útil esta respuesta?"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            <Send className="w-4 h-4" /> Enviar
          </Button>
        </div>
      }
    >
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        Tu retroalimentación ayuda a mejorar el modelo de IA.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            ¿Fue útil?
          </label>
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={() => setHelpful(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: helpful === true ? "var(--accent)" : "var(--bg-subtle)",
                color: helpful === true ? "#fff" : "var(--text-muted)",
                border: `1px solid ${helpful === true ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              <ThumbsUp className="w-4 h-4" /> Sí
            </button>
            <button
              onClick={() => setHelpful(false)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: helpful === false ? "#ef4444" : "var(--bg-subtle)",
                color: helpful === false ? "#fff" : "var(--text-muted)",
                border: `1px solid ${helpful === false ? "#ef4444" : "var(--border)"}`,
              }}
            >
              <ThumbsDown className="w-4 h-4" /> No
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium flex justify-between" style={{ color: "var(--text-muted)" }}>
            <span>Puntaje (1-5)</span>
            <span className="font-bold" style={{ color: "var(--text)" }}>{score}</span>
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-full mt-1 accent-[var(--accent)]"
          />
        </div>

        {helpful === false && (
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Tipo de error (opcional)
            </label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {ERROR_TYPES.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setErrorType(errorType === e.value ? null : e.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: errorType === e.value ? "var(--accent-soft)" : "var(--bg-subtle)",
                    color: errorType === e.value ? "var(--accent)" : "var(--text-muted)",
                    border: `1px solid ${errorType === e.value ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Comentario (opcional)
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Qué podríamos mejorar…"
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg outline-none resize-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
