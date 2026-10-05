import type { CombatCtx } from '../combat/context';
import { forecastTurn } from '../combat/forecast';
import { cardPlayability, catchStatus, consumablePlayability, pickLeadOptions, swapOptions, type CardPlayability } from '../combat/preview';
import { combatReducer } from '../combat/reducer';
import { activeEnemy, lead } from '../combat/slots';
import type { CombatAction, CombatState } from '../combat/state';
import { hpFraction } from '../combat/stats';
import { typeMultiplier } from '../combat/typeChart';

// A deterministic, reasonably competent policy used for balance simulation and golden-master recording.
// It is NOT the game's AI (enemies use §5); it stands in for a decent human player.

export interface AutoPlayerOptions {
  /** Swap the Lead out when its HP fraction drops below this and the incoming hit would matter. */
  retreatBelow: number;
  /** Heal when the Lead is below this fraction and a heal is in hand. */
  healBelow: number;
  /** Throw a ball as soon as the gauge is READY (wild only). */
  tryCatch: boolean;
}

export const DEFAULT_POLICY: AutoPlayerOptions = { retreatBelow: 0.3, healBelow: 0.45, tryCatch: false };

/** What a healing consumable is worth on a target with this Max HP, in HP. Flat is flat; percent scales. */
function healValue(def: { effect: { kind: string; amount?: number; percent?: number } }, maxHp: number): number {
  if (def.effect.kind === 'heal-flat') return def.effect.amount ?? 0;
  if (def.effect.kind === 'heal-percent') return Math.floor((maxHp * (def.effect.percent ?? 0)) / 100);
  return 0;
}

function healthiest(state: CombatState, indices: number[]): number | undefined {
  return [...indices].sort((a, b) => hpFraction(state.player.team[b]!) - hpFraction(state.player.team[a]!))[0];
}

/** Decide the next action for the current state, or null when nothing can be done. */
export function nextAction(state: CombatState, ctx: CombatCtx, opts: AutoPlayerOptions = DEFAULT_POLICY): CombatAction | null {
  if (state.outcome !== 'in-progress') return null;
  if (state.player.pendingLeadPick) {
    const best = healthiest(state, pickLeadOptions(state));
    return best === undefined ? null : { type: 'pick-lead', benchIndex: best };
  }
  if (state.phase !== 'action') return null;
  const enemy = activeEnemy(state);
  const l = lead(state);
  if (!enemy || !l) return { type: 'end-turn' };

  // 1. Catch when the odds are even or better — a player's rule of thumb, not an optimum.
  if (opts.tryCatch && state.kind === 'wild') {
    const odds = catchStatus(state, ctx);
    const ball = state.player.consumables.hand
      .map((c) => consumablePlayability(state, c.id, ctx)!)
      .find((p) => p.def.effect.kind === 'catch' && p.playable);
    if (odds && odds.chance >= 0.5 && ball) return { type: 'use-consumable', cardId: ball.cardId };
  }

  // 2. Heal a low Lead. Both healing kinds, best first — §7.2.2 made healing a percentage of Effective Max
  // HP, and a harness that only knew `heal-flat` silently stopped drinking Potions the day that landed.
  // It read as a 30-point balance collapse and was a missing case in a `find`.
  if (hpFraction(l) < opts.healBelow) {
    const healCard = state.player.consumables.hand
      .map((c) => consumablePlayability(state, c.id, ctx)!)
      .filter((p) => p.playable && (p.def.effect.kind === 'heal-flat' || p.def.effect.kind === 'heal-percent'))
      // Weakest sufficient first: a Max Potion on a scratch is the same waste in a harness as in a player.
      .sort((a, b) => healValue(a.def, l.maxHp) - healValue(b.def, l.maxHp));
    const missing = l.maxHp - l.hp;
    const pick = healCard.find((p) => healValue(p.def, l.maxHp) >= missing) ?? healCard[healCard.length - 1];
    if (pick) return { type: 'use-consumable', cardId: pick.cardId, targetIndex: state.player.leadIndex };
  }

  // §4.3.6 — Defog, the moment a field works against the team: a Home Field, a Sandstorm the Lead is not immune to,
  // or a weather that lifts the enemy Lead's own type. A player reads the ground; a harness that does not measures
  // a strictly worse player (standing facts: take the decision the design expects).
  const f = state.fields;
  const hostileWeather = (f.weather === 'sunny-day' && enemy.types.includes('fire')) || (f.weather === 'rain-dance' && enemy.types.includes('water'));
  const hostileSand = f.hazard === 'sandstorm' && !l.types.some((t) => t === 'rock' || t === 'ground' || t === 'fighting');
  // §4.3.8–§4.3.13 — and the v0.8.7 fields: Hail on a Lead that is not Ice, a terrain that lifts the enemy Lead's own
  // type, a hazard that charges every swap.
  const hostileNew = (f.weather === 'hail' && !l.types.includes('ice'))
    || (f.terrain === 'grassy-terrain' && enemy.types.includes('grass'))
    || (f.terrain === 'psychic-terrain' && enemy.types.includes('psychic'))
    || f.hazard === 'toxic-spikes' || f.hazard === 'sticky-web';
  if (f.home || hostileWeather || hostileSand || hostileNew) {
    const defog = state.player.consumables.hand
      .map((c) => consumablePlayability(state, c.id, ctx)!)
      .find((p) => p.playable && p.def.effect.kind === 'clear-fields');
    if (defog) return { type: 'use-consumable', cardId: defog.cardId };
  }

  // §4.2 / §7.2 — a cure for a Lead that cannot act or is bleeding: Sleep and Freeze lock its cards, Paralysis taxes
  // every card, Burn and Poison take a share a turn. The matching cure costs no AP; a Full Heal is the fallback.
  const status = l.status?.kind;
  if (status) {
    const cures = state.player.consumables.hand
      .map((c) => consumablePlayability(state, c.id, ctx)!)
      .filter((p) => p.playable && p.def.effect.kind === 'cure');
    const exact = cures.find((p) => p.def.effect.kind === 'cure' && p.def.effect.status === status);
    const any = cures.find((p) => p.def.effect.kind === 'cure' && p.def.effect.status === 'all');
    const cure = exact ?? any;
    if (cure) return { type: 'use-consumable', cardId: cure.cardId, targetIndex: state.player.leadIndex };
  }

  // §7.2.3 — an X item at the top of a fight that is worth one (a trainer, an Elite, a Gym), while the stage is
  // still low: X Attack on a Lead with damage to deal, X Defense when the hit coming in is a large one.
  if (state.kind !== 'wild') {
    const xs = state.player.consumables.hand
      .map((c) => consumablePlayability(state, c.id, ctx)!)
      .filter((p) => p.playable && p.def.effect.kind === 'stage');
    const xAtk = xs.find((p) => p.def.effect.kind === 'stage' && p.def.effect.stat === 'attack');
    if (xAtk && (l.stages.attack ?? 0) < 2 && state.player.ap >= xAtk.def.apCost + 1) return { type: 'use-consumable', cardId: xAtk.cardId, targetIndex: state.player.leadIndex };
    const xDef = xs.find((p) => p.def.effect.kind === 'stage' && p.def.effect.stat === 'defense');
    const coming = (forecastTurn(state, ctx).incoming[l.uid] ?? []).reduce((a, h) => a + h.amount, 0);
    if (xDef && (l.stages.defense ?? 0) < 2 && coming >= l.maxHp * 0.25) return { type: 'use-consumable', cardId: xDef.cardId, targetIndex: state.player.leadIndex };
  }

  // §2.4.3 — a Revive is worth two AP the moment somebody is down, because a body back is four cards back.
  const downIndex = state.player.team.findIndex((m) => m.hp <= 0);
  if (downIndex >= 0) {
    const revive = state.player.consumables.hand
      .map((c) => consumablePlayability(state, c.id, ctx)!)
      .find((p) => p.playable && p.def.effect.kind === 'revive');
    if (revive) return { type: 'use-consumable', cardId: revive.cardId, targetIndex: downIndex };
  }

  // 3. Retreat: if the Lead is low and about to be hit, swap in the bench that takes the least.
  // §9.2.5 — every hit coming at the Lead this turn, from the whole group, as the dry-run Resolution prints it.
  const incoming = (forecastTurn(state, ctx).incoming[l.uid] ?? []).reduce((a, h) => a + h.amount, 0);
  const intent = enemy.intent;
  const threatensLead = !!intent && (intent.kind === 'attack' || intent.kind === 'cleave' || state.enemies.length > 1) && incoming > 0;
  if (threatensLead && intent.moveId && (hpFraction(l) < opts.retreatBelow || incoming >= l.hp)) {
    const options = swapOptions(state).filter((o) => o.allowed);
    if (options.length > 0) {
      const moveType = ctx.content.move(intent.moveId).type;
      const best = options
        .map((o) => ({ o, mult: typeMultiplier(moveType, state.player.team[o.benchIndex]!.types), hp: state.player.team[o.benchIndex]!.hp }))
        .sort((a, b) => a.mult - b.mult || b.hp - a.hp)[0]!;
      if (best.mult <= 1 || incoming >= l.hp) return { type: 'swap', benchIndex: best.o.benchIndex };
    }
  }

  // 4. Best damage per AP that is playable; take a KO when available.
  const all = state.player.hand.map((c) => cardPlayability(state, c.id, ctx)!);
  const plays = all.filter((p) => p.playable);
  const damaging = plays.filter((p) => p.damage && p.damage.final > 0);

  // 4a. Nothing damaging is online but a bench Pokémon holds melee cards: swap to bring them online
  //     when the swap plus the card still fit in the AP budget (§3.3.1 — the swap IS the decision).
  if (damaging.length === 0) {
    const locked = all.filter((p) => p.reason === 'melee-needs-lead' && p.damage && p.damage.final > 0 && p.owner.hp > 0);
    const options = swapOptions(state).filter((o) => o.allowed);
    let best: { benchIndex: number; value: number } | null = null;
    for (const o of options) {
      const owner = state.player.team[o.benchIndex]!;
      const cards = locked.filter((p) => p.owner.uid === owner.uid && p.apCost <= state.player.ap - o.cost);
      const value = cards.reduce((acc, p) => acc + p.damage!.final, 0);
      if (value > 0 && (!best || value > best.value)) best = { benchIndex: o.benchIndex, value };
    }
    if (best) return { type: 'swap', benchIndex: best.benchIndex };
  }

  // 4b. Short of AP with damage still in hand: an Ether buys a card you could not otherwise play.
  //
  // §7.2.4 made it cost 1 AP for +2, a net +1 — which means it must be played *before* the tank is empty.
  // The old trigger was `ap === 0`, and at 0 AP an Ether is a brick: the branch went dead the moment the
  // cost landed, and the harness simply stopped using its release valve. `playable` is the real gate.
  {
    const ether = state.player.consumables.hand
      .map((c) => consumablePlayability(state, c.id, ctx)!)
      .find((p) => p.playable && p.def.effect.kind === 'ap');
    // Only when it actually unlocks something: a card that is out of reach now and in reach after.
    const gain = ether && ether.def.effect.kind === 'ap' ? ether.def.effect.amount - ether.def.apCost : 0;
    const unlocks = all.some(
      (p) => p.reason === 'not-enough-ap' && p.damage && p.damage.final > 0 && p.apCost <= state.player.ap + gain,
    );
    if (ether && gain > 0 && unlocks) return { type: 'use-consumable', cardId: ether.cardId };
  }
  // §5.6 — against a group every card has a best target: a knockout first, then the largest share of a target's
  // HP (which finishes a support before it escalates). An area card has no choice to make: it hits them all.
  const aim = (p: CardPlayability): { uid: string | undefined; dmg: number; ko: boolean; share: number } => {
    if (p.hitsAll || state.enemies.length <= 1) {
      const dmg = p.targets.reduce((a, t) => a + (t.damage?.final ?? 0), 0);
      return { uid: undefined, dmg, ko: p.targets.some((t) => (t.damage?.final ?? 0) >= (state.enemies.find((e) => e.uid === t.uid)?.hp ?? Infinity)), share: dmg / Math.max(1, enemy.hp) };
    }
    const options = p.targets
      .filter((t) => t.reachable && t.damage)
      .map((t) => {
        const foe = state.enemies.find((e) => e.uid === t.uid)!;
        // A support that heals or raises the Lead undoes the damage aimed at the Lead: a player takes it out first.
        const focus = foe.role === 'defender' || foe.role === 'buffer' ? 2 : 1;
        return { uid: t.uid, dmg: t.damage!.final, ko: t.damage!.final >= foe.hp, share: (focus * t.damage!.final) / Math.max(1, foe.hp) };
      })
      .sort((a, b) => Number(b.ko) - Number(a.ko) || b.share - a.share);
    return options[0] ?? { uid: undefined, dmg: p.damage?.final ?? 0, ko: false, share: 0 };
  };
  const pick = (p: CardPlayability): CombatAction => {
    const stepBackTo = p.needsStepBackChoice ? healthiest(state, p.stepBackOptions) : undefined;
    const target = aim(p).uid;
    return {
      type: 'play-card',
      cardId: p.card.id,
      ...(stepBackTo === undefined ? {} : { stepBackTo }),
      ...(target === undefined ? {} : { targetUid: target }),
    };
  };
  const ko = damaging.find((p) => aim(p).ko);
  if (ko) return pick(ko);
  if (damaging.length > 0) {
    damaging.sort((a, b) => aim(b).dmg / Math.max(1, b.apCost) - aim(a).dmg / Math.max(1, a.apCost) || aim(b).dmg - aim(a).dmg);
    return pick(damaging[0]!);
  }
  // 5. Free utility (debuffs/buffs) before ending.
  const utility = plays.filter((p) => p.apCost === 0 && p.move.power === 0);
  if (utility.length > 0) return pick(utility[0]!);
  return { type: 'end-turn' };
}

export interface SimResult {
  state: CombatState;
  actions: CombatAction[];
  turns: number;
}

/** Play a whole combat with the policy. Guards against runaway loops. */
export function autoPlay(initial: CombatState, ctx: CombatCtx, opts: AutoPlayerOptions = DEFAULT_POLICY, maxActions = 600): SimResult {
  let state = initial;
  const actions: CombatAction[] = [];
  for (let i = 0; i < maxActions && state.outcome === 'in-progress'; i++) {
    const action = nextAction(state, ctx, opts) ?? { type: 'end-turn' as const };
    const r = combatReducer(state, action, ctx);
    if (r.rejected) {
      // The policy proposed something illegal — end the turn so the fight always progresses.
      const fallback = combatReducer(state, { type: 'end-turn' }, ctx);
      if (fallback.rejected) break;
      state = fallback.state;
      actions.push({ type: 'end-turn' });
      continue;
    }
    state = r.state;
    actions.push(action);
  }
  return { state, actions, turns: state.turn };
}
