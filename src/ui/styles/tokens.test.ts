import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lintMotionFiles, motionFiles } from '../../../scripts/lib/motion-lint.mjs';

const ROOT = resolve(import.meta.dirname, '../../..');
const tokens = readFileSync(resolve(ROOT, 'src/ui/styles/tokens.css'), 'utf8');

/** The `--name: 0ms` declarations inside the first block that opens with `selector {`. */
function collapsed(selector: string): string[] {
  const at = tokens.indexOf(`${selector} {`);
  expect(at, `${selector} block`).toBeGreaterThan(-1);
  const body = tokens.slice(at, tokens.indexOf('}', at));
  return [...body.matchAll(/(--[\w-]+):\s*0ms;/g)].map((m) => m[1] ?? '').sort();
}

describe('Reduced motion, both switches — §9.6, D11', () => {
  it('Tokens_EveryDurationOnRoot_CollapsesUnderBothSwitches', () => {
    const root = tokens.slice(tokens.indexOf(':root {'), tokens.indexOf('\n}', tokens.indexOf(':root {')));
    const durations = [...root.matchAll(/(--motion-[\w-]+):\s*\d+ms;/g)].map((m) => m[1] ?? '').sort();
    expect(durations.length).toBeGreaterThan(0);
    expect(collapsed(":root:not([data-motion='full'])"), 'the system preference, unless Settings says Full').toEqual(durations);
    expect(collapsed(":root[data-motion='reduced']"), "Settings' Reduced").toEqual(durations);
  });

  it('Stylesheets_ReducedMotionRules_ObeyBothSwitches', () => {
    const hits = lintMotionFiles(ROOT, motionFiles(ROOT)).filter((h) => h.rule === 'one-switch' || h.rule === 'ungated-motion');
    expect(hits.map((h) => `${h.file}:${h.line} ${h.detail}`)).toEqual([]);
  });
});
