"use client";

import { useState, useRef, useEffect, type MouseEvent } from "react";
import Link from "next/link";
import {
  agentApi,
  type AgentActionLog,
  type AgentUsageSnapshot,
  type ChatAttachment,
  type ChatResponse,
  type ConversationSummary,
  type QuickReplyItem,
} from "@/features/agent/api/agentApi";
import { uploadAudio, uploadDocument, uploadImage } from "@/features/uploads/api/uploadApi";
import { useAuthStore } from "@/shared/store/authStore";
import { TopBar } from "@/shared/ui/Sidebar";
import {
  Send,
  Bot,
  User2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  ThumbsUp,
  MessageSquarePlus,
  Sparkles,
  Paperclip,
  Mic,
  FileText,
  X,
  Trash2,
  Pencil,
  Menu,
  MessageSquare,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentFeedbackModal } from "@/features/agent/components/AgentFeedbackModal";
import { cn } from "@/shared/utils/utils";

const WELCOME_ASSISTANT =
  "¡Hola! Soy tu **asistente ejecutivo**: diseño contigo eventos completos (fechas, cupo, tareas y publicación), reviso entregas con contexto y coordino voluntarios. Puedes **adjuntar imágenes, PDF o audio** (o dictar con el micrófono). Si falta un dato, te haré preguntas concretas y podrás elegir opciones con un clic. ¿Por dónde empezamos?";

function parseUserContent(content: string): { text: string; attachments: { kind: string; url: string }[] } {
  const attachments: { kind: string; url: string }[] = [];
  const marker = "\n## Adjuntos\n";
  const idx = content.indexOf(marker);
  if (idx === -1) return { text: content, attachments };
  const text = content.slice(0, idx).trim();
  const rest = content.slice(idx + marker.length);
  for (const line of rest.split("\n")) {
    const m = line.match(/^- (image|document|audio): (.+)$/);
    if (m) attachments.push({ kind: m[1], url: m[2].trim() });
  }
  return { text, attachments };
}

function buildUserDisplayContent(text: string, attachments: ChatAttachment[]): string {
  const lines: string[] = [];
  if (text.trim()) lines.push(text.trim());
  if (attachments.length) {
    lines.push("## Adjuntos");
    for (const a of attachments) {
      lines.push(`- ${a.kind}: ${a.url}`);
    }
  }
  return lines.join("\n");
}

interface Message {
  role: "user" | "assistant";
  content: string;
  pending?: ChatResponse["pending_confirmation"];
  actions?: AgentActionLog[];
  quick_replies?: QuickReplyItem[];
  trace_id?: string;
  model_provider?: string;
  model_name?: string;
  /** Respuesta por límite mensual de tokens alcanzado */
  quota_exceeded?: boolean;
}

function formatAgentUsageLine(u: AgentUsageSnapshot): string {
  const tokens = u.month_total_tokens.toLocaleString();
  const cost = u.month_cost_usd.toFixed(4);
  const q = u.month_quota_tokens;
  if (q == null) {
    return `${tokens} tokens · ~$${cost} este mes`;
  }
  return `${tokens} / ${q.toLocaleString()} tokens · ~$${cost} este mes`;
}

const STARTER_PROMPTS = [
  "Quiero crear un evento de voluntariado para el próximo fin de semana",
  "Muéstrame las tareas pendientes de revisión",
  "Busca voluntarios en mi organización para una jornada de unas 4 horas",
  "Ayúdame a preparar la revisión de entregas con evidencia",
] as const;

function UserBubbleBody({ content }: { content: string }) {
  const { text, attachments } = parseUserContent(content);
  return (
    <div className="space-y-2 min-w-0">
      {attachments.length > 0 && (
        <div className="flex flex-col gap-2">
          {attachments.map((a, i) => {
            if (a.kind === "image") {
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={a.url}
                  alt=""
                  className="max-w-full max-h-48 rounded-lg object-contain border border-white/20"
                />
              );
            }
            if (a.kind === "audio") {
              return (
                <audio key={i} src={a.url} controls className="w-full max-w-md h-9" />
              );
            }
            return (
              <a
                key={i}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs underline break-all opacity-95 hover:opacity-100"
              >
                <FileText className="w-4 h-4 shrink-0" />
                Ver documento
              </a>
            );
          })}
        </div>
      )}
      {text ? <span className="whitespace-pre-wrap break-words">{text}</span> : null}
      {!text && attachments.length === 0 ? <span className="opacity-80">(mensaje vacío)</span> : null}
    </div>
  );
}

function Bubble({
  msg,
  onConfirm,
  onFeedback,
  onQuickReply,
  inferenceInput,
}: {
  msg: Message;
  onConfirm?: (id: string) => void;
  onFeedback?: (payload: {
    input: string;
    output: string;
    traceId?: string;
    modelProvider?: string;
    modelName?: string;
  }) => void;
  onQuickReply?: (sendText: string) => void;
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
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? "" : "agent-markdown"}`}
          style={{
            background: isUser ? "var(--accent)" : "var(--bg-card)",
            color: isUser ? "white" : "var(--text)",
            border: isUser
              ? "none"
              : msg.quota_exceeded
                ? "2px solid rgb(251 191 36)"
                : "1px solid var(--border)",
          }}
        >
          {isUser ? (
            <UserBubbleBody content={msg.content} />
          ) : (
            <>
              {msg.quota_exceeded && (
                <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "rgb(180 83 9)" }}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Límite mensual alcanzado
                </p>
              )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="ml-2">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--bg-subtle)" }}>
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="overflow-x-auto p-3 rounded-lg text-xs my-2" style={{ background: "var(--bg-subtle)" }}>
                    {children}
                  </pre>
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
            </>
          )}
        </div>

        {/* Respuestas rápidas (desde tool_offer_quick_replies) */}
        {!isUser && msg.quick_replies && msg.quick_replies.length > 0 && onQuickReply && (
          <div className="flex flex-wrap gap-2 mt-1 max-w-full">
            {msg.quick_replies.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => onQuickReply(q.send_text)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                }}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        {/* Actions taken */}
        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {msg.actions.map((a, i) => (
              <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <CheckCircle className="w-3 h-3" />
                {a.tool}: {a.result}
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
            onClick={() =>
              onFeedback({
                input: inferenceInput,
                output: msg.content,
                traceId: msg.trace_id,
                modelProvider: msg.model_provider,
                modelName: msg.model_name,
              })
            }
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

function AgentConversationList({
  conversations,
  sessionId,
  getLabel,
  onSelect,
  onRename,
  onDelete,
}: {
  conversations: ConversationSummary[];
  sessionId: string | null;
  getLabel: (c: ConversationSummary) => string;
  onSelect: (sid: string) => void;
  onRename: (sid: string, e: MouseEvent) => void;
  onDelete: (sid: string, e: MouseEvent) => void;
}) {
  return (
    <>
      {conversations.length === 0 && (
        <div
          className="rounded-2xl border border-dashed px-5 py-10 text-center"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        >
          <MessageSquare className="mx-auto mb-3 h-9 w-9 opacity-35" style={{ color: "var(--text-muted)" }} aria-hidden />
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Aún no hay chats
          </p>
          <p className="mt-2 text-xs leading-relaxed max-w-[14rem] mx-auto" style={{ color: "var(--text-muted)" }}>
            Escribe abajo para empezar. Podrás renombrar o eliminar desde aquí.
          </p>
        </div>
      )}
      {conversations.map((c) => {
        const active = sessionId === c.session_id;
        return (
          <div
            key={c.session_id}
            role="presentation"
            className={[
              "rounded-2xl border transition-shadow duration-150",
              active ? "shadow-sm" : "hover:shadow-sm",
            ].join(" ")}
            style={{
              borderColor: "var(--border)",
              background: active ? "var(--accent-soft)" : "var(--bg-card)",
              boxShadow: active ? "inset 4px 0 0 0 var(--accent)" : undefined,
            }}
          >
            <div className="flex flex-col gap-3 p-4">
              <button
                type="button"
                onClick={() => onSelect(c.session_id)}
                className="w-full text-left transition-opacity hover:opacity-90"
                style={{ color: "var(--text)" }}
              >
                <p className="text-sm font-semibold leading-snug line-clamp-3">{getLabel(c)}</p>
              </button>
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <span className="text-[11px] font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
                  {c.message_count} {c.message_count === 1 ? "mensaje" : "mensajes"}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="Renombrar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.05]"
                    style={{ color: "var(--text-muted)" }}
                    onClick={(e) => onRename(c.session_id, e)}
                    aria-label="Renombrar conversación"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Eliminar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-red-500/[0.08]"
                    style={{ color: "var(--text-muted)" }}
                    onClick={(e) => onDelete(c.session_id, e)}
                    aria-label="Eliminar conversación"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function AgentPage() {
  const { activeOrgId } = useAuthStore();
  const [access, setAccess] = useState<{ can_use: boolean; reason?: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME_ASSISTANT },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [usage, setUsage] = useState<AgentUsageSnapshot | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRef = useRef<{ stop: () => void } | null>(null);
  /** Texto del input al pulsar el micrófono (no se pierde al dictar). */
  const speechBaseRef = useRef("");
  /** El usuario sigue en modo dictado hasta que pulsa otra vez el micrófono (reinicio tras pausas en Edge/Chrome). */
  const micKeepAliveRef = useRef(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    input: string;
    output: string;
    traceId?: string;
    modelProvider?: string;
    modelName?: string;
  } | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionStorageKey = `agent-session:${activeOrgId ?? "no-org"}`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSpeechSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }, []);

  // Restaurar conversación guardada solo al montar / cambiar org (no al crear sesión tras el primer envío).
  useEffect(() => {
    if (!access?.can_use || !activeOrgId || typeof window === "undefined") return;
    const saved = window.localStorage.getItem(sessionStorageKey);
    if (!saved) return;
    setSessionId(saved);
    setBootstrapping(true);
    agentApi
      .getConversationMessages(saved, activeOrgId)
      .then((res) => {
        if (res.messages.length > 0) {
          setMessages(
            res.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              actions: m.actions,
              quick_replies: m.quick_replies,
            }))
          );
        } else {
          setMessages([{ role: "assistant", content: WELCOME_ASSISTANT }]);
        }
      })
      .catch(() => {
        /* mantener estado actual */
      })
      .finally(() => setBootstrapping(false));
  }, [access?.can_use, activeOrgId, sessionStorageKey]);

  useEffect(() => {
    agentApi.getAccess(activeOrgId ?? null)
      .then((r) => setAccess({ can_use: r.can_use, reason: r.reason }))
      .catch(() => setAccess({ can_use: false, reason: "sin_organizacion" }));
  }, [activeOrgId]);

  useEffect(() => {
    if (!access?.can_use || !activeOrgId) return;
    agentApi.listConversations(activeOrgId).then(setConversations).catch(() => setConversations([]));
  }, [access?.can_use, activeOrgId]);

  useEffect(() => {
    if (!access?.can_use || !activeOrgId) return;
    agentApi.getUsage(activeOrgId).then(setUsage).catch(() => setUsage(null));
  }, [access?.can_use, activeOrgId]);

  useEffect(() => {
    if (!historyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHistoryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen]);

  const refreshUsage = () => {
    if (!activeOrgId) return;
    agentApi.getUsage(activeOrgId).then(setUsage).catch(() => {});
  };

  const refreshConversations = () => {
    if (!activeOrgId) return;
    agentApi.listConversations(activeOrgId).then(setConversations).catch(() => {});
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          const r = await uploadImage(file);
          setPendingAttachments((p) => [...p, { kind: "image", url: r.url }]);
        } else if (file.type.startsWith("audio/")) {
          const r = await uploadAudio(file);
          setPendingAttachments((p) => [
            ...p,
            { kind: "audio", url: r.url, media_type: r.content_type ?? file.type },
          ]);
        } else {
          const r = await uploadDocument(file);
          setPendingAttachments((p) => [
            ...p,
            { kind: "document", url: r.url, media_type: r.content_type ?? file.type },
          ]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "No se pudo subir uno de los archivos. Revisa el tipo y el tamaño (máx. 10–20 MB según el caso)." },
      ]);
    } finally {
      setUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleSpeech = async () => {
    if (typeof window === "undefined") return;
    setSpeechError(null);
    type Rec = {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      stop: () => void;
      abort: () => void;
      onaudiostart: (() => void) | null;
      onresult: ((ev: SpeechRecognitionResultEvent) => void) | null;
      onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
      onend: (() => void) | null;
    };
    type SpeechRecognitionResultEvent = {
      resultIndex: number;
      results: {
        length: number;
        [i: number]: {
          isFinal: boolean;
          0: { transcript: string; confidence: number };
        };
      };
    };
    type SpeechRecognitionErrorEvent = { error: string; message: string };
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    if (listening && speechRef.current) {
      micKeepAliveRef.current = false;
      speechRef.current.stop();
      setListening(false);
      speechRef.current = null;
      return;
    }

    // Misma API que el candado del navegador: evita falsos "not-allowed" en SpeechRecognition
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        setSpeechError("No se pudo usar el micrófono. Revisa permisos del sitio (candado en la barra de dirección).");
        return;
      }
    }

    speechBaseRef.current = input;
    let accumulated = "";
    micKeepAliveRef.current = true;

    const rec = new SR();
    // Idioma: preferir español del navegador (p. ej. es-BO, es-MX) para mejor acento
    const navLang = typeof navigator !== "undefined" ? navigator.language : "";
    rec.lang = /^es/i.test(navLang) ? navLang : "es-ES";
    // Frases largas: varios segmentos finales; texto en vivo con interim
    rec.continuous = true;
    rec.interimResults = true;
    try {
      rec.maxAlternatives = 1;
    } catch {
      /* algunos navegadores no exponen maxAlternatives */
    }

    rec.onresult = (ev: SpeechRecognitionResultEvent) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const row = ev.results[i];
        const piece = row[0]?.transcript ?? "";
        if (row.isFinal) {
          const t = piece.trim();
          if (t) accumulated += (accumulated ? " " : "") + t;
        } else {
          interim += piece;
        }
      }
      const base = speechBaseRef.current;
      const finals = accumulated;
      const mid = interim.trim();
      const parts: string[] = [];
      if (base) parts.push(base);
      if (finals) parts.push(finals);
      if (mid) parts.push(mid);
      setInput(parts.join(" ").replace(/\s+/g, " ").trim());
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      if (ev.error === "aborted" || ev.error === "no-speech") return;
      micKeepAliveRef.current = false;
      if (ev.error === "not-allowed") {
        // Con getUserMedia ya concedido, suele ser bloqueo del servicio de voz en la nube (p. ej. Edge), no el micrófono
        setSpeechError(
          "El reconocimiento de voz del navegador no pudo iniciarse. Prueba con Google Chrome o escribe el mensaje."
        );
      } else if (ev.error === "network") {
        setSpeechError("Reconocimiento de voz: error de red. Comprueba tu conexión.");
      } else {
        setSpeechError(`Voz: ${ev.error || "error"}`);
      }
      setListening(false);
      speechRef.current = null;
    };

    rec.onend = () => {
      if (!micKeepAliveRef.current) {
        setListening(false);
        speechRef.current = null;
        return;
      }
      try {
        rec.start();
      } catch {
        setListening(false);
        speechRef.current = null;
        micKeepAliveRef.current = false;
      }
    };

    speechRef.current = {
      stop: () => {
        try {
          rec.stop();
        } catch {
          try {
            rec.abort();
          } catch {
            /* noop */
          }
        }
      },
    };

    try {
      await new Promise<void>((resolve) => {
        queueMicrotask(() => resolve());
      });
      rec.start();
      setListening(true);
    } catch {
      micKeepAliveRef.current = false;
      setSpeechError("No se pudo iniciar el reconocimiento de voz.");
      setListening(false);
      speechRef.current = null;
    }
  };

  const sendMessage = async (
    text: string,
    confirmed?: boolean,
    confirmationId?: string,
    opts?: { skipAttachments?: boolean }
  ) => {
    const atts = confirmationId || opts?.skipAttachments ? [] : pendingAttachments;
    if (!text.trim() && !confirmationId && !atts.length) return;
    setLoading(true);

    const display = buildUserDisplayContent(text, atts);
    const userMsg: Message = { role: "user", content: confirmationId ? text : display };
    if (!confirmationId) setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await agentApi.chat(
        text,
        sessionId,
        activeOrgId ?? null,
        confirmed,
        confirmationId,
        atts
      );
      setSessionId(res.session_id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(sessionStorageKey, res.session_id);
      }
      setPendingAttachments([]);
      refreshConversations();
      if (res.usage) setUsage(res.usage);
      else refreshUsage();
      if (res.tipo === "quota_exceeded") refreshUsage();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          pending: res.pending_confirmation ?? undefined,
          actions: res.actions_taken,
          quick_replies: res.quick_replies?.length ? res.quick_replies : undefined,
          trace_id: res.trace_id,
          model_provider: res.model_provider,
          model_name: res.model_name,
          quota_exceeded: res.tipo === "quota_exceeded",
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
      setSpeechError(null);
    }
  };

  const handleConfirm = (confirmationId: string) => {
    sendMessage("Confirmado", true, confirmationId);
  };

  const startNewConversation = () => {
    setSessionId(null);
    setHistoryOpen(false);
    setPendingAttachments([]);
    setMessages([{ role: "assistant", content: WELCOME_ASSISTANT }]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(sessionStorageKey);
    }
  };

  const selectConversation = (sid: string) => {
    setSessionId(sid);
    setHistoryOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(sessionStorageKey, sid);
    }
    if (!activeOrgId) return;
    agentApi
      .getConversationMessages(sid, activeOrgId)
      .then((res) => {
        if (res.messages.length > 0) {
          setMessages(
            res.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              actions: m.actions,
              quick_replies: m.quick_replies,
            }))
          );
        } else {
          setMessages([{ role: "assistant", content: WELCOME_ASSISTANT }]);
        }
      })
      .catch(() => {});
  };

  const deleteConv = async (sid: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!activeOrgId) return;
    if (!window.confirm("¿Eliminar esta conversación del historial?")) return;
    try {
      await agentApi.deleteConversation(sid, activeOrgId);
      refreshConversations();
      refreshUsage();
      if (sessionId === sid) startNewConversation();
    } catch {
      /* noop */
    }
  };

  const renameConv = async (sid: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!activeOrgId) return;
    const next = window.prompt("Nuevo título (máx. 200 caracteres):", "");
    if (next === null || !next.trim()) return;
    try {
      await agentApi.renameConversation(sid, next.trim().slice(0, 200), activeOrgId);
      refreshConversations();
    } catch {
      /* noop */
    }
  };

  function conversationLabel(c: ConversationSummary): string {
    const t = (c.title || "").trim();
    if (t) return t;
    return new Date(c.updated_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  }

  // Cargando verificación de acceso o restauración inicial desde localStorage
  if (access === null || bootstrapping) {
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
      <div className="relative flex w-full flex-1 min-h-0 h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        {/* Escritorio: columna lateral dentro del main (no drawer a pantalla completa; no tapa el nav global) */}
        <aside
          className="hidden sm:flex sm:w-64 shrink-0 flex-col border-r overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
        >
          <div
            className="flex shrink-0 items-start gap-3 px-4 pt-4 pb-4"
            style={{ borderColor: "var(--border)", borderBottomWidth: 1, borderBottomStyle: "solid", background: "var(--bg-card)" }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} aria-hidden />
                <h2 className="text-[15px] font-semibold leading-tight tracking-tight" style={{ color: "var(--text)" }}>
                  Conversaciones
                </h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed pl-6" style={{ color: "var(--text-muted)" }}>
                {conversations.length === 0
                  ? "Tus chats aparecerán aquí."
                  : `${conversations.length} guardada${conversations.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3 scroll-smooth">
            <AgentConversationList
              conversations={conversations}
              sessionId={sessionId}
              getLabel={conversationLabel}
              onSelect={selectConversation}
              onRename={renameConv}
              onDelete={deleteConv}
            />
          </div>
        </aside>

        {/* Móvil: panel flotante bajo la barra fija + título de página (z alto; X con área táctil clara) */}
        {historyOpen && (
          <>
            <button
              type="button"
              aria-label="Cerrar lista de conversaciones"
              className="fixed inset-0 z-[90] bg-black/25 backdrop-blur-[1px] sm:hidden"
              onClick={() => setHistoryOpen(false)}
            />
            <div
              id="agent-conv-mobile-panel"
              className="fixed left-3 right-3 top-[7.25rem] z-[100] flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:hidden"
              style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="agent-conv-mobile-title"
            >
              <div
                className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p id="agent-conv-mobile-title" className="text-[15px] font-semibold leading-tight" style={{ color: "var(--text)" }}>
                    Conversaciones
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    {conversations.length === 0
                      ? "Ninguna aún"
                      : `${conversations.length} guardada${conversations.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setHistoryOpen(false);
                  }}
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl touch-manipulation"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  aria-label="Cerrar conversaciones"
                >
                  <X className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-3">
                <AgentConversationList
                  conversations={conversations}
                  sessionId={sessionId}
                  getLabel={conversationLabel}
                  onSelect={selectConversation}
                  onRename={renameConv}
                  onDelete={deleteConv}
                />
              </div>
            </div>
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div
          className="flex flex-wrap items-stretch justify-between gap-3 px-4 sm:px-6 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
              aria-controls="agent-conv-mobile-panel"
              className="flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-opacity hover:opacity-90 sm:hidden"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              <Menu className="h-4 w-4 shrink-0" aria-hidden />
              Conversaciones
            </button>
            {usage && (
              <span
                className="inline-flex min-w-0 max-w-full items-center rounded-full px-3 py-1.5 text-[10px] sm:text-[11px] leading-snug"
                style={{
                  color: "var(--text-muted)",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                }}
                title={formatAgentUsageLine(usage)}
              >
                <span className="truncate">{formatAgentUsageLine(usage)}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={startNewConversation}
            className="flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-opacity hover:opacity-90 shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            <MessageSquarePlus className="w-4 h-4 shrink-0" />
            Nueva conversación
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 min-h-0">
          {messages.length === 1 && messages[0]?.role === "assistant" && (
            <div
              className="rounded-2xl p-4 sm:p-5 mb-2"
              style={{
                background: "linear-gradient(135deg, var(--accent-soft) 0%, var(--bg-card) 100%)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    Plan Pro — Agente IA
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Puedes adjuntar <strong>imágenes</strong>, <strong>PDF u Office</strong> o <strong>audio</strong>;
                    también dictar con el micrófono. El modelo multimodal analiza el contenido. Prueba una idea rápida:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {STARTER_PROMPTS.map((text) => (
                      <button
                        key={text}
                        type="button"
                        disabled={loading}
                        onClick={() => sendMessage(text)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-left transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          color: "var(--text)",
                          maxWidth: "100%",
                        }}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => {
            const prevUserMsg = [...messages.slice(0, i)].reverse().find((m) => m.role === "user");
            const prevForFeedback =
              prevUserMsg != null
                ? parseUserContent(prevUserMsg.content).text || prevUserMsg.content
                : undefined;
            return (
              <Bubble
                key={i}
                msg={msg}
                onConfirm={msg.pending ? handleConfirm : undefined}
                onQuickReply={(sendText) => sendMessage(sendText, undefined, undefined, { skipAttachments: true })}
                onFeedback={
                  msg.role === "assistant"
                    ? (p) =>
                        setFeedbackModal({
                          input: p.input,
                          output: p.output,
                          traceId: p.traceId,
                          modelProvider: p.modelProvider,
                          modelName: p.modelName,
                        })
                    : undefined
                }
                inferenceInput={msg.role === "assistant" ? prevForFeedback : undefined}
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
        <div className="px-4 sm:px-8 pb-6 pt-2 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,application/pdf,.pdf,.doc,.docx,.xlsx,.txt,audio/*"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAttachments.map((a, idx) => (
                <span
                  key={`${a.url}-${idx}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] max-w-[200px]"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  {a.kind === "image" ? "Imagen" : a.kind === "audio" ? "Audio" : "Doc"}
                  <button
                    type="button"
                    className="p-0.5 rounded hover:opacity-80"
                    onClick={() => setPendingAttachments((p) => p.filter((_, j) => j !== idx))}
                    aria-label="Quitar adjunto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              disabled={loading || uploadBusy}
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl transition-all hover:opacity-90 disabled:opacity-40 shrink-0"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
              title="Adjuntar imagen, documento o audio"
            >
              {uploadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            {speechSupported && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void toggleSpeech()}
                className="p-3 rounded-xl transition-all shrink-0"
                style={{
                  background: listening ? "var(--accent)" : "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: listening ? "white" : "var(--text)",
                }}
                title={listening ? "Detener dictado" : "Dictar (español)"}
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe, dicta o adjunta archivos…"
              disabled={loading}
              className="flex-1 min-w-0 px-4 py-3 rounded-xl text-sm outline-none disabled:opacity-50"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && pendingAttachments.length === 0)}
              className="p-3 rounded-xl transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{ background: "var(--accent)", color: "white" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          {speechError && (
            <p className="text-xs mt-2 px-1" style={{ color: "var(--text-muted)" }}>
              {speechError}
            </p>
          )}
        </div>
        </div>
      </div>

      <AgentFeedbackModal
        open={!!feedbackModal}
        onClose={() => setFeedbackModal(null)}
        inferenceInput={feedbackModal?.input ?? ""}
        inferenceOutput={feedbackModal?.output ?? ""}
        sessionId={sessionId}
        orgId={activeOrgId ?? null}
        traceId={feedbackModal?.traceId}
        modelProvider={feedbackModal?.modelProvider}
        modelName={feedbackModal?.modelName}
      />
    </>
  );
}
