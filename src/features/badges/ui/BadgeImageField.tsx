"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { uploadImage } from "@/features/uploads/api/uploadApi";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/utils/utils";

interface BadgeImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  uploading: boolean;
  onUploadingChange: (v: boolean) => void;
  onError: (message: string) => void;
}

export function BadgeImageField({
  value,
  onChange,
  uploading,
  onUploadingChange,
  onError,
}: BadgeImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lastFileName, setLastFileName] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        onError("Solo se admiten imágenes (PNG, JPG, WebP, GIF…).");
        return;
      }
      setLastFileName(file.name);
      onUploadingChange(true);
      try {
        const { url } = await uploadImage(file);
        onChange(url);
      } catch {
        onError("No se pudo subir la imagen. Probá de nuevo.");
      } finally {
        onUploadingChange(false);
      }
    },
    [onChange, onError, onUploadingChange],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const file = e.clipboardData.files?.[0];
    if (file?.type.startsWith("image/")) {
      e.preventDefault();
      void processFile(file);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-3" onPaste={onPaste}>
      <label className="block text-sm font-medium">Imagen de la medalla</label>
      <p className="text-[11px] leading-snug -mt-1" style={{ color: "var(--text-muted)" }}>
        Arrastrá un archivo aquí, hacé clic en el botón, o pegá una imagen desde el portapapeles (Ctrl+V) estando en esta zona.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        onChange={onInputChange}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed transition-colors min-h-[140px] flex flex-col items-center justify-center gap-3 p-5 text-center cursor-pointer outline-none",
          dragOver ? "scale-[1.01]" : "",
        )}
        style={{
          borderColor: dragOver ? "var(--accent)" : "var(--border)",
          background: dragOver ? "var(--accent-soft)" : "var(--bg-subtle)",
        }}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--accent)" }} />
        ) : (
          <ImagePlus className="w-10 h-10" style={{ color: "var(--accent)" }} />
        )}
        <div className="space-y-1 max-w-md">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {uploading ? "Subiendo imagen…" : "Soltá la imagen aquí o elegí un archivo"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {lastFileName ? `Último archivo: ${lastFileName}` : "Formatos habituales: PNG, JPG, WebP."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Elegir imagen
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              disabled={uploading}
              onClick={() => {
                onChange("");
                setLastFileName(null);
              }}
              className="inline-flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Quitar
            </Button>
          ) : null}
        </div>
      </div>

      {value ? (
        <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-[var(--bg-subtle)]">
            <img src={value} alt="" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="min-w-0 text-xs space-y-1">
            <p className="font-medium break-all" style={{ color: "var(--text)" }}>
              Imagen lista para la medalla
            </p>
            <p className="break-all opacity-80" style={{ color: "var(--text-muted)" }}>
              {value.length > 80 ? `${value.slice(0, 80)}…` : value}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
