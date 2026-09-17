"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  retrospectivaApi,
  type Retrospectiva,
  type ItemRetro,
  type ColumnaRetro,
} from "@/features/retrospectiva/api/retrospectivaApi";
import { eventsApi } from "@/features/events/api/eventsApi";
import { TopBar } from "@/shared/ui/Sidebar";
import {
  ArrowLeft,
  Plus,
  ThumbsUp,
  Lock,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Users,
  LayoutGrid,
} from "lucide-react";

const COLUMNAS: { key: ColumnaRetro; label: string; iconColor: string; bgTone: string }[] = [
  { key: "bien", label: "Qué salió bien", iconColor: "#16a34a", bgTone: "rgba(34,197,94,.08)" },
  { key: "mejorar", label: "Qué podemos mejorar", iconColor: "#d97706", bgTone: "rgba(245,158,11,.08)" },
  { key: "accion", label: "Acciones para la próxima", iconColor: "#3b82f6", bgTone: "rgba(59,130,246,.08)" },
];

export default function RetrospectivaPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"tablero" | "reflexiones">("tablero");

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventsApi.getById(eventId),
    enabled: !!eventId,
  });

  const {
    data: retro,
    isLoading: loadingRetro,
    error,
  } = useQuery({
    queryKey: ["retrospectiva", eventId],
    queryFn: async () => {
      try {
        return await retrospectivaApi.getByEvent(eventId);
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 404) return null;
        throw e;
      }
    },
    enabled: !!eventId,
  });

  const { data: volunteerRetros = [], isLoading: loadingVolunteerRetros } = useQuery({
    queryKey: ["volunteer-retrospectives", eventId],
    queryFn: () => eventsApi.listVolunteerRetrospectives(eventId),
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

  const pendingObligation = obligations.some(
    (o) => o.tipo === "voluntario_retro" && o.estado === "pendiente"
  );

  const createMutation = useMutation({
    mutationFn: () => retrospectivaApi.create(eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["retrospectiva", eventId] });
      qc.invalidateQueries({ queryKey: ["volunteer-retrospectives", eventId] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({
      retroId,
      columna,
      contenido,
      es_anonimo,
    }: {
      retroId: string;
      columna: ColumnaRetro;
      contenido: string;
      es_anonimo?: boolean;
    }) => retrospectivaApi.addItem(retroId, { columna, contenido, es_anonimo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retrospectiva", eventId] }),
  });

  const voteMutation = useMutation({
    mutationFn: (itemId: string) => retrospectivaApi.voteItem(itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retrospectiva", eventId] }),
  });

  const closeMutation = useMutation({
    mutationFn: (retroId: string) => retrospectivaApi.close(retroId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retrospectiva", eventId] }),
  });

  if (!eventId) return null;

  return (
    <>
      <TopBar title="Retrospectiva del Evento" />
      <div className="flex-1 p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/events/${eventId}`}
              className="p-2 rounded-xl transition-colors hover:opacity-80"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              title="Volver al evento"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {event?.nombre ?? "Retrospectiva"}
                </h2>
                {event?.estado && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize"
                    style={{
                      background: event.estado === "finalizado" ? "rgba(34,197,94,.1)" : "var(--bg-subtle)",
                      color: event.estado === "finalizado" ? "#16a34a" : "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {event.estado}
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
                Espacio colaborativo de aprendizaje continuo y evaluación tras el cierre del evento.
              </p>
            </div>
          </div>

          {/* Quick status / actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {pendingObligation ? (
              <Link
                href={`/dashboard/events/${eventId}/retro-voluntario`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                style={{ background: "var(--accent)", color: "#ffffff" }}
              >
                <AlertCircle className="w-4 h-4" />
                Completar mi reflexión
              </Link>
            ) : submittedRetro ? (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{
                  background: "rgba(34,197,94,.1)",
                  color: "#16a34a",
                  border: "1px solid rgba(34,197,94,.25)",
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mi reflexión registrada
              </span>
            ) : null}
          </div>
        </div>

        {/* Banner if pending personal reflection */}
        {pendingObligation && (
          <div
            className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            style={{
              background: "rgba(245,158,11,.1)",
              border: "1px solid rgba(245,158,11,.25)",
              color: "var(--text)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Acción pendiente:</strong> Aún no has enviado tu reflexión personal obligatoria sobre este evento.
              </span>
            </div>
            <Link
              href={`/dashboard/events/${eventId}/retro-voluntario`}
              className="px-3 py-1.5 rounded-xl font-bold self-start sm:self-auto whitespace-nowrap"
              style={{ background: "var(--accent)", color: "#ffffff" }}
            >
              Completar reflexión →
            </Link>
          </div>
        )}

        {/* Section Tabs: Tablero Scrum vs Reflexiones individuales */}
        <div className="flex items-center gap-2 border-b pb-1" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={() => setActiveTab("tablero")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
            style={{
              background: activeTab === "tablero" ? "var(--bg-card)" : "transparent",
              color: activeTab === "tablero" ? "var(--text)" : "var(--text-muted)",
              border: activeTab === "tablero" ? "1px solid var(--border)" : "1px solid transparent",
              boxShadow: activeTab === "tablero" ? "0 1px 4px rgba(0,0,0,.06)" : undefined,
            }}
          >
            <LayoutGrid className="w-4 h-4" />
            Tablero Scrum
            {retro && retro.items.length > 0 && (
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                {retro.items.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reflexiones")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
            style={{
              background: activeTab === "reflexiones" ? "var(--bg-card)" : "transparent",
              color: activeTab === "reflexiones" ? "var(--text)" : "var(--text-muted)",
              border: activeTab === "reflexiones" ? "1px solid var(--border)" : "1px solid transparent",
              boxShadow: activeTab === "reflexiones" ? "0 1px 4px rgba(0,0,0,.06)" : undefined,
            }}
          >
            <Users className="w-4 h-4" />
            Reflexiones de Voluntarios
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              {volunteerRetros.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        {loadingEvent || loadingRetro ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Cargando retrospectiva…
          </div>
        ) : activeTab === "tablero" ? (
          retro ? (
            <RetrospectivaBoard
              retro={retro}
              onAddItem={(columna, contenido, es_anonimo) =>
                addItemMutation.mutate({ retroId: retro.id, columna, contenido, es_anonimo })
              }
              onVote={(itemId) => voteMutation.mutate(itemId)}
              onClose={() => closeMutation.mutate(retro.id)}
              isAdding={addItemMutation.isPending}
              isClosing={closeMutation.isPending}
            />
          ) : (
            <div
              className="text-center py-16 rounded-3xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" style={{ color: "var(--text-muted)" }} />
              <h4 className="font-bold text-base mb-1">Este evento aún no tiene retrospectiva inicializada</h4>
              <p className="text-xs max-w-md mx-auto mb-6" style={{ color: "var(--text-muted)" }}>
                Inicializa el tablero tipo Scrum para consolidar feedback en columnas (Bien / Mejorar / Acción).
              </p>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="px-6 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm"
                style={{ background: "var(--accent)", color: "#ffffff" }}
              >
                {createMutation.isPending ? "Creando..." : "Crear tablero de retrospectiva"}
              </button>
            </div>
          )
        ) : (
          <VolunteerReflections retros={volunteerRetros} isLoading={loadingVolunteerRetros} />
        )}
      </div>
    </>
  );
}

function VolunteerReflections({
  retros,
  isLoading,
}: {
  retros: import("@/features/events/api/eventsApi").VolunteerRetrospective[];
  isLoading?: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
            Reflexiones individuales registradas
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Respuestas enviadas por los voluntarios tras finalizar el evento.
          </p>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-xl"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          {retros.length} respuesta{retros.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Cargando reflexiones...
        </div>
      ) : retros.length === 0 ? (
        <div
          className="text-center py-14 rounded-3xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <MessageSquare className="w-10 h-10 mx-auto mb-2.5 opacity-40" style={{ color: "var(--text-muted)" }} />
          <p className="font-semibold text-sm mb-1">Todavía no hay reflexiones enviadas</p>
          <p className="text-xs max-w-sm mx-auto" style={{ color: "var(--text-muted)" }}>
            Las respuestas de los participantes aparecerán aquí una vez que completen su formulario de retrospectiva.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {retros.map((retro, index) => {
            const displayName = retro.nombre_voluntario || `Voluntario ${index + 1}`;
            return (
              <article
                key={`${retro.usuario_id}-${index}`}
                className="rounded-2xl p-5 space-y-4 transition-all"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                {/* Author Info */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2.5">
                    {retro.avatar_url ? (
                      <img
                        src={retro.avatar_url}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                        style={{ border: "1px solid var(--border)" }}
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold leading-tight" style={{ color: "var(--text)" }}>
                        {displayName}
                      </h4>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        Participante del evento
                      </p>
                    </div>
                  </div>

                  {retro.completado_at && (
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {new Date(retro.completado_at).toLocaleDateString("es", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>

                {/* Response Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    className="p-3.5 rounded-xl space-y-1"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-green-600 dark:text-green-400">
                      ✓ Qué salió bien
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
                      {retro.que_bien || "—"}
                    </p>
                  </div>

                  <div
                    className="p-3.5 rounded-xl space-y-1"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      ▲ Qué mejorar
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
                      {retro.que_mejorar || "—"}
                    </p>
                  </div>

                  <div
                    className="p-3.5 rounded-xl space-y-1"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      → Acción propuesta
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
                      {retro.accion || "—"}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RetrospectivaBoard({
  retro,
  onAddItem,
  onVote,
  onClose,
  isAdding,
  isClosing,
}: {
  retro: Retrospectiva;
  onAddItem: (columna: ColumnaRetro, contenido: string, es_anonimo?: boolean) => void;
  onVote: (itemId: string) => void;
  onClose: () => void;
  isAdding: boolean;
  isClosing: boolean;
}) {
  const [addCol, setAddCol] = useState<ColumnaRetro | null>(null);
  const [newContent, setNewContent] = useState("");
  const [esAnonimo, setEsAnonimo] = useState(false);

  const itemsByCol = COLUMNAS.reduce(
    (acc, { key }) => {
      acc[key] = retro.items.filter((i) => i.columna === key);
      return acc;
    },
    {} as Record<ColumnaRetro, ItemRetro[]>
  );

  const handleAdd = (col: ColumnaRetro) => {
    if (newContent.trim().length >= 2) {
      onAddItem(col, newContent.trim(), esAnonimo);
      setNewContent("");
      setEsAnonimo(false);
      setAddCol(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Board Controls */}
      <div
        className="flex items-center justify-between p-3.5 rounded-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 text-xs">
          <span
            className="px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5"
            style={{
              background: retro.cerrada ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)",
              color: retro.cerrada ? "#ef4444" : "#16a34a",
              border: `1px solid ${retro.cerrada ? "rgba(239,68,68,.25)" : "rgba(34,197,94,.25)"}`,
            }}
          >
            {retro.cerrada ? <Lock className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            {retro.cerrada ? "Tablero cerrado (lectura)" : "Tablero abierto para aportes"}
          </span>
          <span style={{ color: "var(--text-muted)" }}>• {retro.items.length} tarjetas en total</span>
        </div>

        {!retro.cerrada && (
          <button
            onClick={() => {
              if (confirm("¿Estás seguro de cerrar la retrospectiva? No se podrán añadir más tarjetas.")) {
                onClose();
              }
            }}
            disabled={isClosing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <Lock className="w-3 h-3" />
            {isClosing ? "Cerrando..." : "Cerrar tablero"}
          </button>
        )}
      </div>

      {/* 3 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNAS.map(({ key, label, iconColor }) => {
          const items = itemsByCol[key] || [];
          return (
            <div
              key={key}
              className="rounded-3xl p-5 min-h-[300px] flex flex-col justify-between"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: iconColor }} />
                    <h3 className="font-bold text-sm tracking-tight" style={{ color: "var(--text)" }}>
                      {label}
                    </h3>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <RetroItem key={item.id} item={item} onVote={onVote} disabled={retro.cerrada} />
                  ))}

                  {items.length === 0 && addCol !== key && (
                    <div className="py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                      No hay tarjetas en esta columna todavía.
                    </div>
                  )}

                  {!retro.cerrada && addCol === key && (
                    <div
                      className="p-3.5 rounded-2xl space-y-3"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                    >
                      <textarea
                        rows={2}
                        placeholder="Escribe un aporte conciso..."
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none transition-all"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAdd(key);
                          }
                          if (e.key === "Escape") setAddCol(null);
                        }}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] select-none" style={{ color: "var(--text-muted)" }}>
                          <input
                            type="checkbox"
                            checked={esAnonimo}
                            onChange={(e) => setEsAnonimo(e.target.checked)}
                            className="rounded cursor-pointer"
                          />
                          <span>Anónimo</span>
                        </label>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setAddCol(null)}
                            className="px-2.5 py-1.5 rounded-xl text-xs"
                            style={{ background: "transparent", color: "var(--text-muted)" }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleAdd(key)}
                            disabled={isAdding || newContent.trim().length < 2}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-40"
                            style={{ background: "var(--accent)", color: "#ffffff" }}
                          >
                            Añadir
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!retro.cerrada && addCol === null && (
                <button
                  onClick={() => setAddCol(key)}
                  className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-semibold transition-colors hover:opacity-80"
                  style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border)", color: "var(--text)" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir tarjeta
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RetroItem({
  item,
  onVote,
  disabled,
}: {
  item: ItemRetro;
  onVote: (itemId: string) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="p-3.5 rounded-2xl flex items-start justify-between gap-2.5 transition-all shadow-xs"
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs leading-relaxed break-words" style={{ color: "var(--text)" }}>
          {item.contenido}
        </p>
        {item.es_anonimo && (
          <span className="inline-block text-[10px]" style={{ color: "var(--text-muted)" }}>
            Anónimo
          </span>
        )}
      </div>
      <button
        onClick={() => onVote(item.id)}
        disabled={disabled}
        className="flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        style={{
          background: item.votos > 0 ? "var(--accent-soft)" : "var(--bg-card)",
          color: item.votos > 0 ? "var(--accent)" : "var(--text-muted)",
          border: "1px solid var(--border)",
        }}
        title="Votar por esta tarjeta"
      >
        <ThumbsUp className="w-3 h-3" />
        <span className="tabular-nums">{item.votos}</span>
      </button>
    </div>
  );
}
