"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  ChevronDown,
  RectangleVertical,
  RectangleHorizontal,
} from "lucide-react";
import { useAuthStore } from "@/shared/store/authStore";
import { plantillasCertificadoApi, type PlantillaCertificado } from "@/features/certificates/api/certificatesApi";
import {
  ConfigPlantillaForm,
  parseConfigPlantilla,
  configToJson,
  type ConfigPlantillaValues,
} from "@/features/certificates/ui/ConfigPlantillaForm";
import { buildCertificatePreviewHtml } from "@/features/certificates/lib/certificatePreview";
import { sanitizeCertificatePreviewHtml } from "@/features/certificates/lib/sanitizeCertificatePreview";
import {
  CERT_PREVIEW_SHORT_EDGE_PX,
  certPreviewFrameStyle,
} from "@/features/certificates/ui/certificateUiConstants";
import { cn } from "@/shared/utils/utils";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { toast } from "sonner";

const PLANTILLA_BASE = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Georgia, serif; padding: 40px; text-align: center; }
  .titulo { font-size: 24px; margin-bottom: 20px; }
  .nombre { font-size: 20px; font-weight: bold; margin: 20px 0; }
  .mensaje { font-size: 14px; margin: 20px 0; line-height: 1.6; }
  .firma { margin-top: 40px; font-size: 12px; }
</style></head>
<body>
  <div class="titulo">CERTIFICADO DE VOLUNTARIADO</div>
  <div class="mensaje">Se certifica que</div>
  <div class="nombre">{{ nombre }}</div>
  <div class="mensaje">ha completado su gestión de voluntariado con {{ horas }} horas acreditadas.</div>
  <div class="mensaje">Gestion: {{ gestion }}</div>
  <div class="mensaje">Fecha de emisión: {{ fecha_emision }}</div>
  <div class="firma">{{ organizacion }}</div>
</body>
</html>`;

const PREVIEW_DEBOUNCE_MS = 320;

export default function CertificatesTemplatesPage() {
  const { activeOrgId } = useAuthStore();
  const [plantillas, setPlantillas] = useState<PlantillaCertificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formHtml, setFormHtml] = useState(PLANTILLA_BASE);
  const [formConfig, setFormConfig] = useState<ConfigPlantillaValues>(parseConfigPlantilla(null));
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [previewError, setPreviewError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [configVisualOpen, setConfigVisualOpen] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeOrgId) return;
    plantillasCertificadoApi
      .list(activeOrgId)
      .then(setPlantillas)
      .catch(() => toast.error("Error al cargar plantillas"))
      .finally(() => setLoading(false));
  }, [activeOrgId]);

  const loadForEdit = (p: PlantillaCertificado) => {
    setEditingId(p.id);
    setFormNombre(p.nombre);
    setFormDesc(p.descripcion || "");
    setFormHtml(p.html_template);
    setFormConfig(parseConfigPlantilla(p.configuracion as Record<string, unknown>));
    setPreviewHtml(null);
    setPreviewError(false);
  };

  const showEditor = showCreate || editingId;

  /** Vista previa automática al cambiar HTML o configuración */
  useEffect(() => {
    if (!showEditor) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      try {
        const html = buildCertificatePreviewHtml(formHtml, formConfig);
        setPreviewHtml(html);
        setPreviewError(false);
        setPreviewNonce((n) => n + 1);
      } catch {
        setPreviewError(true);
        try {
          const fallback = buildCertificatePreviewHtml(PLANTILLA_BASE, formConfig);
          setPreviewHtml(fallback);
          setPreviewNonce((n) => n + 1);
        } catch {
          setPreviewHtml(null);
        }
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formHtml, formConfig, showEditor]);

  const safePreviewSrcDoc = useMemo(() => {
    if (!previewHtml) return "";
    try {
      return sanitizeCertificatePreviewHtml(previewHtml);
    } catch {
      return previewHtml;
    }
  }, [previewHtml]);

  const handleSave = async () => {
    if (!formNombre.trim() || !formHtml.trim()) {
      toast.error("Nombre y plantilla HTML requeridos");
      return;
    }
    if (!activeOrgId) {
      toast.error("Selecciona una organización");
      return;
    }
    const config = configToJson(formConfig);
    setSubmitting(true);
    try {
      if (editingId) {
        await plantillasCertificadoApi.update(editingId, {
          nombre: formNombre,
          descripcion: formDesc || null,
          html_template: formHtml,
          configuracion: config,
        });
        toast.success("Plantilla actualizada");
      } else {
        await plantillasCertificadoApi.create(activeOrgId, {
          nombre: formNombre,
          descripcion: formDesc || null,
          html_template: formHtml,
          configuracion: config,
        });
        toast.success("Plantilla creada");
      }
      setShowCreate(false);
      setEditingId(null);
      setFormNombre("");
      setFormDesc("");
      setFormHtml(PLANTILLA_BASE);
      setFormConfig(parseConfigPlantilla(null));
      setPreviewHtml(null);
      setPreviewError(false);
      plantillasCertificadoApi.list(activeOrgId).then(setPlantillas);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    try {
      await plantillasCertificadoApi.delete(id);
      toast.success("Plantilla eliminada");
      if (activeOrgId) plantillasCertificadoApi.list(activeOrgId).then(setPlantillas);
      if (editingId === id) {
        setEditingId(null);
        setFormNombre("");
        setFormDesc("");
        setFormHtml(PLANTILLA_BASE);
        setFormConfig(parseConfigPlantilla(null));
        setPreviewHtml(null);
      }
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const closeEditor = () => {
    setShowCreate(false);
    setEditingId(null);
    setPreviewHtml(null);
    setPreviewError(false);
  };

  if (!activeOrgId) {
    return (
      <div className="p-5 md:p-8" style={{ color: "var(--text)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Selecciona una organización para gestionar plantillas.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/certificates"
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Certificados
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Plantillas de certificado
          </h1>
        </div>
        {!showEditor && (
          <Button
            onClick={() => {
              setShowCreate(true);
              setFormHtml(PLANTILLA_BASE);
              setFormNombre("");
              setFormDesc("");
              setFormConfig(parseConfigPlantilla(null));
              setPreviewHtml(null);
              setPreviewError(false);
            }}
          >
            <Plus className="w-4 h-4" /> Nueva plantilla
          </Button>
        )}
      </div>

      {showEditor ? (
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder="Ej: Certificado gestión 2024"
                className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
              <input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Breve descripción"
                className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Plantilla HTML (variables: {"{{ nombre }}"}, {"{{ horas }}"}, {"{{ gestion }}"},{" "}
                  {"{{ fecha_emision }}"}, {"{{ organizacion }}"})
                </label>
                <textarea
                  value={formHtml}
                  onChange={(e) => setFormHtml(e.target.value)}
                  rows={16}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none resize-y min-h-[240px]"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div className="space-y-2 xl:sticky xl:top-4 w-full max-w-full">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Vista previa</p>
                  <div
                    className="inline-flex rounded-lg p-0.5 gap-0.5 shrink-0"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                    role="group"
                    aria-label="Orientación A4"
                  >
                    <button
                      type="button"
                      onClick={() => setFormConfig((c) => ({ ...c, orientacion: "vertical" }))}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                        formConfig.orientacion === "vertical" ? "shadow-sm" : "opacity-70 hover:opacity-100"
                      )}
                      style={{
                        background: formConfig.orientacion === "vertical" ? "var(--bg-card)" : "transparent",
                        color: "var(--text)",
                        border:
                          formConfig.orientacion === "vertical" ? "1px solid var(--border)" : "1px solid transparent",
                      }}
                    >
                      <RectangleVertical className="w-3.5 h-3.5" />
                      Vertical
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormConfig((c) => ({ ...c, orientacion: "horizontal" }))}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                        formConfig.orientacion === "horizontal" ? "shadow-sm" : "opacity-70 hover:opacity-100"
                      )}
                      style={{
                        background: formConfig.orientacion === "horizontal" ? "var(--bg-card)" : "transparent",
                        color: "var(--text)",
                        border:
                          formConfig.orientacion === "horizontal" ? "1px solid var(--border)" : "1px solid transparent",
                      }}
                    >
                      <RectangleHorizontal className="w-3.5 h-3.5" />
                      Horizontal
                    </button>
                  </div>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {`Vista previa A4 ${formConfig.orientacion === "horizontal" ? "apaisado" : "retrato"} (borde corto ~${CERT_PREVIEW_SHORT_EDGE_PX}px). Actualización automática (~${PREVIEW_DEBOUNCE_MS / 1000}s).`}
                </p>
                {previewError && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Hubo un error en el HTML; se muestra la plantilla base de respaldo.
                  </p>
                )}
                <div
                  className="relative rounded-xl border overflow-hidden bg-zinc-100 dark:bg-zinc-900/40 mx-auto w-full"
                  style={{
                    borderColor: "var(--border)",
                    ...certPreviewFrameStyle(formConfig.orientacion),
                  }}
                >
                  {safePreviewSrcDoc ? (
                    <iframe
                      key={previewNonce}
                      title="Vista previa del certificado"
                      className="absolute inset-0 min-h-0 w-full h-full border-0 bg-white"
                      sandbox="allow-same-origin"
                      srcDoc={safePreviewSrcDoc}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center gap-2 py-16 text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span style={{ color: "var(--accent)" }}>
                        <Spinner size="md" className="shrink-0" />
                      </span>
                      Generando vista previa…
                    </div>
                  )}
                </div>
              </div>
            </div>

            <details
              className="group rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--border)" }}
              open={configVisualOpen}
              onToggle={(e) => setConfigVisualOpen(e.currentTarget.open)}
            >
              <summary
                className={cn(
                  "flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium select-none",
                  "[&::-webkit-details-marker]:hidden"
                )}
                style={{ background: "var(--bg-subtle)" }}
              >
                <ChevronDown
                  className={cn("w-4 h-4 shrink-0 transition-transform", configVisualOpen && "rotate-180")}
                  style={{ color: "var(--text-muted)" }}
                />
                <span>Configuración visual</span>
                <span className="text-[11px] font-normal ml-auto" style={{ color: "var(--text-muted)" }}>
                  logos · tipografía · colores
                </span>
              </summary>
              <div className="p-3 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <ConfigPlantillaForm value={formConfig} onChange={setFormConfig} />
              </div>
            </details>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleSave} loading={submitting} size="sm">
                Guardar
              </Button>
              <Button variant="ghost" size="sm" onClick={closeEditor}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div>
        <h2 className="font-semibold text-sm mb-3">Plantillas existentes</h2>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : plantillas.length === 0 ? (
          <EmptyState
            title="Sin plantillas"
            description="Crea una plantilla para personalizar el diseño de tus certificados."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plantillas.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl p-4 flex flex-col gap-2"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-semibold">{p.nombre}</p>
                {p.descripcion && (
                  <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>
                    {p.descripcion}
                  </p>
                )}
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  v{p.version} · {p.estado}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="xs" onClick={() => loadForEdit(p)}>
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
