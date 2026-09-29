import { current, isDraft } from 'immer';
import { GameRng } from '../rng/gameRng';
import type { CombatCtx, RunCtx } from './context';
import { executeIntent } from './enemyTurn';
import { resolutionOrder } from './slots';
import type { CombatState } from './state';

// §5.2 / §9.2.5 — the honest intent. What an intent chip prints is not a formula run beside the rules: it is the
// Resolution phase itself, run dry on a copy of the fight. Every term the real hit has — relics, Badges, held
// items, abilities, flat reductions, guards, shields, faint prevention, and what an earlier intent of the same
// turn does to a later one (a support's Growl before the Lead's Tackle) — is in the number because the number
// *is* that hit. The only thing it cannot know is a roll: a rider that lands on a chance is taken not to land.

/** One target an intent lands on, and the HP it will take there. */
export interface ForecastHit {
  targetUid: string;
  /** HP lost — after shields, reductions and faint prevention; the sum of a multi-hit move's hits. */
  amount: number;
  hpAfter: number;
  ko: boolean;
}

export interface IntentForecast {
  enemyUid: string;
  hits: ForecastHit[];
}

export interface TurnForecast {
  /** Per enemy, what its intent does to each of your Pokémon, in the order the intents resolve. */
  byEnemy: Record<string, IntentForecast>;
  /** Per Pokémon of yours, every hit coming at it this turn, in resolution order. */
  incoming: Record<string, { enemyUid: string; amount: number }[]>;
  /** Per Pokémon of yours, its HP once every intent has landed. */
  hpAfter: Record<string, number>;
}

/**
 * A stream that never rolls lucky: every chance below certainty fails, every range picks its first value. A
 * forecast is what will happen for sure, so an unlikely rider must not be printed as if it were coming.
 */
class SteadyRng extends GameRng {
  constructor() {
    super(1);
  }
  override range(min: number): number {
    return min;
  }
  override range01(): number {
    return 1;
  }
}

/** §9.2.5 — run this turn's enemy intents on a copy of the fight and read off what each one does to whom. */
export function forecastTurn(state: CombatState, ctx: CombatCtx): TurnForecast {
  // Inside the reducer the state is an Immer draft (a Proxy, which cannot be cloned); outside it is plain.
  const base = isDraft(state) ? current(state) : state;
  const sim = structuredClone({ ...base, events: [], log: [] }) as CombatState;
  sim.phase = 'resolution';
  const run: RunCtx = { ...ctx, rng: new SteadyRng() };
  const mine = new Set(sim.player.team.map((c) => c.uid));
  const out: TurnForecast = { byEnemy: {}, incoming: {}, hpAfter: {} };

  for (const enemy of resolutionOrder(sim)) {
    if (enemy.hp <= 0 || !enemy.intent) continue;
    const from = sim.events.length;
    executeIntent(sim, enemy, run);
    const totals = new Map<string, number>();
    for (const e of sim.events.slice(from)) {
      if (e.t !== 'damage' || e.sourceUid !== enemy.uid || !mine.has(e.targetUid)) continue;
      totals.set(e.targetUid, (totals.get(e.targetUid) ?? 0) + e.amount);
    }
    const hits: ForecastHit[] = [];
    for (const [targetUid, amount] of totals) {
      const hpAfter = sim.player.team.find((c) => c.uid === targetUid)!.hp;
      hits.push({ targetUid, amount, hpAfter, ko: hpAfter <= 0 });
      (out.incoming[targetUid] ??= []).push({ enemyUid: enemy.uid, amount });
    }
    out.byEnemy[enemy.uid] = { enemyUid: enemy.uid, hits };
  }
  for (const c of sim.player.team) out.hpAfter[c.uid] = c.hp;
  return out;
}

/** The HP an enemy's intent takes off one Pokémon of yours this turn (0 when it does not land there). */
export function forecastOn(forecast: TurnForecast, enemyUid: string, targetUid: string): number {
  return forecast.byEnemy[enemyUid]?.hits.find((h) => h.targetUid === targetUid)?.amount ?? 0;
}
