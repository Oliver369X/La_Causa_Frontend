import type { AxiosError } from "axios";

type ValidationIssue = {
  loc?: unknown[];
  msg?: unknown;
  type?: unknown;
};

const FIELD_LABELS: Record<string, string> = {
  file: "la imagen",
  evidencia_url: "URL de evidencia",
  comentario: "comentario",
  estado: "estado de revisión",
  feedback: "feedback",
  rating: "calificación",
  titulo: "título",
  email: "email",
  password: "contraseña",
};

function fieldLabelFromLoc(loc: unknown[] | undefined): string | null {
  if (!loc?.length) return null;
  const key = String(loc[loc.length - 1] ?? "");
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ");
}

function formatValidationIssue(item: ValidationIssue): string | null {
  const msg = typeof item.msg === "string" ? item.msg.trim() : "";
  const field = fieldLabelFromLoc(Array.isArray(item.loc) ? item.loc : undefined);
  if (field && /field required|missing/i.test(msg)) {
    return `Falta ${field}. Volvé a elegir el archivo e intentá de nuevo.`;
  }
  if (field && msg) {
    return `${field.charAt(0).toUpperCase()}${field.slice(1)}: ${msg}`;
  }
  return msg || null;
}

function isAxiosError(err: unknown): err is AxiosError<{ detail?: unknown }> {
  return !!err && typeof err === "object" && "response" in err;
}

function isUploadImageError(err: unknown): err is Error & { stage?: string } {
  return err instanceof Error && err.name === "UploadImageError";
}

/** Mensajes claros para fallos de subida de imágenes. */
export function extractUploadError(err: unknown): string {
  if (isUploadImageError(err)) return err.message;

  if (!isAxiosError(err)) {
    if (err instanceof Error && err.message) return err.message;
    return "No se pudo subir la imagen. Intentá de nuevo.";
  }

  const status = err.response?.status;
  const detail = err.response?.data?.detail;
  const requestUrl = String(err.config?.url ?? "");

  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return formatValidationIssue(item as ValidationIssue);
        }
        return null;
      })
      .filter(Boolean) as string[];
    if (parts.length) return parts.join(" ");
  }

  if (status === 422) {
    if (requestUrl.includes("/uploads/")) {
      return "No llegó la imagen al servidor. Recargá la página e intentá otra vez.";
    }
    return "Datos inválidos o incompletos. Revisá los campos e intentá de nuevo.";
  }
  if (status === 400) {
    return "La imagen no es válida. Usá JPG, PNG, WebP o GIF.";
  }
  if (status === 413) {
    return "La imagen es demasiado pesada (máx. 10 MB). Elegí otra más liviana.";
  }
  if (status === 429) {
    return "Subiste demasiadas imágenes seguidas. Esperá un minuto e intentá de nuevo.";
  }
  if (status === 503) {
    return "El servicio de imágenes no está disponible ahora. Intentá en unos minutos.";
  }
  if (status === 401) {
    return "Tu sesión expiró. Volvé a iniciar sesión y subí la imagen otra vez.";
  }
  if (status === 500) {
    return "Error del servidor al guardar la imagen. Intentá de nuevo en unos minutos.";
  }
  if (!err.response) {
    return "Sin conexión con el servidor. Revisá tu internet e intentá otra vez.";
  }

  return "No se pudo subir la imagen. Intentá de nuevo.";
}

export function extractApiDetail(err: unknown, fallback = "Ocurrió un error. Intenta de nuevo."): string {
  if (isUploadImageError(err)) return err.message;

  if (!isAxiosError(err)) {
    return err instanceof Error && err.message ? err.message : fallback;
  }

  const status = err.response?.status;
  const detail = err.response?.data?.detail;
  const requestUrl = String(err.config?.url ?? "");

  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return formatValidationIssue(item as ValidationIssue);
        }
        return null;
      })
      .filter(Boolean) as string[];
    if (parts.length) return parts.join(" ");
  }

  if (status === 422) {
    if (requestUrl.includes("/uploads/")) {
      return "No llegó el archivo al servidor. Recargá la página e intentá otra vez.";
    }
    return "Datos inválidos o incompletos. Revisá los campos e intentá de nuevo.";
  }
  if (status === 413) {
    return "El archivo es demasiado grande.";
  }
  if (status === 429) {
    return "Demasiados intentos. Esperá un momento e intentá de nuevo.";
  }
  if (status === 503) {
    return "Servicio temporalmente no disponible. Intentá en unos minutos.";
  }
  if (!err.response) {
    return "Sin conexión. Revisá tu internet e intentá de nuevo.";
  }

  return fallback;
}
