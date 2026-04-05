"use client";

import { useState, useRef, useEffect } from "react";
import { assignmentsApi } from "@/features/assignments/api/assignmentsApi";
import { uploadImage } from "@/features/uploads/api/uploadApi";
import { ImagePlus, X } from "lucide-react";
import { TaskInstructionsDisplay } from "./TaskInstructionsDisplay";

interface DeliveryUploadProps {
  assignmentId: string;
  tareaTitulo: string;
  instrucciones?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeliveryUpload({
  assignmentId,
  tareaTitulo,
  instrucciones,
  onClose,
  onSuccess,
}: DeliveryUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Solo se permiten imágenes (JPG, PNG)");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Máximo 5MB");
      return;
    }
    setError(null);
    setFile(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Selecciona una imagen");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadImage(file);
      await assignmentsApi.submitDelivery(assignmentId, {
        evidencia_url: url,
        comentario: comentario.trim() || undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={onClose}
    >
      <div
        className="max-w-md w-full p-6 rounded-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Entregar: &quot;{tareaTitulo}&quot;</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:opacity-80"
            style={{ background: "var(--bg-subtle)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {instrucciones?.trim() && (
          <div className="mb-4">
            <TaskInstructionsDisplay text={instrucciones} heading="Qué debe incluir tu entrega" />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Evidencia fotográfica *
          </label>
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            {preview ? (
              <div className="space-y-2">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-40 mx-auto rounded-lg object-contain"
                />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {file?.name} · {(file!.size / 1024).toFixed(1)} KB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview(null);
                  }}
                  className="text-xs underline"
                >
                  Cambiar imagen
                </button>
              </div>
            ) : (
              <>
                <ImagePlus className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Click o arrastra una imagen aquí
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  JPG, PNG (máx 5MB)
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Comentario (opcional)</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            placeholder="Describe lo que hiciste..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Una vez enviada, no podrás modificar esta entrega. El organizador la revisará.
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {uploading ? "Enviando..." : "Enviar entrega"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
