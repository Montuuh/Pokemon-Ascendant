import type { ContentRegistry, HeldItemDef, HookSource, MoveDef } from '../content/defs';
import type { PokemonType, Stat } from '../types';
import type { Combatant, CombatState } from './state';

// §7.3 / §7.4 — relics and held items as pure queries over (state, content), exactly like abilities.ts.
//
// The two systems share one hook vocabulary (§7.7) and differ only in scope: a relic belongs to the run and
// applies to the whole party, a held item belongs to one Pokémon and applies only to it. Keeping them in one
// file is what stops that distinction drifting — every query below decides scope in one visible place.
//
// Nothing here mutates. The callers in damageFlow/turn/preview do that.

/**
 * §7.3.6 — everything the run carries that speaks §7.7's hook vocabulary: relics **and** Badges.
 *
 * They are one list here on purpose. The canon puts relics, held items, Badges and fields in the same
 * sentence as independent terms of the same formula, so giving Badges their own copy of every hook site
 * below would be two implementations of one rule — and the second one would drift.
 *
 * What is *not* shared is where they come from: a relic is picked up and a Badge is won from a Gym. That
 * distinction lives in the run layer, which is the only place it means anything.
 */
const relicsOf = (state: CombatState, content: ContentRegistry): HookSource[] => {
  const out: HookSource[] = [];
  for (const id of state.player.relics) {
    const r = content.relic(id);
    // A `pending` relic is authored but inert; §7.8's honest-degradation rule says it is shown and never
    // resolved, and this is where "never resolved" is actually enforced.
    if (r.pending) continue;
    out.push({ id: r.id, hook: r.hook, params: r.params });
    // The second clause, flattened, so every hook site below sees one flat list (§7.3.5, §7.3.7).
    if (r.also) out.push({ id: r.id, hook: r.also.hook, params: r.also.params });
  }
  for (const id of state.player.badges) out.push(content.badge(id));
  // §2.11.3 — and the Region Modifier, the third system on this vocabulary. Same `pending` rule as relics.
  if (state.player.regionModifier) {
    const m = content.regionModifier(state.player.regionModifier);
    if (!m.pending) {
      out.push({ id: m.id, hook: m.hook, params: m.params });
      if (m.also) out.push({ id: m.id, hook: m.also.hook, params: m.also.params });
    }
  }
  return out;
};

const itemOf = (c: Combatant, content: ContentRegistry): HeldItemDef | null =>
  c.heldItemId ? content.heldItem(c.heldItemId) : null;

const num = (v: unknown, fallback: number): number => (typeof v === 'number' ? v : fallback);

/** Is this Pokémon on the player's side? Relics never help the enemy. */
const isPlayers = (state: CombatState, c: Combatant): boolean => state.player.team.some((m) => m.uid === c.uid);

// ── damage dealt ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * §7.3.6 — type-boost relics, held items, badges and fields are each **independent multiplicative terms**.
 * They multiply; they do not add. That is why this returns a product rather than a sum of percentages.
 */
export function itemAttackMultiplier(
  state: CombatState,
  attacker: Combatant,
  move: MoveDef,
  content: ContentRegistry,
  /** §7.3.7 — what the Legendary tier narrows on: the type roll, and who is holding the card. */
  opts: { typeMultiplier?: number } = {},
): number {
  let m = 1;

  if (isPlayers(state, attacker)) {
    for (const relic of relicsOf(state, content)) {
      if (relic.hook !== 'damage-dealt') continue;
      const p = relic.params ?? {};
      if (p.type && p.type !== move.type) continue;
      // §2.11.3 Type Affinity — the type is not written on the row; it is whatever the team leans on. The
      // offer screen tells the player which one before they take it, so this is a read, not a surprise.
      if (p.typeFromTeam && move.type !== teamPrimaryType(state)) continue;
      if (p.belowHp && attacker.hp / attacker.maxHp >= num(p.belowHp, 0)) continue;
      if (p.atFullHp && attacker.hp < attacker.maxHp) continue;
      if (p.leadOnly && state.player.team[state.player.leadIndex]?.uid !== attacker.uid) continue;
      // §5.10.2 Volcano Badge — the heavy cards only, by what the card is printed at, not what it cost today.
      if (p.minApCost && move.apCost < num(p.minApCost, 0)) continue;
      // §5.10.3 Fist Badge — one range only.
      if (p.range && p.range !== move.range) continue;
      // §7.3.7 Type Mastery — a further term on top of the type roll, not a replacement for it.
      if (p.superEffective && (opts.typeMultiplier ?? 1) <= 1) continue;
      // §7.3.7 Evolution's Edge — the reward for having committed to a branch (Pillar 4).
      if (p.fullyEvolved && content.species(attacker.speciesId).evolvesTo.length > 0) continue;
      if (p.perDefeat) {
        // §7.3.5 Champion's Crest — this Pokémon's own record, capped. A team-wide counter would make one
        // sweeper's work pay out on everybody, which is the opposite of what the relic is for.
        const grown = Math.min(num(p.cap, 0), attacker.defeats * num(p.perDefeat, 0));
        m *= 1 + grown;
        continue;
      }
      // §7.3.5 Soul Link — the linked pair hit harder while both of them are standing in this fight.
      if (p.soulLink) {
        if (!attacker.soulLinked) continue;
        if (!state.player.team.some((x) => x.uid !== attacker.uid && x.soulLinked && x.hp > 0)) continue;
      }
      if (p.sharedType) {
        // §7.3.4 Type Resonance — +10 % for each *other* Active member sharing the attacker's primary type.
        const primary = attacker.types[0];
        const sharing = state.player.team.filter((x) => x.hp > 0 && x.uid !== attacker.uid && x.types[0] === primary).length;
        if (sharing === 0 || move.type !== primary) continue;
        m *= num(p.multiplier, 1) ** sharing;
        continue;
      }
      m *= num(p.multiplier, 1);
    }
  }

  // §7.4 — the wearer's own item, and the Lead's aura for everybody else (§6.5.4).
  const own = itemOf(attacker, content);
  if (own && own.hook === 'damage-dealt') {
    const p = own.params ?? {};
    const typeOk = !p.type || p.type === move.type;
    const rangeOk = !p.range || p.range === move.range;
    // §8.5.3 Light Ball — Pikachu only. A Raichu still holding it has evolved out of the bonus (Pillar 4's price).
    const speciesOk = !own.speciesLock || own.speciesLock === attacker.speciesId;
    if (typeOk && rangeOk && speciesOk) m *= num(p.multiplier, 1);
  }
  if (own && own.hook === 'choice-lock' && own.params?.range === move.range) m *= num(own.params.multiplier, 1);

  m *= leadAuraMultiplier(state, attacker, move, content);
  return m;
}

/**
 * §6.5.4 / §7.4.3 — a Type Plate on the **Lead** boosts that type for every *benched* Pokémon, not the Lead
 * itself. It is an opt-in build pillar precisely because it rewards the swap decision rather than the hitter.
 */
function leadAuraMultiplier(state: CombatState, attacker: Combatant, move: MoveDef, content: ContentRegistry): number {
  if (!isPlayers(state, attacker)) return 1;
  const leadMon = state.player.team[state.player.leadIndex];
  if (!leadMon || leadMon.uid === attacker.uid || leadMon.hp <= 0) return 1;
  const plate = itemOf(leadMon, content);
  if (!plate?.grantsLeadAura || plate.grantsLeadAura !== move.type) return 1;
  return 1 + num(plate.params?.percent, 5) / 100;
}

// ── damage taken ──────────────────────────────────────────────────────────────────────────────────────────

/** Relic and item reductions on incoming damage. `firstHit` charges are spent by the caller, not here. */
export function itemDefenceMultiplier(
  state: CombatState,
  target: Combatant,
  content: ContentRegistry,
  opts: { cleave: boolean; isLead: boolean; fullyEvolved: boolean; firstHitAvailable: boolean },
): number {
  let m = 1;
  if (isPlayers(state, target)) {
    for (const relic of relicsOf(state, content)) {
      if (relic.hook !== 'damage-taken') continue;
      const p = relic.params ?? {};
      if (p.cleaveOnly && !opts.cleave) continue;
      if (p.leadOnly && !opts.isLead) continue;
      if (p.firstHit && !opts.firstHitAvailable) continue;
      m *= num(p.multiplier, 1);
    }
  }
  const own = itemOf(target, content);
  if (own && own.hook === 'damage-taken') {
    const p = own.params ?? {};
    // Eviolite is the mechanical argument for *not* evolving — a small counterweight to Pillar 4 (§7.4.4).
    if (!p.notFullyEvolved || !opts.fullyEvolved) m *= num(p.multiplier, 1);
  }
  return m;
}

/**
 * §5.10.1 Boulder Badge — a **flat** reduction on what the Lead takes, applied after the multipliers.
 *
 * Flat and multiplicative are not interchangeable and the Badge is deliberately the flat one: −1 is a third
 * of an early hit and a rounding error by the Gym, which is exactly the shape §5.10.1 asks for ("matters
 * enormously early and gracefully stops mattering late"). A −5 % would have done the opposite.
 */
export function itemFlatReduction(state: CombatState, target: Combatant, content: ContentRegistry, isLead: boolean, cleave = false): number {
  if (!isPlayers(state, target)) return 0;
  let flat = 0;
  for (const src of relicsOf(state, content)) {
    if (src.hook !== 'damage-taken') continue;
    const p = src.params ?? {};
    if (p.leadOnly && !isLead) continue;
    // §2.11.3 Iron Skin — flat, and only against the attack that hits everybody at once.
    if (p.cleaveOnly && !cleave) continue;
    flat += num(p.flat, 0);
  }
  return flat;
}

/**
 * §2.11.3 Type Affinity — the type the Active Team actually leans on: the most common primary type, with a
 * tie broken by the Lead's. A modifier that boosted "a" type would be a coin flip; this is the team's.
 */
export function teamPrimaryType(state: CombatState): PokemonType | null {
  const counts = new Map<PokemonType, number>();
  for (const c of state.player.team) {
    const t = c.types[0];
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const leadType = state.player.team[state.player.leadIndex]?.types[0] ?? null;
  let best: PokemonType | null = null;
  let bestN = 0;
  for (const [t, n] of counts) {
    if (n > bestN || (n === bestN && t === leadType)) {
      best = t;
      bestN = n;
    }
  }
  return best;
}

/**
 * §5.10.1 Cascade Badge — cards drawn the moment a **manual** swap resolves.
 *
 * Not at turn start: the point is that the AP you spent swapping comes back as a card, so the draw has to
 * land while the turn is still yours to spend. Step-Forward and Step-Backward do not pay it — they are free
 * swaps and this rewards the one you chose to buy (§3.3.1 vs §3.3.2).
 */
export function swapDrawBonus(state: CombatState, content: ContentRegistry): number {
  let cards = 0;
  for (const src of relicsOf(state, content)) {
    if (src.hook === 'draw' && src.params?.onManualSwap) cards += num(src.params.cards, 0);
  }
  return cards;
}

/** §2.11.3 Mass Mobilization — cards drawn when a Step-Forward or Step-Backward actually moves someone. */
export function stepDrawBonus(state: CombatState, content: ContentRegistry): number {
  let cards = 0;
  for (const src of relicsOf(state, content)) if (src.hook === 'draw' && src.params?.onStep) cards += num(src.params.cards, 0);
  return cards;
}

/**
 * §5.10.1 Hive Badge — how many free copies a deck cycle is worth, and how often.
 *
 * Returns `{ copies, chance }` rather than rolling here, because nothing in this file may touch the RNG:
 * these are pure queries and the cursor belongs to the caller (§10.8.6 — a resumed run has to replay).
 */
export function reshuffleCopies(state: CombatState, content: ContentRegistry): { copies: number; chance: number } {
  let copies = 0;
  let chance = 0;
  for (const src of relicsOf(state, content)) {
    if (src.hook !== 'draw' || !src.params?.onReshuffle || !src.params?.copies) continue;
    copies += num(src.params.copies, 0);
    chance = Math.max(chance, num(src.params.chance, 1));
  }
  return { copies, chance };
}

/** Does any held relic have an unspent first-hit charge this combat? */
export const firstHitRelic = (state: CombatState, content: ContentRegistry): HookSource | null =>
  relicsOf(state, content).find((r) => r.hook === 'damage-taken' && r.params?.firstHit && !state.player.spent.includes(r.id)) ?? null;

// ── the card economy ──────────────────────────────────────────────────────────────────────────────────────

/**
 * §7.3.4 — AP changes from relics and the wearer's item. Returns a delta, which the caller adds to the base
 * cost before flooring at zero.
 *
 * Choice Specs and Choice Band are the interesting ones: the *first* move of their range each turn is free
 * and every later one costs more, which turns "what do I open with" into a real question rather than a
 * flat discount.
 */
export function itemApDelta(state: CombatState, owner: Combatant, move: MoveDef, content: ContentRegistry): number {
  let delta = 0;
  const played = state.player.playedThisTurn;

  for (const relic of relicsOf(state, content)) {
    if (relic.hook !== 'ap-cost') continue;
    const p = relic.params ?? {};
    // §5.10.2 Thunder Badge — the first move of a range each turn is cheaper; the rest cost what they cost.
    if (p.firstOfRange) {
      if (move.range !== p.firstOfRange) continue;
      if (played.some((x) => content.move(x.moveId).range === p.firstOfRange)) continue;
      delta += num(p.delta, 0);
      continue;
    }
    if (p.range) {
      const priorOfRange = played.filter((x) => content.move(x.moveId).range === p.range).length;
      if (move.range !== p.range) continue;
      if (priorOfRange === 0 && p.freeFirst) return -99; // free, and nothing else can make it cheaper
      if (priorOfRange > 0) delta += num(p.laterDelta, 0);
      continue;
    }
    // §5.10.3 Earth Badge — the positional cards (Step-Forward, Step-Backward) are cheaper; nothing else is.
    if (p.stepOnly) {
      if (move.modifier === 'none') continue;
      delta += num(p.delta, 0);
      continue;
    }
    if (p.afterMinAp) {
      const last = played[played.length - 1];
      if (last && last.apCost >= num(p.afterMinAp, 99)) delta += num(p.delta, 0);
      continue;
    }
    if (p.firstEachTurn && played.length > 0) continue;
    // §7.3.2 Quick Claw Charm — the opening card of the fight, and nothing after it.
    if (p.firstOfCombat && (state.turn > 1 || played.length > 0)) continue;
    delta += num(p.delta, 0);
  }

  const own = itemOf(owner, content);
  if (own?.hook === 'choice-lock' && own.params?.apDelta !== undefined) delta += num(own.params.apDelta, 0);
  return delta;
}

/**
 * §7.4.5 — Choice Band makes the wearer's Ranged moves unplayable and Choice Scarf allows only one of the
 * wearer's moves per turn. Both are genuine double edges, and the UI shows the lock rather than hiding
 * the card (`ui.md`: nothing unplayable is hidden, only marked).
 */
export function choiceLockBlocks(state: CombatState, owner: Combatant, move: MoveDef, content: ContentRegistry): boolean {
  const own = itemOf(owner, content);
  if (own?.hook !== 'choice-lock') return false;
  const p = own.params ?? {};
  if (p.range && p.range !== move.range) return true;
  if (p.onePerTurn && state.player.playedThisTurn.some((x) => x.ownerUid === owner.uid)) return true;
  return false;
}

/** Extra skill cards to draw this turn, from relics only (held items do not touch the shared deck). */
export function itemDrawBonus(state: CombatState, turn: number, content: ContentRegistry): number {
  let extra = 0;
  for (const relic of relicsOf(state, content)) {
    if (relic.hook !== 'draw') continue;
    const p = relic.params ?? {};
    // A draw that fires on an event of its own is not a turn-start draw. Without this the Cascade Badge
    // would pay out once per swap *and* once per turn, which is twice what §5.10.1 promises.
    if (p.onManualSwap) continue;
    // §5.10.2 Soul Badge — it draws when a status lands, not at the top of the turn.
    if (p.onStatusApplied) continue;
    // Lucky Draw draws from the consumable pile, not the skill deck; it is counted by its own query.
    if (p.consumables) continue;
    if (p.turn !== undefined && p.turn !== turn) continue;
    if (p.onReshuffle && !state.player.reshuffled) continue;
    extra += num(p.cards, 0);
  }
  return extra;
}

/** §5.10.2 Soul Badge — cards drawn the moment one of your moves puts a status on an enemy. */
export function statusApplyDrawBonus(state: CombatState, content: ContentRegistry): number {
  let cards = 0;
  for (const src of relicsOf(state, content)) if (src.hook === 'draw' && src.params?.onStatusApplied) cards += num(src.params.cards, 0);
  return cards;
}

/**
 * §5.10.2 Rainbow Badge — at turn start, a Lead carrying a status condition gets a little back. It is the
 * Region 2 Badge that answers Region 2's accent (§2.2): the statuses the route leaves on you pay you instead.
 */
export function itemTurnStartLeadHeal(state: CombatState, content: ContentRegistry): number {
  const leadMon = state.player.team[state.player.leadIndex];
  if (!leadMon || leadMon.hp <= 0) return 0;
  let amount = 0;
  for (const src of relicsOf(state, content)) {
    if (src.hook !== 'turn-end-heal' || !src.params?.atTurnStart) continue;
    if (src.params.whileStatused && !leadMon.status) continue;
    amount += num(src.params.amount, 0);
  }
  return amount;
}

/** §2.11.3 Lucky Draw — extra consumable cards on a given turn. A different pile from the skill deck. */
export function itemConsumableDrawBonus(state: CombatState, turn: number, content: ContentRegistry): number {
  let extra = 0;
  for (const src of relicsOf(state, content)) {
    if (src.hook !== 'draw' || !src.params?.consumables) continue;
    if (src.params.turn !== undefined && src.params.turn !== turn) continue;
    extra += num(src.params.consumables, 0);
  }
  return extra;
}

/** §2.11.3 Swap Fuel — HP the incoming Lead gets back from a manual swap. */
export function swapHealAmount(state: CombatState, content: ContentRegistry): number {
  let heal = 0;
  for (const src of relicsOf(state, content)) {
    if (src.hook === 'swap-heal') heal += num(src.params?.amount, 0);
  }
  return heal;
}

/** §7.3 — cards kept past the end-of-turn discard, if the relic's condition held. */
export function itemRetainCards(state: CombatState, content: ContentRegistry): number {
  let keep = 0;
  for (const relic of relicsOf(state, content)) {
    // Battle Hat pays you for *not* swapping, which is the counterweight to a swap-tempo build.
    if (relic.hook === 'retain-card' && state.player.swapCounter === 0) keep += num(relic.params?.cards, 0);
  }
  return keep;
}

/** §7.3 — AP banked for next turn: a reshuffle, or three different moves from one Pokémon. */
export function itemBankedAp(state: CombatState, content: ContentRegistry): number {
  let ap = 0;
  for (const relic of relicsOf(state, content)) {
    if (relic.hook !== 'banked-ap') continue;
    const on = relic.params?.on;
    if (on === 'always') ap += num(relic.params?.ap, 0);
    if (on === 'reshuffle' && state.player.reshuffled) ap += num(relic.params?.ap, 0);
    if (on === 'three-from-one') {
      const byOwner = new Map<string, Set<string>>();
      for (const x of state.player.playedThisTurn) {
        if (!byOwner.has(x.ownerUid)) byOwner.set(x.ownerUid, new Set());
        byOwner.get(x.ownerUid)!.add(x.moveId);
      }
      if ([...byOwner.values()].some((s) => s.size >= 3)) ap += num(relic.params?.ap, 0);
    }
  }
  return ap;
}

export const itemFreeSwaps = (state: CombatState, content: ContentRegistry): number =>
  relicsOf(state, content).reduce((n, r) => n + (r.hook === 'free-swap' ? num(r.params?.swaps, 0) : 0), 0);

export const itemStatusShield = (state: CombatState, content: ContentRegistry): number =>
  relicsOf(state, content).reduce((n, r) => n + (r.hook === 'status-shield' ? num(r.params?.charges, 0) : 0), 0);

export function itemCritMultiplier(state: CombatState, content: ContentRegistry, base: number): number {
  let out = base;
  for (const r of relicsOf(state, content)) if (r.hook === 'crit-multiplier') out = num(r.params?.multiplier, base);
  return out;
}

// ── healing, statuses, reactions ──────────────────────────────────────────────────────────────────────────

export function itemHealMultiplier(state: CombatState, content: ContentRegistry): number {
  let m = 1;
  for (const r of relicsOf(state, content)) if (r.hook === 'heal-bonus' && r.params?.multiplier) m *= num(r.params.multiplier, 1);
  return m;
}

export function itemCureHeal(state: CombatState, content: ContentRegistry): number {
  let flat = 0;
  for (const r of relicsOf(state, content)) if (r.hook === 'heal-bonus' && r.params?.flatOnCure) flat += num(r.params.flatOnCure, 0);
  return flat;
}

export function itemStatusExtraTurns(state: CombatState, content: ContentRegistry): number {
  let extra = 0;
  for (const r of relicsOf(state, content)) if (r.hook === 'status-duration') extra += num(r.params?.extraTurns, 0);
  return extra;
}

export const itemRidersFirst = (state: CombatState, content: ContentRegistry): boolean =>
  relicsOf(state, content).some((r) => r.hook === 'rider-first');

/** §7.4.4 Leftovers — end-of-turn healing for the wearer. */
export function itemTurnEndHeal(c: Combatant, content: ContentRegistry): number {
  const own = itemOf(c, content);
  if (own?.hook !== 'turn-end-heal') return 0;
  return Math.max(1, Math.floor(c.maxHp / num(own.params?.divisor, 16)));
}

/** §7.4.4 Focus Sash — the third rung of the faint-prevention ladder (§7.3.6). */
export const itemEndures = (c: Combatant, content: ContentRegistry): boolean =>
  itemOf(c, content)?.hook === 'endure' && c.endureAvailable;

/**
 * §7.3.6's faint-prevention ladder, third rung: a **relic** that endures on behalf of the whole team.
 *
 * Focus Sash below belongs to one Pokémon and re-arms every combat. These do not: Last Stand spends its
 * charge once per combat for whoever needed it first, and Phoenix Feather spends its once per *run* and is
 * gone. Both are tracked in `player.spent`, which the run layer empties between combats only for the ones
 * that are not marked `oncePerRun`.
 */
export function teamEndureRelic(state: CombatState, content: ContentRegistry): HookSource | null {
  return relicsOf(state, content).find((r) => r.hook === 'endure' && r.params?.scope === 'team' && !state.player.spent.includes(r.id)) ?? null;
}

/** §7.3.7 Battle Hardened — the shield each Pokémon opens the combat behind, as a share of its max HP. */
export function startShield(state: CombatState, c: Combatant, content: ContentRegistry): number {
  if (!isPlayers(state, c)) return 0;
  let shield = 0;
  for (const r of relicsOf(state, content)) {
    if (r.hook === 'start-shield') shield += Math.floor(c.maxHp * num(r.params?.percentOfMaxHp, 0));
  }
  return shield;
}

/**
 * §7.3.7 Clear Mind reveals every intent; §2.11.3 Pokédex Whisper (`firstOnly`) only an enemy's first; §5.10.3
 * the Marsh Badge (`untilTurn`) every intent of a combat's first turns. The ability half lives in abilities.ts.
 */
export const relicsRevealIntents = (state: CombatState, content: ContentRegistry, firstIntent = false, turn = 1): boolean =>
  relicsOf(state, content).some(
    (r) => r.hook === 'reveal-intents' && (!r.params?.firstOnly || firstIntent) && (r.params?.untilTurn === undefined || turn <= num(r.params.untilTurn, 0)),
  );

/** §7.3.3 Hand-Off Pouch — Confusion's discard is replaced from the deck. */
export const relicsRedrawConfusion = (state: CombatState, content: ContentRegistry): boolean => relicsOf(state, content).some((r) => r.hook === 'confusion-redraw');

/** §7.3.5 Time Spinner — the enemies lose turn 1 (a boss keeps its own). */
export const relicsSkipFirstTurn = (state: CombatState, content: ContentRegistry): boolean => relicsOf(state, content).some((r) => r.hook === 'skip-first-turn');

/** §5.5.1 Trainer's Instinct — enemies plan a turn ahead and the plan is shown. */
export const relicsQueueIntents = (state: CombatState, content: ContentRegistry): boolean => relicsOf(state, content).some((r) => r.hook === 'intent-queue');

/**
 * §5.10.3 Glacier Badge — what an enemy's next attack is multiplied by once a status lands on it: the product of
 * every `status-chill` source the player carries, or 1 when there is none. Only the player's side has Badges.
 */
export function statusChillMultiplier(state: CombatState, content: ContentRegistry): number {
  let m = 1;
  for (const src of relicsOf(state, content)) if (src.hook === 'status-chill') m *= num(src.params?.multiplier, 1);
  return m;
}

/** §8.6.1 Master Ball Charm — is the once-per-run guaranteed catch still armed? Spent through `player.spent` like Phoenix Feather. */
export const guaranteedCatch = (state: CombatState, content: ContentRegistry): string | null => {
  const r = relicsOf(state, content).find((x) => x.hook === 'guaranteed-catch');
  return r && !state.player.spent.includes(r.id) ? r.id : null;
};

/** §8.6.1 Perfect Recall — is the once-per-fight discard recall still available? */
export const recallsDiscard = (state: CombatState, content: ContentRegistry): boolean =>
  !state.player.spent.includes('perfect-recall') && relicsOf(state, content).some((r) => r.hook === 'recall-discard');

/** §7.3.5 Crown of Echoes — does a relic copy the combat's first card back into your hand? */
export const echoesFirstCard = (state: CombatState, content: ContentRegistry): boolean =>
  relicsOf(state, content).some((r) => r.hook === 'draw' && r.params?.echoFirstCard);

export interface ReactiveStage {
  relicId: string;
  target: 'lead' | 'bench' | 'team';
  stat: Stat;
  stages: number;
  /** Only fires once per combat (Bond Bracelet); the caller checks `spent`. */
  once: boolean;
}

/** §7.3 — the stat stages that fire on an event rather than on a card. */
export function itemReactiveStages(state: CombatState, on: 'faint' | 'lead-low' | 'swap-count', content: ContentRegistry): ReactiveStage[] {
  const out: ReactiveStage[] = [];
  for (const r of relicsOf(state, content)) {
    if (r.hook !== 'reactive-stage' || r.params?.on !== on) continue;
    if (on === 'swap-count') {
      const every = num(r.params.every, 3);
      if (state.player.swapCounter === 0 || state.player.swapCounter % every !== 0) continue;
    }
    out.push({
      relicId: r.id,
      target: (r.params.target as ReactiveStage['target']) ?? 'lead',
      stat: (r.params.stat as Stat) ?? 'defense',
      stages: num(r.params.stages, 1),
      once: on === 'lead-low',
    });
  }
  return out;
}

/** §7.3.4 Vital Pendant — once per combat, a Pokémon in real trouble is pulled back to half. */
export function itemPinchHeal(state: CombatState, c: Combatant, content: ContentRegistry): { relicId: string; toPercent: number } | null {
  for (const r of relicsOf(state, content)) {
    if (r.hook !== 'pinch-heal' || state.player.spent.includes(r.id)) continue;
    if (c.hp <= 0 || (c.hp / c.maxHp) * 100 >= num(r.params?.belowPercent, 25)) continue;
    return { relicId: r.id, toPercent: num(r.params?.toPercent, 50) };
  }
  return null;
}

/** Every held-item id the UI needs an aura marker for. */
export const leadAuraType = (c: Combatant, content: ContentRegistry): PokemonType | null =>
  (itemOf(c, content)?.grantsLeadAura as PokemonType | undefined) ?? null;
