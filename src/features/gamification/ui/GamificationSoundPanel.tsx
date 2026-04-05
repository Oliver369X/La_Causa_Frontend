"use client";

import { useCallback, useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import {
  getAudioPrefs,
  setAudioPrefs,
  play,
  type EffectId,
  type EffectVariant,
} from "@/shared/lib/gamificationAudio";

const EFFECT_IDS: EffectId[] = ["click", "xp_gain", "rank_shift", "badge_unlock", "season_finale"];
const EFFECT_LABELS: Record<EffectId, string> = {
  click: "Click",
  xp_gain: "XP",
  rank_shift: "Ranking",
  badge_unlock: "Insignia",
  season_finale: "Finale",
};

/**
 * Preferencias de sonido para producción (misma lógica que el Lab visual, sin demo de partículas).
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
      className="rounded-2xl p-5 space-y-4"
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
              Activá efectos y elegí variante A / B / C por tipo (se guardan en este navegador).
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

      <div className="flex items-center gap-3">
        <label className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
          Volumen
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={prefs.volume}
          onChange={(e) => update({ volume: parseFloat(e.target.value) })}
          className="flex-1 h-2 rounded-full accent-[var(--accent)]"
          disabled={!prefs.enabled}
        />
        <span className="text-xs tabular-nums w-8">{Math.round(prefs.volume * 100)}%</span>
      </div>

      <div className="space-y-3">
        {EFFECT_IDS.map((effectId) => (
          <div key={effectId} className="flex flex-wrap items-center gap-2">
            <span className="text-xs w-24 shrink-0" style={{ color: "var(--text-muted)" }}>
              {EFFECT_LABELS[effectId]}
            </span>
            {(["a", "b", "c"] as EffectVariant[]).map((v) => (
              <Button
                key={v}
                size="xs"
                variant={prefs.variants[effectId] === v ? "primary" : "ghost"}
                disabled={!prefs.enabled}
                onClick={() => {
                  update({ variants: { [effectId]: v } });
                  play(effectId);
                }}
              >
                {v.toUpperCase()}
              </Button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
