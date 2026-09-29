import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTLE_CONFIG } from '../combat/battleConfig';
import type { CombatCtx } from '../combat/context';
import { breakdownFor } from '../combat/damageFlow';
import { forecastTurn } from '../combat/forecast';
import { combatReducer } from '../combat/reducer';
import { createCombat } from '../combat/setup';
import { slotOccupant } from '../combat/slots';
import type { CombatState } from '../combat/state';
import { content } from '../testing/harness';
import { autoRun, type FightTrace } from './autoRun';

// §9.2.5 — the intent's number is the hit. The playtest of 2026-09-24 measured the chip against the harness's own
// fights: a single-target intent printed the hit that landed 65 % of the time, a Cleave's one number 21 %. This
// replays whole runs, turn by turn, and scores two predictors against what actually landed: the pre-v0.8.1 one (the
// bare formula into the slot's occupant; for a Cleave, the Lead's number printed for everyone) and the forecast
// (the Resolution run dry). Only a roll can move the forecast: a rider that lands on a chance and changes a later hit.

const ctx: CombatCtx = { content, config: DEFAULT_BATTLE_CONFIG };
const SEEDS = Number(process.env.INTENT_SEEDS ?? 4);

type Key = string; // `${enemyUid}>${targetUid}`

function legacy(state: CombatState): Map<Key, number> {
  const out = new Map<Key, number>();
  for (const e of state.enemies) {
    const i = e.intent;
    if (!i?.moveId || e.hp <= 0) continue;
    const move = content.move(i.moveId);
    if (move.power <= 0) continue;
    if (i.kind === 'cleave') {
      const leadOcc = slotOccupant(state, 'lead');
      const n = leadOcc ? breakdownFor(e, leadOcc, move, !!move.alwaysCrit, ctx).final : 0;
      for (const s of ['lead', 'bench1', 'bench2'] as const) {
        const occ = slotOccupant(state, s);
        if (occ) out.set(`${e.uid}>${occ.uid}`, n);
      }
    } else if (i.targetSlot) {
      const occ = slotOccupant(state, i.targetSlot);
      if (occ) out.set(`${e.uid}>${occ.uid}`, breakdownFor(e, occ, move, !!move.alwaysCrit, ctx).final);
    }
  }
  return out;
}

function landedBetween(before: CombatState, after: CombatState): Map<Key, number> {
  const mine = new Set(before.player.team.map((c) => c.uid));
  const out = new Map<Key, number>();
  for (const ev of after.events.slice(before.events.length)) {
    if (ev.t !== 'damage' || !ev.sourceUid || mine.has(ev.sourceUid) || !mine.has(ev.targetUid)) continue;
    const k = `${ev.sourceUid}>${ev.targetUid}`;
    out.set(k, (out.get(k) ?? 0) + ev.amount);
  }
  return out;
}

interface Tally { hits: number; legacyExact: number; forecastExact: number; cleaveHits: number; cleaveLegacy: number; cleaveForecast: number }

function measure(fight: FightTrace, t: Tally): void {
  let state = createCombat(fight.scenario, ctx, fight.scenario.seed);
  for (const action of fight.actions) {
    const resolving = action.type === 'end-turn' || action.type === 'flee';
    const old = resolving ? legacy(state) : null;
    const fc = resolving ? forecastTurn(state, ctx) : null;
    const cleavers = new Set(state.enemies.filter((e) => e.intent?.kind === 'cleave').map((e) => e.uid));
    const r = combatReducer(state, action, ctx);
    if (r.rejected) {
      const f = combatReducer(state, { type: 'end-turn' }, ctx);
      if (f.rejected) return;
      state = f.state;
      continue;
    }
    if (resolving && old && fc) {
      const landed = landedBetween(state, r.state);
      for (const [k, amount] of landed) {
        const [enemyUid, targetUid] = k.split('>') as [string, string];
        const predicted = fc.byEnemy[enemyUid]?.hits.find((h) => h.targetUid === targetUid)?.amount ?? 0;
        const cleave = cleavers.has(enemyUid);
        t.hits += 1;
        if (old.get(k) === amount) t.legacyExact += 1;
        if (predicted === amount) t.forecastExact += 1;
        if (cleave) {
          t.cleaveHits += 1;
          if (old.get(k) === amount) t.cleaveLegacy += 1;
          if (predicted === amount) t.cleaveForecast += 1;
        }
      }
    }
    state = r.state;
  }
}

describe('The honest intent, measured over whole runs — §9.2.5', () => {
  it('Forecast_PrintsTheHitThatLands_WhereTheOldChipMissed', () => {
    const t: Tally = { hits: 0, legacyExact: 0, forecastExact: 0, cleaveHits: 0, cleaveLegacy: 0, cleaveForecast: 0 };
    for (const starter of ['charmander', 'squirtle', 'bulbasaur']) {
      for (let seed = 1; seed <= SEEDS; seed++) autoRun(seed * 7919, starter, ctx, undefined, 3, (f) => measure(f, t));
    }
    const pct = (a: number, b: number) => `${Math.round((100 * a) / Math.max(1, b))} %`;
    console.log(
      `intent accuracy over ${t.hits} hits: old chip ${pct(t.legacyExact, t.hits)} · forecast ${pct(t.forecastExact, t.hits)}` +
        ` | cleave ${t.cleaveHits} hits: old ${pct(t.cleaveLegacy, t.cleaveHits)} · forecast ${pct(t.cleaveForecast, t.cleaveHits)}`,
    );
    expect(t.hits).toBeGreaterThan(200);
    // A miss is a rider that rolled: a support's poison on the Lead before another hit, a contact ability.
    expect(t.forecastExact / t.hits).toBeGreaterThan(0.97);
    expect(t.forecastExact).toBeGreaterThan(t.legacyExact);
  });
});
