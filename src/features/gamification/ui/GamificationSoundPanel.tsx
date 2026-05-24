"use client";

import { useCallback, useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { getAudioPrefs, setAudioPrefs } from "@/shared/lib/gamificationAudio";

/**
 * Preferencias de sonido: solo activar/desactivar (variantes fijas en el motor de audio).
 */
export function GamificationSoundPanel() {
  const [prefs, setPrefs] = useState(() => getAudioPrefs());

  useEffect(() => {
    setPrefs(getAudioPrefs());
  }, []);

  const update = useCallback((u: Parameters<typeof setAudioPrefs>[0]) => {
    setAudioPrefs(u);
    setPrefs(getAudioPrefs());
  }, []);

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {prefs.enabled ? (
            <Volume2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
          ) : (
            <VolumeX className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          )}
          <div>
            <h2 className="text-sm font-semibold">Sonidos</h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Activá o desactivá los efectos de gamificación (se guardan en este navegador).
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={prefs.enabled ? "primary" : "ghost"}
          onClick={() => update({ enabled: !prefs.enabled })}
        >
          {prefs.enabled ? "Activados" : "Desactivados"}
        </Button>
      </div>
    </div>
  );
}
