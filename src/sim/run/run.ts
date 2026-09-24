import { produce } from 'immer';
import type { ContentRegistry } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import { RngStreams } from '../rng/rngStreams';
import { knownMoves } from '../combat/stats';
import { isImmuneToStatus } from '../combat/status';
import { buildRingScenario, buildScenario, maxHpOf } from './encounter';
import { generateRegion, WILD_RARE_CHANCE } from './map';
import { ALL_GYMS, GYM, evolvedAt, gymById, regionContent, HELD_ITEM_DROP_CHANCE, RELIC_DROP_CHANCE, RUN_START, TM_DROP_CHANCE } from './region';
import { AID_HEAL_PCT, benchXpShare, floorRestockable, MONEY_REWARD, PRICES, ownedItems, relicMultiplier, rerollPrice, rollHeldItem, rollLegendaryOffer, rollRelic, rollRelicOffer, rollShopStock, sellPrice, therapyPrice } from './economy';
import { CASINO, CITIES, RING, cityAfter, isFinalRegion } from './cities';
import { mysteryEvent, rollEvent, STONE_CACHE, type EventOutcome } from './events';
import { hasModifier, modifierValue, modifierXpMultiplier } from './modifiers';
import { priceFor, rollRegionModifierOffer, traumaZone1Pct, victoryHealPct } from './regionModifiers';
import { FLEE_TOLL, describeToll, fleeTierFor } from './flee';
import { applyBranch, autoPickMoves, DEFAULT_PROGRESSION, encounterXp, grantXp, isEvolutionReady, learnMove, levelXpFactor, stoneUse, stonesForBox, type ProgressionConfig } from './xp';
import type { LevelUp, NodeKind, PartyMon, RingRung, RingState, RunAction, RunPerks, RunReduceResult, RunState, ShopSlot } from './types';


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
    case 'stone':
      return content.evolutionItem(slot.id).name;
  }
}

// §2 — the run reducer. Pure: (state, action) → state, exactly like the combat reducer, so a run is a seed
// plus an action log and a save is that pair (§10.7.4, §10.8).

// 11 — v0.7.5: Evolution Items (`stones`), the run's `starter` for its flourish, and a stone's Evolution screen
//      remembering where to hand back to (§6.3.2, §8.5.3). Migrated from 10 in save.ts.
// 10 — the Badges take the games' names (§5.10.4): the Poison and Psychic ids trade places and two are renamed.
//      Nothing else changed shape, so a version-9 save is migrated rather than refused (save.ts).
// 9 — v0.7.2: the City carries its Challenge Ring and the Game Corner's last result; Department Store slots
//     carry their floor; the CasinoRNG cursor (§2.9.4.1, §2.11.2, §2.11.5).
// 8 — v0.7.1: the City (`city`), the route's nurse and merchant replacing its Center, Shop and Dojo nodes,
//     and statuses carried between fights with their clock (§2.9, §2.11, §4.2.7.1).
// 4 — v0.4 added money, relics, held items, the Shop and Mystery Events (§7.3, §7.4, §2.9.2, §2.10).
// 3 — v0.3 added the Learned Move Pool, the passive slot, TMs and the evolution queue (§6.3, §6.4, §6.7).
export const RUN_SAVE_VERSION = 11;

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
    confusionTurns: 0,
    heldItem: null,
  };
  mon.hp = maxHpOf(mon, content);
  return mon;
}

/** The run of an account that has nothing yet — and of every fixture, which is the same thing. */
export const DEFAULT_PERKS: Readonly<RunPerks> = Object.freeze({ boxBonus: 0, relicPool: null, mastery: {}, bond: {}, familiar: [], insight: false });

/**
 * §2.1.1 — pre-run setup is over; build the route and put the starter in the Box.
 *
 * `perks` is the account's contribution (§8.10), frozen into the save here; `twin` is §8.4.2's second starter,
 * which arrives beside the first at the same level and shares the opening Active Team.
 */
export function createRun(starterId: string, seed: number, ctx: RunCtx, regionIndex = 0, modifiers: readonly string[] = [], startingRelic?: string, regionModifier?: string, perks: RunPerks = DEFAULT_PERKS, twin?: string): RunState {
  resetUidCounter();
  const streams = new RngStreams(seed);
  const mapRng = streams.get('MapRNG');
  const map = generateRegion(mapRng, ctx.content, regionIndex, seed, modifiers, [], wildRareChance(regionModifier ?? null, ctx.content));
  const starter = newPartyMon(starterId, RUN_START.starterLevel, ctx.content, seed);
  // §8.5.3 — the starter's flourish, if it has one (Pikachu's Light Ball).
  const starterItem = RUN_START.starterItems[starterId];
  if (starterItem && ctx.content.allHeldItems().some((i) => i.id === starterItem)) starter.heldItem = starterItem;
  const second = twin ? newPartyMon(twin, RUN_START.starterLevel, ctx.content, seed + 1) : null;

  return {
    version: RUN_SAVE_VERSION,
    seed,
    regionIndex,
    map,
    position: null,
    reachable: [...map.entry],
    visited: [],
    box: second ? [starter, second] : [starter],
    activeUids: second ? [starter.uid, second.uid] : [starter.uid],
    balls: RUN_START.balls,
    consumables: [...RUN_START.consumables],
    tms: [],
    stones: [],
    starter: starterId,
    money: RUN_START.money,
    relics: [],
    spentRelics: [],
    badges: [],
    bag: [],
    modifiers: [...modifiers],
    regionModifier: regionModifier ?? null,
    pendingShop: null,
    city: null,
    pendingEvent: null,
    eventResult: null,
    seenEvents: [],
    seenSpecies: [],
    phase: 'map',
    pendingNodeId: null,
    pendingScenario: null,
    pendingReward: null,
    pendingLegendary: null,
    pendingRecruit: null,
    pendingEvolutions: [],
    outcome: 'in-progress',
    cursors: { MapRNG: mapRng.cursor, EncounterRNG: streams.get('EncounterRNG').cursor, LootRNG: streams.get('LootRNG').cursor },
    stats: { nodesCleared: 0, combatsWon: 0, catches: 0, faints: 0, turnsPlayed: 0, recruits: 0, statusesTaken: 0, escapes: 0, startedAt: 0 },
    perks: { ...perks, mastery: { ...perks.mastery }, bond: { ...(perks.bond ?? {}) }, familiar: [...perks.familiar], relicPool: perks.relicPool ? [...perks.relicPool] : null },
    log: [second ? `A new run begins with ${ctx.content.species(starterId).name} and ${ctx.content.species(second.speciesId).name}.` : `A new run begins with ${ctx.content.species(starterId).name}.`],
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

/**
 * §6.8.3 — is this ability the line's hidden one, still locked for this run's account? The hidden ability is
 * authored on the base form and applies to every stage of the line; the rank travels in the run's perks.
 */
export function abilityLocked(run: RunState, speciesId: string, abilityId: string, content: ContentRegistry): boolean {
  const line = content.lineBase(speciesId);
  const hidden = content.species(line).hiddenAbility;
  return hidden === abilityId && (run.perks?.bond?.[line] ?? 0) < 3;
}

/**
 * §2.3.1 with §8.8 and §8.4.2 — how many the Box holds. Box Squeeze takes it to four and says "not expandable",
 * so the account's Expanded Box and the Box Expander relic both stand down under it.
 */
export function boxCapacity(run: RunState): number {
  if (hasModifier(run.modifiers, 'box-squeeze')) return modifierValue(run.modifiers, 'box-squeeze', 'boxCapacity', 4);
  return RUN_START.boxCapacity + (run.perks?.boxBonus ?? 0) + (run.relics.includes('box-expander') ? 2 : 0);
}

/**
 * §8.6.1 Evolution Catalyst — once per run, the first Pokémon to come within `levels` of its threshold evolves
 * there. The screen it opens is the ordinary one; the relic is spent when that evolution is chosen.
 */
function catalystLevels(run: RunState, content: ContentRegistry): number {
  if (!run.relics.includes('evolution-catalyst') || run.spentRelics.includes('evolution-catalyst')) return 0;
  const levels = content.relic('evolution-catalyst').params?.levels;
  return typeof levels === 'number' ? levels : 0;
}

/** §2.11.3 Naturalist's Lens — a Region Modifier that raises the Rare slot's chance is read when the map is drawn. */
function wildRareChance(modifierId: string | null, content: ContentRegistry): number {
  if (!modifierId) return WILD_RARE_CHANCE;
  const m = content.regionModifier(modifierId);
  return !m.pending && m.hook === 'wild-rare' && typeof m.params?.chance === 'number' ? m.params.chance : WILD_RARE_CHANCE;
}

/** §4.2.7 — every status off one Pokémon: the nurse, the Center and a faint all do this. */
function cureAll(mon: PartyMon): void {
  mon.status = null;
  mon.confusionTurns = 0;
}

/** §2.9.4 — a Dojo service's price here: the City's markup (base in the town, +30 % in the city), then any Region Modifier. */
export function dojoPrice(run: RunState, content: ContentRegistry, service: 'move' | 'ability'): number {
  const base = service === 'move' ? PRICES.dojoMove : PRICES.dojoAbility;
  const markup = run.city ? CITIES[run.city.id].dojoMarkup : 1;
  return priceFor(run, content, Math.round(base * markup));
}

/**
 * §2.1.4 — a Region's Gym is behind the run: stop in the next City, or — after the last Region — win it.
 * Victory Road and the League arrive in v0.9; until then the third Gym is the end of the run.
 */
function endRegion(draft: RunState, ctx: RunCtx): void {
  if (isFinalRegion(draft.regionIndex) || !cityAfter(draft.regionIndex)) {
    draft.outcome = 'victory';
    draft.phase = 'ended';
    return;
  }
  arriveAtCity(draft, ctx);
}

/** §2.11.2 — which shelf a shop visit is standing at. */
function shopKindFor(run: RunState): 'merchant' | 'city' | 'department-store' {
  if (!run.city) return 'merchant';
  return CITIES[run.city.id].shop === 'department-store' ? 'department-store' : 'city';
}

/**
 * §6.4.3, §2.9.4 — what the Dojo teaches this Pokémon, here. The town's Dojo sells the current stage's list;
 * the city's "wider list" (`dojoWide`) sells every stage the line has reached, so a Pokémon no longer has to hold
 * an evolution back to buy a pre-form move there.
 */
export function tutorListFor(run: RunState, mon: PartyMon, content: ContentRegistry): string[] {
  const own = content.species(mon.speciesId).tutorMoves;
  if (!run.city || !CITIES[run.city.id].dojoWide) return [...own];
  // The path from the line's base to this species, along evolvesTo (a branching line takes the branch it took).
  const path: string[] = [];
  const walk = (id: string): boolean => {
    path.push(id);
    if (id === mon.speciesId) return true;
    for (const next of content.species(id).evolvesTo ?? []) if (content.hasSpecies(next) && walk(next)) return true;
    path.pop();
    return false;
  };
  const stages = walk(content.lineBase(mon.speciesId)) ? path : [mon.speciesId];
  return [...new Set(stages.flatMap((id) => content.species(id).tutorMoves))];
}

/**
 * §2.9.4.1 — roll the Challenge Ring for this City: one rival per rung from the trainer rosters (the ladder
 * "reuses the trainer-battle generator"), each filled to a full team from the Elite's (then the other rosters'),
 * every Pokémon at the form its level warrants. Rung 1 stands the City's `firstOffset` above the Gym the run just
 * beat, each later rung `stepOffset` more.
 */
function rollRing(rng: GameRng, draft: RunState, ctx: RunCtx): RingState {
  const def = CITIES[draft.city?.id ?? cityAfter(draft.regionIndex) ?? 'pallet-town'];
  const nodes = Object.values(draft.map.nodes);
  const gymNode = nodes.find((n) => n.id === draft.position && n.kind === 'gym') ?? nodes.find((n) => n.kind === 'gym');
  const gymLevel = Math.max(1, ...(gymNode?.preview.enemies ?? []).map((e) => e.level));
  // The rivals are the Region you just walked: Pallet's are Region 1's rosters, Celadon's Region 2's (§2.9.4.1).
  const region = regionContent(draft.regionIndex);
  // Distinct archetypes where the rosters allow it, drawn without replacement.
  const rosters = [...region.trainers];
  const picked: typeof rosters = [];
  for (let i = 0; i < def.ring.prizes.length && rosters.length; i++) {
    const fresh = rosters.filter((r) => !picked.some((p) => p.archetype === r.archetype));
    const from = fresh.length ? fresh : rosters;
    const roster = from[rng.range(0, from.length)]!;
    picked.push(roster);
    rosters.splice(rosters.indexOf(roster), 1);
  }
  const rungs: RingRung[] = picked.map((roster, i) => {
    const level = gymLevel + def.ring.firstOffset + def.ring.stepOffset * i;
    const species: string[] = [];
    for (const m of [...roster.team, ...region.elite.team, ...region.trainers.flatMap((t) => t.team)]) {
      const form = evolvedAt(m.species, level, ctx.content);
      if (!species.includes(form) && species.length < def.ring.teamSize) species.push(form);
    }
    return {
      trainer: roster.name,
      sprite: roster.sprite,
      line: roster.line,
      // The last Pokémon is the ace, a level above the rest.
      team: species.map((id, k) => ({ species: id, level: level + (k === species.length - 1 ? 1 : 0) })),
      prize: def.ring.prizes[i]!,
    };
  });
  return { fee: def.ring.fee, rungs, entered: false, cleared: 0, banked: 0, fighting: false, done: false, pick: null };
}

/**
 * §2.9.4.1 — the ladder ends paid: everything banked goes to the wallet, and the Ring is shut for this visit.
 * The Ring is inside the Dojo, so its door leads back into the Dojo, not out to the town.
 */
function payRing(draft: RunState): void {
  const ring = draft.city!.ring!;
  if (ring.banked) say(draft, `The Ring pays out ${ring.banked} ₽.`);
  draft.money += ring.banked;
  ring.banked = 0;
  ring.done = true;
  draft.phase = 'dojo';
}

/**
 * §2.9.4.1 — a rung's fight is over. Won: its prize is banked (or, at the top, the Rare 1-of-3 opens). Lost —
 * or run from — and the ladder is lost with everything it paid; the fallen already carry their Trauma. It never
 * ends the run. No XP and no drop: the Ring pays its prizes, and a ladder that paid levels would be a second
 * route to farm.
 */
function resolveRing(draft: RunState, won: boolean, ctx: RunCtx): void {
  const ring = draft.city!.ring!;
  ring.fighting = false;
  draft.pendingScenario = null;
  if (!won) {
    const lost = ring.banked;
    ring.banked = 0;
    ring.done = true;
    draft.phase = 'dojo';
    say(draft, `The Ring is lost${lost ? `, and the ${lost} ₽ it had paid with it` : ''}.`);
    return;
  }
  const rung = ring.rungs[ring.cleared]!;
  ring.cleared += 1;
  draft.stats.combatsWon += 1;
  if ('money' in rung.prize) {
    ring.banked += rung.prize.money;
    say(draft, `${rung.trainer} is beaten — ${rung.prize.money} ₽ banked.`);
    draft.phase = 'ring';
    return;
  }
  const lootRng = new RngStreams(draft.seed).get('LootRNG');
  lootRng.cursor = draft.cursors.LootRNG ?? lootRng.cursor;
  // Rares first. An account that has not opened three Rares yet (§8.6.2) is topped up the way every relic roll
  // falls back (§7.3): the top of the ladder always holds a pick, never a silent nothing.
  const pick = rollRelicOffer(lootRng, ctx.content, draft.relics, 'rare', RING.pickCount, draft.perks.relicPool);
  while (pick.length < RING.pickCount) {
    const id = rollRelic(lootRng, ctx.content, [...draft.relics, ...pick], 'rare', draft.perks.relicPool);
    if (!id) break;
    pick.push(id);
  }
  ring.pick = pick;
  draft.cursors.LootRNG = lootRng.cursor;
  say(draft, `${rung.trainer} is beaten — the ladder is yours.`);
  if (ring.pick.length) draft.phase = 'relic-pick';
  else payRing(draft);
}

/** §2.11.5 — the Game Corner's own stream, resumed from the save so a reload shows the same next result. */
function casinoRng(draft: RunState): GameRng {
  const rng = new RngStreams(draft.seed).get('CasinoRNG');
  rng.cursor = draft.cursors.CasinoRNG ?? rng.cursor;
  return rng;
}

/**
 * §2.11 — walk into the City after a Gym. Everything the lobby offers is rolled here, once: the shop's stock
 * and the three Region Modifiers at the gate, so leaving a building and coming back is never a re-roll.
 * The Region's modifier expires with the Region (§2.1.4.1); the next one is picked at the gate.
 *
 * Exported for the dev hook, which uses it to stand a run in a City without playing a Region to get there.
 */
export function arriveAtCity(draft: RunState, ctx: RunCtx): void {
  const id = cityAfter(draft.regionIndex) ?? 'pallet-town';
  const rng = encounterRng(draft);
  const shop = rollShopStock(rng, ctx.content, draft, CITIES[id].shop === 'department-store' ? 'department-store' : 'city');
  // §8.4.2 Trauma Salve Cache — the first City's shelf always has a Salve. It takes the Uncommon relic's slot
  // (the Salve is an Uncommon), so the shelf keeps its eight; a run already holding one gets the roll instead.
  if (draft.perks.salveCache && draft.regionIndex === 0 && !draft.relics.includes('trauma-salve') && !shop.slots.some((s) => s.id === 'trauma-salve')) {
    const i = shop.slots.findIndex((s) => s.kind === 'relic' && ctx.content.relic(s.id).rarity === 'uncommon');
    const slot: ShopSlot = { kind: 'relic', id: 'trauma-salve', price: priceFor(draft, ctx.content, Math.round(PRICES.relic.uncommon * PRICES.cityMarkup)), sold: false };
    if (i >= 0) shop.slots[i] = { ...slot, ...(shop.slots[i]!.floor ? { floor: shop.slots[i]!.floor } : {}) };
    else shop.slots.push(slot);
  }
  const ring = rollRing(rng, { ...draft, city: { id, shop, reflection: [], ring: null, casino: { wheel: null, slots: null } } }, ctx);
  draft.cursors.EncounterRNG = rng.cursor;
  // The gate's offer is seeded from the run and the Region, like the pre-run offer is seeded from the run.
  const reflection = rollRegionModifierOffer((draft.seed ^ Math.imul(draft.regionIndex + 1, 0x9e3779b1)) >>> 0, ctx.content, draft.box, draft.money);
  draft.city = { id, shop, reflection, ring, casino: { wheel: null, slots: null } };
  draft.regionModifier = null;
  draft.pendingNodeId = null;
  draft.pendingShop = null;
  draft.phase = 'city';
  say(draft, `You arrive in ${CITIES[id].name}.`);
}

/** §2.9 — the nodes that are not a fight: nobody needs to be standing to walk into one. */
export const isServiceNode = (kind: NodeKind): boolean => kind === 'aid' || kind === 'merchant' || kind === 'mystery';

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
    draft.log.push(`${gym.name} is beaten. Region ${draft.regionIndex + 1} is cleared.`);

    // §7.3.7 — a Gym victory is a Legendary pick-moment. It stands between the Gym and the summary rather
    // than after it, because a choice offered on the results screen is a choice nobody makes.
    // Its own cursor on the loot stream, so a reload offers the same three (§10.8.6).
    const pickRng = new RngStreams(draft.seed).get('LootRNG');
    pickRng.cursor = draft.cursors.LootRNG ?? pickRng.cursor;
    const offer = rollLegendaryOffer(pickRng, ctx.content, draft.relics, 3, draft.perks.relicPool);
    draft.cursors.LootRNG = pickRng.cursor;
    if (offer.length) {
      draft.pendingLegendary = offer;
      draft.phase = 'legendary';
      return;
    }
    endRegion(draft, ctx);
  } else {
    draft.phase = 'map';
  }
}

/** §6.3.1 — every Pokémon standing at its threshold owes one Evolution screen, in Box order. */
function queueEvolutions(draft: RunState, content: ContentRegistry): void {
  let early = catalystLevels(draft, content);
  for (const mon of draft.box) {
    const ready = isEvolutionReady(mon, content) || (early > 0 && isEvolutionReady(mon, content, early));
    if (!ready) continue;
    if (draft.pendingEvolutions.some((p) => p.uid === mon.uid)) continue;
    // One Pokémon per run: the first that qualifies takes the Catalyst's four levels, and nobody else does.
    if (!isEvolutionReady(mon, content)) early = 0;
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
      const id = rollRelic(rng, ctx.content, draft.relics, outcome.rarity, draft.perks.relicPool);
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
    case 'stone': {
      // §6.3.2 — a named stone, or a random one the Box can use (any stone if nobody can).
      const usable = stonesForBox(draft.box, ctx.content);
      const all = ctx.content.allEvolutionItems().map((it) => it.id);
      const from = usable.length ? usable : all;
      const id = outcome.id ?? from[Math.min(from.length - 1, Math.floor(rng.range01() * from.length))]!;
      draft.stones.push(id);
      say(draft, `Took the ${ctx.content.evolutionItem(id).name}.`);
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
        if (node.kind === 'merchant') {
          // §2.9.2 — the travelling merchant's cart. Stock is seeded per visit.
          const rng = encounterRng(draft);
          draft.pendingShop = rollShopStock(rng, ctx.content, draft, 'merchant');
          draft.cursors.EncounterRNG = rng.cursor;
          draft.phase = 'shop';
          break;
        }
        if (node.kind === 'mystery') {
          // §2.10.4 — drawn without replacement, so an event never repeats within a run.
          const rng = encounterRng(draft);
          // §8.5.3 — an Eevee run's first Mystery node is the Stone Cache: a free stone, its choice of three.
          const cache = ctx.content.lineBase(draft.starter) === 'eevee' && !draft.seenEvents.includes(STONE_CACHE);
          draft.pendingEvent = cache ? STONE_CACHE : rollEvent(rng, draft.seenEvents);
          draft.seenEvents.push(draft.pendingEvent);
          draft.cursors.EncounterRNG = rng.cursor;
          draft.phase = 'event';
          break;
        }
        if (node.kind === 'aid') {
          // §2.9.1 — the field nurse: half a heal for everyone in the Box, fainted or not, and every status
          // cured. Not a decision, so it happens on arrival; the screen only says what she did. Trauma is a
          // Pokémon Center's work, and the Centers are in the Cities now.
          for (const mon of draft.box) {
            const max = effectiveMax(draft, mon, ctx.content);
            mon.hp = Math.min(max, mon.hp + Math.floor((max * AID_HEAL_PCT) / 100));
            cureAll(mon);
          }
          say(draft, 'The nurse patched everyone up.');
          draft.phase = 'aid';
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
        const healPct = report.outcome === 'victory' || report.outcome === 'caught' ? victoryHealPct(draft, ctx.content) : 0;

        // §8.6.1 Cleanse Tag's discovery counts statuses taken across the whole run.
        draft.stats.statusesTaken += report.tally?.statusesTaken ?? 0;
        // §8.4.2 — every species this fight fielded is now met.
        for (const e of draft.pendingScenario?.enemies ?? []) if (!draft.seenSpecies.includes(e.species)) draft.seenSpecies.push(e.species);

        // 1. Carry HP, status and Trauma back out of the fight (§2.4, §8.2.2).
        for (const result of report.team) {
          const mon = draft.box.find((m) => m.uid === result.uid);
          if (!mon) continue;
          mon.hp = Math.max(0, result.hp);
          // §4.2.7.1 — the status leaves the fight with its clock; a faint has already cleared it.
          mon.status = result.fainted ? null : result.status;
          mon.confusionTurns = result.fainted ? 0 : (result.confusionTurns ?? 0);
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

        // §2.9.4.1 — a Ring rung is not a map node: its prize or the ladder, and a lost rung costs the ladder,
        // not the run. Everything above (HP, statuses, Trauma, spent charges) has carried out as after any fight.
        if (draft.city?.ring?.fighting) {
          resolveRing(draft, report.outcome === 'victory', ctx);
          break;
        }

        if (report.outcome === 'defeat') {
          draft.outcome = 'defeat';
          draft.phase = 'ended';
          say(draft, 'Your team was wiped. The run ends here.');
          break;
        }

        // §3.1.2 — you ran. The parting shot has already landed (it is in the HP carried above); this is the
        // toll: money, Trauma, and for the bigger fights something from the bag. No XP, no drop, no reward
        // screen — the node is behind you and that is all it is.
        if (report.outcome === 'escaped') {
          const tier = fleeTierFor(node.kind);
          const toll = FLEE_TOLL[tier ?? 'wild'];
          const lost = Math.floor((draft.money * toll.moneyPct) / 100);
          draft.money -= lost;
          const lead = draft.box.find((m) => m.uid === draft.activeUids[0]);
          const shaken = toll.trauma === 'all' ? activeOf(draft) : lead ? [lead] : [];
          for (const mon of shaken) mon.traumaStacks = Math.min(10, mon.traumaStacks + 1);
          const lootRng = new RngStreams(draft.seed).get('LootRNG');
          lootRng.cursor = draft.cursors.LootRNG ?? lootRng.cursor;
          let taken: string | null = null;
          if (toll.loot === 'relic') {
            // Never a Legendary: those are a pick, not a drop, and losing one would undo a Gym.
            const pool = draft.relics.filter((id) => ctx.content.relic(id).rarity !== 'legendary');
            if (pool.length) {
              taken = pool[lootRng.range(0, pool.length)]!;
              draft.relics = draft.relics.filter((id) => id !== taken);
              say(draft, `The ${ctx.content.relic(taken).name} was left behind.`);
            }
          }
          if ((toll.loot === 'consumable' || (toll.loot === 'relic' && !taken)) && draft.consumables.length) {
            const at = lootRng.range(0, draft.consumables.length);
            taken = draft.consumables[at]!;
            draft.consumables.splice(at, 1);
            say(draft, `A ${ctx.content.consumable(taken).name} was dropped in the scramble.`);
          }
          draft.cursors.LootRNG = lootRng.cursor;
          draft.stats.escapes += 1;
          say(draft, `Got away — ${describeToll(toll)}${lost ? ` (${lost} ₽)` : ''}.`);
          draft.pendingScenario = null;
          advanceFrom(draft, node.id);
          draft.pendingNodeId = null;
          draft.phase = 'map';
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
        // §6.2.1 — scaled per Pokémon against the level of what was beaten (the average, for a team).
        const foes = draft.pendingScenario?.enemies ?? [];
        const foeLevel = foes.length ? foes.reduce((a, e) => a + e.level, 0) / foes.length : 1;
        for (const mon of draft.box) {
          const scaled = pot * levelXpFactor(foeLevel, mon.level, ctx.progression);
          const amount = Math.round(activeIds.has(mon.uid) ? scaled : scaled * share);
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
            relicDrop = rollRelic(lootRng, ctx.content, draft.relics, node.kind === 'trainer' ? undefined : 'uncommon', draft.perks.relicPool);
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
            draft.stats.recruits += 1;
            if (draft.activeUids.length < 3) draft.activeUids.push(recruit.uid);
            say(draft, `Caught ${ctx.content.species(caught.speciesId).name}!`);
            // §6.3.1 — a recruit caught past its threshold owes its Evolution screen now, like anyone else: a
            // Region 2 basic arrives at Lv 12–20 and every basic evolves at 12, so the catch is where its branch is chosen.
            queueEvolutions(draft, ctx.content);
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
        // §8.6.1 Evolution Catalyst — an evolution below the threshold is the one it paid for. A stone's is the
        // stone's (§6.3.2), and leaves the Catalyst armed.
        if (!pending.stone && !isEvolutionReady(mon, ctx.content) && !draft.spentRelics.includes('evolution-catalyst')) {
          draft.spentRelics.push('evolution-catalyst');
          say(draft, 'The Evolution Catalyst is spent.');
        }
        applyBranch(mon, action.branchId, ctx.content);
        // §4.2.7.1 — an evolution into a type immune to the status it carries clears it.
        if (mon.status && isImmuneToStatus(ctx.content.species(mon.speciesId).types, mon.status.kind)) mon.status = null;
        const branch = ctx.content.branch(action.branchId);
        say(draft, `${from} evolved into ${ctx.content.species(mon.speciesId).name} — ${branch.label}.`);
        draft.pendingEvolutions.shift();
        // A two-stage jump (Caterpie at 8 into Metapod, which evolves at 12) can arrive already ready again.
        queueEvolutions(draft, ctx.content);
        if (draft.pendingEvolutions.length) break;
        // §6.3.2 — a stone used between nodes hands back to where it was used; a level-up walks off the node.
        if (pending.returnTo) {
          draft.phase = pending.returnTo;
          break;
        }
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
            draft.stats.recruits += 1;
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

      // §6.3.2 — an Evolution Item: the stone is spent and the ordinary Evolution screen opens now, below the
      // level threshold, narrowed to the stone's branch where it makes one (Eevee).
      case 'use-stone': {
        const mon = draft.box.find((m) => m.uid === action.uid)!;
        const use = stoneUse(action.stoneId, mon.speciesId, ctx.content)!;
        draft.stones.splice(draft.stones.indexOf(action.stoneId), 1);
        const branches = ctx.content.species(mon.speciesId).branches.map((b) => b.id);
        draft.pendingEvolutions.unshift({
          uid: mon.uid,
          from: mon.speciesId,
          branchIds: use.branch ? [use.branch] : branches,
          stone: action.stoneId,
          returnTo: draft.phase,
        });
        draft.phase = 'evolution';
        say(draft, `The ${ctx.content.evolutionItem(action.stoneId).name} glows beside ${ctx.content.species(mon.speciesId).name}.`);
        break;
      }

      // §6.4.2 — the Dojo's tutor service: an off-learnset move for this stage, the kind nature would never give.
      case 'teach-move': {
        const mon = draft.box.find((m) => m.uid === action.uid)!;
        draft.money -= dojoPrice(draft, ctx.content, 'move');
        learnMove(mon, action.moveId);
        if (mon.moveIds.length < 4) mon.moveIds.push(action.moveId);
        say(draft, `The tutor taught ${ctx.content.species(mon.speciesId).name} ${ctx.content.move(action.moveId).name}.`);
        break;
      }

      // §6.4.2 / §6.5.1 — the ability service. One passive slot; swapping back is allowed on purpose.
      case 'set-ability': {
        const mon = draft.box.find((m) => m.uid === action.uid)!;
        draft.money -= dojoPrice(draft, ctx.content, 'ability');
        mon.abilityId = action.abilityId;
        say(draft, `${ctx.content.species(mon.speciesId).name}'s passive is now ${ctx.content.ability(action.abilityId).name}.`);
        break;
      }

      case 'leave-dojo':
      case 'leave-center': {
        // §2.11.0 — a City building's door leads back to the lobby, not onward.
        if (draft.city) {
          draft.phase = 'city';
          break;
        }
        leaveNode(draft, draft.pendingNodeId!, ctx);
        break;
      }

      case 'leave-aid': {
        leaveNode(draft, draft.pendingNodeId!, ctx);
        break;
      }

      // §2.11.0 — the open doors. The Center heals on the way in, like the route's Centers always did; the
      // shop brings back the stock rolled on arrival, so a sold slot stays sold across visits.
      case 'enter-building': {
        const city = draft.city!;
        if (action.building === 'center') {
          for (const mon of draft.box) {
            mon.hp = effectiveMax(draft, mon, ctx.content);
            cureAll(mon);
          }
          say(draft, 'The Pokémon Center restored your whole Box.');
          draft.phase = 'center';
        } else if (action.building === 'mart') {
          draft.pendingShop = city.shop;
          draft.phase = 'shop';
        } else if (action.building === 'game-corner') {
          draft.phase = 'game-corner';
        } else {
          say(draft, 'The Dojo master looks your team over.');
          draft.phase = 'dojo';
        }
        break;
      }

      // §2.9.4.1 — the Challenge Ring, from inside the Dojo: the fee is paid on the way onto the ladder.
      case 'enter-ring': {
        const ring = draft.city!.ring!;
        draft.money -= ring.fee;
        ring.entered = true;
        draft.phase = 'ring';
        say(draft, `Paid ${ring.fee} ₽ to step into the Ring.`);
        break;
      }

      // §2.9.4.1 — the next rung. No healing between rungs: the Box walks in as the last rung left it.
      case 'ring-fight': {
        const ring = draft.city!.ring!;
        const rng = encounterRng(draft);
        draft.pendingScenario = buildRingScenario(draft, ring.rungs[ring.cleared]!, ring.cleared, ctx.content, rng);
        draft.cursors.EncounterRNG = rng.cursor;
        ring.fighting = true;
        draft.phase = 'combat';
        break;
      }

      case 'ring-cash-out': {
        payRing(draft);
        break;
      }

      // §2.9.4.1 — the top rung's Rare relic, one of three (or none); the ladder then pays out whatever it banked.
      case 'ring-pick': {
        const ring = draft.city!.ring!;
        if (action.relicId) acquireRelic(draft, action.relicId, ctx.content);
        ring.pick = null;
        payRing(draft);
        break;
      }

      // §2.11.5 — the Wheel: a uniform stop on the printed rim, so the segment *is* the odds.
      case 'spin-wheel': {
        const rng = casinoRng(draft);
        const face = rng.range(0, CASINO.wheel.segments.length);
        draft.cursors.CasinoRNG = rng.cursor;
        const multiplier = CASINO.wheel.segments[face]!;
        const payout = action.stake * multiplier;
        draft.money += payout - action.stake;
        draft.city!.casino.wheel = { machine: 'wheel', stake: action.stake, multiplier, payout, face };
        say(draft, multiplier ? `The Wheel stops on ×${multiplier}: ${payout} ₽.` : `The Wheel stops on ×0. The ${action.stake} ₽ is gone.`);
        break;
      }

      // §2.11.5 — the Slots: the outcome from the table first, then three faces drawn to show it.
      case 'pull-slots': {
        const rng = casinoRng(draft);
        const multiplier = rng.pickWeighted(CASINO.slots.table.map((r) => [r.multiplier, r.weight] as const));
        let face: string[];
        const three = CASINO.slots.faces[multiplier];
        if (three) face = [three, three, three];
        else {
          const symbols = CASINO.slots.symbols;
          face = [0, 1, 2].map(() => symbols[rng.range(0, symbols.length)]!);
          // A losing pull never shows three of a kind: the faces only ever tell the truth.
          if (face[0] === face[1] && face[1] === face[2]) face[2] = symbols[(symbols.indexOf(face[2]!) + 1) % symbols.length]!;
        }
        draft.cursors.CasinoRNG = rng.cursor;
        const stake = CASINO.slots.stake;
        const payout = stake * multiplier;
        draft.money += payout - stake;
        draft.city!.casino.slots = { machine: 'slots', stake, multiplier, payout, face };
        say(draft, multiplier ? `Three of a kind — ×${multiplier}, ${payout} ₽.` : 'Nothing lines up.');
        break;
      }

      case 'leave-game-corner': {
        draft.phase = 'city';
        break;
      }

      // §2.11.3 — the gate. The pick *is* the departure: the modifier is set for the Region about to begin,
      // the next map is drawn, and the City is behind you.
      case 'depart-city': {
        draft.regionModifier = action.modifierId;
        draft.city = null;
        draft.regionIndex += 1;
        const mapRng = new RngStreams(draft.seed).get('MapRNG');
        mapRng.cursor = draft.cursors.MapRNG ?? mapRng.cursor;
        // §2.1 placeholder — a Gym whose Badge you hold is not drawn again (Region 3 still draws Region 1's pool).
        const beaten = ALL_GYMS.filter((g) => draft.badges.includes(g.badgeId)).map((g) => g.id);
        draft.map = generateRegion(mapRng, ctx.content, draft.regionIndex, draft.seed, draft.modifiers, beaten, wildRareChance(draft.regionModifier, ctx.content));
        draft.cursors.MapRNG = mapRng.cursor;
        draft.position = null;
        draft.reachable = [...draft.map.entry];
        draft.visited = [];
        draft.pendingNodeId = null;
        // docs/design/catalogs/economy.md §1 — one more Poké Ball as each Region begins.
        draft.balls += RUN_START.ballsPerRegion;
        draft.phase = 'map';
        say(draft, `Region ${draft.regionIndex + 1} begins — ${ctx.content.regionModifier(action.modifierId).name}.`);
        break;
      }

      // §2.11.2.4 — the run's one Poké Dollar exit valve.
      case 'sell-item': {
        draft.bag.splice(draft.bag.indexOf(action.itemId), 1);
        const price = sellPrice();
        draft.money += price;
        say(draft, `Sold a ${ctx.content.heldItem(action.itemId).name} for ${price} ₽.`);
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
            draft.balls += slot.qty ?? 1;
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
          case 'stone':
            draft.stones.push(slot.id);
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
        const kind = shopKindFor(draft);
        if (kind === 'department-store' && action.floor) {
          // §2.11.2 — a store re-roll restocks one floor; the other floors and anything sold stay as they are.
          const floor = action.floor;
          const fresh = rollShopStock(rng, ctx.content, draft, kind, [floor]).slots;
          const keep = stock.slots.filter((s) => s.floor !== floor || s.sold);
          const open = stock.slots.filter((s) => s.floor === floor && !s.sold).length;
          stock.slots = [...keep, ...fresh.slice(0, open)];
        } else {
          const fresh = rollShopStock(rng, ctx.content, draft, kind);
          const sold = stock.slots.filter((s) => s.sold);
          stock.slots = [...sold, ...fresh.slots.slice(0, Math.max(0, stock.slots.length - sold.length))];
        }
        draft.cursors.EncounterRNG = rng.cursor;
        stock.rerolls += 1;
        say(draft, 'The shopkeeper rummages under the counter.');
        break;
      }

      case 'leave-shop': {
        // §2.11.0 — a City shop keeps what it sold for the next visit; the route's merchant is gone once passed.
        if (draft.city) {
          draft.city.shop = draft.pendingShop!;
          draft.pendingShop = null;
          draft.phase = 'city';
          break;
        }
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
        endRegion(draft, ctx);
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
      // A service needs no one standing: the nurse is where a battered team goes, and the merchant does not fight.
      if (node && !isServiceNode(node.kind) && !state.activeUids.some((u) => (state.box.find((m) => m.uid === u)?.hp ?? 0) > 0))
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
    case 'set-active': {
      // §2.3 — the loadout changes on the map, in a preview, in a City's lobby, and between Ring rungs.
      if (state.phase !== 'map' && state.phase !== 'preview' && state.phase !== 'city' && state.phase !== 'ring') return 'wrong-phase';
      if (action.uids.length > 3) return 'team-too-large';
      if (action.uids.some((u) => !state.box.some((m) => m.uid === u))) return 'unknown-pokemon';
      if (!action.uids.some((u) => (state.box.find((m) => m.uid === u)?.hp ?? 0) > 0)) return 'no-healthy-pokemon';
      return undefined;
    }
    case 'set-lead':
      if (state.phase !== 'map' && state.phase !== 'preview' && state.phase !== 'city' && state.phase !== 'ring') return 'wrong-phase';
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

    case 'use-stone': {
      // §6.3.2 — between nodes only: on the map, in a City's lobby, or at the Dojo's Move Manager.
      if (state.phase !== 'map' && state.phase !== 'city' && state.phase !== 'dojo') return 'wrong-phase';
      const mon = state.box.find((m) => m.uid === action.uid);
      if (!mon) return 'unknown-pokemon';
      if (!state.stones.includes(action.stoneId)) return 'no-such-item';
      const use = stoneUse(action.stoneId, mon.speciesId, ctx.content);
      if (!use) return 'incompatible-stone';
      if (mon.level < use.fromLevel) return 'stone-too-early';
      return undefined;
    }

    // Price is checked *last*, on purpose: 'the tutor does not teach that' is a more useful thing to be told
    // than 'you cannot afford it', and a player who hears the second first will go and earn money for a
    // service that was never on the menu.
    case 'teach-move': {
      if (state.phase !== 'dojo') return 'wrong-phase';
      const mon = state.box.find((m) => m.uid === action.uid);
      if (!mon) return 'unknown-pokemon';
      // §6.4.3 — the list is this stage's (every reached stage's, in the city Dojo), so evolving changes the menu.
      if (!tutorListFor(state, mon, ctx.content).includes(action.moveId)) return 'not-on-tutor-list';
      if (mon.pool.includes(action.moveId)) return 'already-known';
      return state.money < dojoPrice(state, ctx.content, 'move') ? 'cannot-afford' : undefined;
    }

    case 'set-ability': {
      if (state.phase !== 'dojo') return 'wrong-phase';
      const mon = state.box.find((m) => m.uid === action.uid);
      if (!mon) return 'unknown-pokemon';
      if (!ctx.content.species(mon.speciesId).availableAbilities.includes(action.abilityId)) return 'ability-not-in-pool';
      // §6.8.3 — the line's hidden ability is in the pool but locked until Bond rank 3.
      if (abilityLocked(state, mon.speciesId, action.abilityId, ctx.content)) return 'ability-locked';
      if (mon.abilityId === action.abilityId) return 'already-known';
      return state.money < dojoPrice(state, ctx.content, 'ability') ? 'cannot-afford' : undefined;
    }

    case 'leave-dojo':
      return state.phase === 'dojo' ? undefined : 'wrong-phase';

    case 'enter-ring': {
      if (state.phase !== 'dojo') return 'wrong-phase';
      const ring = state.city?.ring;
      if (!ring || ring.entered || ring.done) return 'ring-closed';
      return state.money < ring.fee ? 'cannot-afford' : undefined;
    }
    case 'ring-fight': {
      const ring = state.city?.ring;
      if (state.phase !== 'ring' || !ring) return 'wrong-phase';
      if (!ring.entered || ring.done || ring.cleared >= ring.rungs.length) return 'ring-closed';
      if (!state.activeUids.some((u) => (state.box.find((m) => m.uid === u)?.hp ?? 0) > 0)) return 'no-healthy-pokemon';
      return undefined;
    }
    case 'ring-cash-out': {
      const ring = state.city?.ring;
      if (state.phase !== 'ring' || !ring) return 'wrong-phase';
      return ring.entered && !ring.done ? undefined : 'ring-closed';
    }
    case 'ring-pick': {
      const ring = state.city?.ring;
      if (state.phase !== 'relic-pick' || !ring?.pick) return 'wrong-phase';
      return action.relicId === null || ring.pick.includes(action.relicId) ? undefined : 'not-offered';
    }
    case 'spin-wheel': {
      if (state.phase !== 'game-corner') return 'wrong-phase';
      const { minStake, maxStake, step } = CASINO.wheel;
      if (!Number.isInteger(action.stake) || action.stake < minStake || action.stake > maxStake || action.stake % step !== 0) return 'bad-stake';
      return state.money < action.stake ? 'cannot-afford' : undefined;
    }
    case 'pull-slots':
      if (state.phase !== 'game-corner') return 'wrong-phase';
      return state.money < CASINO.slots.stake ? 'cannot-afford' : undefined;
    case 'leave-game-corner':
      return state.phase === 'game-corner' ? undefined : 'wrong-phase';

    case 'leave-center':
      return state.phase === 'center' ? undefined : 'wrong-phase';

    case 'leave-aid':
      return state.phase === 'aid' ? undefined : 'wrong-phase';

    case 'enter-building': {
      if (state.phase !== 'city' || !state.city) return 'not-in-city';
      return CITIES[state.city.id].open.includes(action.building) ? undefined : 'building-closed';
    }

    case 'depart-city': {
      if (state.phase !== 'city' || !state.city) return 'not-in-city';
      return state.city.reflection.includes(action.modifierId) ? undefined : 'not-offered';
    }

    case 'sell-item': {
      if (state.phase !== 'shop') return 'wrong-phase';
      if (!state.city) return 'not-in-city';
      return state.bag.includes(action.itemId) ? undefined : 'no-such-item';
    }

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
      if (state.money < price) return 'cannot-afford';
      // §2.11.2 — a store floor with nothing else to draw is not charged for showing the same shelf again.
      if (action.floor && shopKindFor(state) === 'department-store' && !floorRestockable(state, action.floor, ctx.content)) return 'nothing-to-restock';
      return undefined;
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
