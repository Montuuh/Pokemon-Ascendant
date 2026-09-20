import { produce } from 'immer';
import type { ContentRegistry } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import { RngStreams } from '../rng/rngStreams';
import { knownMoves } from '../combat/stats';
import { buildScenario, maxHpOf } from './encounter';
import { generateRegion } from './map';
import { GYM, gymById, HELD_ITEM_DROP_CHANCE, RELIC_DROP_CHANCE, RUN_START, TM_DROP_CHANCE } from './region';
import { benchXpShare, MONEY_REWARD, PRICES, ownedItems, relicMultiplier, rerollPrice, rollHeldItem, rollLegendaryOffer, rollRelic, rollShopStock, therapyPrice } from './economy';
import { mysteryEvent, rollEvent, type EventOutcome } from './events';
import { hasModifier, modifierValue, modifierXpMultiplier } from './modifiers';
import { priceFor, traumaZone1Pct, victoryHealPct } from './regionModifiers';
import { applyBranch, autoPickMoves, DEFAULT_PROGRESSION, encounterXp, grantXp, isEvolutionReady, learnMove, type ProgressionConfig } from './xp';
import type { LevelUp, PartyMon, RunAction, RunReduceResult, RunState, ShopSlot } from './types';

/** A shop row in the player's words, for the log line after a purchase. */
export function shopSlotName(slot: ShopSlot, content: ContentRegistry): string {
  switch (slot.kind) {
    case 'consumable':
      return content.consumable(slot.id).name;
    case 'relic':
      return content.relic(slot.id).name;
    case 'held-item':
      return content.heldItem(slot.id).name;
    case 'tm':
      return content.tm(slot.id).name;
    case 'ball':
      return 'a Poké Ball';
  }
}

// §2 — the run reducer. Pure: (state, action) → state, exactly like the combat reducer, so a run is a seed
// plus an action log and a save is that pair (§10.7.4, §10.8).

// 4 — v0.4 added money, relics, held items, the Shop and Mystery Events (§7.3, §7.4, §2.9.2, §2.10).
// 3 — v0.3 added the Learned Move Pool, the passive slot, TMs and the evolution queue (§6.3, §6.4, §6.7).
export const RUN_SAVE_VERSION = 5;

export interface RunCtx {
  content: ContentRegistry;
  progression: ProgressionConfig;
}

export const defaultRunCtx = (content: ContentRegistry): RunCtx => ({ content, progression: DEFAULT_PROGRESSION });

let uidCounter = 0;
/** Deterministic within a run: uids are derived from the seed and an incrementing index, never from a clock. */
function makeUid(seed: number): string {
  uidCounter += 1;
  return `m${seed.toString(36)}-${uidCounter.toString(36)}`;
}

export function resetUidCounter(): void {
  uidCounter = 0;
}

export function newPartyMon(speciesId: string, level: number, content: ContentRegistry, seed: number): PartyMon {
  // §6.9 — a recruit derives its pool from its spawn level, so a mid-route catch arrives with a full kit;
  // §6.5.1 — an already-evolved recruit arrives with the pool's first passive, the one its evolution granted.
  const pool = knownMoves(content, speciesId, level);
  const species = content.species(speciesId);
  const mon: PartyMon = {
    uid: makeUid(seed),
    speciesId,
    level,
    xp: 0,
    defeats: 0,
    hp: 1,
    traumaStacks: 0,
    pool: [...pool],
    moveIds: autoPickMoves(pool, content),
    abilityId: species.stage === 'basic' ? null : (species.availableAbilities[0] ?? null),
    archetype: species.archetype ?? null,
    status: null,
    heldItem: null,
  };
  mon.hp = maxHpOf(mon, content);
  return mon;
}

/** §2.1.1 — pre-run setup is over; build the route and put the starter in the Box. */
export function createRun(starterId: string, seed: number, ctx: RunCtx, regionIndex = 0, modifiers: readonly string[] = [], startingRelic?: string, regionModifier?: string): RunState {
  resetUidCounter();
  const streams = new RngStreams(seed);
  const mapRng = streams.get('MapRNG');
  const map = generateRegion(mapRng, ctx.content, regionIndex, seed);
  const starter = newPartyMon(starterId, RUN_START.starterLevel, ctx.content, seed);

  return {
    version: RUN_SAVE_VERSION,
    seed,
    regionIndex,
    map,
    position: null,
    reachable: [...map.entry],
    visited: [],
    box: [starter],
    activeUids: [starter.uid],
    balls: RUN_START.balls,
    consumables: [...RUN_START.consumables],
    tms: [],
    money: RUN_START.money,
    relics: [],
    spentRelics: [],
    badges: [],
    bag: [],
    modifiers: [...modifiers],
    regionModifier: regionModifier ?? null,
    pendingShop: null,
    pendingEvent: null,
    eventResult: null,
    seenEvents: [],
    phase: 'map',
    pendingNodeId: null,
    pendingScenario: null,
    pendingReward: null,
    pendingLegendary: null,
    pendingRecruit: null,
    pendingEvolutions: [],
    outcome: 'in-progress',
    cursors: { MapRNG: mapRng.cursor, EncounterRNG: streams.get('EncounterRNG').cursor, LootRNG: streams.get('LootRNG').cursor },
    stats: { nodesCleared: 0, combatsWon: 0, catches: 0, faints: 0, turnsPlayed: 0, startedAt: 0 },
    log: [`A new run begins with ${ctx.content.species(starterId).name}.`],
    ...(startingRelic ? { relics: [startingRelic] } : {}),
  };
}

const say = (draft: RunState, line: string) => {
  draft.log.push(line);
  if (draft.log.length > 200) draft.log.shift();
};

/** The encounter stream, resumed from the saved cursor so a reload continues the same sequence (§10.8.6). */
function encounterRng(draft: RunState): GameRng {
  const rng = new RngStreams(draft.seed).get('EncounterRNG');
  rng.cursor = draft.cursors.EncounterRNG ?? rng.cursor;
  return rng;
}

const activeOf = (draft: RunState) => draft.activeUids.map((uid) => draft.box.find((m) => m.uid === uid)).filter((m): m is PartyMon => !!m);
const healthy = (draft: RunState) => draft.box.filter((m) => m.hp > 0);

/**
 * §8.2.1 with §8.8 — Effective Max HP, Trauma *and* the run's difficulty modifiers. Every Box-HP site in this
 * file goes through here rather than calling `maxHpOf` directly, because Trauma Surge is the kind of modifier
 * that is silently wrong if one caller forgets it: a Centre that heals past the cap looks like a heal.
 */
export function effectiveMax(run: RunState, mon: PartyMon, content: ContentRegistry): number {
  const z1 = modifierValue(run.modifiers, 'trauma-surge', 'zone1Pct', 5);
  const z2 = modifierValue(run.modifiers, 'trauma-surge', 'zone2Pct', 10);
  // §2.11.3 Trauma Resistance pulls the other way from §8.8's Trauma Surge, and both write the same number.
  // The relief is worth the *same point* wherever it lands rather than overriding the difficulty a player
  // deliberately chose: 5 → 4 by default, and 8 → 7 under Trauma Surge, never 8 → 4.
  const relief = 5 - traumaZone1Pct(run, content);
  return maxHpOf(mon, content, 5, Math.max(1, z1 - relief), Math.max(1, z2 - relief), 10);
}

/** §2.3.1 with §8.8 — how many the Box holds. Box Squeeze takes it from six to four. */
export const boxCapacity = (run: RunState): number => modifierValue(run.modifiers, 'box-squeeze', 'boxCapacity', RUN_START.boxCapacity);

/** After a node is cleared, the next layer's linked nodes open up. */
function advanceFrom(draft: RunState, nodeId: string): void {
  const node = draft.map.nodes[nodeId];
  draft.position = nodeId;
  if (!draft.visited.includes(nodeId)) draft.visited.push(nodeId);
  draft.reachable = node ? [...node.next] : [];
  draft.stats.nodesCleared += 1;
}

/**
 * Walking off a cleared node. Everything that can stand between the fight and the map queues ahead of this —
 * the Evolution screen, then Swap-or-Skip — so both of those finish by calling in here.
 */
function leaveNode(draft: RunState, nodeId: string, ctx: RunCtx): void {
  if (draft.pendingRecruit) {
    draft.phase = 'swap-or-skip';
    return;
  }
  const node = draft.map.nodes[nodeId]!;
  advanceFrom(draft, node.id);
  draft.pendingNodeId = null;
  if (node.kind === 'gym') {
    // §5.10 — the Badge, before the run is marked won, so a save taken at the summary already has it.
    const gym = node.lane !== undefined ? gymById(draft.map.gyms[node.lane] ?? GYM.id) : GYM;
    if (!draft.badges.includes(gym.badgeId)) draft.badges.push(gym.badgeId);
    draft.log.push(`${gym.name} is beaten. Region 1 is cleared.`);

    // §7.3.7 — a Gym victory is a Legendary pick-moment. It stands between the Gym and the summary rather
    // than after it, because a choice offered on the results screen is a choice nobody makes.
    // Its own cursor on the loot stream, so a reload offers the same three (§10.8.6).
    const pickRng = new RngStreams(draft.seed).get('LootRNG');
    pickRng.cursor = draft.cursors.LootRNG ?? pickRng.cursor;
    const offer = rollLegendaryOffer(pickRng, ctx.content, draft.relics);
    draft.cursors.LootRNG = pickRng.cursor;
    if (offer.length) {
      draft.pendingLegendary = offer;
      draft.phase = 'legendary';
      return;
    }
    draft.outcome = 'victory';
    draft.phase = 'ended';
  } else {
    draft.phase = 'map';
  }
}

/** §6.3.1 — every Pokémon standing at its threshold owes one Evolution screen, in Box order. */
function queueEvolutions(draft: RunState, content: ContentRegistry): void {
  for (const mon of draft.box) {
    if (!isEvolutionReady(mon, content)) continue;
    if (draft.pendingEvolutions.some((p) => p.uid === mon.uid)) continue;
    draft.pendingEvolutions.push({
      uid: mon.uid,
      from: mon.speciesId,
      branchIds: content.species(mon.speciesId).branches.map((b) => b.id),
    });
  }
}

/**
 * §7.3 — take a relic, and fire its `on-acquire` hook if it has one. Trauma Salve is the only one today: it
 * is an item that spends itself the moment you pick it up, which is why it cannot be a combat hook.
 */
function acquireRelic(draft: RunState, relicId: string, content: ContentRegistry): void {
  if (draft.relics.includes(relicId)) return;
  draft.relics.push(relicId);
  const def = content.relic(relicId);
  say(draft, `Took the ${def.name}.`);
  if (def.hook === 'on-acquire' && def.params?.effect === 'clear-trauma') {
    const worst = [...draft.box].sort((a, b) => b.traumaStacks - a.traumaStacks)[0];
    if (worst && worst.traumaStacks > 0) {
      worst.traumaStacks = 0;
      say(draft, `${content.species(worst.speciesId).name}'s Trauma is gone.`);
    }
  }
}

/** §2.10 — resolve one Mystery Event choice. Every branch is data (§2.10.3); this is the only interpreter. */
function resolveEventOutcome(draft: RunState, outcome: EventOutcome, ctx: RunCtx, rng: GameRng): void {
  switch (outcome.kind) {
    case 'money':
      draft.money += outcome.amount;
      say(draft, `+${outcome.amount} ₽.`);
      break;
    case 'balls':
      draft.balls += outcome.amount;
      say(draft, `+${outcome.amount} Poké Balls.`);
      break;
    case 'consumables':
      draft.consumables.push(...outcome.ids);
      say(draft, `Picked up ${outcome.ids.map((id) => ctx.content.consumable(id).name).join(', ')}.`);
      break;
    case 'relic': {
      const id = rollRelic(rng, ctx.content, draft.relics, outcome.rarity);
      if (id) acquireRelic(draft, id, ctx.content);
      break;
    }
    case 'held-item': {
      const id = rollHeldItem(rng, ctx.content, ownedItems(draft));
      if (id) {
        draft.bag.push(id);
        say(draft, `Found a ${ctx.content.heldItem(id).name}.`);
      }
      break;
    }
    case 'heal-box': {
      for (const mon of draft.box) {
        if (mon.hp <= 0) continue;
        const max = effectiveMax(draft, mon, ctx.content);
        mon.hp = Math.min(max, mon.hp + Math.floor((max * outcome.percent) / 100));
      }
      say(draft, `The whole Box recovered ${outcome.percent} % of its HP.`);
      break;
    }
    case 'hurt-box': {
      // §2.10.2 — a Tradeoff may cost HP, but it may never faint anyone. A Mystery node that can kill a
      // Pokémon outright is a fight you did not agree to, and Pillar 1 says you agree to your fights.
      for (const mon of draft.box) {
        if (mon.hp <= 0) continue;
        const max = effectiveMax(draft, mon, ctx.content);
        mon.hp = Math.max(1, mon.hp - Math.floor((max * outcome.percent) / 100));
      }
      say(draft, `Everyone is worse for it: −${outcome.percent} % HP across the Box.`);
      break;
    }
    case 'clear-trauma': {
      const worst = [...draft.box].sort((a, b) => b.traumaStacks - a.traumaStacks)[0];
      if (worst && worst.traumaStacks > 0) {
        worst.traumaStacks = 0;
        say(draft, `${ctx.content.species(worst.speciesId).name} came back rested.`);
      } else {
        say(draft, 'Nobody needed the rest, but it was a kind offer.');
      }
      break;
    }
    case 'add-trauma': {
      const victim = draft.box[Math.min(draft.box.length - 1, Math.floor(rng.range01() * draft.box.length))];
      if (victim) {
        victim.traumaStacks = Math.min(10, victim.traumaStacks + outcome.stacks);
        say(draft, `${ctx.content.species(victim.speciesId).name} picked up Trauma.`);
      }
      break;
    }
    case 'gamble': {
      // §2.10.1 — a Gamble is the one event allowed an unknown outcome, and even it states the odds.
      const won = rng.chance(outcome.chance);
      say(draft, won ? 'It goes your way.' : 'It does not go your way.');
      for (const o of won ? outcome.win : outcome.lose) resolveEventOutcome(draft, o, ctx, rng);
      break;
    }
    case 'nothing':
      break;
  }
}

/** §6.7.2 — a legal active 4: 1–4 distinct moves, every one of them in the pool. */
export function validateKit(mon: PartyMon, moveIds: readonly string[]): RunReduceResult['rejected'] {
  const unique = new Set(moveIds);
  if (unique.size === 0) return 'empty-kit';
  if (unique.size > 4) return 'too-many-moves';
  for (const id of unique) if (!mon.pool.includes(id)) return 'move-not-in-pool';
  return undefined;
}

export function runReducer(state: RunState, action: RunAction, ctx: RunCtx): RunReduceResult {
  const rejected = validateRunAction(state, action, ctx);
  if (rejected) return { state, rejected };

  const next = produce(state, (draft) => {
    switch (action.type) {
      case 'enter-node': {
        draft.pendingNodeId = action.nodeId;
        draft.phase = 'preview';
        break;
      }

      case 'cancel-preview': {
        draft.pendingNodeId = null;
        draft.pendingScenario = null;
        draft.phase = 'map';
        break;
      }

      case 'begin-combat': {
        const node = draft.map.nodes[draft.pendingNodeId!]!;
        if (node.kind === 'dojo') {
          // §2.9.4 — the Dojo is a utility stop, not a fight. Money is the gate now; the credit it used to
          // carry in v0.3 is gone.
          draft.phase = 'dojo';
          say(draft, 'The Dojo master looks your team over.');
          break;
        }
        if (node.kind === 'shop') {
          // §2.9.2 — stock is seeded per visit, so leaving and coming back is not a re-roll.
          const rng = encounterRng(draft);
          draft.pendingShop = rollShopStock(rng, ctx.content, draft);
          draft.cursors.EncounterRNG = rng.cursor;
          draft.phase = 'shop';
          break;
        }
        if (node.kind === 'mystery') {
          // §2.10.4 — drawn without replacement, so an event never repeats within a run.
          const rng = encounterRng(draft);
          draft.pendingEvent = rollEvent(rng, draft.seenEvents);
          draft.seenEvents.push(draft.pendingEvent);
          draft.cursors.EncounterRNG = rng.cursor;
          draft.phase = 'event';
          break;
        }
        if (node.kind === 'center') {
          // §2.9.1 — the restore is free, automatic and complete: it is not a decision, so it happens on
          // entry rather than behind a button. §8.2.4's Therapy *is* a decision, and it needs a screen to be
          // made on — which is why the Centre stopped handing the map straight back in v0.4.
          for (const mon of draft.box) {
            mon.hp = effectiveMax(draft, mon, ctx.content);
            mon.status = null;
          }
          say(draft, 'The Pokémon Center restored your whole Box.');
          draft.phase = 'center';
          break;
        }
        const rng = encounterRng(draft);
        const scenario = buildScenario(node, draft, ctx.content, rng, node.preview.speciesIds[0]);
        draft.cursors.EncounterRNG = rng.cursor;
        draft.pendingScenario = scenario;
        draft.phase = 'combat';
        break;
      }

      case 'finish-combat': {
        const { report } = action;
        const node = draft.map.nodes[draft.pendingNodeId!]!;
        draft.stats.turnsPlayed += report.turns;

        // §7.3.7 — a relic charge marked `oncePerRun` does not come back with the next fight. The fight
        // reports every charge it spent; the content row is what says which of them were the last.
        for (const id of report.spentRelics ?? []) {
          // §7.3.6 — three systems share the hook vocabulary and therefore share `spent`: a charge in that
          // list may belong to a relic, a Badge or a Region Modifier. Only a relic can be spent for the
          // *run*, so the lookup asks whether it is one rather than assuming it.
          const row = ctx.content.allRelics().find((r) => r.id === id);
          if (row?.params?.oncePerRun && !draft.spentRelics.includes(id)) {
            draft.spentRelics.push(id);
            say(draft, `The ${row.name} is spent.`);
          }
        }

        // §2.11.3 Pocket Healer — a share of max HP back for winning, applied *after* the fight's HP is
        // carried across so it heals the damage that was actually taken rather than the damage predicted.
        const healPct = report.outcome !== 'defeat' ? victoryHealPct(draft, ctx.content) : 0;

        // 1. Carry HP, status and Trauma back out of the fight (§2.4, §8.2.2).
        for (const result of report.team) {
          const mon = draft.box.find((m) => m.uid === result.uid);
          if (!mon) continue;
          mon.hp = Math.max(0, result.hp);
          mon.status = result.status;
          // §7.3.5 Champion's Crest — the record follows the Pokémon, not the fight.
          if (result.defeats !== undefined) mon.defeats = result.defeats;
          if (healPct > 0 && mon.hp > 0) {
            const max = effectiveMax(draft, mon, ctx.content);
            mon.hp = Math.min(max, mon.hp + Math.max(1, Math.floor((max * healPct) / 100)));
          }
          if (result.fainted) {
            mon.traumaStacks = Math.min(10, mon.traumaStacks + 1);
            draft.stats.faints += 1;
            say(draft, `${ctx.content.species(mon.speciesId).name} fainted — Trauma ${mon.traumaStacks}.`);
          }
        }

        if (report.outcome === 'defeat') {
          draft.outcome = 'defeat';
          draft.phase = 'ended';
          say(draft, 'Your team was wiped. The run ends here.');
          break;
        }

        // 2. XP: the Active Team at full rate, the rest of the Box at three-quarters (§6.2.1), times any
        // relic multiplier (§7.3.3 Lucky Egg Token, Exp Share).
        // §2.8.2 — an Elite Wild pays elite XP whichever way it ended; the catch is the *premium* path, not
        // a discount on the fight.
        const tier = node.kind === 'gym' ? 'boss'
          : node.kind === 'elite' || node.kind === 'elite-wild' ? 'elite'
          : node.kind === 'trainer' ? 'trainer' : 'wild';
        const enemyCount = draft.pendingScenario?.enemies.length ?? 1;
        // §8.8.3 — the difficulty premium multiplies with the relic multiplier; both are run-long terms.
        const pot = Math.round(
          encounterXp(tier, enemyCount, ctx.progression)
            * relicMultiplier(draft, ctx.content, 'xp-multiplier')
            * modifierXpMultiplier(draft.modifiers),
        );
        const share = benchXpShare(draft, ctx.content, ctx.progression.benchXpShare);
        const activeIds = new Set(draft.activeUids);
        const xpAwarded: { uid: string; amount: number }[] = [];
        const levelUps: LevelUp[] = [];
        for (const mon of draft.box) {
          const amount = activeIds.has(mon.uid) ? pot : Math.round(pot * share);
          const up = grantXp(mon, amount, ctx.content, ctx.progression);
          xpAwarded.push({ uid: mon.uid, amount });
          if (up) {
            levelUps.push(up);
            const name = ctx.content.species(mon.speciesId).name;
            const learnedNames = up.learned.map((m) => ctx.content.move(m).name);
            say(draft, `${name} grew to level ${up.to}${learnedNames.length ? ` and learned ${learnedNames.join(', ')}` : ''}.`);
            const waiting = up.learned.filter((m) => !up.activated.includes(m));
            if (waiting.length) say(draft, `${name}'s active 4 is full — ${waiting.map((m) => ctx.content.move(m).name).join(', ')} waits in the pool.`);
          }
        }

        // §6.3.1 — anything standing at its threshold owes an Evolution screen before the next node.
        queueEvolutions(draft, ctx.content);

        // §2.14 / §7.3 / §7.4.6 — the loot stream: money, then a TM, a relic and a held item on their own
        // rolls. One RNG stream for all of it so a reload replays the same drops (§10.8.6).
        const lootRng = new RngStreams(draft.seed).get('LootRNG');
        lootRng.cursor = draft.cursors.LootRNG ?? lootRng.cursor;

        const band = MONEY_REWARD[node.kind] ?? [0, 0];
        const rawMoney = band[0] + Math.floor(lootRng.range01() * (band[1] - band[0] + 1));
        const moneyEarned = Math.round(rawMoney * relicMultiplier(draft, ctx.content, 'money-multiplier'));
        draft.money += moneyEarned;
        if (moneyEarned > 0) say(draft, `Picked up ${moneyEarned} ₽.`);

        // §7.5 — a TM drops from a Trainer at canon's 5 % now that the Shop is its other source. The Gym
        // still drops one outright, because a Region's climax should hand you something to build with.
        let tmDrop: string | null = null;
        if (node.kind === 'trainer' || node.kind === 'gym' || node.kind === 'elite') {
          const chance = node.kind === 'trainer' ? TM_DROP_CHANCE : 1;
          const offer = ctx.content
            .allTms()
            .filter((t) => draft.box.some((m) => t.compatibleSpecies.includes(m.speciesId) && !m.pool.includes(t.move)));
          if (offer.length && lootRng.chance(chance)) {
            tmDrop = offer[Math.min(offer.length - 1, Math.floor(lootRng.range01() * offer.length))]!.id;
            draft.tms.push(tmDrop);
            say(draft, `Found ${ctx.content.tm(tmDrop).name}!`);
          }
        }

        // §7.3.1 — a relic from a Trainer, guaranteed from an Elite or the Gym. Duplicates are excluded.
        //
        // §2.8.2 — the Elite Wild is the catch-**or**-kill node, and this is where that word is enforced:
        // beat it and you take the relic, catch it and you take the Pokémon. Never both. Handing over both
        // would make the dilemma a formality, and the dilemma is the only reason the node exists.
        const beatTheEliteWild = node.kind === 'elite-wild' && report.outcome !== 'caught';
        let relicDrop: string | null = null;
        if (node.kind === 'trainer' || node.kind === 'elite' || node.kind === 'gym' || beatTheEliteWild) {
          const chance = node.kind === 'trainer' ? RELIC_DROP_CHANCE : 1;
          if (lootRng.chance(chance)) {
            relicDrop = rollRelic(lootRng, ctx.content, draft.relics, node.kind === 'trainer' ? undefined : 'uncommon');
            if (relicDrop) acquireRelic(draft, relicDrop, ctx.content);
          }
        }

        // §7.4.6 — a Trainer drops a Held Item one time in five. Wild loot never contains one.
        let itemDrop: string | null = null;
        if ((node.kind === 'trainer' || node.kind === 'elite') && lootRng.chance(HELD_ITEM_DROP_CHANCE)) {
          itemDrop = rollHeldItem(lootRng, ctx.content, ownedItems(draft));
          if (itemDrop) {
            draft.bag.push(itemDrop);
            say(draft, `Found a ${ctx.content.heldItem(itemDrop).name}.`);
          }
        }
        draft.cursors.LootRNG = lootRng.cursor;

        // 3. Balls are spent on the throw, not on the catch, so a wild fight returns its own count.
        if (node.kind === 'wild' || node.kind === 'elite-wild') draft.balls = Math.max(0, Math.min(draft.balls, report.ballsLeft));

        // §8.8 No Refunds — the shelf is normally restocked between fights (§7.2.1: a consumable is a card,
        // not a stock item). This modifier turns it into one, so a played Potion comes off the run's list.
        if (hasModifier(draft.modifiers, 'no-refunds')) {
          for (const id of report.spentConsumables ?? []) {
            const at = draft.consumables.indexOf(id);
            if (at >= 0) draft.consumables.splice(at, 1);
          }
        }

        // 4. A catch is a Victory that also hands you a Pokémon (§2.6.4).
        let caught: { speciesId: string; level: number } | null = null;
        if (report.outcome === 'caught' && report.caught) {
          caught = report.caught;
          draft.stats.catches += 1;
          if (draft.box.length < boxCapacity(draft)) {
            const recruit = newPartyMon(caught.speciesId, caught.level, ctx.content, draft.seed);
            draft.box.push(recruit);
            if (draft.activeUids.length < 3) draft.activeUids.push(recruit.uid);
            say(draft, `Caught ${ctx.content.species(caught.speciesId).name}!`);
          } else {
            // §2.3.1 — the Box is full: Swap or Skip, and releasing is permanent.
            draft.pendingRecruit = caught;
            say(draft, `Caught ${ctx.content.species(caught.speciesId).name}, but the Box is full.`);
          }
        } else {
          draft.stats.combatsWon += 1;
        }

        draft.pendingReward = {
          xpAwarded,
          levelUps,
          caught,
          faintedUids: report.team.filter((t) => t.fainted).map((t) => t.uid),
          tm: tmDrop,
          money: moneyEarned,
          relic: relicDrop,
          heldItem: itemDrop,
        };
        draft.phase = 'reward';
        break;
      }

      case 'claim-reward': {
        const node = draft.map.nodes[draft.pendingNodeId!]!;
        draft.pendingReward = null;
        draft.pendingScenario = null;

        // §3.6 — the Evolution screen comes before anything else: it is the celebration *and* the choice.
        if (draft.pendingEvolutions.length) {
          draft.phase = 'evolution';
          break;
        }
        leaveNode(draft, node.id, ctx);
        break;
      }

      case 'choose-branch': {
        const pending = draft.pendingEvolutions[0]!;
        const mon = draft.box.find((m) => m.uid === pending.uid)!;
        const from = ctx.content.species(mon.speciesId).name;
        applyBranch(mon, action.branchId, ctx.content);
        const branch = ctx.content.branch(action.branchId);
        say(draft, `${from} evolved into ${ctx.content.species(mon.speciesId).name} — ${branch.label}.`);
        draft.pendingEvolutions.shift();
        // A two-stage jump (Caterpie at 8 into Metapod, which evolves at 12) can arrive already ready again.
        queueEvolutions(draft, ctx.content);
        if (draft.pendingEvolutions.length) break;
        leaveNode(draft, draft.pendingNodeId!, ctx);
        break;
      }

      case 'resolve-recruit': {
        const recruit = draft.pendingRecruit!;
        if (action.releaseUid) {
          const idx = draft.box.findIndex((m) => m.uid === action.releaseUid);
          if (idx >= 0) {
            const [released] = draft.box.splice(idx, 1);
            draft.activeUids = draft.activeUids.filter((u) => u !== action.releaseUid);
            const fresh = newPartyMon(recruit.speciesId, recruit.level, ctx.content, draft.seed);
            draft.box.push(fresh);
            if (draft.activeUids.length < 3) draft.activeUids.push(fresh.uid);
            say(draft, `Released ${ctx.content.species(released!.speciesId).name} for ${ctx.content.species(recruit.speciesId).name}.`);
          }
        } else {
          say(draft, `Let ${ctx.content.species(recruit.speciesId).name} go.`);
        }
        draft.pendingRecruit = null;

        const node = draft.map.nodes[draft.pendingNodeId!]!;
        advanceFrom(draft, node.id);
        draft.pendingNodeId = null;
        draft.phase = 'map';
        break;
      }

      case 'use-center': {
        for (const mon of draft.box) {
          mon.hp = effectiveMax(draft, mon, ctx.content);
          mon.status = null;
        }
        say(draft, 'Everyone is back to full health.');
        break;
      }

      case 'set-active': {
        draft.activeUids = [...action.uids];
        break;
      }

      case 'set-lead': {
        draft.activeUids = [action.uid, ...draft.activeUids.filter((u) => u !== action.uid)];
        break;
      }

      // §6.7.2 — the Move Manager. Free, unlimited and out of combat: the pool is the reward, the four
      // slots are the pressure, and moving a card between them costs nothing but the decision.
      case 'set-moves': {
        const mon = draft.box.find((m) => m.uid === action.uid)!;
        mon.moveIds = [...new Set(action.moveIds)];
        break;
      }

      // §6.4.1 — a TM is single use and permanent. It adds to the pool; the player re-picks the active 4.
      case 'use-tm': {
        const mon = draft.box.find((m) => m.uid === action.uid)!;
        const tm = ctx.content.tm(action.tmId);
        draft.tms.splice(draft.tms.indexOf(action.tmId), 1);
        learnMove(mon, tm.move);
        if (mon.moveIds.length < 4) mon.moveIds.push(tm.move);
        say(draft, `${ctx.content.species(mon.speciesId).name} learned ${ctx.content.move(tm.move).name} from ${tm.name}.`);
        break;
      }

      // §6.4.2 — the Dojo's tutor service: an off-learnset move for this stage, the kind nature would never give.
      case 'teach-move': {
        const mon = draft.box.find((m) => m.uid === action.uid)!;
        draft.money -= priceFor(draft, ctx.content, PRICES.dojoMove);
        learnMove(mon, action.moveId);
        if (mon.moveIds.length < 4) mon.moveIds.push(action.moveId);
        say(draft, `The tutor taught ${ctx.content.species(mon.speciesId).name} ${ctx.content.move(action.moveId).name}.`);
        break;
      }

      // §6.4.2 / §6.5.1 — the ability service. One passive slot; swapping back is allowed on purpose.
      case 'set-ability': {
        const mon = draft.box.find((m) => m.uid === action.uid)!;
        draft.money -= priceFor(draft, ctx.content, PRICES.dojoAbility);
        mon.abilityId = action.abilityId;
        say(draft, `${ctx.content.species(mon.speciesId).name}'s passive is now ${ctx.content.ability(action.abilityId).name}.`);
        break;
      }

      case 'leave-dojo':
      case 'leave-center': {
        leaveNode(draft, draft.pendingNodeId!, ctx);
        break;
      }

      // §2.9.2 — buy a slot. The price is on the slot so a re-roll cannot change what you already agreed to.
      case 'buy': {
        const slot = draft.pendingShop!.slots[action.index]!;
        draft.money -= slot.price;
        slot.sold = true;
        switch (slot.kind) {
          case 'consumable':
            draft.consumables.push(slot.id);
            break;
          case 'ball':
            draft.balls += 1;
            break;
          case 'relic':
            acquireRelic(draft, slot.id, ctx.content);
            break;
          case 'held-item':
            draft.bag.push(slot.id);
            break;
          case 'tm':
            draft.tms.push(slot.id);
            break;
        }
        say(draft, `Bought ${shopSlotName(slot, ctx.content)} for ${slot.price} ₽.`);
        break;
      }

      // §2.9.3 — re-roll the *unsold* slots. What you already bought stays bought.
      case 'reroll-shop': {
        const stock = draft.pendingShop!;
        draft.money -= rerollPrice(stock)!;
        const rng = encounterRng(draft);
        const fresh = rollShopStock(rng, ctx.content, draft);
        draft.cursors.EncounterRNG = rng.cursor;
        const sold = stock.slots.filter((s) => s.sold);
        stock.slots = [...sold, ...fresh.slots.slice(0, Math.max(0, stock.slots.length - sold.length))];
        stock.rerolls += 1;
        say(draft, 'The shopkeeper rummages under the counter.');
        break;
      }

      case 'leave-shop': {
        draft.pendingShop = null;
        leaveNode(draft, draft.pendingNodeId!, ctx);
        break;
      }

      // §8.2.4 — Therapy. One stack, priced by how bad it already is, so a broken Pokémon is a real decision.
      case 'use-therapy': {
        const mon = draft.box.find((m) => m.uid === action.uid)!;
        draft.money -= therapyPrice(mon);
        mon.traumaStacks = Math.max(0, mon.traumaStacks - 1);
        mon.hp = Math.min(effectiveMax(draft, mon, ctx.content), mon.hp);
        say(draft, `${ctx.content.species(mon.speciesId).name} looks steadier — Trauma ${mon.traumaStacks}.`);
        break;
      }

      // §7.4.1 — equipping swaps with the bag rather than destroying anything. Nothing is ever lost.
      case 'equip-item': {
        const mon = draft.box.find((m) => m.uid === action.uid)!;
        if (mon.heldItem) draft.bag.push(mon.heldItem);
        if (action.itemId) draft.bag.splice(draft.bag.indexOf(action.itemId), 1);
        mon.heldItem = action.itemId;
        say(
          draft,
          action.itemId
            ? `${ctx.content.species(mon.speciesId).name} is holding a ${ctx.content.heldItem(action.itemId).name}.`
            : `${ctx.content.species(mon.speciesId).name} is holding nothing.`,
        );
        break;
      }

      case 'choose-event': {
        const event = mysteryEvent(draft.pendingEvent!);
        const choice = event.choices[action.option]!;
        say(draft, `${event.title}: ${choice.label}.`);
        const rng = encounterRng(draft);
        const from = draft.log.length;
        if (choice.cost) {
          draft.money -= choice.cost;
          say(draft, `Paid ${choice.cost} ₽.`);
        }
        for (const o of choice.outcomes) resolveEventOutcome(draft, o, ctx, rng);
        draft.cursors.EncounterRNG = rng.cursor;
        // The choice stays on screen with its result attached. A Gamble that resolves and vanishes in the
        // same frame is a coin flip the player never sees land, and even a stated outcome reads better
        // confirmed than assumed — so leaving the node is a second, deliberate action (§2.10).
        draft.eventResult = draft.log.slice(from);
        break;
      }

      case 'leave-event': {
        draft.pendingEvent = null;
        draft.eventResult = null;
        queueEvolutions(draft, ctx.content);
        if (draft.pendingEvolutions.length) {
          draft.phase = 'evolution';
          break;
        }
        leaveNode(draft, draft.pendingNodeId!, ctx);
        break;
      }

      // §7.3.7 — the Legendary 1-of-3 that closes a Gym victory. Taking one is optional: at the 2-per-run
      // cap the offer is Rares, and declining is a real answer rather than a formality.
      case 'pick-legendary': {
        if (action.relicId) acquireRelic(draft, action.relicId, ctx.content);
        else say(draft, 'You leave all three where they are.');
        draft.pendingLegendary = null;
        draft.outcome = 'victory';
        draft.phase = 'ended';
        break;
      }
    }
  });

  return { state: next };
}

/** §6.7.2 — true when the deck is locked: inside a fight, or after the run has ended. */
const outOfCombat = (state: RunState) => state.phase === 'combat' || state.phase === 'ended';

export function validateRunAction(state: RunState, action: RunAction, ctx: RunCtx): RunReduceResult['rejected'] {
  if (state.outcome !== 'in-progress' && action.type !== 'set-active') return 'wrong-phase';

  switch (action.type) {
    case 'enter-node':
      if (state.phase !== 'map') return 'wrong-phase';
      if (!state.reachable.includes(action.nodeId)) return 'node-unreachable';
      return undefined;
    case 'cancel-preview':
      return state.phase === 'preview' ? undefined : 'wrong-phase';
    case 'begin-combat': {
      if (state.phase !== 'preview' || !state.pendingNodeId) return 'wrong-phase';
      const node = state.map.nodes[state.pendingNodeId];
      if (node && node.kind !== 'center' && !state.activeUids.some((u) => (state.box.find((m) => m.uid === u)?.hp ?? 0) > 0))
        return 'no-healthy-pokemon';
      return undefined;
    }
    case 'finish-combat':
      return state.phase === 'combat' ? undefined : 'wrong-phase';
    case 'claim-reward':
      return state.phase === 'reward' ? undefined : 'wrong-phase';
    case 'resolve-recruit':
      if (state.phase !== 'swap-or-skip' || !state.pendingRecruit) return 'wrong-phase';
      if (action.releaseUid && !state.box.some((m) => m.uid === action.releaseUid)) return 'unknown-pokemon';
      return undefined;
    case 'use-center':
      return state.phase === 'map' ? undefined : 'wrong-phase';
    case 'set-active': {
      if (state.phase !== 'map' && state.phase !== 'preview') return 'wrong-phase';
      if (action.uids.length > 3) return 'team-too-large';
      if (action.uids.some((u) => !state.box.some((m) => m.uid === u))) return 'unknown-pokemon';
      if (!action.uids.some((u) => (state.box.find((m) => m.uid === u)?.hp ?? 0) > 0)) return 'no-healthy-pokemon';
      return undefined;
    }
    case 'set-lead':
      if (state.phase !== 'map' && state.phase !== 'preview') return 'wrong-phase';
      if (!state.activeUids.includes(action.uid)) return 'unknown-pokemon';
      return undefined;

    case 'choose-branch': {
      const pending = state.pendingEvolutions[0];
      if (state.phase !== 'evolution' || !pending) return 'wrong-phase';
      if (action.uid !== pending.uid) return 'unknown-pokemon';
      if (!pending.branchIds.includes(action.branchId)) return 'unknown-branch';
      return undefined;
    }

    case 'set-moves': {
      // §6.7.2 — "out of combat, between nodes, free and unlimited". Stated as what it is *not*: the deck is
      // locked once a fight starts, and a finished run has nothing left to sculpt. Everything else is fair
      // game, including the moment an evolution or a Dojo purchase just widened the pool.
      if (outOfCombat(state)) return 'wrong-phase';
      const mon = state.box.find((m) => m.uid === action.uid);
      if (!mon) return 'unknown-pokemon';
      return validateKit(mon, action.moveIds);
    }

    case 'use-tm': {
      if (outOfCombat(state)) return 'wrong-phase';
      const mon = state.box.find((m) => m.uid === action.uid);
      if (!mon) return 'unknown-pokemon';
      if (!state.tms.includes(action.tmId)) return 'no-such-tm';
      const tm = ctx.content.tm(action.tmId);
      if (!tm.compatibleSpecies.includes(mon.speciesId)) return 'incompatible-tm';
      if (mon.pool.includes(tm.move)) return 'already-known';
      return undefined;
    }

    // Price is checked *last*, on purpose: 'the tutor does not teach that' is a more useful thing to be told
    // than 'you cannot afford it', and a player who hears the second first will go and earn money for a
    // service that was never on the menu.
    case 'teach-move': {
      if (state.phase !== 'dojo') return 'wrong-phase';
      const mon = state.box.find((m) => m.uid === action.uid);
      if (!mon) return 'unknown-pokemon';
      // §6.4.3 — the list is this stage's, so evolving changes what is on the menu.
      if (!ctx.content.species(mon.speciesId).tutorMoves.includes(action.moveId)) return 'not-on-tutor-list';
      if (mon.pool.includes(action.moveId)) return 'already-known';
      return state.money < priceFor(state, ctx.content, PRICES.dojoMove) ? 'cannot-afford' : undefined;
    }

    case 'set-ability': {
      if (state.phase !== 'dojo') return 'wrong-phase';
      const mon = state.box.find((m) => m.uid === action.uid);
      if (!mon) return 'unknown-pokemon';
      if (!ctx.content.species(mon.speciesId).availableAbilities.includes(action.abilityId)) return 'ability-not-in-pool';
      if (mon.abilityId === action.abilityId) return 'already-known';
      return state.money < priceFor(state, ctx.content, PRICES.dojoAbility) ? 'cannot-afford' : undefined;
    }

    case 'leave-dojo':
      return state.phase === 'dojo' ? undefined : 'wrong-phase';

    case 'leave-center':
      return state.phase === 'center' ? undefined : 'wrong-phase';

    case 'buy': {
      if (state.phase !== 'shop' || !state.pendingShop) return 'wrong-phase';
      const slot = state.pendingShop.slots[action.index];
      if (!slot) return 'invalid-slot';
      if (slot.sold) return 'already-sold';
      if (state.money < slot.price) return 'cannot-afford';
      // §7.3 — a relic you already hold never appears again; buying a duplicate would be money for nothing.
      if (slot.kind === 'relic' && state.relics.includes(slot.id)) return 'already-known';
      return undefined;
    }

    case 'reroll-shop': {
      if (state.phase !== 'shop' || !state.pendingShop) return 'wrong-phase';
      const price = rerollPrice(state.pendingShop);
      if (price === null) return 'no-rerolls-left';
      return state.money < price ? 'cannot-afford' : undefined;
    }

    case 'leave-shop':
      return state.phase === 'shop' ? undefined : 'wrong-phase';

    case 'use-therapy': {
      // §8.2.4 — Centres treat Trauma, and only Centres: the whole point of the service is that it is the
      // reason to walk into a Centre you did not strictly need for the heal.
      if (state.phase !== 'center') return 'wrong-phase';
      const mon = state.box.find((m) => m.uid === action.uid);
      if (!mon) return 'unknown-pokemon';
      if (mon.traumaStacks <= 0) return 'no-trauma';
      return state.money < therapyPrice(mon) ? 'cannot-afford' : undefined;
    }

    case 'equip-item': {
      if (outOfCombat(state)) return 'wrong-phase';
      const mon = state.box.find((m) => m.uid === action.uid);
      if (!mon) return 'unknown-pokemon';
      if (action.itemId === null) return mon.heldItem ? undefined : 'no-such-item';
      if (!state.bag.includes(action.itemId)) return 'no-such-item';
      // §7.4.6 — a signature item only goes on its own species.
      const def = ctx.content.heldItem(action.itemId);
      if (def.speciesLock && def.speciesLock !== mon.speciesId) return 'item-locked-to-species';
      return undefined;
    }

    case 'leave-event':
      return state.phase === 'event' && state.eventResult ? undefined : 'wrong-phase';

    case 'pick-legendary': {
      if (state.phase !== 'legendary' || !state.pendingLegendary) return 'wrong-phase';
      // null is "take none". Anything else has to be one of the three actually offered — a client cannot
      // name a relic that was not on the table.
      if (action.relicId !== null && !state.pendingLegendary.includes(action.relicId)) return 'not-offered';
      return undefined;
    }

    case 'choose-event': {
      // Once the result is on screen the choice is made; the only thing left to do is walk on.
      if (state.phase !== 'event' || !state.pendingEvent || state.eventResult) return 'wrong-phase';
      const event = mysteryEvent(state.pendingEvent);
      const choice = event.choices[action.option];
      if (!choice) return 'unknown-option';
      // A wager you cannot cover is not a gamble, it is a soft-lock. Same for a purchase you cannot make:
      // §2.10.2's costed choices are offers, and an offer you cannot take is greyed out, never taken.
      if (choice.cost && state.money < choice.cost) return 'cannot-afford';
      return undefined;
    }
  }
}

/** Everything a screen needs to know about the Box at a glance. */
export const runHelpers = { activeOf, healthy, maxHpOf };
