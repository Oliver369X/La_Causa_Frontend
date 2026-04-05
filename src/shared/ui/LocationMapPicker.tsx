"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";

export interface LocationPoint {
  lat: number;
  lng: number;
  direccion?: string;
}

interface LocationMapPickerProps {
  value: LocationPoint | null;
  onChange: (value: LocationPoint | null) => void;
  placeholder?: string;
  className?: string;
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
}

function MapClickHandler({ onChange }: { onChange: (v: LocationPoint) => void }) {
  const { useMapEvents } = require("react-leaflet");
  useMapEvents({
    click: (e: { latlng: { lat: number; lng: number } }) => {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/**
 * Selector de ubicación en mapa usando OpenStreetMap (sin API key).
 * El usuario hace clic en el mapa para marcar el punto exacto.
 */
export function LocationMapPicker({
  value,
  onChange,
  placeholder = "Haz clic en el mapa para marcar la ubicación exacta",
  className = "",
  defaultCenter = { lat: -17.7833, lng: -63.1821 },
  defaultZoom = 13,
}: LocationMapPickerProps) {
  const [mounted, setMounted] = useState(false);
  // Carga dinámica de react-leaflet: any evita desalinear tipos estrictos con props reales del mapa.
  const [LeafletComponents, setLeafletComponents] = useState<{
    MapContainer: React.ComponentType<any>;
    TileLayer: React.ComponentType<any>;
    Marker: React.ComponentType<any>;
    Popup: React.ComponentType<any>;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    let cancelled = false;

    void Promise.all([import("leaflet/dist/leaflet.css"), import("leaflet")]).then(([, Lmod]) => {
      if (cancelled) return;
      const L = (Lmod as { default?: typeof import("leaflet") }).default ?? Lmod;
      // Webpack/Next no resuelven las rutas por defecto de marker-icon.png / shadow.
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      const base = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images";
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: `${base}/marker-icon-2x.png`,
        iconUrl: `${base}/marker-icon.png`,
        shadowUrl: `${base}/marker-shadow.png`,
      });
      return import("react-leaflet");
    }).then((mod) => {
      if (cancelled || !mod) return;
      setLeafletComponents({
        MapContainer: mod.MapContainer as React.ComponentType<any>,
        TileLayer: mod.TileLayer as React.ComponentType<any>,
        Marker: mod.Marker as React.ComponentType<any>,
        Popup: mod.Popup as React.ComponentType<any>,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const handleMapClick = useCallback(
    (point: LocationPoint) => {
      onChange(point);
    },
    [onChange]
  );

  if (!mounted || !LeafletComponents) {
    return (
      <div
        className={`flex items-center justify-center h-48 rounded-xl ${className}`}
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
      >
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          Cargando mapa...
        </span>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletComponents;
  const center = value ? [value.lat, value.lng] : [defaultCenter.lat, defaultCenter.lng];
  const zoom = value ? 16 : defaultZoom;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {placeholder}
        </p>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="w-3.5 h-3.5" />
            Quitar ubicación
          </button>
        )}
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ height: 240, border: "1px solid var(--border)" }}
      >
        <MapContainer
          key={value ? `${value.lat}-${value.lng}` : "empty"}
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onChange={handleMapClick} />
          {value && (
            <Marker position={[value.lat, value.lng]}>
              <Popup>
                <span className="text-sm">
                  Punto en el mapa: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
                </span>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      {value && (
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          <MapPin className="w-3 h-3 inline mr-1" />
          Coordenadas: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
