import { create } from 'zustand';
import { browserKind, combineVerdicts, expectsWebGL, gpuOverride, probeGpu, probeWebGpu, shouldProbe, type BrowserKind, type GpuApiLike, type GpuVerdict } from './gpu';
import { LOADED_SEARCH } from './loadedSearch';
import { claimLegacyKey, GPU_NOTICE_DISMISSED_KEY } from './storageKeys';

// §9.6.2 — what the probe found, and whether this browser has been told. A per-browser convenience like the
// guides' "seen" flags, so plain localStorage with every access guarded: blocked storage means the notice may
// return next visit, never an error.

function readDismissed(): boolean {
  claimLegacyKey(GPU_NOTICE_DISMISSED_KEY);
  try {
    return window.localStorage.getItem(GPU_NOTICE_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

interface GpuStore {
  /** `null` until the probe has run. */
  verdict: GpuVerdict | null;
  browser: BrowserKind;
  dismissed: boolean;
  /** Closed for this visit only. */
  hide: boolean;
  probe: () => void;
  close: () => void;
  dismissForever: () => void;
}

let started = false;

export const useGpuStore = create<GpuStore>((set) => ({
  verdict: null,
  browser: 'other',
  dismissed: readDismissed(),
  hide: false,
  probe: () => {
    if (started) return;
    started = true;
    const run = () => {
      const forced = gpuOverride(LOADED_SEARCH, import.meta.env.DEV);
      const ua = navigator.userAgent;
      set({ browser: browserKind(ua) });
      if (forced) return set({ verdict: forced });
      if (!shouldProbe(navigator)) return set({ verdict: 'unknown' });
      const webgl = probeGpu(() => document.createElement('canvas'), expectsWebGL(ua, navigator));
      set({ verdict: webgl });
      // WebGPU is the second, asynchronous signal; it can only raise the verdict to software.
      const api = (navigator as unknown as { gpu?: GpuApiLike }).gpu;
      void probeWebGpu(api).then((a) => set({ verdict: combineVerdicts(webgl, a) }));
    };
    // Off the critical path: after first paint, in an idle moment.
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 3000 });
    else window.setTimeout(run, 1200);
  },
  close: () => set({ hide: true }),
  dismissForever: () => {
    try {
      window.localStorage.setItem(GPU_NOTICE_DISMISSED_KEY, '1');
    } catch {
      // Blocked storage: it may come back next visit.
    }
    set({ dismissed: true });
  },
}));
