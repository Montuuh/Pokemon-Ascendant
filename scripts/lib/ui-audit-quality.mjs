// The quality half of a UI audit result (docs/design/ui-doctrine.md, Severity). Pure: takes the records
// scripts/ui-audit.mjs writes and answers two separate questions — was every screen CAPTURED, and does what was
// MEASURED hold any established Blocker? Neither is a review: the ui-reviewer's verdict is a third, separate thing,
// and `review.status` says "not-performed" until a person or the agent records otherwise.
//
// A Blocker here is only what the page can prove by measuring, and each one is a row of the doctrine's Severity table
// (D5 contrast, D8 overflow / spill / cut-off / unreachable pointer / unnamed control / page error or failed request,
// D2 native title=). D1/D3/D4/D6/D7, motion and text faded by opacity (plan or history?) are judgement or lint: they are
// reported as advisories and never fail the gate.

export const EXIT = { ok: 0, captureFailed: 1, serverMissing: 2, qualityBlocked: 3 };

const SIZES = [['1080p', (s) => s], ['720p', (s) => s.at720 ?? {}]];

/** The established blockers of one captured screen record: `{ rule, doctrine, size, detail }[]`. */
export function blockersOf(screen) {
  if (screen?.status !== 'captured') return [];
  const out = [];
  const add = (rule, doctrine, size, detail) => out.push({ rule, doctrine, size, detail });
  // Contrast, names, native titles and console errors are measured once, at 1080p (the 720p pass is for layout).
  for (const c of screen.contrastFails ?? []) add('contrast', 'D5', '1080p', `${c.ratio}:1 (needs ${c.need}) “${c.text}” @ ${c.at}`);
  for (const at of screen.unnamed ?? []) add('unnamed-control', 'D8', '1080p', at);
  for (const t of screen.titles ?? []) add('native-title', 'D2', '1080p', `${t.at}: “${t.title}”`);
  for (const e of screen.errors ?? []) add('console-error', 'D8', '1080p', String(e).slice(0, 160));
  for (const [size, pick] of SIZES) {
    const m = pick(screen);
    for (const at of m.overflowing ?? []) add('viewport-overflow', 'D8', size, at);
    if (m.pageScrollX) add('viewport-overflow', 'D8', size, 'the page scrolls sideways');
    for (const p of m.spills ?? []) add('spill', 'D8', size, `${p.at} ${p.px} px ${p.side} ${p.bound}`);
    for (const h of m.hidden ?? []) add('cut-off', 'D8', size, `${h.at} ${h.px} px on its ${h.axis} axis`);
    for (const p of m.pointer ?? []) add('pointer', 'D8', size, `${p.at} belongs to ${p.by}`);
  }
  return out;
}

/** What a measurement could not see — never a pass, never a fail. */
export function unmeasuredOf(screen) {
  return screen?.status === 'captured' ? { contrastBlocks: screen.contrastUnknownBg ?? 0 } : { contrastBlocks: 0 };
}

/**
 * `capture`: what was photographed. `quality`: what the measurements hold. `review`: always not-performed here.
 * `quality.status` is 'blockers' | 'no-blockers' | 'incomplete' (a failed capture means some screens are unmeasured) |
 * 'not-run' (nothing requested). `no-blockers` is not an approval: it says only that nothing measurable failed.
 */
export function summarise(results, requested) {
  const screens = Object.values(results);
  const failed = screens.filter((r) => r.status === 'failed').map((r) => r.screen);
  const captured = screens.filter((r) => r.status === 'captured');
  const withBlockers = [];
  let total = 0;
  let unmeasuredBlocks = 0;
  let faded = 0;
  for (const r of captured) {
    const b = blockersOf(r);
    unmeasuredBlocks += unmeasuredOf(r).contrastBlocks;
    faded += (r.contrastFaded ?? []).length;
    if (b.length) { withBlockers.push({ screen: r.screen, count: b.length }); total += b.length; }
  }
  const complete = requested > 0 && failed.length === 0 && captured.length === requested;
  const status = requested === 0 ? 'not-run' : total ? 'blockers' : !complete ? 'incomplete' : 'no-blockers';
  return {
    capture: { requested, captured: captured.length, failed, complete },
    quality: { status, blockers: total, screensWithBlockers: withBlockers, unmeasuredContrastBlocks: unmeasuredBlocks, fadedTextBlocks: faded, measured: { contrast: '1080p', layout: '1080p and 720p' } },
    review: { status: 'not-performed', note: 'A capture and a quality gate are evidence. The ui-reviewer verdict is the review.' },
  };
}

/**
 * Exit code: a failed capture outranks a quality failure, and a quality failure only counts in strict mode. A gate that
 * measured fewer screens than were asked for, or none, cannot pass: in strict mode that is a capture failure too.
 */
export function exitCodeFor(summary, strict) {
  if (summary.capture.failed.length || (strict && !summary.capture.complete)) return EXIT.captureFailed;
  if (strict && summary.quality.status === 'blockers') return EXIT.qualityBlocked;
  return EXIT.ok;
}

/** The lines that open a report and close a run. They never say "clean", "passed" or "approved". */
export function verdictLines(summary, strict) {
  const { capture, quality } = summary;
  const cap = capture.requested === 0
    ? 'Capture: nothing requested'
    : `Capture: ${capture.captured}/${capture.requested} ${capture.complete ? 'complete' : 'INCOMPLETE'}${capture.failed.length ? ` · failed: ${capture.failed.join(', ')}` : ''}`;
  const gate = {
    blockers: `Quality gate: ${strict ? 'FAIL' : 'BLOCKERS'} — ${quality.blockers} measured blocker(s) on ${quality.screensWithBlockers.length} screen(s): ${quality.screensWithBlockers.map((s) => `${s.screen} (${s.count})`).join(', ')}${quality.fadedTextBlocks ? ` · ${quality.fadedTextBlocks} faded text block(s) under AA are the reviewer's call` : ''}`,
    'no-blockers': `Quality gate: no measured blockers${[quality.unmeasuredContrastBlocks ? `${quality.unmeasuredContrastBlocks} text block(s) on a gradient or image were not measured` : '', quality.fadedTextBlocks ? `${quality.fadedTextBlocks} faded text block(s) under AA are the reviewer's call` : ''].filter(Boolean).map((n, i, all) => (i === 0 ? ' (' : '') + n + (i === all.length - 1 ? ')' : '; ')).join('')} — a measurement, not an approval`,
    incomplete: 'Quality gate: INCOMPLETE — screens that were not captured were not measured',
    'not-run': 'Quality gate: not run',
  }[quality.status];
  return [cap, gate, `Review: not performed — ${summary.review.note}${strict ? '' : ' Run with --strict (npm run ui:audit:strict) to make measured blockers fail the run.'}`];
}
