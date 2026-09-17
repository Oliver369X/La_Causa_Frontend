"use client";
import { useEffect, useRef, useState } from "react";
import { LocationMapPicker } from "@/shared/ui/LocationMapPicker";
import { geocodeWithNominatim } from "@/shared/utils/geocoding";

export type EventLocation = { direccion?: string; lat?: number | null; lng?: number | null };

export function EventLocationField({ value, onChange, disabled }: {
  value: EventLocation | null; onChange: (value: EventLocation | null) => void; disabled: boolean;
}) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const latestChange = useRef(onChange);
  useEffect(() => { latestChange.current = onChange; }, [onChange]);
  useEffect(() => {
    if (disabled) { request.current?.abort(); setSearching(false); }
  }, [disabled]);
  useEffect(() => () => request.current?.abort(), []);
  const cancelSearch = () => { request.current?.abort(); setSearching(false); setError(""); };
  const search = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSearching(true); setError("");
    try {
      const point = await geocodeWithNominatim(value?.direccion || "", controller.signal);
      if (controller.signal.aborted) return;
      if (point) latestChange.current({ lat: point.lat, lng: point.lng, direccion: point.displayName });
      else setError("No encontramos esa dirección. Puedes marcar el punto directamente en el mapa.");
    } catch {
      if (!controller.signal.aborted) setError("No se pudo buscar la dirección. Puedes seleccionar un punto en el mapa.");
    } finally { if (!controller.signal.aborted) setSearching(false); }
  };
  const point = typeof value?.lat === "number" && typeof value.lng === "number"
    ? { lat: value.lat, lng: value.lng, direccion: value.direccion } : null;
  return <div className="space-y-3">
    <label className="block text-sm">Dirección del evento
      <input value={value?.direccion || ""} disabled={disabled} placeholder="Busca una dirección o marca el mapa"
        onChange={e => { cancelSearch(); onChange({ direccion: e.target.value }); }} />
    </label>
    <button type="button" disabled={disabled || searching || (value?.direccion?.trim().length ?? 0) < 3}
      onClick={() => void search()} className="text-sm text-[var(--accent)] disabled:opacity-40">
      {searching ? "Buscando…" : "Buscar dirección en el mapa"}
    </button>
    {error && <p role="status" className="text-xs text-[var(--text-muted)]">{error}</p>}
    <div className={disabled ? "pointer-events-none opacity-60" : ""} inert={disabled}>
      <LocationMapPicker value={point} onChange={next => {
        if (disabled) return;
        cancelSearch();
        onChange(next ? { ...next, direccion: value?.direccion || "" } : null);
      }} />
    </div>
    {(point || value?.direccion) && <button type="button" disabled={disabled} className="text-xs underline"
      onClick={() => { cancelSearch(); onChange(null); }}>Quitar ubicación</button>}
  </div>;
}
