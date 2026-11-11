#!/usr/bin/env node
// Read-only scan of every player-facing string in Pokémon Ascendant for AI-slop candidates. Never edits.
//
// Sources: string and template literals and JSX text in src/ui, src/app and src/sim (via the TypeScript AST, so
// comments, imports, class names and test ids are skipped), the prose fields of src/content/data/*.json, and the
// What's new entries of CHANGELOG.md. Each string is tagged with its surface (screen, component, tooltip, string
// table, content class, sim text, What's new) and the patterns it trips, then ranked.
//
// Usage: node .claude/skills/slop-remover/slop-scan.mjs                     summary + top candidates
//        node .claude/skills/slop-remover/slop-scan.mjs --path src/ui/screens/ShopScreen.tsx
//        node .claude/skills/slop-remover/slop-scan.mjs --surface tooltip --all
//        node .claude/skills/slop-remover/slop-scan.mjs --json playtest/slop/candidates.json   every string, for an audit
//        node .claude/skills/slop-remover/slop-scan.mjs --code                 code slop in the scope as well
//        node .claude/skills/slop-remover/slop-scan.mjs --changed              only what this change wrote (vs HEAD)
//        --min 3   only strings that trip a weight-3 pattern (leaks, narration, AI vocabulary, reassurance, D1)
//        --hook    one line per finding and nothing else (used by .claude/hooks/slop-stop.mjs)
//        --dev  include the dev-only screens (cheats, scenario picker)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(import.meta.dirname, '../../..');
const args = process.argv.slice(2);
const opt = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const flag = (name) => args.includes(name);
const scope = opt('--path');
const surfaceFilter = opt('--surface');
const jsonOut = opt('--json');
const showAll = flag('--all');
const withCode = flag('--code');
const withDev = flag('--dev');
const changedOnly = flag('--changed');
const rel = (p) => relative(ROOT, p).split(sep).join('/');

// ── Where a string is shown ─────────────────────────────────────────────────────────────────────────────────
const DEV_ONLY = /(CheatMenu|ScenarioPicker|cheats)\.tsx?$/;
function surfaceOf(file) {
  if (file === 'src/ui/tips.tsx' || file === 'src/ui/ownedMonTip.tsx' || file.startsWith('src/ui/tooltip/'))
    return 'tooltip';
  if (/^src\/ui\/(strings|moveText|evolutionText|intentTone)\.ts$/.test(file)) return 'string table';
  let m = /^src\/ui\/screens\/(?:([\w-]+)\/)?(\w+)\.tsx?$/.exec(file);
  if (m) return `screen:${m[1] ?? m[2]}`;
  m = /^src\/ui\/(components|title|fx|hooks)\/(\w+)\.tsx?$/.exec(file);
  if (m) return `component:${m[2]}`;
  if (file.startsWith('src/app/')) return 'app';
  m = /^src\/sim\/(\w+)\//.exec(file);
  if (m) return `sim:${m[1]}`;
  return 'other';
}

// ── Patterns ──────────────────────────────────────────────────────────────────────────────────────────────────
// [regex, tag, weight]. Weight 3: almost always cut. 2: usually shorten. 1: look at it.
const PATTERNS = [
  [
    /§\s?\d|\bv\d+\.\d+(\.\d+)?\b|\b(TODO|FIXME|XXX|lorem|placeholder|fixture|reducer|payload|the sim|config|undefined|NaN|null)\b/i,
    'internal leak (D10)',
    3,
  ],
  [
    /\b(not working yet|in this build|(a|until a) later version|in development|not written yet|not in the game yet|coming soon|work in progress|stub|uniformly|legal (intents|moves|options))\b/i,
    'dev or roadmap leak (D10)',
    3,
  ],
  [/\b(the player'?s?|players|the user)\b/i, 'talks about the player in third person', 2],
  [
    /\b(here you can|this (screen|panel|page|section|menu|tab|list|window|card|bubble) (shows|lists|lets|is where|is for)|on this (screen|panel|page)|you can (see|find|view|check|read) )/i,
    'narrates the interface',
    3,
  ],
  [
    /\b(click|tap|press|hover|rest the pointer|mouse over)\b[^.]{0,30}\b(to|for)\b/i,
    'explains the control (D2)',
    1,
  ],
  [
    /\b(easily|seamless(ly)?|effortless(ly)?|powerful|amazing|incredible|awesome|exciting|perfect(ly)?|truly|really|very|simply|basically|actually|literally|absolutely|super(?! effective))\b/i,
    'filler or marketing word',
    2,
  ],
  [
    /\b(delve|tapestry|testament|elevate|embark|unleash|realm|vibrant|bustling|robust|crucial|vital|pivotal|meticulous(ly)?|intricate|ever-(changing|evolving)|whether you('re| are)|dive (in|into)|at its (core|heart)|worth noting|it'?s important to|plays a (key|crucial) role|game-?changer|next level(?!-))\b/i,
    'AI vocabulary',
    3,
  ],
  [
    /\b(not (just|only|merely)|more than (just )?(a|an)\b|isn'?t (just|about)\b|it'?s not about)\b|\bnot\b[^.;]{2,40}—\s*(it'?s|but)\b|,\s*not\s+\w+[^,.]{0,20}[.,]/i,
    '"not X but Y" construction',
    2,
  ],
  [
    /\b(don'?t worry|no worries|rest assured|feel free|of course|naturally,|happily,|luckily,)\b/i,
    'reassurance',
    3,
  ],
  [
    /(^|[.!?]\s+)(remember|note|tip|be aware|keep in mind|please|in short|in other words|that is,|simply put)\b/i,
    'preamble or recap',
    2,
  ],
  [
    /\b(might|perhaps|possibly|may want to|you may|generally|typically|usually tends|somewhat|fairly|quite|rather)\b/i,
    'hedge',
    1,
  ],
  [
    /\b(in order to|is able to|are able to|the fact that|at this point in time|each and every|any and all|due to the fact)\b/i,
    'wordy phrase',
    2,
  ],
  [/[!¡]/, 'exclamation', 1],
  [/\.\.\.|…(?!\s*$)/, 'ellipsis mid-text', 1],
];
const SERIES_BEAT =
  /(super effective|not very effective|critical hit|fainted|was caught|evolved|grew to|learned|gained|It's|Wild |What\?|Congratulations|Gotcha|Oh!)/i;

const words = (s) => s.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ0-9]/.test(w)).length;
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\{[^}]*\}/g, '#')
    .replace(/[^a-z0-9#\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function judge(raw, surface, field) {
  const tags = [];
  const add = (tag, w) => tags.push([tag, w]);
  const whatsNew = surface === "what's new";
  // Interpolations are code, not copy: judge the words around them only.
  const text = raw.replace(/\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, '#');
  for (const [re, tag, w] of PATTERNS) {
    if (whatsNew && tag.startsWith('internal')) {
      if (/§|\b(TODO|FIXME|fixture|reducer|payload|the sim|config|placeholder)\b/i.test(text)) add(tag, w);
      continue;
    }
    if (tag === 'exclamation' && (SERIES_BEAT.test(text) || surface.startsWith('sim:combat'))) continue;
    if (re.test(text)) add(tag, w);
  }
  const dashes = (text.match(/—/g) ?? []).length;
  if (dashes >= 2) add(`em dash ×${dashes}`, 2);
  else if (dashes === 1) add('em dash', 1);
  const parens = (text.match(/\(/g) ?? []).length;
  if (parens >= 2) add(`parenthetical ×${parens}`, 2);
  if ((text.match(/;/g) ?? []).length >= 2) add('semicolon chain', 1);
  const n = words(text);
  const chars = text.length;
  const onScreen = /^(screen|component|app)/.test(surface);
  if (onScreen) {
    if (chars > 120) add(`long block on screen, ${chars} chars (D1)`, 3);
    else if (n >= 12) add(`sentence on screen, ${n} words (D1)`, 1);
  } else if (surface === 'tooltip') {
    if (n >= 45) add(`long tooltip, ${n} words`, 2);
  } else if (surface === 'rules page') {
    if (n >= 60) add(`long rules paragraph, ${n} words`, 1);
  } else if (surface.startsWith('content')) {
    if (n >= 25) add(`long ${field ?? 'text'}, ${n} words`, 2);
  } else if (whatsNew) {
    if (n >= 14) add(`long changelog line, ${n} words`, 1);
  } else if (n >= 30) add(`long string, ${n} words`, 2);
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/).filter((s) => words(s) >= 3);
  if (
    sentences.length >= 3 &&
    !['tooltip', 'rules page'].includes(surface) &&
    !surface.startsWith('content')
  ) {
    add(`${sentences.length} sentences`, 1);
  }
  return tags;
}

// ── Collect: TypeScript sources ─────────────────────────────────────────────────────────────────────────────
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$|\.d\.ts$/.test(name) ? [full] : [];
  });
}
const SKIP_ATTR = new Set([
  'className',
  'data-testid',
  'key',
  'id',
  'href',
  'src',
  'style',
  'role',
  'type',
  'name',
  'htmlFor',
  'viewBox',
  'd',
  'fill',
  'stroke',
  'transform',
  'points',
  'xmlns',
  'preserveAspectRatio',
  'data-state',
  'data-tone',
  'data-kind',
  'lang',
  'rel',
  'target',
  'sizes',
  'srcSet',
  'as',
  'variant',
  'tone',
  'size',
  'kind',
  'side',
  'align',
]);
const SKIP_CALL =
  /^(console\.\w+|Error|TypeError|RangeError|require|import|querySelector(All)?|matchMedia|getElementById|setAttribute|getAttribute|classList\.\w+|addEventListener|removeEventListener|fetch|new URL|URL|RegExp|localStorage\.\w+|sessionStorage\.\w+|\w+\.(startsWith|endsWith|includes|split|replace|replaceAll|indexOf|match|test|join|padStart|padEnd))$/;
const CSSISH =
  /(var\(--|rgba?\(|hsla?\(|\burl\(|cubic-bezier|translate[XY3d]?\(|\bpx\b|\d(px|ms|rem|em|vh|vw|%)\b.*\d(px|ms|rem|em|vh|vw)|^[.#\[][\w-]|^\s*[\w-]+\s*:\s*[\w#(-]+;|\bdata-[\w-]+=|^[\w/-]+\.(png|webp|gif|json|mp3|ogg)$|^https?:)/;

function keyPath(node) {
  const parts = [];
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isPropertyDeclaration(p))
      parts.unshift(p.name.getText().replace(/['"]/g, ''));
    else if (ts.isVariableDeclaration(p) || ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p)) {
      if (p.name) parts.unshift(p.name.getText());
      break;
    } else if (ts.isJsxAttribute(p)) parts.unshift(`@${p.name.getText()}`);
    else if (ts.isCaseClause(p)) parts.unshift(`case ${p.expression.getText().replace(/['"]/g, '')}`);
  }
  return parts.slice(-4).join('.');
}
function skipByContext(node) {
  for (let p = node.parent, depth = 0; p && depth < 6; p = p.parent, depth++) {
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p) || ts.isTypeNode(p))
      return true;
    if (ts.isJsxAttribute(p)) return SKIP_ATTR.has(p.name.getText());
    if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
      const callee = p.expression.getText();
      if (SKIP_CALL.test(callee) || /^new (Error|TypeError|RangeError)/.test(p.getText())) return true;
    }
    if (ts.isThrowStatement(p)) return true;
    if (ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText())) return true;
    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
    if (ts.isPropertyAssignment(p) && p.name === node) return true;
    if (
      ts.isPropertyAssignment(p) &&
      /^(className|testId|testid|cls|style|key|id|kind|type|icon|art|src|sprite|path|url|href|tone|accent|sfx|track)$/.test(
        p.name.getText(),
      )
    )
      return true;
    if (ts.isTaggedTemplateExpression(p)) return true;
  }
  return false;
}
function templateText(node) {
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  let s = node.head.text;
  for (const span of node.templateSpans) {
    const e = span.expression.getText().replace(/\s+/g, ' ');
    s += `{${e.length > 24 ? `${e.slice(0, 22)}…` : e}}` + span.literal.text;
  }
  return s;
}

const strings = [];
const sourceFiles = [
  ...walk(join(ROOT, 'src/ui')),
  ...walk(join(ROOT, 'src/app')),
  ...walk(join(ROOT, 'src/sim')),
].filter((f) => {
  const r = rel(f);
  if (!withDev && DEV_ONLY.test(r)) return false;
  return !scope || r.startsWith(scope.replace(/\\/g, '/'));
});

for (const file of sourceFiles) {
  const r = rel(file);
  const fileSurface = surfaceOf(r);
  const text = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const isSim = fileSurface.startsWith('sim:');
  const visit = (node) => {
    let value = null;
    if (ts.isStringLiteral(node)) value = node.text;
    else if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node))
      value = templateText(node);
    else if (ts.isJsxText(node)) value = node.getText().replace(/\s+/g, ' ').trim();
    if (value !== null) {
      const n = words(value);
      const plausible =
        /[A-Za-z]{2}/.test(value) &&
        !CSSISH.test(value) &&
        (n >= 3 || (n >= 2 && /^[A-Z¿¡]/.test(value)) || (ts.isJsxText(node) && n >= 2));
      const minWords = isSim ? 4 : 2;
      if (
        plausible &&
        n >= minWords &&
        !skipByContext(node) &&
        !/^[a-z]+(-[a-z0-9]+)+( [a-z]+(-[a-z0-9]+)*)*$/.test(value)
      ) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
        const key = keyPath(node);
        // A bubble written inside a screen file is still a bubble; the How to play sheet is a rules page (D1 exempts it).
        const surface = r.endsWith('HowToPlay.tsx')
          ? 'rules page'
          : /^(screen|component|app)/.test(fileSurface) &&
              /(^|\.)@?(tip|\w*Tip|tips?)(\.|$)|@(footer)\b/i.test(key)
            ? 'tooltip'
            : fileSurface;
        strings.push({ at: `${r}:${line + 1}`, surface, origin: fileSurface, key, text: value });
      }
      if (!ts.isTemplateExpression(node)) return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// ── Collect: content JSON prose ─────────────────────────────────────────────────────────────────────────────
const PROSE_KEY =
  /^(description|flavour|flavor|line|lines|label|detail|title|body|text|lede|hint|summary|quote|intro|outro|speech|taunt|win|lose|greeting|caption|effect|note)$/i;
if (!scope || scope.startsWith('src/content')) {
  const dir = join(ROOT, 'src/content/data');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const surface = `content:${f.replace('.json', '')}`;
    const visit = (v, path, key) => {
      if (typeof v === 'string') {
        if ((PROSE_KEY.test(key ?? '') || words(v) >= 6) && words(v) >= 3 && !(key ?? '').startsWith('_')) {
          strings.push({ at: `src/content/data/${f}`, surface, key: path, field: key, text: v });
        }
      } else if (Array.isArray(v))
        v.forEach((x, i) => visit(x, `${path}[${x && typeof x === 'object' && x.id ? x.id : i}]`, key));
      else if (v && typeof v === 'object')
        for (const [k, x] of Object.entries(v))
          if (!k.startsWith('_')) visit(x, path ? `${path}.${k}` : k, k);
    };
    visit(data, '', null);
  }
}

// ── Collect: What's new (CHANGELOG.md, below the first version heading) ─────────────────────────────────────
if (!scope || scope === 'CHANGELOG.md') {
  const lines = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8').split('\n');
  const start = lines.findIndex((l) => /^## v/.test(l));
  let heading = '';
  lines.forEach((l, i) => {
    if (i < start) return;
    if (/^#{2,3} /.test(l)) heading = l.replace(/^#+ /, '');
    const t = l.replace(/^-\s+/, '').replace(/\*\*/g, '').trim();
    if (t && !/^#/.test(l) && words(t) >= 3)
      strings.push({ at: `CHANGELOG.md:${i + 1}`, surface: "what's new", key: heading, text: t });
  });
}

// ── Judge, find repeats, rank ───────────────────────────────────────────────────────────────────────────────
const seen = new Map();
for (const s of strings) {
  const k = norm(s.text);
  if (words(s.text) >= 5) seen.set(k, [...(seen.get(k) ?? []), s.at]);
}
for (const s of strings) {
  s.words = words(s.text);
  s.tags = judge(s.text, s.surface, s.field);
  // Spoken lines (trainers, Leaders, NPCs) are the series' voice: an exclamation there is canon, not slop.
  if (/(^|\.)line$/.test(s.key ?? '') || s.field === 'line')
    s.tags = s.tags.filter(([t]) => t !== 'exclamation');
  const dupes = seen.get(norm(s.text));
  if (dupes && new Set(dupes).size >= 2) s.tags.push([`repeated in ${new Set(dupes).size} places`, 1]);
  s.score = s.tags.reduce((a, [, w]) => a + w, 0);
}
// ── --changed: only the strings this change wrote (vs HEAD, untracked files included) ───────────────────────
// A TS string counts when its line is an added line of `git diff -U0 HEAD`; a JSON or changelog string when its
// text is not in the HEAD copy of the file. Pre-existing slop in a touched file is not this change's to answer.
function changedFilter() {
  const git = (...a) => {
    const r = spawnSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return r.status === 0 ? r.stdout : '';
  };
  const added = new Map();
  let file = null;
  for (const line of git('diff', '-U0', '--no-color', 'HEAD').split('\n')) {
    const f = /^\+\+\+ b\/(.+)$/.exec(line);
    if (f) {
      file = f[1];
      added.set(file, new Set());
      continue;
    }
    const h = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (h && file) for (let i = 0; i < Number(h[2] ?? 1); i++) added.get(file).add(Number(h[1]) + i);
  }
  const untracked = new Set(git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean));
  const headCopy = new Map();
  const head = (f) => {
    if (!headCopy.has(f)) headCopy.set(f, git('show', `HEAD:${f}`));
    return headCopy.get(f);
  };
  return (s) => {
    const m = /^(.+?)(?::(\d+))?$/.exec(s.at);
    const f = m[1];
    if (untracked.has(f)) return true;
    if (!added.has(f)) return false;
    if (m[2] && /\.tsx?$/.test(f)) return added.get(f).has(Number(m[2]));
    const before = f === 'CHANGELOG.md' ? head(f).replaceAll('**', '') : head(f);
    return !before.includes(f.endsWith('.json') ? JSON.stringify(s.text).slice(1, -1) : s.text);
  };
}
const minWeight = Number(opt('--min', '0'));
let pool = surfaceFilter ? strings.filter((s) => s.surface.startsWith(surfaceFilter)) : strings;
if (changedOnly) pool = pool.filter(changedFilter());
if (minWeight) pool = pool.filter((s) => s.tags.some(([, w]) => w >= minWeight));
const flagged = pool.filter((s) => s.score > 0).sort((a, b) => b.score - a.score || b.words - a.words);

// --hook: one line per finding, nothing else (the Stop hook reads it).
if (flag('--hook')) {
  for (const s of flagged)
    console.log(`${s.at} [${s.tags.map(([t]) => t).join('; ')}] "${s.text.slice(0, 140)}"`);
  process.exit(0);
}

// ── Code slop (opt-in) ──────────────────────────────────────────────────────────────────────────────────────
const code = [];
if (withCode) {
  for (const file of sourceFiles) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const at = `${rel(file)}:${i + 1}`;
        if (/\bas any\b|@ts-ignore|@ts-expect-error(?!\s+\S)/.test(line))
          code.push([at, 'unsafe cast or bare suppression']);
        if (
          /eslint-disable(-next-line)?(?!.*--)/.test(line) &&
          !/eslint-disable-next-line\s+\S+\s+--/.test(line)
        )
          code.push([at, 'eslint-disable without a reason']);
        if (
          /^\s*\/\/\s*(Import|Define|Create|Set|Get|Return|Call|Render|Handle|Initiali[sz]e|Update|Loop|Check if)s?\b[^.§]{0,40}$/.test(
            line,
          )
        )
          code.push([at, 'comment restates the next line']);
        if (/catch\s*\((\w+)\)\s*\{\s*console\.(log|error)\(\1\)\s*;?\s*\}/.test(line))
          code.push([at, 'log-and-swallow catch']);
        if (/console\.(log|debug)\(/.test(line) && !/src\/dev\//.test(at))
          code.push([at, 'stray console.log']);
      });
  }
}

// ── Report ──────────────────────────────────────────────────────────────────────────────────────────────────
const bySurface = new Map();
for (const s of pool) {
  const g = s.surface.replace(/:.*/, (m) =>
    s.surface.startsWith('screen') || s.surface.startsWith('component') ? '' : m,
  );
  const e = bySurface.get(g) ?? { strings: 0, words: 0, flagged: 0 };
  e.strings += 1;
  e.words += s.words;
  e.flagged += s.score > 0 ? 1 : 0;
  bySurface.set(g, e);
}
console.log(
  `Player-facing strings: ${pool.length} · ${pool.reduce((a, s) => a + s.words, 0)} words · ${flagged.length} candidates${scope ? ` (scope ${scope})` : ''}`,
);
console.log('\nSurface                    strings   words  candidates');
for (const [g, e] of [...bySurface].sort((a, b) => b[1].words - a[1].words)) {
  console.log(
    `  ${g.padEnd(25)}${String(e.strings).padStart(8)}${String(e.words).padStart(8)}${String(e.flagged).padStart(12)}`,
  );
}
const tagCount = new Map();
for (const s of flagged)
  for (const [t] of s.tags) {
    const k = t.replace(/[,×]\s?\d+.*|\d+ (chars|words).*/, '').trim();
    tagCount.set(k, (tagCount.get(k) ?? 0) + 1);
  }
console.log('\nPatterns:');
for (const [t, n] of [...tagCount].sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(n).padStart(5)}  ${t}`);
const limit = showAll ? flagged.length : 40;
console.log(`\nTop candidates${showAll ? '' : ' (--all for every one)'}:`);
for (const s of flagged.slice(0, limit)) {
  console.log(
    `- [${s.score}] ${s.at} ${s.surface}${s.key ? ` · ${s.key}` : ''}\n    ${s.tags.map(([t]) => t).join('; ')}\n    "${s.text}"`,
  );
}
if (withCode) {
  console.log(`\nCode candidates: ${code.length}`);
  for (const [at, why] of code.slice(0, showAll ? code.length : 30)) console.log(`- ${at} ${why}`);
}
if (jsonOut) {
  const out = resolve(ROOT, jsonOut);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), strings: pool, code }, null, 1));
  console.log(`\nWrote ${rel(out)} (${pool.length} strings).`);
}
console.log('\nCandidates, not verdicts: read each one where the player meets it before changing it.');
