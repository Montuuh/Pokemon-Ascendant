import type { ContentRegistry, EvolutionBranch, EvolutionItemUse } from '../content/defs';
import type { EnemyTier } from '../content/defs';
import { slotIndex, upgradeParents } from '../combat/kit';
import { statAtLevel } from '../combat/stats';
import type { LevelUp, PartyMon } from './types';

// §6.2 — XP, levels and what a level-up gives you. Numbers are the ProgressionConfig values from
// docs/design/catalogs/economy.md; a level-up matters here because it can add a card to the deck (§6.9).

export interface ProgressionConfig {
  wildXp: number;
  trainerXp: number;
  eliteXp: number;
  gymXp: number;
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
}

// Tuned against the whole-run harness (src/sim/balance/runBalance.test.ts), not a single fight: a seven-node
// route has to carry a Lv 5 starter to roughly Lv 14, which is the level the Gym in §5.9 is written for.
export const DEFAULT_PROGRESSION: ProgressionConfig = {
  // v0.8.6: ×0.8 with extra enemies at extraEnemyXpShare (were 48 / 72 / 110 / 200, every enemy in full).
  // v0.8.7: wild and trainer ×0.9 again (29 / 43) — the 20-column route walks ~12 fights where the old one walked
  // ~9.5 (§2.5.1). ×0.8 overshot (360 runs: R3|R2 30 %); ×0.9 reads R1 64 % · R2 61 % · R3 58 %.
  wildXp: 26,
  trainerXp: 39,
  eliteXp: 66,
  gymXp: 120,
  benchXpShare: 0.75,
  levelUpBaseXp: 12,
  levelUpSlopeXp: 4,
  maxLevel: 60,
  xpLevelExponent: 2.5,
  extraEnemyXpShare: 0.5,
};

/** §6.2.3 — the XP needed to leave level L. */
export function xpToNext(level: number, config = DEFAULT_PROGRESSION): number {
  return config.levelUpBaseXp + (Math.max(1, level) - 1) * config.levelUpSlopeXp;
}

/** §6.2.1 — XP for clearing an encounter, by the tier of what you beat. */
export function encounterXp(tier: EnemyTier, enemyCount: number, config = DEFAULT_PROGRESSION): number {
  const per = tier === 'boss' ? config.gymXp
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
 * it is made on the Evolution screen between nodes (§3.6).
 */
export function grantXp(mon: PartyMon, amount: number, content: ContentRegistry, config = DEFAULT_PROGRESSION): LevelUp | null {
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
  // §6.9 — only what the new levels teach: a move an evolution has since rewritten is not learned again.
  const reached = content.lineLearnset(mon.speciesId).filter((l) => l.level > from && l.level <= mon.level).map((l) => l.move);
  for (const id of reached) {
    if (!learnMove(mon, id)) continue;
    learned.push(id);
    if (mon.moveIds.length < 4) {
      mon.moveIds.push(id);
      activated.push(id);
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
  if (isEvolutionReady(mon, content)) up.evolutionReady = true;
  return up;
}

/** §6.2.4 — is this Pokémon standing at its evolution threshold, with a branch to pick? */
/** §6.3.2 — what a stone does for this species, or null when it does nothing for it. */
export function stoneUse(stoneId: string, speciesId: string, content: ContentRegistry): EvolutionItemUse | null {
  return content.evolutionItem(stoneId).uses.find((u) => u.species === speciesId) ?? null;
}

/** §6.3.2 — the stones that would evolve someone in this Box, now or once they reach the stone's level. */
export function stonesForBox(box: readonly PartyMon[], content: ContentRegistry): string[] {
  return content.allEvolutionItems().filter((it) => box.some((m) => stoneUse(it.id, m.speciesId, content))).map((it) => it.id);
}

export function isEvolutionReady(mon: PartyMon, content: ContentRegistry, early = 0): boolean {
  const species = content.species(mon.speciesId);
  return species.evolveLevel !== undefined && mon.level + early >= species.evolveLevel && species.branches.length > 0;
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
  const parents = upgradeParents(content, mon.speciesId);
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
  mon.speciesId = branch.to;
  mon.archetype = branch.archetype;

  const parents = upgradeParents(content, mon.speciesId);
  for (const u of branch.upgrades) {
    const inPool = slotIndex(mon.pool, u.from, parents);
    const held = inPool >= 0 ? mon.pool[inPool]! : null;
    if (held) mon.pool[inPool] = u.to;
    else if (!mon.pool.includes(u.to)) mon.pool.push(u.to);
    const inKit = held ? mon.moveIds.indexOf(held) : -1;
    if (inKit >= 0) mon.moveIds[inKit] = u.to;
  }
  for (const add of branch.adds) {
    if (learnMove(mon, add) && mon.moveIds.length < 4) mon.moveIds.push(add);
  }

  // §6.7.1 — the pool deduplicates: an upgrade can land on a move a TM already gave you.
  mon.pool = [...new Set(mon.pool)];
  mon.moveIds = [...new Set(mon.moveIds)].filter((m) => mon.pool.includes(m)).slice(0, 4);

  // §6.5.1 — the first evolution grants a passive; later ones leave a chosen one alone unless the branch
  // names its own, which is how an archetype expresses itself beyond its moves.
  const granted = branch.abilityId ?? content.species(branch.to).availableAbilities[0] ?? null;
  if (branch.abilityId || mon.abilityId === null) mon.abilityId = granted;
}

/** §6.3 — what one branch does, read off the content alone (v0.9.9, for the Pokédex): no Pokémon needed. */
export interface BranchPayload {
  branchId: string;
  from: string;
  to: string;
  /** The level it opens at, or null for a stone-only evolution. */
  level: number | null;
  /** §6.3.2 — the Evolution Items that make this branch (Eevee's stones). */
  stones: string[];
  archetype: EvolutionBranch['archetype'];
  label: string;
  /** Upgrades as the branch names them: the slot's first move → the new one. The old card is forgotten. */
  upgrades: { from: string; to: string }[];
  adds: string[];
  abilityId: string | null;
  /** §6.3.4 — the stats at the threshold, before (the form as it stands) and after (the new form on this path's lean). */
  statsBefore: Record<'hp' | 'attack' | 'defense' | 'speed', number>;
  statsAfter: Record<'hp' | 'attack' | 'defense' | 'speed', number>;
}

export function branchPayload(content: ContentRegistry, branchId: string): BranchPayload {
  const branch = content.branch(branchId);
  const from = content.allSpecies().find((s) => s.branches.some((b) => b.id === branchId))!;
  const to = content.species(branch.to);
  const stones = content.allEvolutionItems().filter((i) => i.uses.some((u) => u.species === from.id && (!u.branch || u.branch === branchId))).map((i) => i.id);
  const level = from.evolveLevel ?? null;
  const at = level ?? Math.min(...content.allEvolutionItems().flatMap((i) => i.uses.filter((u) => u.species === from.id).map((u) => u.fromLevel)), 30);
  const stats = (sp: typeof from, arch: EvolutionBranch['archetype'] | null) => ({ hp: statAtLevel(sp, 'hp', at, arch), attack: statAtLevel(sp, 'attack', at, arch), defense: statAtLevel(sp, 'defense', at, arch), speed: statAtLevel(sp, 'speed', at, arch) });
  return {
    branchId,
    from: from.id,
    to: to.id,
    level,
    stones,
    archetype: branch.archetype,
    label: branch.label,
    upgrades: branch.upgrades.map((u) => ({ from: u.from, to: u.to })),
    adds: [...branch.adds],
    abilityId: branch.abilityId ?? to.availableAbilities[0] ?? null,
    statsBefore: stats(from, from.archetype ?? null),
    statsAfter: stats(to, branch.archetype),
  };
}
