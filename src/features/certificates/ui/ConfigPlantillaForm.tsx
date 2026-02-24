"use client";

import { useState, useRef, useEffect } from "react";
import { ImagePlus, X, PenTool, Building2, Stamp } from "lucide-react";
import { uploadImage } from "@/features/uploads/api/uploadApi";
import { toast } from "sonner";

/** Configuración que se genera desde el formulario (sin JSON manual) */
export interface ConfigPlantillaValues {
  logo_url: string;
  firma_url: string;
  sello_url: string;
  colores: {
    titulo: string;
    texto: string;
    borde: string;
    acento: string;
  };
  tipografia: {
    titulo: string;
    cuerpo: string;
  };
  posicion: {
    logo: string;
    firma: string;
    sello: string;
    qr: string;
  };
  margenes: {
    superior: number;
    inferior: number;
    izquierdo: number;
    derecho: number;
  };
}

const DEFAULT_CONFIG: ConfigPlantillaValues = {
  logo_url: "",
  firma_url: "",
  sello_url: "",
  colores: {
    titulo: "#1f2937",
    texto: "#374151",
    borde: "#d1d5db",
    acento: "#2563eb",
  },
  tipografia: {
    titulo: "Georgia",
    cuerpo: "Arial",
  },
  posicion: {
    logo: "top-center",
    firma: "bottom-right",
    sello: "bottom-left",
    qr: "bottom-center",
  },
  margenes: {
    superior: 40,
    inferior: 40,
    izquierdo: 40,
    derecho: 40,
  },
};

/** Fuentes disponibles (web-safe + Google Fonts) */
const FUENTES_TITULO = [
  { value: "Georgia", label: "Georgia (serif)" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Playfair Display", label: "Playfair Display (elegante)" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "Libre Baskerville", label: "Libre Baskerville" },
  { value: "Cinzel", label: "Cinzel (formal)" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
];

const FUENTES_CUERPO = [
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Roboto", label: "Roboto" },
  { value: "Source Sans Pro", label: "Source Sans Pro" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "PT Sans", label: "PT Sans" },
];

const POSICIONES = [
  { value: "top-left", label: "Arriba izquierda" },
  { value: "top-center", label: "Arriba centro" },
  { value: "top-right", label: "Arriba derecha" },
  { value: "bottom-left", label: "Abajo izquierda" },
  { value: "bottom-center", label: "Abajo centro" },
  { value: "bottom-right", label: "Abajo derecha" },
];

interface ConfigPlantillaFormProps {
  value: ConfigPlantillaValues;
  onChange: (config: ConfigPlantillaValues) => void;
}

function ImageUploadSlot({
  label,
  icon: Icon,
  url,
  onUrlChange,
  uploading,
  onUploadingChange,
}: {
  label: string;
  icon: React.ElementType;
  url: string;
  onUrlChange: (url: string) => void;
  uploading: boolean;
  onUploadingChange: (v: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes (JPG, PNG, WebP)");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Máximo 5 MB");
      return;
    }
    onUploadingChange(true);
    try {
      const { url: uploadedUrl } = await uploadImage(f);
      onUrlChange(uploadedUrl);
      toast.success("Imagen subida correctamente");
    } catch {
      toast.error("Error al subir. Verifica que Cloudinary esté configurado.");
    } finally {
      onUploadingChange(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-colors border-2 border-dashed min-h-[80px]"
        style={{
          borderColor: url ? "var(--border)" : "var(--accent)",
          background: "var(--bg-subtle)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        {url ? (
          <>
            <img
              src={url}
              alt={label}
              className="w-14 h-14 object-contain rounded-lg shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                Imagen cargada (Cloudinary)
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUrlChange("");
                }}
                className="text-xs mt-1 flex items-center gap-1 hover:underline"
                style={{ color: "var(--accent)" }}
              >
                <X className="w-3 h-3" /> Quitar
              </button>
            </div>
          </>
        ) : (
          <>
            <Icon className="w-10 h-10 shrink-0" style={{ color: "var(--text-muted)" }} />
            <div>
              <p className="text-sm" style={{ color: "var(--text)" }}>
                {uploading ? "Subiendo..." : "Click para subir imagen"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                JPG, PNG, WebP · máx. 5 MB · se guarda en Cloudinary
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ConfigPlantillaForm({ value, onChange }: ConfigPlantillaFormProps) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFirma, setUploadingFirma] = useState(false);
  const [uploadingSello, setUploadingSello] = useState(false);

  const update = (partial: Partial<ConfigPlantillaValues>) => {
    onChange({ ...value, ...partial });
  };

  const updateNested = <K extends keyof ConfigPlantillaValues>(
    key: K,
    nested: Partial<ConfigPlantillaValues[K]>
  ) => {
    onChange({
      ...value,
      [key]: { ...(value[key] as object), ...nested },
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Imágenes (Cloudinary) ───────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ImagePlus className="w-4 h-4" style={{ color: "var(--accent)" }} />
          Imágenes del certificado
        </h4>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Sube logo, firma digital y sello. Se almacenan en Cloudinary.
        </p>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
          <ImageUploadSlot
            label="Logo de la organización"
            icon={Building2}
            url={value.logo_url}
            onUrlChange={(url) => update({ logo_url: url })}
            uploading={uploadingLogo}
            onUploadingChange={setUploadingLogo}
          />
          <ImageUploadSlot
            label="Firma digital"
            icon={PenTool}
            url={value.firma_url}
            onUrlChange={(url) => update({ firma_url: url })}
            uploading={uploadingFirma}
            onUploadingChange={setUploadingFirma}
          />
          <ImageUploadSlot
            label="Sello"
            icon={Stamp}
            url={value.sello_url}
            onUrlChange={(url) => update({ sello_url: url })}
            uploading={uploadingSello}
            onUploadingChange={setUploadingSello}
          />
        </div>
      </div>

      {/* ── Tipografía ───────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Tipografía</h4>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Elige la fuente para el título y el cuerpo del certificado.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">Fuente del título</label>
            <select
              value={value.tipografia.titulo}
              onChange={(e) => updateNested("tipografia", { titulo: e.target.value })}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {FUENTES_TITULO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Fuente del cuerpo</label>
            <select
              value={value.tipografia.cuerpo}
              onChange={(e) => updateNested("tipografia", { cuerpo: e.target.value })}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {FUENTES_CUERPO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Posiciones ───────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Posición de elementos</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Logo</label>
            <select
              value={value.posicion.logo}
              onChange={(e) => updateNested("posicion", { logo: e.target.value })}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {POSICIONES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Firma</label>
            <select
              value={value.posicion.firma}
              onChange={(e) => updateNested("posicion", { firma: e.target.value })}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {POSICIONES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Sello</label>
            <select
              value={value.posicion.sello}
              onChange={(e) => updateNested("posicion", { sello: e.target.value })}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {POSICIONES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Código QR</label>
            <select
              value={value.posicion.qr}
              onChange={(e) => updateNested("posicion", { qr: e.target.value })}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {POSICIONES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Colores ───────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Colores</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["titulo", "texto", "borde", "acento"] as const).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1.5 capitalize">{key}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={value.colores[key]}
                  onChange={(e) =>
                    updateNested("colores", { [key]: e.target.value })
                  }
                  className="w-10 h-9 rounded cursor-pointer border"
                  style={{ borderColor: "var(--border)" }}
                />
                <input
                  type="text"
                  value={value.colores[key]}
                  onChange={(e) =>
                    updateNested("colores", { [key]: e.target.value })
                  }
                  className="flex-1 h-9 px-2 rounded-lg text-sm font-mono outline-none"
                  style={{
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Parsea config existente o devuelve default */
export function parseConfigPlantilla(
  raw: Record<string, unknown> | null | undefined
): ConfigPlantillaValues {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CONFIG };
  return {
    logo_url: (raw.logo_url as string) ?? DEFAULT_CONFIG.logo_url,
    firma_url: (raw.firma_url as string) ?? DEFAULT_CONFIG.firma_url,
    sello_url: (raw.sello_url as string) ?? DEFAULT_CONFIG.sello_url,
    colores: {
      ...DEFAULT_CONFIG.colores,
      ...(typeof raw.colores === "object" && raw.colores ? (raw.colores as Record<string, string>) : {}),
    },
    tipografia: {
      ...DEFAULT_CONFIG.tipografia,
      ...(typeof raw.tipografia === "object" && raw.tipografia ? (raw.tipografia as Record<string, string>) : {}),
    },
    posicion: {
      ...DEFAULT_CONFIG.posicion,
      ...(typeof raw.posicion === "object" && raw.posicion ? (raw.posicion as Record<string, string>) : {}),
    },
    margenes: {
      ...DEFAULT_CONFIG.margenes,
      ...(typeof raw.margenes === "object" && raw.margenes ? (raw.margenes as Record<string, number>) : {}),
    },
  };
}

/** Convierte ConfigPlantillaValues a objeto para guardar en backend */
export function configToJson(values: ConfigPlantillaValues): Record<string, unknown> {
  return {
    logo_url: values.logo_url || undefined,
    firma_url: values.firma_url || undefined,
    sello_url: values.sello_url || undefined,
    colores: values.colores,
    tipografia: values.tipografia,
    posicion: values.posicion,
    margenes: values.margenes,
  };
}
