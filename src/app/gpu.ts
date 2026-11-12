// §9.6.2 — is the browser drawing with the graphics card? The game animates a lot of DOM and canvas; without
// hardware acceleration it stutters, and the player usually does not know the browser setting exists.
//
// Browsers do not say "acceleration is off", so this asks WebGL, in two steps:
//   1. A context created with `failIfMajorPerformanceCaveat: true`. Chrome, Edge and Firefox refuse it when
//      the only renderer is a software one (SwiftShader, llvmpipe, WARP) or the GPU is blocklisted. A context
//      that comes back is then checked by name: the unmasked renderer string, where the browser shares it.
//   2. If the strict request was refused, an ordinary context. One that works means WebGL exists but only in
//      software: 'software'.
//
// **No context at all** is the commonest face of "acceleration off" on a desktop Chrome or Edge: Chromium
// dropped the automatic SwiftShader WebGL fallback (warned in M130, removed on desktop in 137-139), so with the
// GPU process disabled WebGL simply is not there. On a desktop Chrome, Edge or Firefox that is 'software'. Only
// a browser that threw, or one this code does not know (Safari, Opera, a phone), is 'unknown' and silent: a
// false alarm tells a healthy machine to change a setting, a missed one costs a hint.
//
// WebGPU is a second, asynchronous signal where it exists (`probeWebGpu`): no adapter, or a fallback adapter,
// is software. It can only turn 'unknown' or 'hardware' into 'software', never the reverse.
//
// Known limit: Firefox's switch mostly governs compositing, and WebGL can stay on the GPU with it off, so a
// Firefox with the setting off may read 'hardware'. The notice misses that case; it is not wrong when it fires.
//
// The probe takes its environment as arguments so the test can feed it every browser's answers, and it
// releases the context it made.

export type GpuVerdict = 'hardware' | 'software' | 'unknown';
export type BrowserKind = 'chrome' | 'edge' | 'firefox' | 'other';

/** The parts of a WebGL context the probe touches. */
export interface GlLike {
  getExtension(name: string): unknown;
  getParameter(pname: number): unknown;
}
export interface CanvasLike {
  getContext(kind: string, attrs?: { failIfMajorPerformanceCaveat?: boolean }): GlLike | null;
}

/** Renderer names that mean the CPU is drawing. Matched case-insensitively. */
export const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|\bsoftware\b|basic render driver|microsoft basic|\bwarp\b|mesa offscreen/i;

const UNMASKED_RENDERER_WEBGL = 0x9246; // WEBGL_debug_renderer_info — the constant lives on the extension object.

function rendererOf(gl: GlLike): string | null {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL?: number } | null;
    const name = gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL ?? UNMASKED_RENDERER_WEBGL);
    return typeof name === 'string' && name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

function release(gl: GlLike | null): void {
  try {
    (gl?.getExtension('WEBGL_lose_context') as { loseContext?: () => void } | null)?.loseContext?.();
  } catch {
    // A context that will not lose itself is garbage collected with its canvas.
  }
}

function tryContext(canvas: CanvasLike, strict: boolean): GlLike | null {
  const attrs = { failIfMajorPerformanceCaveat: strict };
  for (const kind of ['webgl2', 'webgl']) {
    try {
      const gl = canvas.getContext(kind, attrs);
      if (gl) return gl;
    } catch {
      // A browser that throws instead of returning null is treated as having no context of that kind.
    }
  }
  return null;
}

/** Per §9.6.2 — the verdict for a canvas factory. Pure over its argument; call it once, off the critical path. */
export function probeGpu(makeCanvas: () => CanvasLike, expectsWebGL = false): GpuVerdict {
  let strict: GlLike | null = null;
  let loose: GlLike | null = null;
  try {
    strict = tryContext(makeCanvas(), true);
    if (strict) {
      const name = rendererOf(strict);
      return name && SOFTWARE_RENDERER.test(name) ? 'software' : 'hardware';
    }
    loose = tryContext(makeCanvas(), false);
    // No context of any kind: software where a hardware browser would have one, else we cannot tell.
    return loose || expectsWebGL ? 'software' : 'unknown';
  } catch {
    return 'unknown';
  } finally {
    release(strict);
    release(loose);
  }
}

/** The browser, for the settings path that names it. Edge and Opera also say "Chrome", so they are tested first. */
export function browserKind(userAgent: string): BrowserKind {
  if (/\bEdg(e|A|iOS)?\//.test(userAgent)) return 'edge';
  if (/\bOPR\/|\bOpera\b|\bSamsungBrowser\b|\bYaBrowser\b/.test(userAgent)) return 'other';
  if (/\bFirefox\/|\bFxiOS\//.test(userAgent)) return 'firefox';
  if (/\bChrome\/|\bCriOS\//.test(userAgent)) return 'chrome';
  return 'other';
}

/**
 * Whether the page should look at all. An automated browser (Playwright, a screenshot run) renders in software
 * by design, so the notice would sit over every test; it is skipped there and forced with the dev override.
 */
export function shouldProbe(nav: { webdriver?: boolean } | undefined): boolean {
  return !nav?.webdriver;
}

/** `?gpu=software|hardware` — a dev build only, so a tester can see either state on any machine. */
export function gpuOverride(search: string, dev: boolean): GpuVerdict | null {
  if (!dev) return null;
  const v = new URLSearchParams(search).get('gpu');
  return v === 'software' || v === 'hardware' || v === 'unknown' ? v : null;
}

/** Whether this browser should have WebGL when it is accelerated: desktop Chrome, Edge or Firefox, not automated. */
export function expectsWebGL(userAgent: string, nav: { webdriver?: boolean } | undefined): boolean {
  if (nav?.webdriver) return false;
  if (/Mobi|Android|iPhone|iPad|CrOS/.test(userAgent)) return false;
  return browserKind(userAgent) !== 'other';
}

/** The parts of `navigator.gpu` the second signal touches. */
export interface GpuApiLike {
  requestAdapter(): Promise<{ isFallbackAdapter?: boolean; info?: { isFallbackAdapter?: boolean } } | null>;
}

export type WebGpuAnswer = 'none' | 'fallback' | 'real' | null;

/** WebGPU's answer: no adapter, a fallback one, a real one, or null when the API is absent or throws. */
export async function probeWebGpu(gpu: GpuApiLike | undefined): Promise<WebGpuAnswer> {
  if (!gpu) return null;
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return 'none';
    return adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter ? 'fallback' : 'real';
  } catch {
    return null;
  }
}

/**
 * Fold WebGPU into the WebGL verdict. A fallback adapter, or no adapter where WebGL could not vouch for the
 * card, is software. No adapter beside a hardware WebGL is left alone: older cards run WebGL well without WebGPU.
 */
export function combineVerdicts(webgl: GpuVerdict, webgpu: WebGpuAnswer): GpuVerdict {
  if (webgpu === 'fallback') return 'software';
  if (webgpu === 'none' && webgl !== 'hardware') return 'software';
  return webgl;
}
