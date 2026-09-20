import { describe, expect, it } from 'vitest';
import { autoPlay } from '../balance/autoPlayer';
import { content, ctx, startFixture } from '../testing/harness';
import { fingerprint, replayCombat } from './replay';

// §10.7.3 / §10.7.4 — given seed + input log, the combat replays identically.
describe('Determinism & replay', () => {
  const ids: string[] = content.allScenarios().map((s) => s.id);

  it.each(ids)('%s — same seed, same policy ⇒ identical fingerprint', (id) => {
    const a = autoPlay(startFixture(id), ctx);
    const b = autoPlay(startFixture(id), ctx);
    expect(fingerprint(a.state)).toBe(fingerprint(b.state));
    expect(a.actions).toEqual(b.actions);
  });

  it.each(ids)('%s — replaying the recorded actions reproduces the end state', (id) => {
    const sc = content.scenario(id);
    const played = autoPlay(startFixture(id), ctx);
    const replayed = replayCombat({ scenarioId: id, seed: sc.seed, actions: played.actions }, sc, ctx);
    expect(replayed.rejectedAt).toBeNull();
    expect(fingerprint(replayed.state)).toBe(fingerprint(played.state));
    expect(replayed.state.events.length).toBe(played.state.events.length);
  });

  it('DifferentSeeds_ProduceDifferentFights', () => {
    const a = autoPlay(startFixture('wild-basic', 1), ctx);
    const b = autoPlay(startFixture('wild-basic', 2), ctx);
    expect(fingerprint(a.state)).not.toBe(fingerprint(b.state));
  });

  it('State_IsJsonRoundTrippable', () => {
    const s = startFixture('wild-boss-3phase');
    const copy = JSON.parse(JSON.stringify(s));
    expect(copy).toEqual(s);
  });

  it('EveryFixture_EndsWithinActionBudget', () => {
    for (const id of ids) {
      const r = autoPlay(startFixture(id), ctx);
      expect(r.state.outcome, id).not.toBe('in-progress');
      expect(r.turns, id).toBeLessThan(40);
    }
  });
});
