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
import { ArrowLeft, Plus, ThumbsUp, Lock, MessageSquare } from "lucide-react";

const COLUMNAS: { key: ColumnaRetro; label: string }[] = [
  { key: "bien", label: "Bien" },
  { key: "mejorar", label: "Mejorar" },
  { key: "accion", label: "Acción" },
];

export default function RetrospectivaPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const qc = useQueryClient();

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

  const createMutation = useMutation({
    mutationFn: () => retrospectivaApi.create(eventId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retrospectiva", eventId] }),
  });

  const addItemMutation = useMutation({
    mutationFn: ({ retroId, columna, contenido, es_anonimo }: { retroId: string; columna: ColumnaRetro; contenido: string; es_anonimo?: boolean }) =>
      retrospectivaApi.addItem(retroId, { columna, contenido, es_anonimo }),
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

  const noRetroYet = retro === null && !error;

  if (!eventId) {
    return null;
  }

  const renderContent = () => {
    if (loadingEvent || loadingRetro) {
      return (
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>
          Cargando...
        </div>
      );
    }

    if (noRetroYet && !createMutation.isPending) {
      const canCreate = event?.estado === "finalizado";
      return (
        <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <MessageSquare className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p className="mb-2" style={{ color: "var(--text-muted)" }}>
            Este evento aún no tiene retrospectiva.
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            {canCreate
              ? "Crea una para recoger feedback tipo Scrum (Bien / Mejorar / Acción). Solo se puede crear una vez por evento."
              : "La retrospectiva solo se puede crear cuando el evento está finalizado."}
          </p>
          {canCreate && (
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="px-6 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Crear retrospectiva
            </button>
          )}
        </div>
      );
    }

    if (retro) {
      return (
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
      );
    }

    return null;
  };

  return (
    <>
      <TopBar title="Retrospectiva" />
      <div className="flex-1 p-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard/events"
            className="p-2 rounded-full hover:opacity-80"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-semibold">
              {event?.nombre ?? "Evento"}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Retrospectiva tipo Scrum
            </p>
          </div>
        </div>

        {renderContent()}
      </div>
    </>
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
    if (newContent.trim().length >= 3) {
      onAddItem(col, newContent.trim(), esAnonimo);
      setNewContent("");
      setEsAnonimo(false);
      setAddCol(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {retro.cerrada ? (
            <span className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              Cerrada
            </span>
          ) : (
            "Abierta"
          )}
        </span>
        {!retro.cerrada && (
          <button
            onClick={onClose}
            disabled={isClosing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <Lock className="w-3.5 h-3.5" />
            Cerrar retrospectiva
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNAS.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-2xl p-5 min-h-[200px]"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-semibold text-sm mb-4">{label}</h3>
            <div className="space-y-3">
              {itemsByCol[key]?.map((item) => (
                <RetroItem key={item.id} item={item} onVote={onVote} disabled={retro.cerrada} />
              ))}
              {!retro.cerrada && addCol === key ? (
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={esAnonimo}
                      onChange={(e) => setEsAnonimo(e.target.checked)}
                      className="rounded"
                    />
                    <span style={{ color: "var(--text-muted)" }}>Publicar como anónimo</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Escribe el ítem..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd(key);
                      if (e.key === "Escape") setAddCol(null);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAdd(key)}
                      disabled={isAdding || newContent.trim().length < 3}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      Añadir
                    </button>
                    <button
                      onClick={() => setAddCol(null)}
                      className="px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                !retro.cerrada &&
                addCol === null && (
                  <button
                    onClick={() => setAddCol(key)}
                    className="flex items-center gap-1.5 w-full px-3 py-2 rounded-xl text-sm text-left"
                    style={{ color: "var(--text-muted)", border: "1px dashed var(--border)" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir ítem
                  </button>
                )
              )}
            </div>
          </div>
        ))}
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
      className="p-3 rounded-xl flex items-start justify-between gap-2"
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
    >
      <p className="text-sm leading-snug flex-1 min-w-0">{item.contenido}</p>
      <button
        onClick={() => onVote(item.id)}
        disabled={disabled}
        className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg text-xs disabled:opacity-50"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        title="Votar"
      >
        <ThumbsUp className="w-3 h-3" />
        {item.votos > 0 && <span>{item.votos}</span>}
      </button>
    </div>
  );
}
