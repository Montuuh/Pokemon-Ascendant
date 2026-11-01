import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lintMotionFiles, motionFiles } from '../../../scripts/lib/motion-lint.mjs';
import { FX_MS } from '@/ui/hooks/useCombatFx';

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

  // §9.9 — the bar's drain (CSS) and the faint that waits for it (useCombatFx) read one length.
  it('Tokens_HpDrain_MatchesTheArenaTable', () => {
    expect(tokens).toContain(`--motion-hp-drain: ${FX_MS.hpDrain}ms;`);
  });

  it('Stylesheets_ReducedMotionRules_ObeyBothSwitches', () => {
    const hits = lintMotionFiles(ROOT, motionFiles(ROOT)).filter((h) => h.rule === 'one-switch' || h.rule === 'ungated-motion');
    expect(hits.map((h) => `${h.file}:${h.line} ${h.detail}`)).toEqual([]);
  });
});

/** Every CSS module under src/ui, comments blanked (a hex in a note is not a colour). */
function modules(): { file: string; lines: string[] }[] {
  const out: { file: string; lines: string[] }[] = [];
  (function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.module.css')) out.push({ file: relative(ROOT, p).split('\\').join('/'), lines: readFileSync(p, 'utf8').replace(/\/\*(?![^*]*token-ok)[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).split('\n') });
    }
  })(resolve(ROOT, 'src/ui'));
  return out;
}

describe('Tokens, not literals — D6', () => {
  // A deliberate exception carries `/* token-ok: <reason> */` on its line (SVG user units, an em of a token-sized mark).
  const hits = (re: RegExp) =>
    modules().flatMap(({ file, lines }) => lines.flatMap((l, i) => (re.test(l) && !l.includes('token-ok') ? [`${file}:${i + 1} ${l.trim()}`] : [])));

  it('Modules_NoLiteralHexColour', () => {
    expect(hits(/#[0-9a-fA-F]{3,8}\b/)).toEqual([]);
  });

  // §9.6 — a literal size ignores the text-size setting; every size is a --type-* token (or a calc on one).
  it('Modules_NoLiteralFontSize', () => {
    expect(hits(/font-size:\s*[0-9.]+(px|rem|em)\s*;/)).toEqual([]);
  });
});
