import type { ReactNode } from 'react';
import { create } from 'zustand';

// One tooltip for the whole app.
//
// The game had sixty-three native `title=` attributes: a second's delay the browser owns, no styling, no
// structure, nothing at all on touch. The explanations were there and nobody saw them. This replaces the
// mechanism, not the words — one layer, mounted once, that any element can borrow by spreading `useTip()`.
//
// Kept as a store rather than React context so a trigger deep inside a memoised card can show a tooltip
// without re-rendering anything between it and the root, and so the layer can live in a portal above every
// `overflow: hidden` the screens use.

export interface TipState {
  /** The element the bubble is anchored to, or null when hidden. */
  anchor: HTMLElement | null;
  content: ReactNode;
  /** The id the anchor's `aria-describedby` points at, so screen readers read the same text sighted users hover. */
  id: string;
  /** Opened while the pointer was still reading tips (D11): it appears without the delay or the fade. */
  warm: boolean;
  /** When the last bubble closed (ms, `performance.now()`), for the warm window. */
  closedAt: number;
  show: (anchor: HTMLElement, content: ReactNode, warm?: boolean) => void;
  hide: (anchor?: HTMLElement) => void;
}

export const TIP_ID = 'app-tooltip';

export const useTipStore = create<TipState>((set, get) => ({
  anchor: null,
  content: null,
  id: TIP_ID,
  warm: false,
  closedAt: -Infinity,
  // A refresh of the open bubble (the same anchor, new content) keeps how it was opened.
  show: (anchor, content, warm) => set({ anchor, content, warm: warm ?? (get().anchor === anchor && get().warm) }),
  // A hide from a trigger that is no longer the anchor is a stale leave event racing a newer enter; ignore it,
  // or a fast sweep across three cards ends with no tooltip at all.
  hide: (anchor) => {
    if (anchor && get().anchor !== anchor) return;
    set({ anchor: null, content: null, closedAt: performance.now() });
  },
}));
