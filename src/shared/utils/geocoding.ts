/**
 * Geocodificación con Nominatim (OpenStreetMap). Sin API key.
 * Uso razonable: debounce en el cliente y no abusar del servicio público.
 */
export async function geocodeWithNominatim(
  query: string,
  signal?: AbortSignal
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const q = query.trim();
  if (q.length < 3) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "bo");

  const res = await fetch(url.toString(), {
    signal,
    headers: {
      "Accept-Language": "es",
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const first = data[0] as { lat?: string; lon?: string; display_name?: string };
  const lat = parseFloat(first.lat ?? "");
  const lng = parseFloat(first.lon ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return {
    lat,
    lng,
    displayName: typeof first.display_name === "string" ? first.display_name : q,
  };
}

/** Dirección legible a partir de coordenadas (clic en mapa). */
export async function reverseGeocodeWithNominatim(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    signal,
    headers: {
      "Accept-Language": "es",
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string };
  return typeof data.display_name === "string" ? data.display_name : null;
}
