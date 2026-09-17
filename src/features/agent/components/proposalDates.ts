// Edit wall-clock values in Bolivia regardless of the browser timezone.
export function pickerDate(value: string | null): Date | null {
  if (!value) return null;
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return null;
  const bolivia = new Date(instant.getTime() - 4 * 3600_000);
  return new Date(bolivia.getUTCFullYear(), bolivia.getUTCMonth(), bolivia.getUTCDate(), bolivia.getUTCHours(), bolivia.getUTCMinutes());
}
export function pickerISO(date: Date | null): string | null {
  if (!date) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00-04:00`;
}
