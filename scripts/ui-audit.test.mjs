import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { auditReady } from './lib/ui-audit-ready.mjs';

const root = resolve(import.meta.dirname, '..');
const run = (args, env = {}) => new Promise((done) => {
  const child = spawn(process.execPath, ['scripts/ui-audit.mjs', ...args], { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', (data) => { stdout += data; });
  child.stderr.on('data', (data) => { stderr += data; });
  child.on('close', (code) => done({ code, stdout, stderr }));
});

test('every audit preset declares its expected screen root', async () => {
  const result = await run(['--list']);
  assert.equal(result.code, 0, result.stderr);
  const presets = JSON.parse(result.stdout);
  for (const id of ['menu', 'combat', 'hub-card', 'center-daycare', 'mystery', 'evolution', 'map-hover-wild', 'map-hover-trainer', 'map-hover-service', 'map-hover-locked', 'victory', 'defeat', 'victory-record', 'defeat-record']) {
    assert.ok(presets[id], `${id} is a required canonical preset`);
  }
  for (const [id, preset] of Object.entries(presets)) assert.ok(preset.root, `${id} lacks an expected root`);
  assert.equal(presets.mystery.root, 'event-screen');
  assert.equal(presets.evolution.root, 'evolution-screen');
  assert.equal(presets['hub-card'].root, 'trainer-card');
  assert.equal(presets['hub-daycare'], undefined);
  for (const id of ['results', 'results-gym', 'results-escape']) assert.equal(presets[id].root, 'fight-results');
});

test('capture readiness rejects an undeclared target', async () => {
  await assert.rejects(auditReady({}, {}), /no expected root/);
});

test('a wrong root records a failure, removes stale success evidence and continues to the next screen', { timeout: 30_000 }, async () => {
  const out = resolve(root, 'playtest/a19-a21/audit-regression');
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'menu.png'), 'stale screenshot');
  writeFileSync(resolve(out, 'menu-720.png'), 'stale screenshot');
  const server = createServer((request, response) => {
    const about = new URL(request.url, 'http://fixture.test').searchParams.get('screen') === 'about';
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(`<!doctype html><html><head><title>Pokémon Ascendant</title><style>body{background:#fff;color:#222;font:16px sans-serif}main{padding:24px}.card{width:80px;background:#ddd;margin-bottom:20px}.child{display:block;width:160px}.clipped{overflow:hidden}</style></head><body><main data-testid="${about ? 'about-screen' : 'wrong-screen'}">${about ? 'About fixture' : 'Wrong landing page'}<section class="card"><span class="child" data-testid="visible-spill">Visible overflow</span></section><section class="card clipped"><span class="child" data-testid="clipped-spill">Clipped content</span></section></main><script>window.__ascendant={run:{state:()=>({phase:'ended',outcome:'defeat'})}}</script></body></html>`);
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const result = await run(['--screens', 'menu,about', '--files', 'scripts/ui-audit.mjs'], { UI_AUDIT_BASE: base, UI_AUDIT_OUT: out, UI_AUDIT_TIMEOUT: '400' });
    assert.equal(result.code, 1, result.stdout + result.stderr);
    const report = JSON.parse(readFileSync(resolve(out, 'report.json'), 'utf8'));
    assert.deepEqual(report.summary, { requested: 2, captured: 1, failed: ['menu'] });
    assert.equal(report.screens.menu.status, 'failed');
    assert.equal(report.screens.menu.expectedRoot, 'main-menu');
    assert.deepEqual(report.screens.menu.observed.roots, ['wrong-screen']);
    assert.equal(report.screens.menu.screenshot, null);
    assert.deepEqual(report.screens.menu.captures, { at1080: null, at720: null });
    assert.equal(existsSync(resolve(out, 'menu.png')), false);
    assert.equal(existsSync(resolve(out, 'menu-720.png')), false);
    assert.equal(report.screens.about.status, 'captured');
    assert.equal(report.screens.about.captures.at720.root, 'about-screen');
    for (const measured of [report.screens.about, report.screens.about.at720]) {
      assert.ok(measured.spills.some((spill) => spill.at.includes('visible-spill') && spill.px === 80));
      assert.ok(!measured.spills.some((spill) => spill.at.includes('clipped-spill')));
    }
    assert.ok(existsSync(resolve(out, 'about.png')) && existsSync(resolve(out, 'about-720.png')));
    assert.match(readFileSync(resolve(out, 'report.md'), 'utf8'), /menu — FAILED/);
  } finally {
    await new Promise((done) => server.close(done));
  }
});
