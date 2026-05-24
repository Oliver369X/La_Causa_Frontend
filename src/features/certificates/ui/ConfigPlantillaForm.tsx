"use client";

import { useState } from "react";
import { X, PenTool, Building2, Stamp, Plus, Trash2, ChevronDown } from "lucide-react";
import { uploadImage } from "@/features/uploads/api/uploadApi";
import { toast } from "sonner";
import { extractUploadError } from "@/shared/utils/apiError";
import {
  newPlacedImage,
  type PlacedImage,
  hydratePlacedImagesFromConfig,
} from "@/features/certificates/lib/certificatePlacements";
import { DragPlacementPad } from "@/features/certificates/ui/DragPlacementPad";
import { CERT_MINI_HOJA_MAX_W, type CertOrientacion } from "@/features/certificates/ui/certificateUiConstants";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/utils/utils";

/** Configuración que se genera desde el formulario (sin JSON manual) */
export interface ConfigPlantillaValues {
  logos: PlacedImage[];
  firmas: PlacedImage[];
  sellos: PlacedImage[];
  /** Compatibilidad: primer URL (lectura legada) */
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
  /** Retrato A4 o apaisado A4 */
  orientacion: CertOrientacion;
}

const DEFAULT_CONFIG: ConfigPlantillaValues = {
  logos: [],
  firmas: [],
  sellos: [],
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
  orientacion: "vertical",
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
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes (JPG, PNG, WebP)");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10 MB.");
      return;
    }
    onUploadingChange(true);
    try {
      const { url: uploadedUrl } = await uploadImage(f);
      onUrlChange(uploadedUrl);
      toast.success("Imagen subida correctamente");
    } catch (err) {
      toast.error(extractUploadError(err));
    } finally {
      onUploadingChange(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <label
        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border-2 border-dashed min-h-[64px]"
        style={{
          borderColor: url ? "var(--border)" : "var(--accent)",
          background: "var(--bg-subtle)",
        }}
      >
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
        {url ? (
          <>
            <img src={url} alt="" className="w-12 h-12 object-contain rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                Cloudinary
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
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
            <Icon className="w-8 h-8 shrink-0" style={{ color: "var(--text-muted)" }} />
            <div>
              <p className="text-sm" style={{ color: "var(--text)" }}>
                {uploading ? "Subiendo..." : "Subir imagen"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>JPG, PNG, WebP · máx. 5 MB</p>
            </div>
          </>
        )}
      </label>
    </div>
  );
}

type PlacedKey = "logos" | "firmas" | "sellos";

const PLACED_META: Record<
  PlacedKey,
  { title: string; icon: React.ElementType; addLabel: string; defaults: Partial<PlacedImage>; accent: string }
> = {
  logos: {
    title: "Logos",
    icon: Building2,
    addLabel: "Añadir logo",
    defaults: { xPct: 50, yPct: 10, widthPx: 160 },
    accent: "#7c3aed",
  },
  firmas: {
    title: "Firmas",
    icon: PenTool,
    addLabel: "Añadir firma",
    defaults: { xPct: 72, yPct: 88, widthPx: 140 },
    accent: "#2563eb",
  },
  sellos: {
    title: "Sellos",
    icon: Stamp,
    addLabel: "Añadir sello",
    defaults: { xPct: 28, yPct: 88, widthPx: 96 },
    accent: "#059669",
  },
};

function CollapsibleSection({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className="group rounded-xl border overflow-hidden mb-2 last:mb-0"
      style={{ borderColor: "var(--border)" }}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium select-none",
          "[&::-webkit-details-marker]:hidden"
        )}
        style={{ background: "var(--bg-subtle)" }}
      >
        <ChevronDown
          className={cn("w-4 h-4 shrink-0 transition-transform", open && "rotate-180")}
          style={{ color: "var(--text-muted)" }}
        />
        <span className="flex-1 text-left">{title}</span>
        {hint ? (
          <span className="text-[11px] font-normal shrink-0" style={{ color: "var(--text-muted)" }}>
            {hint}
          </span>
        ) : null}
      </summary>
      <div className="px-3 py-3 border-t space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
        {children}
      </div>
    </details>
  );
}

export function ConfigPlantillaForm({ value, onChange }: ConfigPlantillaFormProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const updateNested = <K extends keyof ConfigPlantillaValues>(
    key: K,
    nested: Partial<ConfigPlantillaValues[K]>
  ) => {
    onChange({
      ...value,
      [key]: { ...(value[key] as object), ...nested },
    });
  };

  const syncLegacyUrls = (next: ConfigPlantillaValues): ConfigPlantillaValues => ({
    ...next,
    logo_url: next.logos[0]?.url ?? "",
    firma_url: next.firmas[0]?.url ?? "",
    sello_url: next.sellos[0]?.url ?? "",
  });

  const updatePlaced = (key: PlacedKey, index: number, patch: Partial<PlacedImage>) => {
    const arr = [...value[key]];
    if (!arr[index]) return;
    arr[index] = { ...arr[index], ...patch };
    onChange(syncLegacyUrls({ ...value, [key]: arr }));
  };

  const removePlaced = (key: PlacedKey, index: number) => {
    const arr = value[key].filter((_, i) => i !== index);
    onChange(syncLegacyUrls({ ...value, [key]: arr }));
  };

  const addPlaced = (key: PlacedKey) => {
    const meta = PLACED_META[key];
    const arr = [...value[key], newPlacedImage(meta.defaults)];
    onChange(syncLegacyUrls({ ...value, [key]: arr }));
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] px-0.5 pb-1" style={{ color: "var(--text-muted)" }}>
        Mini-hoja ({CERT_MINI_HOJA_MAX_W}px) con la misma proporción A4 que la vista previa (vertical u horizontal).
      </p>

      <CollapsibleSection title="Logos, firmas y sellos" hint="imágenes" defaultOpen>
        <p className="text-[11px] -mt-1" style={{ color: "var(--text-muted)" }}>
          Varios elementos por tipo. La mini-hoja es compacta; la vista previa de arriba muestra el resultado real.
        </p>
        {(Object.keys(PLACED_META) as PlacedKey[]).map((key, sectionIdx) => {
          const meta = PLACED_META[key];
          const Icon = meta.icon;
          const list = value[key];
          return (
            <CollapsibleSection
              key={key}
              title={meta.title}
              hint={`${list.length}`}
              defaultOpen={sectionIdx === 0}
            >
              <div className="space-y-3">
                {list.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-xl p-3 space-y-3"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                        {meta.title.slice(0, -1)} {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePlaced(key, index)}
                        className="p-1 rounded-lg hover:opacity-80 transition-opacity"
                        style={{ color: "var(--text-muted)" }}
                        aria-label="Quitar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                      <ImageUploadSlot
                        label="Archivo"
                        icon={Icon}
                        url={item.url}
                        onUrlChange={(url) => updatePlaced(key, index, { url })}
                        uploading={uploadingId === item.id}
                        onUploadingChange={(v) => setUploadingId(v ? item.id : null)}
                      />
                      <div className="flex justify-center sm:justify-end shrink-0" style={{ width: CERT_MINI_HOJA_MAX_W + 16 }}>
                        <DragPlacementPad
                          label="Posición"
                          accentColor={meta.accent}
                          orientacion={value.orientacion}
                          xPct={item.xPct}
                          yPct={item.yPct}
                          maxWidthPx={CERT_MINI_HOJA_MAX_W}
                          onChange={(xPct, yPct) => updatePlaced(key, index, { xPct, yPct })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-1">
                        Ancho máx. (px): {item.widthPx}
                      </label>
                      <input
                        type="range"
                        min={48}
                        max={400}
                        value={item.widthPx}
                        onChange={(e) => updatePlaced(key, index, { widthPx: Number(e.target.value) })}
                        className="w-full accent-[var(--accent)] h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => addPlaced(key)}>
                <Plus className="w-4 h-4" /> {meta.addLabel}
              </Button>
            </CollapsibleSection>
          );
        })}
      </CollapsibleSection>

      <CollapsibleSection title="Tipografía" hint="fuentes">
        <p className="text-[11px] -mt-1 mb-1" style={{ color: "var(--text-muted)" }}>
          Clases .titulo y .nombre / .mensaje / .firma.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium mb-1">Fuente del título</label>
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
            <label className="block text-xs font-medium mb-1">Fuente del cuerpo</label>
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
      </CollapsibleSection>

      <CollapsibleSection title="Colores" hint="tema">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["titulo", "texto", "borde", "acento"] as const).map((k) => (
            <div key={k}>
              <label className="block text-xs font-medium mb-1 capitalize">{k}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={value.colores[k]}
                  onChange={(e) => updateNested("colores", { [k]: e.target.value })}
                  className="w-9 h-8 rounded cursor-pointer border"
                  style={{ borderColor: "var(--border)" }}
                />
                <input
                  type="text"
                  value={value.colores[k]}
                  onChange={(e) => updateNested("colores", { [k]: e.target.value })}
                  className="flex-1 h-8 px-2 rounded-lg text-xs font-mono outline-none"
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
      </CollapsibleSection>
    </div>
  );
}

/** Parsea config existente o devuelve default */
export function parseConfigPlantilla(
  raw: Record<string, unknown> | null | undefined
): ConfigPlantillaValues {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CONFIG };
  const placed = hydratePlacedImagesFromConfig(raw);
  return {
    ...DEFAULT_CONFIG,
    logos: placed.logos,
    firmas: placed.firmas,
    sellos: placed.sellos,
    logo_url: placed.logos[0]?.url ?? (typeof raw.logo_url === "string" ? raw.logo_url : "") ?? "",
    firma_url: placed.firmas[0]?.url ?? (typeof raw.firma_url === "string" ? raw.firma_url : "") ?? "",
    sello_url: placed.sellos[0]?.url ?? (typeof raw.sello_url === "string" ? raw.sello_url : "") ?? "",
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
    orientacion:
      raw.orientacion === "horizontal" || raw.orientacion === "vertical"
        ? (raw.orientacion as CertOrientacion)
        : DEFAULT_CONFIG.orientacion,
  };
}

/** Convierte ConfigPlantillaValues a objeto para guardar en backend */
export function configToJson(values: ConfigPlantillaValues): Record<string, unknown> {
  return {
    logos: values.logos.filter((p) => p.url.trim() !== ""),
    firmas: values.firmas.filter((p) => p.url.trim() !== ""),
    sellos: values.sellos.filter((p) => p.url.trim() !== ""),
    logo_url: values.logos[0]?.url || undefined,
    firma_url: values.firmas[0]?.url || undefined,
    sello_url: values.sellos[0]?.url || undefined,
    colores: values.colores,
    tipografia: values.tipografia,
    posicion: values.posicion,
    margenes: values.margenes,
    orientacion: values.orientacion,
  };
}
