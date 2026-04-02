import type { ConfigPlantillaValues } from "@/features/certificates/ui/ConfigPlantillaForm";

const GOOGLE_FONTS = [
  "Playfair Display",
  "Merriweather",
  "Libre Baskerville",
  "Cinzel",
  "Open Sans",
  "Lato",
  "Roboto",
  "Source Sans Pro",
  "PT Sans",
];

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function injectBeforeClosingHead(html: string, injection: string): string {
  const re = /<\/head\s*>/i;
  const m = html.match(re);
  if (m && m.index !== undefined) {
    const i = m.index;
    return html.slice(0, i) + injection + html.slice(i);
  }
  const headOpen = html.match(/<head[^>]*>/i);
  if (headOpen && headOpen.index !== undefined) {
    const end = headOpen.index + headOpen[0].length;
    return html.slice(0, end) + injection + html.slice(end);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${injection}</head><body>${html}</body></html>`;
}

function injectBeforeClosingBody(html: string, block: string): string {
  const re = /<\/body\s*>/i;
  const m = html.match(re);
  if (m && m.index !== undefined) {
    const i = m.index;
    return html.slice(0, i) + block + html.slice(i);
  }
  return html + block;
}

/** Sustituye variables {{ nombre }}, etc. */
export function applyCertificateVariables(
  html: string,
  datos: {
    nombre: string;
    horas: string;
    gestion: string;
    fecha_emision: string;
    organizacion: string;
  }
): string {
  return html
    .replace(/\{\{\s*nombre\s*\}\}/g, datos.nombre)
    .replace(/\{\{\s*horas\s*\}\}/g, datos.horas)
    .replace(/\{\{\s*gestion\s*\}\}/g, datos.gestion)
    .replace(/\{\{\s*fecha_emision\s*\}\}/g, datos.fecha_emision)
    .replace(/\{\{\s*organizacion\s*\}\}/g, datos.organizacion);
}

export function buildCertificatePreviewHtml(html: string, cfg: ConfigPlantillaValues): string {
  const datos = {
    nombre: "Juan Pérez",
    horas: "120",
    gestion: "2024",
    fecha_emision: new Date().toLocaleDateString("es-ES"),
    organizacion: "Mi Organización",
  };
  let out = applyCertificateVariables(html, datos);

  const fontsToLoad = [cfg.tipografia.titulo, cfg.tipografia.cuerpo]
    .filter((f) => GOOGLE_FONTS.includes(f))
    .filter((f, i, a) => a.indexOf(f) === i);
  const fontsQuery = fontsToLoad
    .map((f) => {
      const name = encodeURIComponent(f).replace(/%20/g, "+");
      return `family=${name}:wght@400;600;700`;
    })
    .join("&");
  const fontsLink =
    fontsToLoad.length > 0
      ? `<link href="https://fonts.googleapis.com/css2?${fontsQuery}&amp;display=swap" rel="stylesheet" crossorigin="anonymous" />`
      : "";

  const styleOverrides = `
      .titulo { font-family: "${cfg.tipografia.titulo}", Georgia, serif !important; color: ${cfg.colores.titulo} !important; }
      .nombre, .mensaje, .firma { font-family: "${cfg.tipografia.cuerpo}", Arial, sans-serif !important; color: ${cfg.colores.texto} !important; }
      /* La hoja llena el iframe (proporción A4 en el contenedor padre); flujo natural arriba→abajo, sin bloques vacíos por centrado. */
      html {
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #e5e7eb;
      }
      body {
        position: relative !important;
        margin: 0;
        box-sizing: border-box;
        background: #fff !important;
        color: ${cfg.colores.texto} !important;
        border: 2px solid ${cfg.colores.borde};
        padding: ${cfg.margenes.superior}px ${cfg.margenes.derecho}px ${cfg.margenes.inferior}px ${cfg.margenes.izquierdo}px;
        width: 100%;
        height: 100%;
        max-height: 100%;
        overflow-x: hidden;
        overflow-y: auto;
      }
    `;
  out = injectBeforeClosingHead(out, `${fontsLink}<style type="text/css">${styleOverrides}</style>`);

  const placedBlocks: string[] = [];
  let z = 3;
  const pushPlaced = (list: { url: string; xPct: number; yPct: number; widthPx: number }[], kind: string) => {
    for (const p of list) {
      if (!p.url?.trim()) continue;
      const w = Math.round(p.widthPx);
      const u = escapeHtmlAttr(p.url);
      const x = Math.max(0, Math.min(100, p.xPct));
      const y = Math.max(0, Math.min(100, p.yPct));
      placedBlocks.push(
        `<div class="cert-placed cert-placed-${kind}" style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);max-width:${w}px;width:max-content;z-index:${z};pointer-events:none;line-height:0">` +
          `<img src="${u}" alt="" style="max-width:100%;width:auto;height:auto;object-fit:contain;display:block" />` +
          `</div>`
      );
      z += 1;
    }
  };

  pushPlaced(cfg.logos, "logo");
  pushPlaced(cfg.sellos, "sello");
  pushPlaced(cfg.firmas, "firma");

  if (placedBlocks.length > 0) {
    out = injectBeforeClosingBody(out, placedBlocks.join(""));
  }

  return out;
}
