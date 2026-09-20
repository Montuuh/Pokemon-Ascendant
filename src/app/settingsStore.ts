import { create } from 'zustand';
import { claimLegacyKey, SETTINGS_KEY } from './storageKeys';

// §9.6 — display settings. Two of them in v0.5, and both are accessibility items rather than preferences:
// text size, which §9.6 schedules for this version precisely because a layout has to be *built* at 150 % or
// it clips, and a motion override, because the system preference is the right default and not always the
// right answer.
//
// They apply to the document root rather than to React state that components read, so a screen that has
// never heard of settings still honours them. That is the whole reason the type scale is eight tokens.

export const TEXT_SCALES = [0.8, 1, 1.25, 1.5] as const;
export type TextScale = (typeof TEXT_SCALES)[number];
export type MotionMode = 'system' | 'reduced' | 'full';

export interface Settings {
  textScale: TextScale;
  motion: MotionMode;
}

const KEY = SETTINGS_KEY;
const DEFAULTS: Settings = { textScale: 1, motion: 'system' };

function load(): Settings {
  claimLegacyKey(KEY);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      textScale: TEXT_SCALES.includes(parsed.textScale as TextScale) ? (parsed.textScale as TextScale) : DEFAULTS.textScale,
      motion: parsed.motion === 'reduced' || parsed.motion === 'full' ? parsed.motion : DEFAULTS.motion,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Push the settings onto <html>. Called on load and on every change; idempotent. */
export function applySettings(s: Settings): void {
  const root = document.documentElement;
  root.style.setProperty('--text-scale', String(s.textScale));
  // "system" removes the attribute so the `prefers-reduced-motion` media queries are back in charge, rather
  // than writing a third value the stylesheet would have to know about.
  if (s.motion === 'system') root.removeAttribute('data-motion');
  else root.setAttribute('data-motion', s.motion);
}

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...load(),

  set: (patch) => {
    const next: Settings = { textScale: get().textScale, motion: get().motion, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // A blocked storage quota costs the setting on the next load, not this session.
    }
    applySettings(next);
    set(next);
  },

  reset: () => get().set(DEFAULTS),
}));
