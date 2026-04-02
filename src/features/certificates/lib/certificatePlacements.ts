/** Imagen colocada en coordenadas % sobre el cuerpo del certificado */
export interface PlacedImage {
  id: string;
  url: string;
  /** 0–100 desde la izquierda (centro del elemento con translate -50%) */
  xPct: number;
  /** 0–100 desde arriba */
  yPct: number;
  /** Ancho máximo en px */
  widthPx: number;
}

export function newPlacedImage(
  partial: Partial<Omit<PlacedImage, "id">> & { url?: string }
): PlacedImage {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url: partial.url ?? "",
    xPct: partial.xPct ?? 50,
    yPct: partial.yPct ?? 50,
    widthPx: partial.widthPx ?? 140,
  };
}

function normalizePlaced(raw: unknown, index: number): PlacedImage {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const url = typeof o.url === "string" ? o.url : "";
  const id =
    typeof o.id === "string" && o.id.length > 0
      ? o.id
      : `imported-${index}-${url.slice(-8)}`;
  const xPct = typeof o.xPct === "number" && Number.isFinite(o.xPct) ? clamp(o.xPct, 0, 100) : 50;
  const yPct = typeof o.yPct === "number" && Number.isFinite(o.yPct) ? clamp(o.yPct, 0, 100) : 50;
  const widthPx =
    typeof o.widthPx === "number" && Number.isFinite(o.widthPx) ? clamp(o.widthPx, 24, 800) : 140;
  return { id, url, xPct, yPct, widthPx };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parsePlacedArray(raw: unknown, legacyUrl: string | undefined, legacyDefaults: Omit<PlacedImage, "id" | "url">): PlacedImage[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item, i) => normalizePlaced(item, i)).filter((p) => p.url.trim() !== "");
  }
  if (legacyUrl && legacyUrl.trim() !== "") {
    return [newPlacedImage({ url: legacyUrl, ...legacyDefaults })];
  }
  return [];
}

/** Migra configuración guardada (incl. logo_url único) a listas colocadas */
export function hydratePlacedImagesFromConfig(raw: Record<string, unknown> | null | undefined): {
  logos: PlacedImage[];
  firmas: PlacedImage[];
  sellos: PlacedImage[];
} {
  if (!raw || typeof raw !== "object") {
    return { logos: [], firmas: [], sellos: [] };
  }
  const logos = parsePlacedArray(raw.logos, raw.logo_url as string | undefined, {
    xPct: 50,
    yPct: 10,
    widthPx: 160,
  });
  const firmas = parsePlacedArray(raw.firmas, raw.firma_url as string | undefined, {
    xPct: 72,
    yPct: 88,
    widthPx: 140,
  });
  const sellos = parsePlacedArray(raw.sellos, raw.sello_url as string | undefined, {
    xPct: 28,
    yPct: 88,
    widthPx: 96,
  });
  return { logos, firmas, sellos };
}
