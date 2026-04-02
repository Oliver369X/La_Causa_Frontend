import type { CSSProperties } from "react";

/** Ancho máximo de la mini-hoja A4 (posición), en px */
export const CERT_MINI_HOJA_MAX_W = 118;

/**
 * Escala de la vista previa: lado corto del A4 (210 mm) en píxeles.
 * Retrato: ancho = este valor, alto = proporción 297/210 × ancho.
 * Apaisado: ancho = 297/210 × este valor, alto = este valor (mismo lado corto que en retrato).
 */
export const CERT_PREVIEW_SHORT_EDGE_PX = 280;

/** A4 en mm: ancho × alto retrato */
const A4_SHORT_MM = 210;
const A4_LONG_MM = 297;

/**
 * Marco del iframe: proporción A4 fija con `aspect-ratio` (evita el truco padding+height:0
 * con `border-box`, que puede colapsar la altura y estirar la vista varias veces la hoja).
 */
export function certPreviewFrameStyle(orientacion: CertOrientacion): CSSProperties {
  if (orientacion === "horizontal") {
    const maxW = CERT_PREVIEW_SHORT_EDGE_PX * (A4_LONG_MM / A4_SHORT_MM);
    return {
      width: "100%",
      maxWidth: maxW,
      aspectRatio: `${A4_LONG_MM} / ${A4_SHORT_MM}`,
      position: "relative",
      boxSizing: "border-box",
      minHeight: 0,
    };
  }
  return {
    width: "100%",
    maxWidth: CERT_PREVIEW_SHORT_EDGE_PX,
    aspectRatio: `${A4_SHORT_MM} / ${A4_LONG_MM}`,
    position: "relative",
    boxSizing: "border-box",
    minHeight: 0,
  };
}

/** Vertical = retrato A4 (210×297), horizontal = apaisado A4 (297×210) */
export type CertOrientacion = "vertical" | "horizontal";

export function certAspectRatioCSS(o: CertOrientacion): "210 / 297" | "297 / 210" {
  return o === "horizontal" ? "297 / 210" : "210 / 297";
}

export function certIsLandscape(o: CertOrientacion): boolean {
  return o === "horizontal";
}
