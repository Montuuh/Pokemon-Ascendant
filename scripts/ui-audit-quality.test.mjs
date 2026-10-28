// B31 — a complete capture is not an approved UI. node --test scripts/ui-audit-quality.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { EXIT, blockersOf, exitCodeFor, summarise, verdictLines } from './lib/ui-audit-quality.mjs';

const root = resolve(import.meta.dirname, '..');
const run = (args, env = {}) => new Promise((done) => {
  const child = spawn(process.execPath, ['scripts/ui-audit.mjs', ...args], { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', (data) => { stdout += data; });
  child.stderr.on('data', (data) => { stderr += data; });
  child.on('close', (code) => done({ code, stdout, stderr }));
});

const captured = (screen, extra = {}) => ({
  screen, status: 'captured', errors: [], contrastFails: [], contrastUnknownBg: 0, unnamed: [], titles: [], overflowing: [], pageScrollX: false, spills: [], hidden: [], pointer: [],
  at720: { overflowing: [], pageScrollX: false, spills: [], hidden: [], pointer: [] }, ...extra,
});

test('each established blocker is named by rule, doctrine and size', () => {
  const screen = captured('x', {
    contrastFails: [{ ratio: 1.9, need: 4.5, text: 'Faint', at: 'label' }], unnamed: ['kiosk'], titles: [{ at: 'card', title: 'old' }], errors: ['boom'],
    spills: [{ at: 'span', px: 80, side: 'right of', bound: 'section' }],
    at720: { overflowing: ['wide'], pageScrollX: true, spills: [], hidden: [{ at: 'route', px: 12, axis: 'vertical' }], pointer: [{ at: 'tag', by: 'node' }] },
  });
  const found = blockersOf(screen).map((b) => `${b.doctrine}:${b.rule}:${b.size}`).sort();
  assert.deepEqual(found, ['D2:native-title:1080p', 'D5:contrast:1080p', 'D8:console-error:1080p', 'D8:cut-off:720p', 'D8:pointer:720p', 'D8:spill:1080p', 'D8:unnamed-control:1080p', 'D8:viewport-overflow:720p', 'D8:viewport-overflow:720p']);
});

test('a measured screen with nothing failing has no blockers; unmeasured text is neither a pass nor a fail', () => {
  const screen = captured('x', { contrastUnknownBg: 28 });
  assert.deepEqual(blockersOf(screen), []);
  const summary = summarise({ x: screen }, 1);
  assert.equal(summary.quality.status, 'no-blockers');
  assert.equal(summary.quality.unmeasuredContrastBlocks, 28);
  assert.equal(summary.review.status, 'not-performed');
  const text = verdictLines(summary, false).join('\n');
  assert.match(text, /a measurement, not an approval/);
  assert.match(text, /Review: not performed/);
  assert.doesNotMatch(text, /\bclean\b|\bpassed\b/i);
});

test('exit codes: strict fails only on blockers, and a failed capture outranks them', () => {
  const faint = captured('a', { contrastFails: [{ ratio: 2, need: 4.5, text: 't', at: 'p' }] });
  const blocked = summarise({ a: faint }, 1);
  assert.equal(exitCodeFor(blocked, false), EXIT.ok);
  assert.equal(exitCodeFor(blocked, true), EXIT.qualityBlocked);
  const both = summarise({ a: faint, b: { screen: 'b', status: 'failed' } }, 2);
  assert.equal(both.capture.complete, false);
  assert.equal(exitCodeFor(both, true), EXIT.captureFailed);
  assert.equal(summarise({ b: { screen: 'b', status: 'failed' } }, 1).quality.status, 'incomplete');
  assert.equal(summarise({}, 0).quality.status, 'not-run');
});

test('fewer screens measured than requested, or none, cannot pass a strict gate', () => {
  const short = summarise({ a: captured('a') }, 3);
  assert.equal(short.capture.complete, false);
  assert.equal(short.quality.status, 'incomplete');
  assert.match(verdictLines(short, true).join('\n'), /INCOMPLETE/);
  assert.equal(exitCodeFor(short, false), EXIT.ok);
  assert.equal(exitCodeFor(short, true), EXIT.captureFailed);
  const none = summarise({}, 0);
  assert.equal(exitCodeFor(none, false), EXIT.ok);
  assert.equal(exitCodeFor(none, true), EXIT.captureFailed);
});

test('faded text is counted on the gate line and does not fail it', () => {
  const summary = summarise({ a: captured('a', { contrastFaded: [{ ratio: 2.1, need: 4.5, opacity: 0.35, at: 'row', text: 'Locked' }] }) }, 1);
  assert.equal(summary.quality.status, 'no-blockers');
  assert.equal(summary.quality.fadedTextBlocks, 1);
  assert.match(verdictLines(summary, true)[1], /1 faded text block\(s\) under AA/);
  assert.equal(exitCodeFor(summary, true), EXIT.ok);
});

const fixtureServer =(body) => createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end(`<!doctype html><html><head><title>Pokémon Ascendant</title><style>body{background:#fff;color:#222;font:16px sans-serif}main{padding:24px}.faint{color:#bbb}</style></head><body><main data-testid="about-screen"><h1>About fixture</h1>${body}</main><script>window.__ascendant={}</script></body></html>`);
});
const withFixture = async (body, fn) => {
  const out = mkdtempSync(resolve(tmpdir(), 'ui-audit-b31-'));
  const server = fixtureServer(body);
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  try {
    await fn(out, { UI_AUDIT_BASE: `http://127.0.0.1:${server.address().port}`, UI_AUDIT_OUT: out, UI_AUDIT_TIMEOUT: '2000' });
  } finally {
    await new Promise((done) => server.close(done));
    rmSync(out, { recursive: true, force: true });
  }
};
const args = ['--screens', 'about', '--files', 'scripts/ui-audit.mjs'];

test('a low-contrast label is a quality failure in strict mode while the capture is still recorded', { timeout: 90_000 }, () => withFixture('<p class="faint" data-testid="faint-label">Faint label</p>', async (out, env) => {
  // Default mode keeps its exit 0 but cannot read as clean: the report says so on its first lines.
  const lenient = await run(args, env);
  assert.equal(lenient.code, 0, lenient.stdout + lenient.stderr);
  const report = JSON.parse(readFileSync(resolve(out, 'report.json'), 'utf8'));
  assert.equal(report.capture.complete, true);
  assert.deepEqual(report.summary, { requested: 1, captured: 1, failed: [] });
  assert.equal(report.quality.status, 'blockers');
  assert.equal(report.review.status, 'not-performed');
  assert.ok(report.screens.about.quality.blockers.some((b) => b.rule === 'contrast' && b.doctrine === 'D5' && /Faint label/.test(b.detail)));
  const md = readFileSync(resolve(out, 'report.md'), 'utf8');
  assert.match(md, /Capture\*\*: 1\/1 complete/);
  assert.match(md, /Quality gate\*\*: BLOCKERS/);
  assert.match(md, /Review\*\*: not performed/);
  assert.ok(existsSync(resolve(out, 'about.png')) && existsSync(resolve(out, 'about-720.png')));
  // Strict: exit 3, and the captures and the report are the same complete ones.
  const strict = await run([...args, '--strict'], env);
  assert.equal(strict.code, 3, strict.stdout + strict.stderr);
  assert.match(strict.stdout, /Quality gate: FAIL/);
  assert.equal(JSON.parse(readFileSync(resolve(out, 'report.json'), 'utf8')).capture.complete, true);
  assert.ok(existsSync(resolve(out, 'about.png')) && existsSync(resolve(out, 'about-720.png')));
  // The gate over the stored report needs no browser and agrees.
  assert.equal((await run(['--check-report', out], env)).code, 3);
}));

test('a complete capture with nothing measured failing exits 0 in strict mode and still claims no review', { timeout: 90_000 }, () => withFixture('<p>Readable label</p>', async (out, env) => {
  const strict = await run([...args, '--strict'], env);
  assert.equal(strict.code, 0, strict.stdout + strict.stderr);
  const report = JSON.parse(readFileSync(resolve(out, 'report.json'), 'utf8'));
  assert.equal(report.quality.status, 'no-blockers');
  assert.equal(report.review.status, 'not-performed');
  assert.match(strict.stdout, /a measurement, not an approval/);
  const gate = await run(['--check-report', resolve(out, 'report.json')], env);
  assert.equal(gate.code, 0);
  assert.match(gate.stdout, /Report: written \d{4}-\d{2}-\d{2}T/);
  assert.ok(report.generatedAt && 'head' in report);
}));

test('text faded by opacity is listed as an advisory, not failed; a labelled input is named', { timeout: 90_000 }, () => withFixture('<div style="opacity:.3"><p data-testid="spent-row">Spent row</p></div><label>Nickname <input data-testid="nick"></label><label for="b">Box</label><input id="b">', async (out, env) => {
  const strict = await run([...args, '--strict'], env);
  assert.equal(strict.code, 0, strict.stdout + strict.stderr);
  const about = JSON.parse(readFileSync(resolve(out, 'report.json'), 'utf8')).screens.about;
  assert.ok(about.contrastFaded.some((c) => c.at === 'spent-row' && c.opacity === 0.3));
  assert.deepEqual(about.contrastFails, []);
  assert.deepEqual(about.unnamed, []);
  assert.match(strict.stdout, /faded text block\(s\) under AA/);
}));

test('--check-report with no value or no report is a usage failure, not an audit run', async () => {
  const bare = await run(['--check-report']);
  assert.equal(bare.code, 1);
  assert.match(bare.stderr, /needs a report/);
  assert.equal((await run(['--check-report', 'playtest/does-not-exist-b31'])).code, 1);
});
