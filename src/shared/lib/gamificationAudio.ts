/**
 * Motor de audio gamificado V4 — melodías multi-nota con Web Audio API.
 * Cada efecto es una secuencia de notas (no un beep), con 3 variantes (A/B/C)
 * que cambian timbre, escala y velocidad. Incluye delay/reverb simulado.
 */

export type EffectId = "click" | "xp_gain" | "rank_shift" | "badge_unlock" | "season_finale";
export type EffectVariant = "a" | "b" | "c";

const STORAGE_KEY = "gamification-audio-prefs";

export interface AudioPrefs {
  enabled: boolean;
  volume: number;
  variants: Record<EffectId, EffectVariant>;
}

const DEFAULT_PREFS: AudioPrefs = {
  enabled: false,
  volume: 0.7,
  variants: {
    click: "a",
    xp_gain: "a",
    rank_shift: "a",
    badge_unlock: "a",
    season_finale: "a",
  },
};

let audioContext: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
  }
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

interface Note {
  freq: number;
  start: number;   // seconds offset from now
  dur: number;
  type: OscillatorType;
  vol?: number;     // 0-1 relative to master
}

function playSequence(notes: Note[], masterVol: number): void {
  const c = ctx();
  if (!c) return;

  const vol = Math.min(1, Math.max(0, masterVol)) * 0.18;

  for (const n of notes) {
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const delay = c.createDelay(0.3);
      const delayGain = c.createGain();

      osc.type = n.type;
      osc.frequency.value = n.freq;

      const noteVol = vol * (n.vol ?? 1);
      const t = c.currentTime + n.start;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(noteVol, t + 0.008);
      gain.gain.setValueAtTime(noteVol, t + n.dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);

      delay.delayTime.value = 0.12;
      delayGain.gain.value = 0.15;

      osc.connect(gain);
      gain.connect(c.destination);
      gain.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(c.destination);

      osc.start(t);
      osc.stop(t + n.dur + 0.15);
    } catch { /* silent */ }
  }
}

// ── Note constants (frequencies) ──
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880.00, C6 = 1046.50;
const Eb4 = 311.13, Bb4 = 466.16, Fs4 = 369.99, Ab4 = 415.30;

type Melody = (type: OscillatorType) => Note[];

const MELODIES: Record<EffectId, Record<EffectVariant, Melody>> = {
  click: {
    a: (t) => [
      { freq: A5, start: 0, dur: 0.04, type: t },
      { freq: C6, start: 0.03, dur: 0.04, type: t },
    ],
    b: (t) => [
      { freq: E5, start: 0, dur: 0.05, type: t },
      { freq: G5, start: 0.04, dur: 0.05, type: t },
    ],
    c: (t) => [
      { freq: C5, start: 0, dur: 0.03, type: t },
      { freq: E5, start: 0.025, dur: 0.04, type: t },
      { freq: G5, start: 0.05, dur: 0.03, type: t },
    ],
  },

  xp_gain: {
    a: (t) => [
      { freq: C5, start: 0, dur: 0.12, type: t },
      { freq: E5, start: 0.08, dur: 0.12, type: t },
      { freq: G5, start: 0.16, dur: 0.18, type: t },
    ],
    b: (t) => [
      { freq: D4, start: 0, dur: 0.1, type: t },
      { freq: Fs4, start: 0.07, dur: 0.1, type: t },
      { freq: A4, start: 0.14, dur: 0.1, type: t },
      { freq: D5, start: 0.21, dur: 0.15, type: t },
    ],
    c: (t) => [
      { freq: E4, start: 0, dur: 0.08, type: t },
      { freq: G4, start: 0.05, dur: 0.08, type: t },
      { freq: B4, start: 0.1, dur: 0.08, type: t },
      { freq: E5, start: 0.15, dur: 0.2, type: t, vol: 1.2 },
    ],
  },

  rank_shift: {
    a: (t) => [
      { freq: G4, start: 0, dur: 0.08, type: t },
      { freq: A4, start: 0.06, dur: 0.08, type: t },
      { freq: B4, start: 0.12, dur: 0.08, type: t },
      { freq: D5, start: 0.18, dur: 0.15, type: t, vol: 1.1 },
    ],
    b: (t) => [
      { freq: Eb4, start: 0, dur: 0.1, type: t },
      { freq: G4, start: 0.08, dur: 0.1, type: t },
      { freq: Bb4, start: 0.16, dur: 0.15, type: t },
    ],
    c: (t) => [
      { freq: A4, start: 0, dur: 0.06, type: t },
      { freq: C5, start: 0.04, dur: 0.06, type: t },
      { freq: E5, start: 0.08, dur: 0.06, type: t },
      { freq: A5, start: 0.12, dur: 0.2, type: t, vol: 1.3 },
    ],
  },

  badge_unlock: {
    a: (t) => [
      { freq: C5, start: 0, dur: 0.15, type: t },
      { freq: E5, start: 0.1, dur: 0.15, type: t },
      { freq: G5, start: 0.2, dur: 0.15, type: t },
      { freq: C6, start: 0.3, dur: 0.35, type: t, vol: 1.2 },
      // chord underneath
      { freq: C4, start: 0.3, dur: 0.35, type: "sine", vol: 0.5 },
      { freq: E4, start: 0.3, dur: 0.35, type: "sine", vol: 0.4 },
    ],
    b: (t) => [
      { freq: D4, start: 0, dur: 0.12, type: t },
      { freq: A4, start: 0.1, dur: 0.12, type: t },
      { freq: D5, start: 0.2, dur: 0.12, type: t },
      { freq: Fs4, start: 0.3, dur: 0.3, type: t, vol: 1.1 },
      { freq: A4, start: 0.3, dur: 0.3, type: "sine", vol: 0.5 },
    ],
    c: (t) => [
      { freq: E4, start: 0, dur: 0.1, type: t },
      { freq: Ab4, start: 0.08, dur: 0.1, type: t },
      { freq: B4, start: 0.16, dur: 0.1, type: t },
      { freq: E5, start: 0.24, dur: 0.3, type: t, vol: 1.3 },
      { freq: G4, start: 0.24, dur: 0.3, type: "sine", vol: 0.4 },
      { freq: B4, start: 0.24, dur: 0.3, type: "sine", vol: 0.3 },
    ],
  },

  season_finale: {
    a: (t) => [
      { freq: C4, start: 0, dur: 0.2, type: t, vol: 0.8 },
      { freq: E4, start: 0.15, dur: 0.2, type: t, vol: 0.8 },
      { freq: G4, start: 0.3, dur: 0.2, type: t },
      { freq: C5, start: 0.45, dur: 0.25, type: t, vol: 1.1 },
      { freq: E5, start: 0.6, dur: 0.25, type: t, vol: 1.2 },
      { freq: G5, start: 0.75, dur: 0.35, type: t, vol: 1.3 },
      { freq: C6, start: 0.95, dur: 0.5, type: t, vol: 1.4 },
      // sustained chord
      { freq: C4, start: 0.95, dur: 0.5, type: "sine", vol: 0.4 },
      { freq: E4, start: 0.95, dur: 0.5, type: "sine", vol: 0.3 },
      { freq: G4, start: 0.95, dur: 0.5, type: "sine", vol: 0.3 },
    ],
    b: (t) => [
      { freq: D4, start: 0, dur: 0.18, type: t, vol: 0.7 },
      { freq: Fs4, start: 0.12, dur: 0.18, type: t },
      { freq: A4, start: 0.24, dur: 0.18, type: t },
      { freq: D5, start: 0.36, dur: 0.22, type: t, vol: 1.1 },
      { freq: Fs4, start: 0.5, dur: 0.22, type: t, vol: 1.2 },
      { freq: A5, start: 0.65, dur: 0.3, type: t, vol: 1.3 },
      { freq: D5, start: 0.65, dur: 0.3, type: "sine", vol: 0.35 },
      { freq: Fs4, start: 0.65, dur: 0.3, type: "sine", vol: 0.3 },
    ],
    c: (t) => [
      { freq: E4, start: 0, dur: 0.15, type: t, vol: 0.7 },
      { freq: G4, start: 0.1, dur: 0.15, type: t },
      { freq: B4, start: 0.2, dur: 0.15, type: t },
      { freq: E5, start: 0.3, dur: 0.2, type: t, vol: 1.1 },
      { freq: G5, start: 0.45, dur: 0.2, type: t, vol: 1.2 },
      { freq: B4, start: 0.6, dur: 0.25, type: t, vol: 1.3 },
      { freq: E5, start: 0.75, dur: 0.4, type: t, vol: 1.4 },
      { freq: E4, start: 0.75, dur: 0.4, type: "sine", vol: 0.35 },
      { freq: G4, start: 0.75, dur: 0.4, type: "sine", vol: 0.3 },
      { freq: B4, start: 0.75, dur: 0.4, type: "sine", vol: 0.25 },
    ],
  },
};

const VARIANT_TIMBRES: Record<EffectVariant, OscillatorType> = {
  a: "sine",
  b: "triangle",
  c: "sawtooth",
};

/**
 * Manifiesto de samples en `/public/audio/gamification/`.
 * Prefijo `EN-USO_` + `effect-*` + `variante-*` para ver en disco qué está cableado al motor.
 * Variantes sin entrada usan solo síntesis.
 */
const SAMPLE_FILES: Record<EffectId, Partial<Record<EffectVariant, string>>> = {
  click: {
    a: "EN-USO_effect-click_variant-a_mixkit-select-click.wav",
  },
  xp_gain: {
    a: "EN-USO_effect-xp_gain_variant-a_level-up-5.mp3",
    b: "EN-USO_effect-xp_gain_variant-b_level-up-1.mp3",
    c: "EN-USO_effect-xp_gain_variant-c_mixkit-quick-win.wav",
  },
  rank_shift: {
    a: "EN-USO_effect-rank_shift_variant-a_mixkit-arcade-score.wav",
    b: "EN-USO_effect-rank_shift_variant-b_whoosh-coin-ding.mp3",
    c: "EN-USO_effect-rank_shift_variant-c_mixkit-wind-swoosh.wav",
  },
  badge_unlock: {
    a: "EN-USO_effect-badge_unlock_variant-a_mixkit-ethereal-win.wav",
    b: "EN-USO_effect-badge_unlock_variant-b_freesound-tadaa.mp3",
    c: "EN-USO_effect-badge_unlock_variant-c_freesound-trumpet-fanfare.mp3",
  },
  season_finale: {
    a: "EN-USO_effect-season_finale_variant-a_jimscott-super-fanfare.mp3",
    b: "EN-USO_effect-season_finale_variant-b_mufp2-fanfare.mp3",
    c: "EN-USO_effect-season_finale_variant-c_freesound-fasching-fanfare.mp3",
  },
};

const sampleBufferCache = new Map<string, AudioBuffer>();

async function loadDecodedSample(url: string, context: AudioContext): Promise<AudioBuffer | null> {
  const cached = sampleBufferCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const buf = await context.decodeAudioData(arr.slice(0));
    sampleBufferCache.set(url, buf);
    return buf;
  } catch {
    return null;
  }
}

/** Reproduce un sample del CDN estático si existe; si no, el caller usa síntesis. */
async function tryPlaySampleFile(
  effectId: EffectId,
  variant: EffectVariant,
  masterVol: number
): Promise<boolean> {
  const file = SAMPLE_FILES[effectId]?.[variant];
  const c = ctx();
  if (!c || !file) return false;
  const vol = Math.min(1, Math.max(0, masterVol)) * 0.85;
  const url = `/audio/gamification/${file}`;
  const buffer = await loadDecodedSample(url, c);
  if (!buffer) return false;
  try {
    const src = c.createBufferSource();
    const gain = c.createGain();
    gain.gain.value = vol;
    src.buffer = buffer;
    src.connect(gain);
    gain.connect(c.destination);
    src.start(0);
    return true;
  } catch {
    return false;
  }
}

// ── Preferences persistence ──
let prefs: AudioPrefs = { ...DEFAULT_PREFS };
let prefsLoaded = false;

function ensurePrefsLoaded(): void {
  if (prefsLoaded) return;
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AudioPrefs>;
      prefs = {
        ...DEFAULT_PREFS,
        ...p,
        variants: { ...DEFAULT_PREFS.variants, ...p.variants },
      };
    }
  } catch { /* ignore */ }
  prefsLoaded = true;
}

function savePrefs(): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

export function getAudioPrefs(): AudioPrefs {
  ensurePrefsLoaded();
  return { ...prefs };
}

export function setAudioPrefs(
  updates: Partial<Omit<AudioPrefs, "variants">> & {
    variants?: Partial<Record<EffectId, EffectVariant>>;
  }
): void {
  ensurePrefsLoaded();
  const { variants, ...rest } = updates;
  prefs = { ...prefs, ...rest };
  if (variants) prefs.variants = { ...prefs.variants, ...variants };
  savePrefs();
}

export function play(effectId: EffectId): void {
  try {
    ensurePrefsLoaded();
    if (!prefs.enabled || prefs.volume <= 0) return;
    const variant = prefs.variants[effectId] ?? "a";
    const volume = prefs.volume;
    void (async () => {
      const usedFile = await tryPlaySampleFile(effectId, variant, volume);
      if (usedFile) return;
      const timbre = VARIANT_TIMBRES[variant];
      const melody = MELODIES[effectId]?.[variant];
      if (!melody) return;
      playSequence(melody(timbre), volume);
    })();
  } catch { /* never break UI */ }
}
