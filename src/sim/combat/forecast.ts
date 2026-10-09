import { current, isDraft } from 'immer';
import { GameRng } from '../rng/gameRng';
import type { CombatCtx, RunCtx } from './context';
import { executeIntent } from './enemyTurn';
import { resolutionOrder } from './slots';
import type { CombatState, EnemyCombatant, Intent } from './state';

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
  /** Per enemy, what its whole turn does to each of your Pokémon (both actions of one that acts twice). */
  byEnemy: Record<string, IntentForecast>;
  /** §5.6.1 — per action: `<enemyUid>#0` is its intent, `<enemyUid>#1` the second action of one that acts twice. */
  byAction: Record<string, IntentForecast>;
  /** Per Pokémon of yours, every hit coming at it this turn, one entry per action, in resolution order. */
  incoming: Record<string, { enemyUid: string; action: number; amount: number }[]>;
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

/**
 * Settled states are immutable (Immer freezes every one the reducer hands back), so a forecast of one is a fact
 * about it forever: cached by identity, it is computed once however many chips, portraits and harness decisions
 * read it. A draft is mid-change and is never cached.
 */
const cache = new WeakMap<CombatState, { ctx: CombatCtx; forecast: TurnForecast }>();

/** §9.2.5 — run this turn's enemy intents on a copy of the fight and read off what each one does to whom. */
export function forecastTurn(state: CombatState, ctx: CombatCtx): TurnForecast {
  if (isDraft(state)) return computeForecast(state, ctx);
  const hit = cache.get(state);
  if (hit && hit.ctx.content === ctx.content && hit.ctx.config === ctx.config) return hit.forecast;
  const forecast = computeForecast(state, ctx);
  cache.set(state, { ctx, forecast });
  return forecast;
}

function computeForecast(state: CombatState, ctx: CombatCtx): TurnForecast {
  // Inside the reducer the state is an Immer draft (a Proxy, which cannot be cloned); outside it is plain.
  const base = isDraft(state) ? current(state) : state;
  const sim = structuredClone({ ...base, events: [], log: [] }) as CombatState;
  sim.phase = 'resolution';
  const run: RunCtx = { ...ctx, rng: new SteadyRng() };
  const mine = new Set(sim.player.team.map((c) => c.uid));
  const out: TurnForecast = { byEnemy: {}, byAction: {}, incoming: {}, hpAfter: {} };

  /** Run one action and read off the HP it took from each of yours. */
  const act = (enemy: EnemyCombatant, intent: Intent, action: number): ForecastHit[] => {
    const from = sim.events.length;
    executeIntent(sim, enemy, run, intent);
    const totals = new Map<string, number>();
    for (const e of sim.events.slice(from)) {
      if (e.t !== 'damage' || e.sourceUid !== enemy.uid || !mine.has(e.targetUid)) continue;
      totals.set(e.targetUid, (totals.get(e.targetUid) ?? 0) + e.amount);
    }
    const hits: ForecastHit[] = [];
    for (const [targetUid, amount] of totals) {
      const hpAfter = sim.player.team.find((c) => c.uid === targetUid)!.hp;
      hits.push({ targetUid, amount, hpAfter, ko: hpAfter <= 0 });
      (out.incoming[targetUid] ??= []).push({ enemyUid: enemy.uid, action, amount });
    }
    out.byAction[`${enemy.uid}#${action}`] = { enemyUid: enemy.uid, hits };
    return hits;
  };

  for (const enemy of resolutionOrder(sim)) {
    if (enemy.hp <= 0 || !enemy.intent) continue;
    // §3.2.5 / §5.6.1 — the same order `executeTurn` keeps: its intent, then its second if it still stands.
    const hits = act(enemy, enemy.intent, 0).map((h) => ({ ...h }));
    if (enemy.second && !enemy.second.broken && enemy.hp > 0 && sim.outcome === 'in-progress') {
      for (const h of act(enemy, enemy.second, 1)) {
        const same = hits.find((x) => x.targetUid === h.targetUid);
        if (same) Object.assign(same, { amount: same.amount + h.amount, hpAfter: h.hpAfter, ko: h.ko });
        else hits.push({ ...h });
      }
    }
    out.byEnemy[enemy.uid] = { enemyUid: enemy.uid, hits };
  }
  for (const c of sim.player.team) out.hpAfter[c.uid] = c.hp;
  return out;
}

/**
 * The HP an enemy's intent takes off one Pokémon of yours this turn (0 when it does not land there). `action` 1 is
 * the second action of a Pokémon that acts twice; absent, its whole turn.
 */
export function forecastOn(forecast: TurnForecast, enemyUid: string, targetUid: string, action?: number): number {
  const f = action === undefined ? forecast.byEnemy[enemyUid] : forecast.byAction[`${enemyUid}#${action}`];
  return f?.hits.find((h) => h.targetUid === targetUid)?.amount ?? 0;
}

const ifLeadCache = new WeakMap<CombatState, Map<number, TurnForecast>>();

/**
 * §9.2.5 / §3.3 — the same honest dry run with another of your Pokémon at the Lead (v0.8.6, the user's idea): what
 * this turn's intents would do if `index` took the Lead now. It is the forecast of the fight after that swap, so the
 * number a bench Pokémon shows "as Lead" is the number its portrait would show once it got there — the swap
 * decision, priced. Null for a fainted Pokémon; the Lead's own is the ordinary forecast.
 */
export function forecastIfLead(state: CombatState, ctx: CombatCtx, index: number): TurnForecast | null {
  const mon = state.player.team[index];
  if (!mon || mon.hp <= 0) return null;
  if (index === state.player.leadIndex) return forecastTurn(state, ctx);
  const draft = isDraft(state);
  const cached = draft ? undefined : ifLeadCache.get(state)?.get(index);
  if (cached) return cached;
  const base = draft ? current(state) : state;
  const forecast = computeForecast({ ...base, player: { ...base.player, leadIndex: index } } as CombatState, ctx);
  if (!draft) {
    const byIndex = ifLeadCache.get(state) ?? new Map<number, TurnForecast>();
    byIndex.set(index, forecast);
    ifLeadCache.set(state, byIndex);
  }
  return forecast;
}

/**
 * §9.2.5 — what Pokémon `index` would take this turn at the Lead, from the intents you can see (a hidden intent's
 * number stays hidden). `only` narrows it to one enemy action — the intent card's "If X led" line. The one place
 * both the bench chip and the intent card read, so the two can never disagree.
 */
export function asLeadDamage(state: CombatState, ctx: CombatCtx, index: number, only?: { enemyUid: string; action: 0 | 1 }): { amount: number; ko: boolean } | null {
  const f = forecastIfLead(state, ctx, index);
  const mon = state.player.team[index];
  if (!f || !mon) return null;
  let amount = 0;
  for (const e of state.enemies) {
    for (const [action, intent] of [[0, e.intent], [1, e.second]] as const) {
      if (!intent || intent.hidden) continue;
      if (only && (only.enemyUid !== e.uid || only.action !== action)) continue;
      amount += forecastOn(f, e.uid, mon.uid, action);
    }
  }
  return { amount, ko: amount >= mon.hp };
}
