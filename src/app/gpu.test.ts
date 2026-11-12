import { describe, expect, it, vi } from 'vitest';
import { browserKind, combineVerdicts, expectsWebGL, gpuOverride, probeGpu, probeWebGpu, shouldProbe, type CanvasLike, type GlLike } from './gpu';

// §9.6.2 — the detection, fed each browser's answers by hand.

interface Fake {
  /** Renderer for a context made with the strict flag; `null` for a refusal. */
  strict: string | null | 'hidden';
  /** Renderer for an ordinary context; `null` for none at all. */
  loose: string | null | 'hidden';
}

function rig(f: Fake) {
  const lost = vi.fn();
  const made: boolean[] = [];
  const glFor = (renderer: string | 'hidden'): GlLike => ({
    getExtension: (name) => {
      if (name === 'WEBGL_lose_context') return { loseContext: lost };
      if (name === 'WEBGL_debug_renderer_info') return renderer === 'hidden' ? null : { UNMASKED_RENDERER_WEBGL: 0x9246 };
      return null;
    },
    getParameter: () => (renderer === 'hidden' ? 'Mozilla' : renderer),
  });
  const canvas: CanvasLike = {
    getContext: (_kind, attrs) => {
      const strict = !!attrs?.failIfMajorPerformanceCaveat;
      made.push(strict);
      const r = strict ? f.strict : f.loose;
      return r === null ? null : glFor(r);
    },
  };
  return { make: () => canvas, lost, made };
}

describe('probeGpu', () => {
  it('StrictContextOnARealCard_IsHardware', () => {
    const r = rig({ strict: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)', loose: 'x' });
    expect(probeGpu(r.make)).toBe('hardware');
  });

  it.each(['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'Microsoft Basic Render Driver', 'Google SwiftShader', 'Software Rasterizer', 'Microsoft WARP'])(
    'StrictContextNamedSoftware_IsSoftware (%s)',
    (name) => {
      expect(probeGpu(rig({ strict: name, loose: name }).make)).toBe('software');
    },
  );

  it('StrictRefusedButLooseWorks_IsSoftware', () => {
    expect(probeGpu(rig({ strict: null, loose: 'Whatever' }).make)).toBe('software');
  });

  it('NoWebGLAtAll_OnADesktopChromeEdgeOrFirefox_IsSoftware', () => {
    // Chromium dropped the SwiftShader WebGL fallback: acceleration off means no context at all.
    expect(probeGpu(rig({ strict: null, loose: null }).make, true)).toBe('software');
  });

  it('NoWebGLAtAll_OnAnUnknownBrowser_IsUnknown_SoNoNoticeShows', () => {
    expect(probeGpu(rig({ strict: null, loose: null }).make, false)).toBe('unknown');
  });

  it('HiddenRendererNameOnAStrictContext_IsHardware', () => {
    // A privacy-hardened Firefox shares nothing, but it also granted the strict context, so there is no caveat.
    expect(probeGpu(rig({ strict: 'hidden', loose: 'hidden' }).make)).toBe('hardware');
  });

  it('ASoftwareWordInsideAnotherName_IsNotSoftware', () => {
    expect(probeGpu(rig({ strict: 'NVIDIA GeForce Warpath 3000', loose: 'x' }).make)).toBe('hardware');
  });

  it('ABrowserThatThrows_IsUnknown', () => {
    expect(probeGpu(() => { throw new Error('no canvas'); })).toBe('unknown');
    expect(probeGpu(() => ({ getContext: () => { throw new Error('blocked'); } }))).toBe('unknown');
  });

  it('TheContextsItMade_AreReleased', () => {
    const hw = rig({ strict: 'GeForce', loose: 'GeForce' });
    probeGpu(hw.make);
    expect(hw.lost).toHaveBeenCalledTimes(1);
    const sw = rig({ strict: null, loose: 'SwiftShader' });
    probeGpu(sw.make);
    expect(sw.lost).toHaveBeenCalledTimes(1);
  });

  it('TheFirstContextAsked_IsTheStrictOne', () => {
    const r = rig({ strict: 'GeForce', loose: 'GeForce' });
    probeGpu(r.make);
    expect(r.made[0]).toBe(true);
    expect(r.made.every(Boolean)).toBe(true);
  });
});

describe('expectsWebGL', () => {
  const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
  it('DesktopChromeEdgeFirefox_Expect_ButNotPhonesAutomationOrOthers', () => {
    expect(expectsWebGL(chrome, { webdriver: false })).toBe(true);
    expect(expectsWebGL(chrome + ' Edg/140.0.0.0', undefined)).toBe(true);
    expect(expectsWebGL('Mozilla/5.0 (Windows NT 10.0; rv:132.0) Gecko/20100101 Firefox/132.0', undefined)).toBe(true);
    expect(expectsWebGL(chrome, { webdriver: true })).toBe(false);
    expect(expectsWebGL('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36', undefined)).toBe(false);
    expect(expectsWebGL('Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.1 Safari/605.1.15', undefined)).toBe(false);
  });
});

describe('probeWebGpu and combineVerdicts', () => {
  it('NoAdapter_IsNone_AFallbackAdapter_IsFallback_ARealOne_IsReal', async () => {
    expect(await probeWebGpu(undefined)).toBeNull();
    expect(await probeWebGpu({ requestAdapter: async () => null })).toBe('none');
    expect(await probeWebGpu({ requestAdapter: async () => ({ isFallbackAdapter: true }) })).toBe('fallback');
    expect(await probeWebGpu({ requestAdapter: async () => ({ info: { isFallbackAdapter: true } }) })).toBe('fallback');
    expect(await probeWebGpu({ requestAdapter: async () => ({ info: {} }) })).toBe('real');
    expect(await probeWebGpu({ requestAdapter: async () => { throw new Error('x'); } })).toBeNull();
  });

  it('WebGpuCanRaiseToSoftware_ButNeverLowerIt', () => {
    expect(combineVerdicts('hardware', 'fallback')).toBe('software');
    expect(combineVerdicts('unknown', 'none')).toBe('software');
    expect(combineVerdicts('hardware', 'none')).toBe('hardware');
    expect(combineVerdicts('software', 'real')).toBe('software');
    expect(combineVerdicts('unknown', null)).toBe('unknown');
  });
});

describe('browserKind', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', 'chrome'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0', 'edge'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0', 'firefox'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15', 'other'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0', 'other'],
  ])('%s', (ua, kind) => {
    expect(browserKind(ua)).toBe(kind);
  });
});

describe('shouldProbe and gpuOverride', () => {
  it('AnAutomatedBrowser_IsNotProbed', () => {
    expect(shouldProbe({ webdriver: true })).toBe(false);
    expect(shouldProbe({ webdriver: false })).toBe(true);
    expect(shouldProbe(undefined)).toBe(true);
  });

  it('TheOverride_WorksInDevOnly_AndOnlyForKnownValues', () => {
    expect(gpuOverride('?gpu=software', true)).toBe('software');
    expect(gpuOverride('?gpu=hardware', true)).toBe('hardware');
    expect(gpuOverride('?gpu=unknown', true)).toBe('unknown');
    expect(gpuOverride('?gpu=software', false)).toBeNull();
    expect(gpuOverride('?gpu=banana', true)).toBeNull();
    expect(gpuOverride('', true)).toBeNull();
  });
});
