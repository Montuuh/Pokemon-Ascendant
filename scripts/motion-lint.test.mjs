// The motion lint (scripts/lib/motion-lint.mjs) — what D11/D12's measuring half finds and what it leaves alone.
// Run: node --test scripts/motion-lint.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { lintMotion, formatMotion } from './lib/motion-lint.mjs';

const rules = (file, text) => lintMotion(file, text).map((h) => h.rule);

test('chrome transitions: all, ease-in and layout properties are found', () => {
  assert.deepEqual(rules('a.module.css', '.a { transition: all var(--motion-base) ease-out; }'), ['transition-all']);
  assert.deepEqual(rules('a.module.css', '.a { transition: opacity var(--motion-fast) ease-in; }'), ['ease-in']);
  assert.deepEqual(rules('a.module.css', '.a { transition: width var(--motion-slow) ease-out; }'), ['layout-property']);
  assert.deepEqual(rules('a.module.css', '.a { transition-property: transform, height; }'), ['layout-property']);
});

test('ease-in-out and token durations are clean', () => {
  assert.deepEqual(rules('a.module.css', '.a { transition: transform var(--motion-base) ease-in-out, opacity var(--motion-fast) var(--ease-step); }'), []);
  assert.deepEqual(rules('a.module.css', '.a { animation: global(pop) var(--fx-pop) linear calc(var(--at) + 120ms) both; }'), []);
  assert.deepEqual(rules('a.module.css', '.a { transition-delay: 0ms; animation-duration: 0s; }'), []);
});

test('a literal duration is found, in CSS and in a React style string', () => {
  assert.deepEqual(rules('a.module.css', '.a { animation: global(lossPulse) 1.2s ease-in-out infinite; }'), ['literal-duration']);
  assert.deepEqual(rules('a.module.css', '.a { animation-delay: 0.3s; }'), ['literal-duration']);
  assert.deepEqual(rules('A.tsx', "const s = { transition: 'opacity 200ms ease-out' };"), ['literal-duration']);
});

test('keyframes that move layout, and scale(0), are found; a beam growing along its length is not', () => {
  assert.deepEqual(rules('a.module.css', '@keyframes drop { 0% { top: 10%; } 100% { top: 20%; } }'), ['layout-property', 'layout-property']);
  assert.deepEqual(rules('a.module.css', '@keyframes pop { from { transform: scale(0); } }'), ['scale-zero']);
  assert.deepEqual(rules('a.module.css', '@keyframes pop { from { scale: 0; } }'), ['scale-zero']);
  assert.deepEqual(rules('a.module.css', '@keyframes grow { from { scale: 0 1; } to { scale: 1 1; } }'), []);
  assert.deepEqual(rules('A.tsx', '<motion.div initial={{ opacity: 0, scale: 0 }} />'), ['scale-zero']);
  assert.deepEqual(rules('A.tsx', '<motion.div initial={{ opacity: 0, scale: 0.95 }} />'), []);
});

test('Motion code that never asks useMotionPref is found; gated code is not', () => {
  assert.deepEqual(rules('A.tsx', "import { motion } from 'motion/react';\nexport const A = () => <motion.div animate={{ opacity: 1 }} />;"), ['ungated-motion']);
  assert.deepEqual(rules('A.tsx', "import { motion } from 'motion/react';\nimport { useMotionPref } from '../hooks/useMotionPref';\nexport const A = () => { const on = useMotionPref(); return <motion.div animate={on ? { opacity: 1 } : false} />; };"), []);
  assert.deepEqual(rules('A.tsx', 'el.animate([{ opacity: 0 }, { opacity: 1 }], 200);'), ['ungated-motion']);
});

test('a motion-ok marker with a reason silences the line it sits on or above', () => {
  assert.deepEqual(rules('a.module.css', '.a {\n  /* motion-ok: gravity — the ball falls */\n  animation: drop var(--fx-drop) ease-in both;\n}'), []);
  assert.deepEqual(rules('a.module.css', '.a { animation: drop var(--fx-drop) ease-in both; } /* motion-ok: gravity */'), []);
  assert.deepEqual(rules('a.module.css', '.a {\n  /* motion-ok: */\n  animation: drop var(--fx-drop) ease-in both;\n}'), ['ease-in'], 'a marker needs its reason');
});

test('comments are not read as rules, and hits carry their line', () => {
  assert.deepEqual(rules('a.module.css', '/* transition: all 300ms ease-in; */\n.a { opacity: 1; }'), []);
  assert.deepEqual(rules('A.tsx', "// transition: 'all 300ms'\nexport const x = 1;"), []);
  const [h] = lintMotion('a.module.css', '.a {\n  color: red;\n  transition: all var(--motion-base);\n}');
  assert.equal(h.line, 3);
  assert.deepEqual(formatMotion([h]), ['transition-all (1): `a.module.css:3`']);
  assert.deepEqual(formatMotion([]), ['none']);
});

test('files that are neither CSS nor TS are ignored', () => {
  assert.deepEqual(rules('notes.md', 'transition: all 300ms ease-in;'), []);
});
