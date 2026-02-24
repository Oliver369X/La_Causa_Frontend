"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DOMPurify from "dompurify";
import { FileText, Plus, ArrowLeft, Edit2, Trash2 } from "lucide-react";
import { useAuthStore } from "@/shared/store/authStore";
import { plantillasCertificadoApi, type PlantillaCertificado } from "@/features/certificates/api/certificatesApi";
import {
  ConfigPlantillaForm,
  parseConfigPlantilla,
  configToJson,
  type ConfigPlantillaValues,
} from "@/features/certificates/ui/ConfigPlantillaForm";
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeOrgId) return;
    plantillasCertificadoApi.list(activeOrgId)
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
  };

  const GOOGLE_FONTS = ["Playfair Display", "Merriweather", "Libre Baskerville", "Cinzel", "Open Sans", "Lato", "Roboto", "Source Sans Pro", "PT Sans"];
  const buildPreviewHtml = (html: string, cfg: ConfigPlantillaValues) => {
    const datos = {
      nombre: "Juan Pérez",
      horas: "120",
      gestion: "2024",
      fecha_emision: new Date().toLocaleDateString("es-ES"),
      organizacion: "Mi Organización",
    };
    let out = html
      .replace(/\{\{\s*nombre\s*\}\}/g, datos.nombre)
      .replace(/\{\{\s*horas\s*\}\}/g, datos.horas)
      .replace(/\{\{\s*gestion\s*\}\}/g, datos.gestion)
      .replace(/\{\{\s*fecha_emision\s*\}\}/g, datos.fecha_emision)
      .replace(/\{\{\s*organizacion\s*\}\}/g, datos.organizacion);
    const fontsToLoad = [cfg.tipografia.titulo, cfg.tipografia.cuerpo]
      .filter((f) => GOOGLE_FONTS.includes(f))
      .filter((f, i, a) => a.indexOf(f) === i);
    const fontsLink =
      fontsToLoad.length > 0
        ? `<link href="https://fonts.googleapis.com/css2?${fontsToLoad.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;700`).join("&")}&display=swap" rel="stylesheet" />`
        : "";
    const styleOverrides = `
      .titulo { font-family: ${cfg.tipografia.titulo}, serif !important; color: ${cfg.colores.titulo} !important; }
      .nombre, .mensaje, .firma { font-family: ${cfg.tipografia.cuerpo}, sans-serif !important; color: ${cfg.colores.texto} !important; }
      body { border: 2px solid ${cfg.colores.borde}; padding: ${cfg.margenes.superior}px ${cfg.margenes.derecho}px ${cfg.margenes.inferior}px ${cfg.margenes.izquierdo}px; }
    `;
    if (out.includes("</head>")) {
      out = out.replace("</head>", `${fontsLink}<style>${styleOverrides}</style></head>`);
    } else if (out.includes("<head>")) {
      out = out.replace("<head>", `<head>${fontsLink}<style>${styleOverrides}</style>`);
    }
    if (cfg.logo_url && out.includes("<body>")) {
      out = out.replace("<body>", `<body><div style="text-align:center;margin-bottom:16px"><img src="${cfg.logo_url}" alt="Logo" style="max-height:60px;object-fit:contain" /></div>`);
    }
    const extras: string[] = [];
    if (cfg.firma_url) extras.push(`<img src="${cfg.firma_url}" alt="Firma" style="max-height:50px;object-fit:contain" />`);
    if (cfg.sello_url) extras.push(`<img src="${cfg.sello_url}" alt="Sello" style="max-height:48px;object-fit:contain" />`);
    if (extras.length && out.includes("</body>")) {
      out = out.replace("</body>", `<div style="margin-top:24px;display:flex;gap:16px;justify-content:center;align-items:center">${extras.join("")}</div></body>`);
    }
    return out;
  };

  const handlePreview = () => {
    try {
      setPreviewHtml(buildPreviewHtml(formHtml, formConfig));
    } catch {
      setPreviewHtml(formHtml);
    }
  };

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
      }
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const showEditor = showCreate || editingId;

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
          <Button onClick={() => { setShowCreate(true); setFormHtml(PLANTILLA_BASE); setFormNombre(""); setFormDesc(""); setFormConfig(parseConfigPlantilla(null)); }}>
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
            <div>
              <label className="block text-sm font-medium mb-1">
                Plantilla HTML (variables: {"{{ nombre }}"}, {"{{ horas }}"}, {"{{ gestion }}"}, {"{{ fecha_emision }}"}, {"{{ organizacion }}"}
              </label>
              <textarea
                value={formHtml}
                onChange={(e) => setFormHtml(e.target.value)}
                rows={14}
                className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none resize-y"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Configuración visual (logo, firma, sello, tipografía, colores)
              </label>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                Sube logo, firma digital y sello. Se guardan en Cloudinary. Elige tipografías y colores.
              </p>
              <ConfigPlantillaForm value={formConfig} onChange={setFormConfig} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePreview} variant="outline" size="sm">Vista previa</Button>
              <Button onClick={handleSave} loading={submitting} size="sm">Guardar</Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowCreate(false); setEditingId(null); setPreviewHtml(null); }}
              >
                Cancelar
              </Button>
            </div>
            {previewHtml && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-sm font-medium mb-2">Vista previa</p>
                <div
                  className="rounded-xl p-6 border overflow-auto max-h-96"
                  style={{ background: "#fff", borderColor: "var(--border)", color: "#333" }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
                />
              </div>
            )}
          </div>
        </Card>
      ) : null}

      <div>
        <h2 className="font-semibold text-sm mb-3">Plantillas existentes</h2>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
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
                  <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>{p.descripcion}</p>
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
