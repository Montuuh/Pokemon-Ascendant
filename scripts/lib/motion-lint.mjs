#!/usr/bin/env node
// The motion lint — the measuring half of D11/D12 (docs/design/ui-doctrine.md, docs/design/ui/motion-review.md §6).
// Reads CSS and TS(X) and reports what can be found without running the screen: `transition: all`, `ease-in`,
// layout properties that animate, `scale(0)`, durations that are not tokens (they outlive both reduced-motion
// switches) and Motion/WAAPI code that never asks `useMotionPref()`. Evidence, not a verdict: the ui-reviewer judges.
//
// `/* motion-ok: <reason> */` or `// motion-ok: <reason>` on the line or the line above silences one hit.
//
// Usage: npm run ui:motion             every .css/.ts/.tsx under src/ui and src/app
//        npm run ui:motion -- --json   the same, machine-readable
//        npm run ui:motion -- <files>  only these files
// Imported by scripts/ui-audit.mjs for the changed files.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const LAYOUT = /^(width|height|min-width|min-height|max-width|max-height|top|left|right|bottom|margin(-\w+)?|padding(-\w+)?)$/;
const MOTION_PROPS = 'transition|transition-property|transition-duration|transition-delay|transition-timing-function|animation|animation-duration|animation-delay|animation-timing-function';

/** Blank a span to spaces, keeping newlines, so offsets and line numbers survive. */
const blank = (s) => s.replace(/[^\n]/g, ' ');

/** Remove every `name(...)` group, nested parentheses included: tokens, calc offsets, curves and `global()`. */
function stripFunctions(value) {
  let out = '';
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '(') { depth++; continue; }
    if (c === ')') { depth = Math.max(0, depth - 1); continue; }
    if (depth === 0) out += c;
  }
  // The function's name is left behind with nothing after it: drop it too.
  return out.replace(/[\w-]+(?=\s|,|$)/g, (w) => (/^(var|calc|cubic-bezier|steps|global|min|max|clamp)$/.test(w) ? '' : w));
}

/** Split a declaration value on its top-level commas. */
function parts(value) {
  const out = [];
  let depth = 0, cur = '';
  for (const c of value) {
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out.map((p) => p.trim()).filter(Boolean);
}

/** The motion declarations in a text: `{ prop, value, index }`. CSS `prop: value;` and TS style strings `prop: '…'`. */
function declarations(text, isCss) {
  const out = [];
  if (isCss) {
    const re = new RegExp(`(?:^|[;{\\s])(${MOTION_PROPS})\\s*:\\s*([^;{}]+)`, 'g');
    for (const m of text.matchAll(re)) out.push({ prop: m[1], value: m[2].trim(), index: m.index + m[0].indexOf(m[1]) });
  } else {
    // React style objects use camelCase: transitionDuration → transition-duration.
    const re = /\b(transition|transitionProperty|transitionDuration|transitionDelay|transitionTimingFunction|animation|animationDuration|animationDelay|animationTimingFunction)\s*:\s*(['"`])([^'"`]*)\2/g;
    for (const m of text.matchAll(re)) out.push({ prop: m[1].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), value: m[3].trim(), index: m.index });
  }
  return out;
}

/** The body of every `@keyframes` block: `{ body, index }` with index at the body's start. */
function keyframeBodies(text) {
  const out = [];
  for (const m of text.matchAll(/@keyframes\s+[\w-]+\s*\{/g)) {
    let depth = 1, i = m.index + m[0].length;
    const start = i;
    for (; i < text.length && depth > 0; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
    }
    out.push({ body: text.slice(start, i - 1), index: start });
  }
  return out;
}

/**
 * Lint one file's text. `file` is the path reported (repo-relative); the extension decides CSS or TS.
 * @returns {{ file: string, line: number, rule: string, detail: string }[]}
 */
export function lintMotion(file, raw) {
  const isCss = file.endsWith('.css');
  if (!isCss && !/\.(tsx?|mts)$/.test(file)) return [];
  // Comments blanked to the same length so a note is not read as a rule; markers are read from the raw lines.
  const text = isCss
    ? raw.replace(/\/\*[\s\S]*?\*\//g, blank)
    : raw.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, pre) => pre + blank(m.slice(pre.length)));
  const lines = raw.split('\n');
  const lineOf = (index) => text.slice(0, index).split('\n').length;
  const silenced = (line) => [line, line - 1].some((n) => n >= 1 && /motion-ok:\s*[^\s*/]/.test(lines[n - 1] ?? ''));
  const hits = [];
  const hit = (index, rule, detail) => {
    const line = lineOf(index);
    if (!silenced(line)) hits.push({ file, line, rule, detail: detail.replace(/\s+/g, ' ').slice(0, 100) });
  };

  for (const d of declarations(text, isCss)) {
    const ps = parts(d.value);
    if (d.prop === 'transition' || d.prop === 'transition-property') {
      const named = d.prop === 'transition' ? ps.map((p) => p.split(/\s+/)[0]) : ps;
      if (named.includes('all')) hit(d.index, 'transition-all', `${d.prop}: ${d.value}`);
      const layout = named.filter((p) => LAYOUT.test(p));
      if (layout.length) hit(d.index, 'layout-property', `${d.prop}: ${d.value}`);
    }
    if (/\bease-in\b(?!-)/.test(d.value)) hit(d.index, 'ease-in', `${d.prop}: ${d.value}`);
    const bare = stripFunctions(d.value);
    const literal = [...bare.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)].find((m) => Number(m[1]) !== 0);
    if (literal && /^(transition|animation)(-duration|-delay)?$/.test(d.prop)) hit(d.index, 'literal-duration', `${d.prop}: ${d.value}`);
  }

  if (isCss) {
    for (const k of keyframeBodies(text)) {
      for (const m of k.body.matchAll(/(?:^|[;{\s])([\w-]+)\s*:/g)) {
        if (LAYOUT.test(m[1])) hit(k.index + m.index + m[0].indexOf(m[1]), 'layout-property', `@keyframes sets ${m[1]}`);
      }
    }
    // `scale: 0 1` is a line growing along its length (a beam), not a thing appearing from nothing.
    for (const m of text.matchAll(/scale\(\s*0(?:\s*,\s*0)?\s*\)|(?:^|[;{\s])scale\s*:\s*0(?:\s+0)?\s*(?=[;}]|$)/gm)) hit(m.index, 'scale-zero', m[0].trim());
  } else {
    for (const m of text.matchAll(/scale\(\s*0(?:\s*,\s*0)?\s*\)|\binitial=\{\{[^}]*\bscale\s*:\s*0(?![.\d])/g)) hit(m.index, 'scale-zero', m[0].trim());
    const usesMotion = text.match(/from\s+['"]motion(?:\/react)?['"]|\.animate\(\s*\[/);
    if (usesMotion && !/\buseMotionPref\b/.test(text)) hit(usesMotion.index, 'ungated-motion', 'animates without asking useMotionPref()');
  }
  return hits.sort((a, b) => a.line - b.line);
}

/** Every .css/.ts/.tsx under the given roots, tests and type declarations left out. */
export function motionFiles(root, dirs = ['src/ui', 'src/app']) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(css|tsx?)$/.test(e.name) && !/\.(test|spec)\.tsx?$|\.d\.ts$/.test(e.name)) out.push(relative(root, p).replaceAll('\\', '/'));
    }
  };
  for (const d of dirs) if (existsSync(resolve(root, d))) walk(resolve(root, d));
  return out.sort();
}

/** Lint repo-relative files. */
export function lintMotionFiles(root, files) {
  return files.flatMap((f) => (existsSync(resolve(root, f)) ? lintMotion(f, readFileSync(resolve(root, f), 'utf8')) : []));
}

/** The report's lines, grouped by rule. */
export function formatMotion(hits) {
  if (!hits.length) return ['none'];
  const by = new Map();
  for (const h of hits) by.set(h.rule, [...(by.get(h.rule) ?? []), h]);
  return [...by.entries()].map(([rule, list]) => `${rule} (${list.length}): ${list.map((h) => `\`${h.file}:${h.line}\``).join(', ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = resolve(import.meta.dirname, '../..');
  const args = process.argv.slice(2);
  const named = args.filter((a) => !a.startsWith('--'));
  const hits = lintMotionFiles(root, named.length ? named : motionFiles(root));
  if (args.includes('--json')) console.log(JSON.stringify(hits, null, 2));
  else {
    console.log(`# Motion lint — ${hits.length} hit(s)\n`);
    for (const h of hits) console.log(`- [${h.rule}] ${h.file}:${h.line} — ${h.detail}`);
    console.log(`\n${formatMotion(hits).map((l) => `- ${l}`).join('\n')}`);
  }
}
