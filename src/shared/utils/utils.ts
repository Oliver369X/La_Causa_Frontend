import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
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
