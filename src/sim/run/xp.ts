import type { ContentRegistry, EvolutionBranch, EvolutionItemUse, EvolveMethod, SpeciesDef } from '../content/defs';
import type { EnemyTier } from '../content/defs';
import { learnInto, slotIndex, upgradeParents } from '../combat/kit';
import { statAtLevel } from '../combat/stats';
import { maxHpOf } from './encounter';
import type { LevelUp, PartyMon } from './types';

// §6.2 — XP, levels and what a level-up gives you. Numbers are the ProgressionConfig values from
// docs/design/catalogs/economy.md; a level-up matters here because it can add a card to the deck (§6.9).

export interface ProgressionConfig {
  wildXp: number;
  trainerXp: number;
  eliteXp: number;
  gymXp: number;
  /**
   * §6.2.1 — the boss-wilds (the Elite Wild, the Apex), Victory Road's Gauntlet, and the League's doors: priced on their
   * own since 2026-10-20, at what they paid before, when the Elite's and the Gym's levels came up to read right and their
   * pay came down to match (§2.8.1, §5.9.3). None of these moved a level.
   */
  apexXp: number;
  leagueXp: number;
  /** §6.2.1 — benched Box Pokémon learn at three-quarters speed, so rotating the team stays viable. */
  benchXpShare: number;
  levelUpBaseXp: number;
  levelUpSlopeXp: number;
  maxLevel: number;
  /**
   * §6.2.1 — the level-scaling exponent (Gen V's formula): a Pokémon above its foe learns less from it, one below
   * learns more. 0 turns the scaling off, which is how the pre-v0.7.1 curve is reproduced.
   */
  xpLevelExponent: number;
  /**
   * §6.2.1 — the share of a foe's XP that each enemy past the first pays (v0.8.6). Groups are the rule since v0.8.5,
   * and paying every Pokémon of a trio in full left teams seven to ten levels over their Region (measured).
   */
  extraEnemyXpShare: number;
  /** §6.3.9 — Friendship: what moves it, and what it opens. */
  friendship: FriendshipConfig;
}

/** §6.3.9 — the series' 0–255 scale and its gains (Gen II's level-up steps), tuned against the run harness. */
export interface FriendshipConfig {
  /** A caught, received or starting Pokémon's (the series' 70). */
  start: number;
  max: number;
  /** From here a level-up evolves a Friendship line (Gen II's 220). */
  evolve: number;
  /** Each won fight in the Active Team, and the Lead's extra on top. */
  win: number;
  lead: number;
  /** Each level gained: below 100, below 200, and from 200 (Gen II's +5 / +3 / +2). */
  levelUp: [number, number, number];
  /** Lost for each faint. */
  faint: number;
  /** §6.3.9 — the Center's grooming: what it gives, and its price. */
  groom: number;
  groomPrice: number;
}

// Tuned against the whole-run harness (src/sim/balance/runBalance.test.ts), not a single fight: the route has to carry
// a Lv 5 starter to about Lv 18 at Region 1's Gym, 30 at Region 2's and 45 at Region 3's (§6.2.4).
export const DEFAULT_PROGRESSION: ProgressionConfig = {
  // v0.8.6: ×0.8 with extra enemies at extraEnemyXpShare (were 48 / 72 / 110 / 200, every enemy in full).
  // v0.8.7: wild and trainer ×0.9 again (29 / 43) — the 20-column route walks ~12 fights where the old one walked
  // ~9.5 (§2.5.1). ×0.8 overshot (360 runs: R3|R2 30 %); ×0.9 reads R1 64 % · R2 61 % · R3 58 %.
  // v0.9.95 (§6.2.1, the user's playtest: "Lv 18 at the point of no return — trainers above all give a lot"): 26 / 39 →
  // 22 / 24. A trainer already pays for every Pokémon it sends (extraEnemyXpShare) and stands over the team (the level
  // factor), so its per-Pokémon rate came down to the wild's: one trainer is a level at Lv 10, not two.
  wildXp: 22,
  trainerXp: 24,
  // 2026-10-20: 66 → 49 and 120 → 80 — the Elite and the Gym stand over the team now (§2.8.1, §5.9.3), and the level
  // factor below pays them that much more; the run's XP stays where it was (harness: team Lv at each Gym unchanged).
  eliteXp: 49,
  // v0.9.92 (§6.2.4): 80 → 28 — a Gym is five Pokémon over the team, and at 80 it paid four levels in one fight.
  gymXp: 28,
  apexXp: 66,
  leagueXp: 120,
  benchXpShare: 0.75,
  // v0.9.90 (§6.2.4): 12 + 4(L−1) → 8 + 2(L−1), so the XP to reach a real level is what reaching the compressed one
  // cost (the levels stretched by 1.4: 8x + x² against 12x/1.4 + 2(x/1.4)², x the levels gained); the cap is the series' 100.
  // v0.9.92 (§6.2.4, the user's arc — Lv 18 / 30 / 45 at each Region's end): 8 + 2(L−1) → 32 + 1.2(L−1). The flat start
  // let two trainers take a starter from Lv 5 to 14; the new curve costs four times as much at Lv 5, as much at Lv 44.
  levelUpBaseXp: 32,
  levelUpSlopeXp: 1.2,
  maxLevel: 100,
  xpLevelExponent: 2.5,
  extraEnemyXpShare: 0.5,
  // v0.9.90: an Eevee caught on Route 1 reaches 220 around the end of Region 2 on wins and levels alone; the grooming
  // and the Soothe Bell bring it to the Region's middle.
  friendship: { start: 70, max: 255, evolve: 220, win: 2, lead: 1, levelUp: [5, 3, 2], faint: 5, groom: 25, groomPrice: 150 },
};

/** §6.3.9 — change one Pokémon's Friendship, held inside the scale. Returns what it actually moved. */
export function befriend(mon: PartyMon, amount: number, config = DEFAULT_PROGRESSION): number {
  const was = mon.friendship;
  mon.friendship = Math.max(0, Math.min(config.friendship.max, was + Math.round(amount)));
  return mon.friendship - was;
}

/** §6.3.9 — the Friendship one level-up gives at this much (Gen II's steps). */
function levelUpFriendship(friendship: number, config: ProgressionConfig): number {
  const [low, mid, high] = config.friendship.levelUp;
  return friendship < 100 ? low : friendship < 200 ? mid : high;
}

/** §6.2.3 — the XP needed to leave level L, a whole number (the slope is fractional since v0.9.92). */
export function xpToNext(level: number, config = DEFAULT_PROGRESSION): number {
  return Math.round(config.levelUpBaseXp + (Math.max(1, level) - 1) * config.levelUpSlopeXp);
}

/** §6.2.1 — XP for clearing an encounter, by the tier of what you beat (and the boss-wilds' and the League's own). */
export function encounterXp(tier: EnemyTier | 'apex' | 'league', enemyCount: number, config = DEFAULT_PROGRESSION): number {
  const per = tier === 'league' ? config.leagueXp
    : tier === 'apex' ? config.apexXp
    : tier === 'boss' ? config.gymXp
    : tier === 'elite' ? config.eliteXp
    : tier === 'trainer' ? config.trainerXp
    : config.wildXp;
  return per * (1 + Math.max(0, enemyCount - 1) * config.extraEnemyXpShare);
}

/**
 * §6.2.1 — how much of an encounter's XP a Pokémon of `monLevel` takes from foes of `enemyLevel`: Gen V's
 * `((2·Le + 10) / (Le + Lp + 10))^2.5`. Level with the foe it is 1; ten levels above a Lv 20 foe it is about
 * 0.65; five below it, about 1.3. It is what keeps a team from running away from the Region's level band —
 * without it a three-Region run ended with a Lv 43 team fighting Lv 33 Gyms, one or two turns a fight.
 */
export function levelXpFactor(enemyLevel: number, monLevel: number, config = DEFAULT_PROGRESSION): number {
  if (!config.xpLevelExponent) return 1;
  return Math.pow((2 * enemyLevel + 10) / (enemyLevel + monLevel + 10), config.xpLevelExponent);
}

/**
 * §6.9 / §6.9.1 — one learnset row on a Pokémon: `learnInto` on its pool, and the active 4 to match — a replaced move's
 * card becomes the new one where it stood; a move learned beside the rest fills a free slot.
 */
function learnRow(mon: PartyMon, entry: { move: string; replaces?: string }, parents: Map<string, Set<string>>): { move: string; replaced: string | null; activated: boolean } | null {
  const done = learnInto(mon.pool, entry, parents);
  if (!done) return null;
  if (done.replaced) {
    const at = mon.moveIds.indexOf(done.replaced);
    if (at >= 0) mon.moveIds[at] = done.move;
    return { ...done, activated: at >= 0 };
  }
  const activated = mon.moveIds.length < 4;
  if (activated) mon.moveIds.push(done.move);
  return { ...done, activated };
}

/** §6.7.1 — add a move to the pool if it is not already there. Returns whether it was new. */
export function learnMove(mon: PartyMon, moveId: string): boolean {
  if (mon.pool.includes(moveId)) return false;
  mon.pool.push(moveId);
  return true;
}

export { autoPickMoves } from '../combat/kit';

/**
 * Apply XP to one Pokémon and level it up as far as the XP goes.
 *
 * A level-up grows the **pool** (§6.7.1) and fills any free slot in the active 4, but never evicts a move the
 * player chose: past four, a new move waits in the pool until the Move Manager swaps it in. Evolution is not
 * applied here — crossing the threshold only flags it, because the branch is the player's call (§6.3.3) and
 * it is made on the Evolution screen between nodes (§3.6). Each level adds Friendship (§6.3.9), times
 * `friendshipScale` (the Soothe Bell's), and a level-up while a held-item or Friendship condition holds primes the
 * evolution it opens (§6.3.8).
 */
export function grantXp(mon: PartyMon, amount: number, content: ContentRegistry, config = DEFAULT_PROGRESSION, friendshipScale = 1): LevelUp | null {
  if (amount <= 0 || mon.level >= config.maxLevel) return null;
  const from = mon.level;
  mon.xp += Math.round(amount);

  while (mon.level < config.maxLevel && mon.xp >= xpToNext(mon.level, config)) {
    mon.xp -= xpToNext(mon.level, config);
    mon.level += 1;
  }
  if (mon.level === from) return null;

  const learned: string[] = [];
  const activated: string[] = [];
  const upgraded: { from: string; to: string }[] = [];
  // §6.9 — only what the new levels teach: a move an evolution has since rewritten is not learned again. §6.9.1 — a
  // track's row takes the slot of the move it replaces, in the pool and the active 4 (the Move Reminder keeps the old).
  const reached = content.lineLearnset(mon.speciesId).filter((l) => l.level > from && l.level <= mon.level);
  const parents = upgradeParents(content, mon.speciesId);
  for (const entry of reached) {
    const done = learnRow(mon, entry, parents);
    if (!done) continue;
    if (done.replaced) upgraded.push({ from: done.replaced, to: done.move });
    else {
      learned.push(done.move);
      if (done.activated) activated.push(done.move);
    }
  }

  const sp = content.species(mon.speciesId);
  const at = (k: 'hp' | 'attack' | 'defense' | 'speed') => statAtLevel(sp, k, mon.level, mon.archetype);
  const was = (k: 'hp' | 'attack' | 'defense' | 'speed') => statAtLevel(sp, k, from, mon.archetype);
  const up: LevelUp = {
    uid: mon.uid,
    from,
    to: mon.level,
    learned,
    activated,
    gains: { hp: at('hp') - was('hp'), attack: at('attack') - was('attack'), defense: at('defense') - was('defense'), speed: at('speed') - was('speed') },
    statsAt: { hp: at('hp'), attack: at('attack'), defense: at('defense'), speed: at('speed') },
  };
  if (upgraded.length) up.upgraded = upgraded;
  // §6.2.2 — the Max HP a level adds is added to current HP too, as in the series; a fainted Pokémon stays at 0.
  if (mon.hp > 0) mon.hp += maxHpOf(mon, content) - maxHpOf({ ...mon, level: from }, content);
  let befriended = 0;
  for (let l = from; l < mon.level; l++) befriended += befriend(mon, levelUpFriendship(mon.friendship, config) * friendshipScale, config);
  if (befriended) up.friendship = befriended;
  // §6.3.8 — the level-up is the trigger: holding the item (or this fond of you) as it levels, it is ready.
  if (evolutionConditionHolds(mon, sp, config)) mon.evolutionPrimed = mon.speciesId;
  if (isEvolutionReady(mon, content)) up.evolutionReady = true;
  return up;
}

/** §6.3.7 — how one branch evolves: its own method where it names one (Eevee's Umbreon), else its species'. */
export function evolveMethod(species: SpeciesDef, branch: EvolutionBranch): 'level' | EvolveMethod {
  return branch.by ?? species.evolveBy ?? 'level';
}

/** §6.3.8 — does a level-up now open a held-item or Friendship evolution of this species? */
function evolutionConditionHolds(mon: PartyMon, species: SpeciesDef, config: ProgressionConfig): boolean {
  return species.branches.some((b) => {
    const method = evolveMethod(species, b);
    return (method === 'held-item' && !!species.evolveItem && mon.heldItem === species.evolveItem)
      || (method === 'friendship' && mon.friendship >= config.friendship.evolve);
  });
}

/**
 * §2.12.3 — the Training Grounds' Level Push: exactly the XP the next level needs, granted now, with the stats, moves and
 * evolution flag that level brings. One function for the reducer and for the screen's preview of the same push (it hands
 * the screen a copy, so the level-up beat can show what is about to be learned before anything is committed).
 */
export function levelPush(mon: PartyMon, content: ContentRegistry, config = DEFAULT_PROGRESSION, friendshipScale = 1): LevelUp | null {
  return grantXp(mon, xpToNext(mon.level, config) - mon.xp, content, config, friendshipScale);
}

/** §6.3.2 — what a stone does for this species, or null when it does nothing for it. */
export function stoneUse(stoneId: string, speciesId: string, content: ContentRegistry): EvolutionItemUse | null {
  return content.evolutionItem(stoneId).uses.find((u) => u.species === speciesId) ?? null;
}

/** §6.3.2 — the stones that would evolve someone in this Box, now or once they reach the stone's level. */
export function stonesForBox(box: readonly PartyMon[], content: ContentRegistry): string[] {
  return content.allEvolutionItems().filter((it) => box.some((m) => stoneUse(it.id, m.speciesId, content))).map((it) => it.id);
}

/**
 * §6.3.7 — the branches this Pokémon may take now, by each one's method: a level line at its threshold (`early` levels
 * sooner, the Evolution Catalyst's), a held-item line primed and still holding its item, a Friendship branch primed. A
 * stone's branches are never ready by themselves: the stone opens its own screen (`use-stone`).
 */
export function readyBranches(mon: PartyMon, content: ContentRegistry, early = 0): string[] {
  const species = content.species(mon.speciesId);
  if (species.evolveLevel === undefined) return [];
  const primed = mon.evolutionPrimed === mon.speciesId;
  return species.branches.filter((b) => {
    switch (evolveMethod(species, b)) {
      case 'level': return mon.level + early >= species.evolveLevel!;
      case 'held-item': return primed && !!species.evolveItem && mon.heldItem === species.evolveItem;
      case 'friendship': return primed;
      case 'stone': return false;
    }
  }).map((b) => b.id);
}

/** §6.2.4 — is this Pokémon standing at an evolution, with a branch to pick? */
export function isEvolutionReady(mon: PartyMon, content: ContentRegistry, early = 0): boolean {
  return readyBranches(mon, content, early).length > 0;
}

/**
 * §6.3.3 — everything the Evolution screen has to show about one branch, computed here rather than in the
 * UI so the preview and the payload can never disagree. "Upgrade" versus "addition" is a property of this
 * Pokémon's pool, not of the branch: a move it never learned arrives as a gift instead of a replacement.
 */
export interface BranchPreview {
  branchId: string;
  to: string;
  upgrades: { from: string; to: string; inKit: boolean }[];
  adds: string[];
  /** The passive this branch ends up granting, or null when it leaves a chosen one alone. */
  abilityId: string | null;
  /** The four stats before and after the species swap, at the Pokémon's current level (the Evolution screen's bars). */
  statsBefore: { hp: number; attack: number; defense: number; speed: number };
  statsAfter: { hp: number; attack: number; defense: number; speed: number };
  /** The pool and the active 4 this branch leaves — what `applyBranch` would make of them, computed by it. */
  pool: string[];
  kit: string[];
}

export function previewBranch(mon: PartyMon, branchId: string, content: ContentRegistry): BranchPreview {
  const branch = content.branch(branchId);
  const before = content.species(mon.speciesId);
  const after = content.species(branch.to);

  const upgrades: BranchPreview['upgrades'] = [];
  const adds = [...branch.adds];
  // §6.9.1 — a branch follows its own slots, not the tracks' (`upgradeParents` without them).
  const parents = upgradeParents(content, mon.speciesId, false);
  for (const u of branch.upgrades) {
    // A slot is named by the move that first held it; it shows as whatever that slot holds now.
    const i = slotIndex(mon.pool, u.from, parents);
    const held = i >= 0 ? mon.pool[i]! : null;
    if (held && held !== u.to) upgrades.push({ from: held, to: u.to, inKit: mon.moveIds.includes(held) });
    else if (!held && !mon.pool.includes(u.to)) adds.push(u.to);
  }

  const granted = branch.abilityId ?? after.availableAbilities[0] ?? null;
  // §6.3.4 — before, as the Pokémon stands (its last path's lean); after, the new species on this branch's path.
  const stats = (sp: typeof before, arch: PartyMon['archetype']) => ({ hp: statAtLevel(sp, 'hp', mon.level, arch), attack: statAtLevel(sp, 'attack', mon.level, arch), defense: statAtLevel(sp, 'defense', mon.level, arch), speed: statAtLevel(sp, 'speed', mon.level, arch) });
  const statsBefore = stats(before, mon.archetype);
  const statsAfter = stats(after, branch.archetype);
  // The resulting kit, by the very function that will apply it, on a copy: the preview cannot disagree with the payload.
  const trial: PartyMon = { ...mon, pool: [...mon.pool], moveIds: [...mon.moveIds] };
  applyBranch(trial, branchId, content);
  return {
    branchId,
    to: branch.to,
    upgrades,
    adds,
    abilityId: branch.abilityId || mon.abilityId === null ? granted : null,
    statsBefore,
    statsAfter,
    pool: trial.pool,
    kit: trial.moveIds,
  };
}

/**
 * §6.3.5 — apply one branch's payload. An upgrade or a swap replaces its slot **in place** (and takes the same place
 * in the active 4 if it had one, §6.7.3); an addition appends. A slot is named by the move that first held it, so a
 * final evolution's swap lands on whatever the first evolution made of it. One whose slot the Pokémon never
 * learned arrives as an addition.
 */
export function applyBranch(mon: PartyMon, branchId: string, content: ContentRegistry): void {
  const branch = content.branch(branchId);
  delete mon.deferredEvolutionFrom;
  delete mon.deferredEvolutionStone;
  delete mon.deferredEvolutionForced;
  delete mon.evolutionPrimed;
  const maxBefore = maxHpOf(mon, content);
  mon.speciesId = branch.to;
  mon.archetype = branch.archetype;

  // §6.9.1 — a branch follows its own slots, not the tracks': a slot a track grew keeps its card, and the upgrade arrives
  // beside it. The catch-up below learns along the tracks.
  const branchParents = upgradeParents(content, mon.speciesId, false);
  const parents = upgradeParents(content, mon.speciesId);
  for (const u of branch.upgrades) {
    const inPool = slotIndex(mon.pool, u.from, branchParents);
    const held = inPool >= 0 ? mon.pool[inPool]! : null;
    if (held) mon.pool[inPool] = u.to;
    else if (!mon.pool.includes(u.to)) mon.pool.push(u.to);
    const inKit = held ? mon.moveIds.indexOf(held) : -1;
    if (inKit >= 0) mon.moveIds[inKit] = u.to;
  }
  for (const add of branch.adds) {
    if (learnMove(mon, add) && mon.moveIds.length < 4) mon.moveIds.push(add);
  }
  // §6.9 — the new form's own learnset up to the level it evolved at (v0.9.11): a late evolution — a stone used at
  // Lv 30, an evolution put off — learns what that form would already know, rather than nothing until its next level.
  for (const l of [...content.species(branch.to).learnset].sort((a, b) => a.level - b.level)) {
    if (l.level <= mon.level) learnRow(mon, l, parents);
  }

  // §6.7.1 — the pool deduplicates: an upgrade can land on a move a TM already gave you.
  mon.pool = [...new Set(mon.pool)];
  mon.moveIds = [...new Set(mon.moveIds)].filter((m) => mon.pool.includes(m)).slice(0, 4);

  // §6.5.1 — the first evolution grants a passive; later ones leave a chosen one alone unless the branch
  // names its own, which is how an archetype expresses itself beyond its moves.
  const granted = branch.abilityId ?? content.species(branch.to).availableAbilities[0] ?? null;
  if (branch.abilityId || mon.abilityId === null) mon.abilityId = granted;
  // §6.2.2 — as with a level, the Max HP an evolution adds is added to current HP: the damage taken stays the same.
  if (mon.hp > 0) mon.hp = Math.max(1, Math.min(maxHpOf(mon, content), mon.hp + maxHpOf(mon, content) - maxBefore));
}

/** §6.3 — what one branch does, read off the content alone (v0.9.9, for the Pokédex): no Pokémon needed. */
export interface BranchPayload {
  branchId: string;
  from: string;
  to: string;
  /** The level it opens at, or null for one that a stone, a held item or Friendship opens (§6.3.7). */
  level: number | null;
  /** §6.3.7 — how it opens, and the held item it levels up with for `held-item`. */
  method: 'level' | EvolveMethod;
  item: string | null;
  /** §6.3.2 — the Evolution Items that make this branch (Eevee's stones). */
  stones: string[];
  archetype: EvolutionBranch['archetype'];
  label: string;
  /** Upgrades as the branch names them: the slot's first move → the new one. The old card is forgotten. */
  upgrades: { from: string; to: string }[];
  adds: string[];
  abilityId: string | null;
  /** The level the two stat rows below are read at: the threshold, a stone's first level, or the series' trainers' level. */
  statsAt: number;
  /** §6.3.4 — the stats at the threshold, before (the form as it stands) and after (the new form on this path's lean). */
  statsBefore: Record<'hp' | 'attack' | 'defense' | 'speed', number>;
  statsAfter: Record<'hp' | 'attack' | 'defense' | 'speed', number>;
}

export function branchPayload(content: ContentRegistry, branchId: string): BranchPayload {
  const branch = content.branch(branchId);
  const from = content.allSpecies().find((s) => s.branches.some((b) => b.id === branchId))!;
  const to = content.species(branch.to);
  const stones = content.allEvolutionItems().filter((i) => i.uses.some((u) => u.species === from.id && (!u.branch || u.branch === branchId))).map((i) => i.id);
  const method = evolveMethod(from, branch);
  const level = method === 'level' ? from.evolveLevel ?? null : null;
  // A stone's shows its stats at the stone's first level; a held item's and Friendship's where the series' trainers field it.
  const at = level ?? (method === 'stone' ? Math.min(...content.allEvolutionItems().flatMap((i) => i.uses.filter((u) => u.species === from.id).map((u) => u.fromLevel)), 30) : from.evolveLevel ?? 30);
  const stats = (sp: typeof from, arch: EvolutionBranch['archetype'] | null) => ({ hp: statAtLevel(sp, 'hp', at, arch), attack: statAtLevel(sp, 'attack', at, arch), defense: statAtLevel(sp, 'defense', at, arch), speed: statAtLevel(sp, 'speed', at, arch) });
  return {
    branchId,
    from: from.id,
    to: to.id,
    level,
    method,
    item: method === 'held-item' ? from.evolveItem ?? null : null,
    stones,
    archetype: branch.archetype,
    label: branch.label,
    upgrades: branch.upgrades.map((u) => ({ from: u.from, to: u.to })),
    adds: [...branch.adds],
    abilityId: branch.abilityId ?? to.availableAbilities[0] ?? null,
    statsAt: at,
    statsBefore: stats(from, from.archetype ?? null),
    statsAfter: stats(to, branch.archetype),
  };
}
