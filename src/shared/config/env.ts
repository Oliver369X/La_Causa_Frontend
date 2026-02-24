/**
 * Validación de variables de entorno.
 * En producción (client-side), NEXT_PUBLIC_API_URL debe estar definida.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  !API_URL
) {
  console.error(
    "NEXT_PUBLIC_API_URL is required in production. Configure it in Vercel env vars."
  );
}

export const API_BASE_URL = API_URL || "http://localhost:8000";
