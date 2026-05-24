/**
 * URL base del backend FastAPI.
 * Una sola variable para local y producción: NEXT_PUBLIC_API_URL (ej. https://api.tudominio.com sin barra final).
 */
const RAW = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? "";
/** Solo desarrollo cuando no definiste NEXT_PUBLIC_API_URL en .env.local */
const FALLBACK_LOCAL = "http://localhost:8000";

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  !RAW
) {
  console.error(
    "NEXT_PUBLIC_API_URL is required in production (URL pública HTTPS del backend)."
  );
}

export const API_BASE_URL =
  RAW || (process.env.NODE_ENV !== "production" ? FALLBACK_LOCAL : "");
