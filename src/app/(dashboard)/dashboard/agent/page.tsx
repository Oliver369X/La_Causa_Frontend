"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { agentApi, type ChatMessage, type ChatResponse } from "@/features/agent/api/agentApi";
import { useAuthStore } from "@/shared/store/authStore";
import { TopBar } from "@/shared/ui/Sidebar";
import { Send, Bot, User2, Loader2, AlertTriangle, CheckCircle, CreditCard, ThumbsUp } from "lucide-react";
import { AgentFeedbackModal } from "@/features/agent/components/AgentFeedbackModal";

interface Message {
  role: "user" | "assistant";
  content: string;
  pending?: ChatResponse["pending_confirmation"];
  actions?: string[];
}

function Bubble({
  msg,
  onConfirm,
  onFeedback,
  inferenceInput,
}: {
  msg: Message;
  onConfirm?: (id: string) => void;
  onFeedback?: (input: string, output: string) => void;
  inferenceInput?: string;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: isUser ? "var(--accent)" : "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {isUser ? <User2 className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4" style={{ color: "var(--accent)" }} />}
      </div>
      <div className={`max-w-[75%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={{
            background: isUser ? "var(--accent)" : "var(--bg-card)",
            color: isUser ? "white" : "var(--text)",
            border: isUser ? "none" : "1px solid var(--border)",
          }}
        >
          {msg.content}
        </div>

        {/* Actions taken */}
        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {msg.actions.map((a, i) => (
              <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <CheckCircle className="w-3 h-3" />
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Pending confirmation */}
        {msg.pending && onConfirm && (
          <div className="p-4 rounded-2xl max-w-full" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-semibold">Confirmación requerida</p>
            </div>
            <p className="text-xs mb-1 font-medium">{msg.pending.accion}</p>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{msg.pending.descripcion}</p>
            {msg.pending.impacto.length > 0 && (
              <ul className="text-xs space-y-1 mb-3" style={{ color: "var(--text-muted)" }}>
                {msg.pending.impacto.map((imp, i) => <li key={i}>• {imp}</li>)}
              </ul>
            )}
            <button
              onClick={() => onConfirm(msg.pending!.confirmation_id)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              Confirmar acción
            </button>
          </div>
        )}

        {/* Feedback CTA — solo en respuestas del asistente */}
        {!isUser && onFeedback && inferenceInput && (
          <button
            onClick={() => onFeedback(inferenceInput, msg.content)}
            className="flex items-center gap-1.5 mt-2 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            ¿Te fue útil esta respuesta?
          </button>
        )}
      </div>
    </div>
  );
}

export default function AgentPage() {
  const { activeOrgId } = useAuthStore();
  const [access, setAccess] = useState<{ can_use: boolean; reason?: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "¡Hola! Soy el Agente IA. Puedo ayudarte a gestionar tu organización: crear eventos, asignar tareas, buscar voluntarios y más. ¿En qué te puedo ayudar?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ input: string; output: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    agentApi.getAccess(activeOrgId ?? null)
      .then((r) => setAccess({ can_use: r.can_use, reason: r.reason }))
      .catch(() => setAccess({ can_use: false, reason: "sin_organizacion" }));
  }, [activeOrgId]);

  const sendMessage = async (text: string, confirmed?: boolean, confirmationId?: string) => {
    if (!text.trim() && !confirmationId) return;
    setLoading(true);

    const userMsg: Message = { role: "user", content: text };
    if (!confirmationId) setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await agentApi.chat(text, sessionId, activeOrgId ?? null, confirmed, confirmationId);
      setSessionId(res.session_id);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          pending: res.pending_confirmation ?? undefined,
          actions: res.actions_taken,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Lo siento, hubo un error al procesar tu solicitud. Inténtalo de nuevo." },
      ]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  const handleConfirm = (confirmationId: string) => {
    sendMessage("Confirmado", true, confirmationId);
  };

  // Cargando verificación de acceso
  if (access === null) {
    return (
      <>
        <TopBar title="Agente IA" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      </>
    );
  }

  // Restricción: solo organizadores con plan de pago
  if (!access.can_use) {
    const isVolunteer = access.reason === "voluntario";
    const needsPlan = access.reason === "sin_plan_pago";
    const noOrg = access.reason === "sin_organizacion";
    return (
      <>
        <TopBar title="Agente IA" />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div
            className="max-w-md p-6 rounded-2xl text-center space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <AlertTriangle className="w-12 h-12 mx-auto" style={{ color: "var(--accent)" }} />
            <h2 className="text-lg font-semibold">Acceso restringido</h2>
            {isVolunteer && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                El Agente IA está disponible solo para organizadores con plan de pago. Como voluntario no tienes acceso a esta función.
              </p>
            )}
            {needsPlan && (
              <>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Tu organización necesita un plan de pago activo para usar el Agente IA.
                </p>
                <Link
                  href="/dashboard/subscriptions"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{ background: "var(--accent)" }}
                >
                  <CreditCard className="w-4 h-4" />
                  Ver planes y suscribirse
                </Link>
              </>
            )}
            {noOrg && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Selecciona o crea una organización para acceder al Agente IA.
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Agente IA" />
      <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          {messages.map((msg, i) => {
            const prevUserMsg = [...messages.slice(0, i)].reverse().find((m) => m.role === "user");
            return (
              <Bubble
                key={i}
                msg={msg}
                onConfirm={msg.pending ? handleConfirm : undefined}
                onFeedback={msg.role === "assistant" ? (input, output) => setFeedbackModal({ input, output }) : undefined}
                inferenceInput={msg.role === "assistant" ? prevUserMsg?.content : undefined}
              />
            );
          })}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <Bot className="w-4 h-4" style={{ color: "var(--accent)" }} />
              </div>
              <div className="px-4 py-3 rounded-2xl flex items-center gap-2 text-sm"
                   style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Pensando…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 sm:px-8 pb-6 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje…"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none disabled:opacity-50"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 rounded-xl transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", color: "white" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <AgentFeedbackModal
        open={!!feedbackModal}
        onClose={() => setFeedbackModal(null)}
        inferenceInput={feedbackModal?.input ?? ""}
        inferenceOutput={feedbackModal?.output ?? ""}
        sessionId={sessionId}
        orgId={activeOrgId ?? null}
      />
    </>
  );
}
