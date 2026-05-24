"use client";

import { useState, useRef, useEffect } from "react";
import { assignmentsApi } from "@/features/assignments/api/assignmentsApi";
import { uploadImage } from "@/features/uploads/api/uploadApi";
import { ImagePlus, X } from "lucide-react";
import { TaskInstructionsDisplay } from "./TaskInstructionsDisplay";
import { extractApiDetail, extractUploadError } from "@/shared/utils/apiError";
import { formatImageSize } from "@/shared/utils/prepareImageForUpload";

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
  const [uploadStep, setUploadStep] = useState<"idle" | "optimizing" | "uploading" | "saving">("idle");
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
    if (!f.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif)$/i.test(f.name)) {
      setError("Solo se permiten imágenes (JPG, PNG, WebP o GIF).");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(`La imagen pesa ${formatImageSize(f.size)}. El máximo permitido es 10 MB.`);
      return;
    }
    setError(null);
    setFile(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const uploadStatusLabel =
    uploadStep === "optimizing"
      ? "Optimizando imagen..."
      : uploadStep === "uploading"
        ? "Subiendo imagen..."
        : uploadStep === "saving"
          ? "Registrando entrega..."
          : "Enviando...";

  const handleSubmit = async () => {
    if (!file) {
      setError("Selecciona una imagen de evidencia.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      let evidenceUrl: string;
      try {
        setUploadStep("optimizing");
        // uploadImage comprime y redimensiona antes de enviar
        setUploadStep("uploading");
        const uploaded = await uploadImage(file);
        evidenceUrl = uploaded.url?.trim() ?? "";
        if (!evidenceUrl) {
          setError("La subida terminó pero no recibimos la URL de la imagen. Intentá de nuevo.");
          return;
        }
      } catch (uploadErr) {
        setError(extractUploadError(uploadErr));
        return;
      }

      setUploadStep("saving");
      await assignmentsApi.submitDelivery(assignmentId, {
        evidencia_url: evidenceUrl,
        ...(comentario.trim() ? { comentario: comentario.trim() } : {}),
      });
      onSuccess();
    } catch (err: unknown) {
      setError(
        extractApiDetail(
          err,
          "La imagen se subió, pero no se pudo registrar la entrega. Contactá al organizador."
        )
      );
    } finally {
      setUploading(false);
      setUploadStep("idle");
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
                  JPG, PNG o WebP (máx. 10 MB). Se optimiza automáticamente al enviar.
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
          <div
            className="text-sm mb-4 p-3 rounded-xl"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444" }}
            role="alert"
          >
            <p className="font-medium">No se pudo completar la entrega</p>
            <p className="mt-1 text-xs leading-relaxed opacity-95">{error}</p>
          </div>
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
            {uploading ? uploadStatusLabel : "Enviar entrega"}
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
