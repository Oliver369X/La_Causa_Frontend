"use client";

import type { User } from "@/shared/store/authStore";
import { Camera, MapPin, UserPlus } from "lucide-react";

interface VolunteerProfileBasicsCardProps {
  user: User | null;
  displayName: string;
  setDisplayName: (value: string) => void;
  bio: string;
  setBio: (value: string) => void;
  onSave: () => void;
  savePending?: boolean;
  onAvatarFile: (file: File) => void;
  avatarPending?: boolean;
  onUseLocation: () => void;
  locationPending?: boolean;
  title?: string;
  description?: string;
  saveLabel?: string;
}

export function VolunteerProfileBasicsCard({
  user,
  displayName,
  setDisplayName,
  bio,
  setBio,
  onSave,
  savePending = false,
  onAvatarFile,
  avatarPending = false,
  onUseLocation,
  locationPending = false,
  title = "Datos personales",
  description = "Completa lo esencial para que las organizaciones entiendan mejor tu perfil.",
  saveLabel = "Guardar perfil",
}: VolunteerProfileBasicsCardProps) {
  return (
    <div className="p-6 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <UserPlus className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
            style={{ background: "var(--bg-subtle)", border: "2px solid var(--border)" }}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold" style={{ color: "var(--text-muted)" }}>
                {(displayName || user?.nombre || "V")[0].toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <label
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer w-fit"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
            >
              <Camera className="w-4 h-4" />
              {avatarPending ? "Subiendo..." : "Cambiar foto"}
              <input
                type="file"
                accept="image/*"
                disabled={avatarPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onAvatarFile(file);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              JPG o PNG. Max. 5 MB.
            </p>
          </div>
        </div>

        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Nombre"
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
        />

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Cuéntanos sobre ti, tus intereses o lo que te motiva a ayudar"
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onUseLocation}
            disabled={locationPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--border)", color: "var(--accent)" }}
          >
            <MapPin className="w-4 h-4" />
            {locationPending ? "Obteniendo..." : "Usar mi ubicación"}
          </button>
          {user?.ubicacion?.lat != null && (
            <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
              Guardada: {user.ubicacion.lat.toFixed(4)}, {user.ubicacion.lon?.toFixed(4)}
              {user.ubicacion.ciudad ? ` · ${user.ubicacion.ciudad}` : ""}
            </span>
          )}
        </div>

        <button
          onClick={onSave}
          disabled={!displayName.trim() || savePending}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          {savePending ? "Guardando..." : saveLabel}
        </button>
      </div>
    </div>
  );
}
