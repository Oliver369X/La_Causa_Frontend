import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseUTC(dateString: string): Date {
  if (!dateString) return new Date(NaN);
  // Si no termina en Z y no tiene offset (+/-XX:XX), asumimos UTC y le agregamos Z
  if (!dateString.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(dateString)) {
    return new Date(dateString + "Z");
  }
  return new Date(dateString);
}

export function formatDate(dateString: string): string {
  const d = parseUTC(dateString);
  if (isNaN(d.getTime())) return "Fecha inválida";
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function toLocalDateTimeString(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = parseUTC(dateStr);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function truncate(str: string, length = 80): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

/** Nombre visible para personas: nunca mostrar UUID crudo al usuario. */
export function displayPersonName(
  nombre?: string | null,
  email?: string | null,
  fallback = "Persona"
): string {
  const n = (nombre || "").trim();
  if (n) return n;
  const e = (email || "").trim();
  if (e) return e;
  return fallback;
}
