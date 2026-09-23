import { createCombat } from '../combat/setup';
import type { CombatCtx } from '../combat/context';
import { buildOutcomeReport } from '../run/report';
import { createRun, defaultRunCtx, dojoPrice, runReducer, tutorListFor } from '../run/run';
import { RUN_START, gymById, gymTeamFor } from '../run/region';
import { applyBranch, autoPickMoves } from '../run/xp';
import { maxHpOf } from '../run/encounter';
import { PRICES, therapyPrice } from '../run/economy';
import { rollRegionModifierOffer } from '../run/regionModifiers';
import { allOutcomes, mysteryEvent } from '../run/events';
import type { MapNode, PartyMon, RunState, ShopSlot } from '../run/types';
import { typeMultiplier } from '../combat/typeChart';
import { autoPlay, type AutoPlayerOptions } from './autoPlayer';

// A whole-run stand-in for a decent player, used to answer the only question that matters for v0.2: can the
// Region actually be finished? It reuses the combat auto-player for the fights and adds the route decisions —
// where to go, who to field, when to throw a ball — so the pacing numbers cover the run, not just one fight.

export interface RunPolicy extends AutoPlayerOptions {
  /** Take the field nurse whenever the team is below this share of its effective Max HP (§2.9.1). */
  restBelow: number;
  /** Prefer a Wild node while the Box has fewer than this many Pokémon: you need a team. */
  recruitUntil: number;
  /** §2.9.4 — spend at a City's Dojo. The Dojo left the route on 2026-09-22; this is a City visit now. */
  takeDojo: boolean;
  /** §2.9.2 — take the travelling merchant when the route offers it, and spend at a City's shop. */
  takeShop: boolean;
  /** §2.10 — take a Mystery node. Off by default in the A/B runs so the gamble does not blur the signal. */
  takeMystery: boolean;
  /** Keep this much in reserve rather than spending down to zero: the Dojo is late and the Shop is not. */
  keepReserve: number;
  /**
   * §2.11.3 — take a Region Modifier at run start.
   *
   * On by default, and the reason is the lesson v0.5's fork already taught: a harness that skips a decision
   * the design expects every player to make measures a strictly worse player, and then the design gets
   * tuned against that player. It can be switched off to A/B the modifier itself.
   */
  takeRegionModifier: boolean;
}

export const DEFAULT_RUN_POLICY: RunPolicy = {
  retreatBelow: 0.3,
  healBelow: 0.45,
  tryCatch: true,
  restBelow: 0.7,
  recruitUntil: 6,
  takeDojo: true,
  takeShop: true,
  takeMystery: true,
  keepReserve: 0,
  takeRegionModifier: true,
};

/** One fight as the harness saw it — for balance work that needs to know *where* a run is won or lost. */
export interface FightTrace {
  region: number;
  layer: number;
  kind: MapNode['kind'];
  enemies: { species: string; level: number }[];
  /** `status` is what the Pokémon walked out of the fight carrying (§4.2.7.1), for the accent measure (§2.2). */
  team: { species: string; level: number; hpBefore: number; hpAfter: number; max: number; status: string | null }[];
  turns: number;
  outcome: string;
}

export interface RunSimResult {
  /** 'victory' is "cleared the Regions asked for" — the whole run when `regions` is 3. */
  outcome: 'victory' | 'defeat';
  /** §2.1 — Gyms beaten this run. */
  regionsCleared: number;
  /** How many layers deep the run got, 1-based. */
  depth: number;
  nodesCleared: number;
  catches: number;
  faints: number;
  turns: number;
  boxSize: number;
  topLevel: number;
  /** How many times something in the Box evolved (§6.2.4) — the run's reward loop, measured. */
  evolutions: number;
  state: RunState;
}

const healthShare = (run: RunState, content: CombatCtx['content']): number => {
  const active = run.activeUids.map((u) => run.box.find((m) => m.uid === u)).filter((m): m is PartyMon => !!m);
  if (!active.length) return 0;
  return active.reduce((a, m) => a + m.hp / maxHpOf(m, content), 0) / active.length;
};

/**
 * §5.9.2 / §2.5 — how well this Box answers a Gym, as an average type advantage across the Gym's team.
 *
 * This is the measurement the whole fork exists to make a player take, so a harness that ignores it measures
 * a strictly worse player than the design assumes — and then the *design* gets tuned against that player.
 */
function gymMatchup(run: RunState, content: CombatCtx['content'], gymId: string): number {
  const gym = gymById(gymId);
  const mine = run.box.filter((m) => m.hp > 0).map((m) => content.species(m.speciesId));
  if (!mine.length) return 0;
  const theirs = gymTeamFor(gym).map((m) => content.species(m.species).types);
  // Best offence any Box member has into the Gym, minus the worst beating the Gym can hand out.
  const offence = Math.max(...mine.flatMap((s) => s.types.map((t) => Math.max(...theirs.map((x) => typeMultiplier(t, x))))));
  const defence = Math.max(...theirs.flatMap((x) => x.map((t) => Math.max(...mine.map((s) => typeMultiplier(t, s.types))))));
  return offence - defence;
}

/** Route policy: rest when hurt, recruit while the team is thin, otherwise take the richest fight. */
function chooseNode(run: RunState, content: CombatCtx['content'], policy: RunPolicy): MapNode {
  const options = run.reachable.map((id) => run.map.nodes[id]!);
  const gym = options.find((n) => n.kind === 'gym');
  if (gym) return gym;
  // §2.8.1 — the Elite takes its whole layer, so there is nothing to weigh it against.
  const elite = options.find((n) => n.kind === 'elite' && n.lane === undefined);
  if (elite) return elite;

  // §2.5 — THE FORK. Whichever lane the next step commits to is the Gym you will fight, and the lanes never
  // rejoin, so this is the one routing decision in the run that cannot be walked back. Take the lane whose
  // Gym the Box answers best; only if that is a tie does anything else about the node matter.
  const lanes = new Set(options.map((n) => n.lane).filter((l): l is number => l !== undefined));
  if (lanes.size > 1) {
    const best = [...lanes].sort((a, b) => gymMatchup(run, content, run.map.gyms[b]!) - gymMatchup(run, content, run.map.gyms[a]!))[0]!;
    const inLane = options.filter((n) => n.lane === best);
    if (inLane.length) return chooseAmong(run, content, policy, inLane);
  }

  return chooseAmong(run, content, policy, options);
}

/** The ordinary "which of these" preference, once the lane question is settled. */
function chooseAmong(run: RunState, content: CombatCtx['content'], policy: RunPolicy, options: MapNode[]): MapNode {
  // §2.8.2 — an Elite Wild is a boss fight for a boss reward. Worth it with a healthy team, not otherwise.
  const eliteWild = options.find((n) => n.kind === 'elite-wild');
  if (eliteWild && healthShare(run, content) > 0.8 && run.box.length >= 3) return eliteWild;
  // An extra Elite Trainer in a lane is a spike; take it only when clearly ahead of it.
  const laneElite = options.find((n) => n.kind === 'elite');
  if (laneElite && healthShare(run, content) > 0.85) return laneElite;

  // §2.9.1 — the nurse, when hurt or carrying a status into the next fight (§4.2.7.1).
  const hurt = healthShare(run, content) < policy.restBelow || run.box.some((m) => m.hp > 0 && (m.status || m.confusionTurns > 0));
  const aid = options.find((n) => n.kind === 'aid');
  if (hurt && aid) return aid;

  // §2.9.2 — the merchant is worth a fight's worth of XP only if you can buy its wildcard. Below that it is
  // a vending machine for Potions, and Potions are not worth a node.
  const merchant = options.find((n) => n.kind === 'merchant');
  if (merchant && policy.takeShop && run.money >= PRICES.relic.common) return merchant;

  // §2.10 — a Mystery is taken when the team is healthy enough to absorb a bad one.
  const mystery = options.find((n) => n.kind === 'mystery');
  if (mystery && policy.takeMystery && healthShare(run, content) > 0.75) return mystery;

  const wild = options.find((n) => n.kind === 'wild');
  // A thin Box needs bodies, and a hurt team wants the cheaper fight: one wild Pokémon, not a trainer's two.
  if (wild && (run.box.length < policy.recruitUntil || healthShare(run, content) < 0.85)) return wild;

  // Otherwise take the trainer: more XP, and the route is short.
  const trainer = options.find((n) => n.kind === 'trainer');
  return trainer ?? wild ?? options.find((n) => n.kind !== 'aid') ?? options[0]!;
}

/**
 * §6.3.3 — the harness has to pick an archetype like a player would, or the branch system never gets
 * exercised by the balance numbers.
 *
 * It scores the **resulting kit**, not the payload. Scoring the payload was tried first and measured badly:
 * raw power gain always favours Vanguard, so every line in the table evolved Melee and the numbers described
 * a game nobody would play. Applying the branch to a clone and valuing the four cards it would actually hold
 * — Ranged discounted the way the sim discounts it, utility worth something, a Melee-only hand heavily
 * penalised (§6.3.6.5) — picks differently per species, which is the point of having archetypes at all.
 */
function chooseBranch(mon: PartyMon, branchIds: readonly string[], content: CombatCtx['content']): string {
  const value = (id: string): number => {
    const clone: PartyMon = { ...mon, pool: [...mon.pool], moveIds: [...mon.moveIds] };
    applyBranch(clone, id, content);
    const kit = autoPickMoves(clone.pool, content).map((m) => content.move(m));
    let score = 0;
    for (const move of kit) {
      score += move.power > 0 ? move.power * (move.range === 'ranged' ? 0.75 : 1) : 22;
      if (move.targeting === 'cleave') score += 15;
      if (move.effects.some((e) => e.kind === 'status')) score += 8;
    }
    if (!kit.some((m) => m.range === 'ranged')) score -= 60;
    if (kit.filter((m) => m.power > 0).length < 2) score -= 40;
    return score;
  };
  return [...branchIds].sort((a, b) => value(b) - value(a))[0]!;
}

/**
 * Field three Pokémon for a specific node. A player does not bring the healthiest three to a Rock Gym; they
 * bring the ones whose types work, which is the whole point of a Box (§2.3). Score = matchup, then condition.
 */
function bestTeam(run: RunState, content: CombatCtx['content'], against: MapNode | null): string[] {
  const enemyTypes = (against?.preview.speciesIds ?? []).map((id) => content.species(id).types);

  const matchup = (speciesId: string): number => {
    if (!enemyTypes.length) return 0;
    const mine = content.species(speciesId);
    let score = 0;
    for (const theirs of enemyTypes) {
      // What my kit can do to them, minus what they can do to me.
      const offence = Math.max(...mine.types.map((t) => typeMultiplier(t, theirs)));
      const defence = Math.max(...theirs.map((t) => typeMultiplier(t, mine.types)));
      score += offence - defence;
    }
    return score / enemyTypes.length;
  };

  return [...run.box]
    .filter((m) => m.hp > 0)
    .map((m) => ({ m, score: matchup(m.speciesId), health: m.hp / maxHpOf(m, content) }))
    .sort((a, b) => b.score - a.score || b.health - a.health || b.m.level - a.m.level)
    .slice(0, 3)
    .map((x) => x.m.uid);
}

/** What one tutor move is worth to this Pokémon: its own damage, plus a bonus for a type it does not have. */
function tutorValue(mon: PartyMon, moveId: string, content: CombatCtx['content']): number {
  const move = content.move(moveId);
  const have = new Set(mon.pool.map((m) => content.move(m).type));
  let score = move.power > 0 ? move.power * (move.range === 'ranged' ? 0.75 : 1) : 22;
  if (!have.has(move.type)) score += 35;
  if (move.range === 'ranged' && !mon.pool.some((m) => content.move(m).range === 'ranged')) score += 40;
  return score;
}

/**
 * §2.9.4 — spend the visit. v0.3 rationed this to one free service; v0.4 charges 150 ₽ a move and sells as
 * many as you can pay for, so the harness buys until the wallet says stop. Buying one and leaving was how the
 * first v0.4 measurement made the Dojo look like a losing trade — it was comparing a whole fight against a
 * single card.
 *
 * It buys across the **Active Team**, best value first. A tutor move on the Lead is worth most, but a second
 * card on the same Pokémon is worth much less than the first card on the next one, and that is what the
 * per-Pokémon value function already says.
 */
function visitDojo(get: () => RunState, content: CombatCtx['content'], policy: RunPolicy, step: (a: Parameters<typeof runReducer>[1]) => void): void {
  // The state is read through `get` on purpose: `step` replaces it, so a captured snapshot would be one
  // action stale by the time the re-pick needs the widened pool.
  for (let bought = 0; bought < 6; bought++) {
    const run = get();
    if (run.money - dojoPrice(run, content, 'move') < policy.keepReserve) break;

    // A player at a tutor buys the thing their deck cannot already do, so coverage outranks raw power: a
    // Charmeleon holding four Fire and Normal cards takes Brick Break over Crunch, and that one habit is
    // worth several points of win rate to the Fire start against a Rock Gym.
    const offers = run.activeUids
      .map((uid) => run.box.find((m) => m.uid === uid))
      .filter((m): m is PartyMon => !!m)
      .flatMap((mon) =>
        tutorListFor(run, mon, content)
          .filter((t) => !mon.pool.includes(t))
          .map((moveId) => ({ mon, moveId, value: tutorValue(mon, moveId, content) })),
      )
      .sort((a, b) => b.value - a.value);

    const best = offers[0];
    if (!best) break;
    step({ type: 'teach-move', uid: best.mon.uid, moveId: best.moveId });
    const after = get().box.find((m) => m.uid === best.mon.uid)!;
    if (after.pool.length > 4) step({ type: 'set-moves', uid: after.uid, moveIds: autoPickMoves(after.pool, content) });
  }
  step({ type: 'leave-dojo' });
}

/**
 * §2.9.2 — spend a Shop visit. The order is the order a decent player buys in: a relic first, because it is
 * the only run-long purchase on the shelf; then a Held Item for whoever is not carrying one; then a TM the
 * team can actually use; then Poké Balls and consumables with whatever is left.
 *
 * It does not re-roll. A re-roll is 25 ₽ against a 150 ₽ relic and the harness has no way to judge whether
 * the shelf it is looking at is a *bad* shelf — measuring an agent that gambles on that would measure the
 * gamble, not the shop.
 */
const SHOP_ORDER: ShopSlot['kind'][] = ['relic', 'held-item', 'tm', 'ball', 'consumable'];

function visitShop(get: () => RunState, content: CombatCtx['content'], policy: RunPolicy, step: (a: Parameters<typeof runReducer>[1]) => void): void {
  for (const kind of SHOP_ORDER) {
    // Re-read every pass: buying changes both the wallet and the sold flags.
    for (let guard = 0; guard < 10; guard++) {
      const run = get();
      const stock = run.pendingShop;
      if (!stock) break;
      const index = stock.slots.findIndex((s) => !s.sold && s.kind === kind && run.money - s.price >= policy.keepReserve);
      if (index < 0) break;
      // A Held Item nobody can wear, or a TM nobody can learn, is a decoration. The Shop curates the TM slot
      // already (§2.9.2); the Held Item slot does not, so check it here.
      if (kind === 'held-item') {
        const item = content.heldItem(stock.slots[index]!.id);
        const wearer = run.box.find((m) => !m.heldItem && (!item.speciesLock || item.speciesLock === m.speciesId));
        if (!wearer) break;
      }
      step({ type: 'buy', index });
    }
  }
  step({ type: 'leave-shop' });
}

/**
 * §7.4.1 — put bagged items on Pokémon that are not holding one. A held item in the bag is worth nothing,
 * and forgetting to equip is the single easiest way for a harness to under-report the system it is measuring.
 */
function equipFromBag(get: () => RunState, content: CombatCtx['content'], step: (a: Parameters<typeof runReducer>[1]) => void): void {
  for (let guard = 0; guard < 8; guard++) {
    const run = get();
    if (!run.bag.length) return;
    // Prefer the Active Team, best first: an item on the bench does nothing this node.
    const order = [...run.activeUids, ...run.box.map((m) => m.uid)];
    const pair = run.bag
      .map((itemId) => {
        const item = content.heldItem(itemId);
        const uid = order.find((u) => {
          const mon = run.box.find((m) => m.uid === u);
          return mon && !mon.heldItem && (!item.speciesLock || item.speciesLock === mon.speciesId);
        });
        return uid ? { itemId, uid } : null;
      })
      .find((x): x is { itemId: string; uid: string } => !!x);
    if (!pair) return;
    step({ type: 'equip-item', uid: pair.uid, itemId: pair.itemId });
  }
}

/**
 * §2.10 — answer a Mystery Event. Scores the stated outcomes, which is exactly what the screen asks a player
 * to do: money is money, a relic is worth more than money, HP is worth more when you are short of it.
 */
function answerEvent(run: RunState, policy: RunPolicy): number {
  const event = mysteryEvent(run.pendingEvent!);
  const hurt = 1 - run.box.reduce((a, m) => a + (m.hp > 0 ? 1 : 0), 0) / Math.max(1, run.box.length);
  const score = (choice: (typeof event.choices)[number]): number => {
    if (choice.cost && run.money - choice.cost < policy.keepReserve) return -Infinity;
    let n = -(choice.cost ?? 0) / 100;
    for (const o of allOutcomes(choice)) {
      switch (o.kind) {
        case 'money': n += o.amount / 100; break;
        case 'balls': n += o.amount * 0.4; break;
        case 'consumables': n += o.ids.length * 0.5; break;
        // A relic is run-long, so it beats its own cash price by a wide margin.
        case 'relic': n += o.rarity === 'uncommon' ? 6 : 4; break;
        case 'held-item': n += 4; break;
        case 'heal-box': n += (o.percent / 100) * (2 + hurt * 6); break;
        case 'hurt-box': n -= (o.percent / 100) * 4; break;
        case 'clear-trauma': n += 1 + Math.max(...run.box.map((m) => m.traumaStacks), 0); break;
        case 'add-trauma': n -= 2 * o.stacks; break;
        // A gamble's branches are already counted by allOutcomes; discount the whole thing for variance.
        case 'gamble': n -= 1 - o.chance; break;
        case 'nothing': break;
      }
    }
    return n;
  };
  let best = 0;
  let bestScore = -Infinity;
  event.choices.forEach((c, i) => {
    const s = score(c);
    if (s > bestScore) { bestScore = s; best = i; }
  });
  return best;
}

/**
 * §2.11 — spend a City visit the way the route's services used to be spent: heal and treat Trauma at the
 * Center, buy at the shop, sculpt at the Dojo, then leave by the gate with the first modifier on offer (the
 * same "no preference" rule as the Legendary pick).
 */
function visitCity(get: () => RunState, content: CombatCtx['content'], policy: RunPolicy, step: (a: Parameters<typeof runReducer>[1]) => void): void {
  step({ type: 'enter-building', building: 'center' });
  for (let bought = 0; bought < 6; bought++) {
    const run = get();
    const worst = [...run.box].filter((m) => m.traumaStacks > 0).sort((a, b) => b.traumaStacks - a.traumaStacks)[0];
    if (!worst || run.money - therapyPrice(worst) < policy.keepReserve) break;
    step({ type: 'use-therapy', uid: worst.uid });
  }
  step({ type: 'leave-center' });
  if (policy.takeShop) {
    step({ type: 'enter-building', building: 'mart' });
    visitShop(get, content, policy, step);
    equipFromBag(get, content, step);
  }
  if (policy.takeDojo && get().box.length >= 2) {
    step({ type: 'enter-building', building: 'dojo' });
    visitDojo(get, content, policy, step);
  }
  step({ type: 'depart-city', modifierId: get().city!.reflection[0]! });
}

/**
 * Play a run. `regions` is how many Gyms to beat before calling it: 1 (the default) measures Region 1's pacing
 * exactly as it was measured before the run continued past it; 3 plays the whole run, Cities included.
 */
export function autoRun(seed: number, starterId: string, ctx: CombatCtx, policy: RunPolicy = DEFAULT_RUN_POLICY, regions = 1, trace?: (fight: FightTrace) => void): RunSimResult {
  const runCtx = defaultRunCtx(ctx.content);
  // §2.11.3 — the offer is weighted, and the harness takes the first of the three exactly as it takes the
  // first Legendary: modelling a preference here would add variance without adding information.
  const regionPick = policy.takeRegionModifier ? rollRegionModifierOffer(seed, ctx.content)[0] : undefined;
  let run = createRun(starterId, seed, runCtx, 0, [], undefined, regionPick);
  let turns = 0;
  let evolutions = 0;

  const step = (action: Parameters<typeof runReducer>[1]) => {
    const r = runReducer(run, action, runCtx);
    if (r.rejected) throw new Error(`auto-run rejected ${action.type}: ${r.rejected}`);
    run = r.state;
  };

  // The phase is read through a function so TypeScript does not narrow it across the reducer's mutations.
  const phase = () => run.phase;

  let regionsCleared = 0;
  // One iteration per node; the hard cap is a runaway guard, not a rule.
  for (let node = 0; node < 40 * regions && run.outcome === 'in-progress'; node++) {
    // §2.11 — a Gym is behind us. Either that is as far as this measurement goes, or spend the City and walk on.
    if (phase() === 'city') {
      regionsCleared = run.regionIndex + 1;
      if (regionsCleared >= regions) break;
      visitCity(() => run, ctx.content, policy, step);
      continue;
    }
    if (phase() !== 'map') break;

    const target = chooseNode(run, ctx.content, policy);
    const team = bestTeam(run, ctx.content, target);
    if (team.length === 0) break;
    step({ type: 'set-active', uids: team });
    step({ type: 'enter-node', nodeId: target.id });
    step({ type: 'begin-combat' });

    // §2.9.2 — the merchant's cart.
    if (phase() === 'shop') {
      visitShop(() => run, ctx.content, policy, step);
      equipFromBag(() => run, ctx.content, step);
      continue;
    }
    // §2.9.1 — the nurse healed on arrival; there is nothing to decide.
    if (phase() === 'aid') {
      step({ type: 'leave-aid' });
      continue;
    }
    if (phase() === 'event') {
      step({ type: 'choose-event', option: answerEvent(run, policy) });
      step({ type: 'leave-event' });
      // An event can hand over a Pokémon-shaped reward that evolves something on the spot (§6.3.1).
      while (phase() === 'evolution') {
        const pending = run.pendingEvolutions[0]!;
        const mon = run.box.find((m) => m.uid === pending.uid)!;
        step({ type: 'choose-branch', uid: pending.uid, branchId: chooseBranch(mon, pending.branchIds, ctx.content) });
        evolutions += 1;
      }
      equipFromBag(() => run, ctx.content, step);
      continue;
    }
    if (!run.pendingScenario) continue;

    const combat = autoPlay(createCombat(run.pendingScenario, ctx, run.pendingScenario.seed), ctx, policy);
    turns += combat.turns;
    const scenario = run.pendingScenario;
    const before = run.activeUids.map((uid) => run.box.find((m) => m.uid === uid)!).map((m) => ({ uid: m.uid, hp: m.hp }));
    step({ type: 'finish-combat', report: buildOutcomeReport(combat.state, run) });
    if (trace) {
      const node = run.map.nodes[run.pendingNodeId ?? ''] ?? run.map.nodes[run.position ?? ''];
      trace({
        region: run.regionIndex,
        layer: node?.layer ?? -1,
        kind: node?.kind ?? 'wild',
        enemies: scenario.enemies.map((e) => ({ species: e.species, level: e.level })),
        team: before.map((b) => {
          const m = run.box.find((x) => x.uid === b.uid);
          return { species: m?.speciesId ?? '?', level: m?.level ?? 0, hpBefore: b.hp, hpAfter: m?.hp ?? 0, max: m ? maxHpOf(m, ctx.content) : 0, status: m?.status?.kind ?? null };
        }),
        turns: combat.turns,
        outcome: String(run.outcome),
      });
    }
    if (run.outcome !== 'in-progress') break;

    // §6.4.1 — a TM that dropped is worth nothing in the bag; teach it to whoever can take it.
    const tm = run.pendingReward?.tm ?? null;
    step({ type: 'claim-reward' });

    // §6.3.3 — work the evolution queue, one branch pick per screen, then re-pick the active 4 from the
    // widened pool the way a player would with the Move Manager's Auto button.
    while (phase() === 'evolution') {
      const pending = run.pendingEvolutions[0]!;
      const mon = run.box.find((m) => m.uid === pending.uid)!;
      step({ type: 'choose-branch', uid: pending.uid, branchId: chooseBranch(mon, pending.branchIds, ctx.content) });
      evolutions += 1;
      const after = run.box.find((m) => m.uid === pending.uid)!;
      // A Gym win can evolve something and end the run in the same breath; there is nothing left to sculpt.
      if (run.outcome === 'in-progress' && after.pool.length > 4) {
        step({ type: 'set-moves', uid: after.uid, moveIds: autoPickMoves(after.pool, ctx.content) });
      }
    }

    // §7.3.7 — a Gym victory opens the Legendary 1-of-3 and the run does not end until it is answered.
    //
    // The harness takes the first on offer rather than modelling a preference. Modelling one would add
    // variance to the measurement without adding information until the Regions after it have their own
    // content to be good or bad against (v0.7.3).
    if (phase() === 'legendary') {
      step({ type: 'pick-legendary', relicId: run.pendingLegendary?.[0] ?? null });
    }

    // §6.7.2 — a decent player opens the Move Manager when a level-up leaves a move in the pool, so the
    // harness does too. Without this it measures a player who never touches the screen, which is a different
    // (and much worse) question than "can the Region be finished".
    if (run.outcome === 'in-progress') {
      for (const mon of run.box) {
        if (mon.pool.length <= 4) continue;
        const want = autoPickMoves(mon.pool, ctx.content);
        if (want.join() !== mon.moveIds.join()) step({ type: 'set-moves', uid: mon.uid, moveIds: want });
      }
    }

    // §7.4.6 — a Held Item that dropped goes on someone before the next node, not into a bag nobody reads.
    if (run.outcome === 'in-progress' && phase() === 'map') equipFromBag(() => run, ctx.content, step);

    // §2.3.1 — a full Box asks who leaves. Release the weakest thing that is not the newcomer.
    if (phase() === 'swap-or-skip') {
      const weakest = [...run.box].sort((a, b) => a.level - b.level)[0]!;
      const better = run.pendingRecruit && run.pendingRecruit.level > weakest.level;
      step({ type: 'resolve-recruit', releaseUid: better ? weakest.uid : null });
    }

    if (tm && phase() === 'map') {
      const def = ctx.content.tm(tm);
      const taker = run.box.find((m) => def.compatibleSpecies.includes(m.speciesId) && !m.pool.includes(def.move));
      if (taker) {
        step({ type: 'use-tm', uid: taker.uid, tmId: tm });
        step({ type: 'set-moves', uid: taker.uid, moveIds: autoPickMoves(taker.pool.concat(def.move), ctx.content) });
      }
    }
  }

  if (phase() === 'city') regionsCleared = Math.max(regionsCleared, run.regionIndex + 1);
  if (run.outcome === 'victory') regionsCleared = run.regionIndex + 1;
  const depth = run.position ? run.map.nodes[run.position]!.layer + 1 : 0;
  return {
    outcome: run.outcome === 'victory' || regionsCleared >= regions ? 'victory' : 'defeat',
    regionsCleared,
    depth,
    nodesCleared: run.stats.nodesCleared,
    catches: run.stats.catches,
    faints: run.stats.faints,
    turns,
    boxSize: run.box.length,
    evolutions,
    topLevel: Math.max(...run.box.map((m) => m.level), 0),
    state: run,
  };
}

export const RUN_BOX_CAPACITY = RUN_START.boxCapacity;

/** What one climb of the Challenge Ring came to. */
export interface RingClimb {
  rungs: number;
  won: number;
}

/**
 * §2.9.4.1 — climb a City's Challenge Ring the way a player committed to it would, from a run standing in that
 * City: heal at the Center first, field the three healthiest, and climb every rung (never cashing out), re-
 * picking the three healthiest between rungs since nothing heals there. It is the measurement behind the
 * Ring's clear-rate bands, so it pays the fee out of thin air rather than skip a poor run — the question is how
 * hard the fights are, not how often a run can afford them.
 */
export function playRing(start: RunState, ctx: CombatCtx, policy: RunPolicy = DEFAULT_RUN_POLICY): RingClimb | null {
  const runCtx = defaultRunCtx(ctx.content);
  let run = start;
  const step = (action: Parameters<typeof runReducer>[1]) => {
    const r = runReducer(run, action, runCtx);
    if (r.rejected) throw new Error(`ring rejected ${action.type}: ${r.rejected}`);
    run = r.state;
  };
  if (run.phase !== 'city' || !run.city?.ring) return null;
  const healthiest = () =>
    [...run.box].filter((m) => m.hp > 0).sort((a, b) => b.level - a.level || b.hp - a.hp).slice(0, 3).map((m) => m.uid);
  step({ type: 'enter-building', building: 'center' });
  step({ type: 'leave-center' });
  step({ type: 'set-active', uids: healthiest() });
  step({ type: 'enter-building', building: 'dojo' });
  run = { ...run, money: Math.max(run.money, run.city!.ring!.fee) };
  step({ type: 'enter-ring' });
  const rungs = run.city!.ring!.rungs.length;
  let won = 0;
  while (run.phase === 'ring') {
    const team = healthiest();
    if (!team.length) break;
    step({ type: 'set-active', uids: team });
    step({ type: 'ring-fight' });
    const combat = autoPlay(createCombat(run.pendingScenario!, ctx, run.pendingScenario!.seed), ctx, policy);
    const before = run.city!.ring!.cleared;
    step({ type: 'finish-combat', report: buildOutcomeReport(combat.state, run) });
    if ((run.city?.ring?.cleared ?? before) > before) won += 1;
  }
  if (run.phase === 'relic-pick') step({ type: 'ring-pick', relicId: run.city!.ring!.pick![0] ?? null });
  return { rungs, won };
}
