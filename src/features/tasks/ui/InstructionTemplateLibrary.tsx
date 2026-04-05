"use client";

import { useCallback, useEffect, useState } from "react";
import { BookMarked, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  BUILTIN_INSTRUCTION_TEMPLATES,
  type SavedInstructionTemplate,
  loadSavedInstructionTemplates,
  saveInstructionTemplate,
  deleteInstructionTemplate,
} from "../lib/instructionTemplates";

export type InsertMode = "replace" | "append";

function applyInsert(current: string, texto: string, mode: InsertMode): string {
  const t = texto.trim();
  if (!t) return current;
  if (mode === "replace") return t;
  const c = current.trim();
  return c ? `${c}\n\n${t}` : t;
}

interface InstructionTemplateLibraryProps {
  currentText: string;
  onApply: (next: string) => void;
  /** Plantillas guardadas separadas por organización */
  orgId?: string | null;
}

export function InstructionTemplateLibrary({ currentText, onApply, orgId }: InstructionTemplateLibraryProps) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<SavedInstructionTemplate[]>([]);
  const [newName, setNewName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSaved(loadSavedInstructionTemplates(orgId));
  }, [orgId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleInsert = (texto: string, mode: InsertMode) => {
    onApply(applyInsert(currentText, texto, mode));
  };

  const handleSaveCustom = () => {
    setSaveError(null);
    try {
      saveInstructionTemplate(newName, currentText, orgId);
      setNewName("");
      refresh();
    } catch (e) {
      setSaveError((e as Error).message);
    }
  };

  const handleDelete = (id: string) => {
    deleteInstructionTemplate(id, orgId);
    refresh();
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium transition-opacity hover:opacity-90"
        style={{ background: "var(--bg-subtle)", color: "var(--text)" }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <BookMarked className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
          Biblioteca de instrucciones
          <span className="text-xs font-normal truncate" style={{ color: "var(--text-muted)" }}>
            plantillas reutilizables
          </span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>

      {open && (
        <div className="p-3 space-y-4 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Elige una plantilla y usa <strong className="text-[var(--text)]">Reemplazar</strong> o{" "}
            <strong className="text-[var(--text)]">Añadir</strong> al texto del cuadro de arriba. Puedes guardar tus
            propios textos en “Mis plantillas”.
          </p>

          <section>
            <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Sugeridas
            </h4>
            <ul className="space-y-2">
              {BUILTIN_INSTRUCTION_TEMPLATES.map((tpl) => (
                <li key={tpl.id}>
                  <TemplateRow
                    nombre={tpl.nombre}
                    preview={tpl.texto}
                    onReplace={() => handleInsert(tpl.texto, "replace")}
                    onAppend={() => handleInsert(tpl.texto, "append")}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Mis plantillas
            </h4>
            {saved.length === 0 ? (
              <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>
                Aún no guardaste ninguna. Escribe instrucciones arriba y pulsa “Guardar”.
              </p>
            ) : (
              <ul className="space-y-2">
                {saved.map((tpl) => (
                  <li
                    key={tpl.id}
                    className="flex items-stretch gap-2 rounded-lg p-2"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <TemplateRow
                        nombre={tpl.nombre}
                        preview={tpl.texto}
                        onReplace={() => handleInsert(tpl.texto, "replace")}
                        onAppend={() => handleInsert(tpl.texto, "append")}
                        compact
                        noCard
                      />
                    </div>
                    <button
                      type="button"
                      title="Eliminar plantilla"
                      onClick={() => handleDelete(tpl.id)}
                      className="shrink-0 px-2 rounded-lg self-stretch flex items-center justify-center hover:opacity-80"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1">
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                  Nombre de la plantilla
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Instrucciones stand de agua"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <button
                type="button"
                onClick={handleSaveCustom}
                disabled={!currentText.trim()}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 shrink-0"
                style={{ background: "var(--accent)", color: "white" }}
              >
                <Plus className="w-4 h-4" />
                Guardar texto actual
              </button>
            </div>
            {saveError && <p className="text-xs text-red-500 mt-1">{saveError}</p>}
          </section>
        </div>
      )}
    </div>
  );
}

function TemplateRow({
  nombre,
  preview,
  onReplace,
  onAppend,
  compact,
  noCard,
}: {
  nombre: string;
  preview: string;
  onReplace: () => void;
  onAppend: () => void;
  compact?: boolean;
  /** Sin borde interno (cuando ya va dentro de otra tarjeta) */
  noCard?: boolean;
}) {
  const firstLine = preview.split("\n").find((l) => l.trim()) ?? preview;
  const short = firstLine.length > (compact ? 90 : 120) ? `${firstLine.slice(0, compact ? 90 : 120)}…` : firstLine;

  const cardStyle =
    noCard || compact
      ? undefined
      : { background: "var(--bg-subtle)", border: "1px solid var(--border)" };

  return (
    <div className={noCard || compact ? "" : "rounded-lg p-2"} style={cardStyle}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
            {nombre}
          </p>
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>
            {short}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onReplace}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            Reemplazar
          </button>
          <button
            type="button"
            onClick={onAppend}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}
