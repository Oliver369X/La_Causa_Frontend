import DOMPurify from "dompurify";

/**
 * Sanitiza HTML de certificado para vista previa en iframe (`srcDoc`).
 * Permite documento completo, estilos, fuentes de Google y datos HTTPS.
 */
export function sanitizeCertificatePreviewHtml(html: string): string {
  if (typeof window === "undefined") return html;

  return DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ["link", "style", "img", "meta"],
    ADD_ATTR: [
      "href",
      "rel",
      "type",
      "media",
      "crossorigin",
      "src",
      "alt",
      "class",
      "id",
      "style",
      "charset",
      "name",
      "content",
    ],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|data:image\/(?:png|gif|jpeg|webp|svg\+xml)):|[a-z][a-z0-9+.-]*:|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}
