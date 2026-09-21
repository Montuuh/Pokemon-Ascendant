import type { ContentRegistry } from '../content/defs';
import type { EnemyTier } from '../content/defs';
import { knownMoves } from '../combat/stats';
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
}

// Tuned against the whole-run harness (src/sim/balance/runBalance.test.ts), not a single fight: a seven-node
// route has to carry a Lv 5 starter to roughly Lv 14, which is the level the Gym in §5.9 is written for.
export const DEFAULT_PROGRESSION: ProgressionConfig = {
  wildXp: 48,
  trainerXp: 72,
  eliteXp: 110,
  gymXp: 200,
  benchXpShare: 0.75,
  levelUpBaseXp: 12,
  levelUpSlopeXp: 4,
  maxLevel: 60,
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
  return per * Math.max(1, enemyCount);
}

/** §6.7.1 — add a move to the pool if it is not already there. Returns whether it was new. */
export function learnMove(mon: PartyMon, moveId: string): boolean {
  if (mon.pool.includes(moveId)) return false;
  mon.pool.push(moveId);
  return true;
}

/**
 * §6.7.2 — the Move Manager's "Auto" button, and the fallback for a player who never opens it.
 *
 * Two kit rules from §6.3.6 are enforced here, and both were learned the hard way from the whole-run harness:
 *
 *  1. **Two ways to deal damage.** "The four most recently learned" alone produced kits with one damaging
 *     card, or none — Oddish learns Absorb at 1 and Acid at 7, so by level 10 its only card that hurts a Rock
 *     was gone.
 *  2. **At least one Ranged card** (§6.3.6.5), whenever the pool has one. A four-Melee kit is a dead hand
 *     every turn that Pokémon is benched. Evolution branches made this reachable: a Vanguard Charmeleon's
 *     pool is mostly Melee, and picking purely by power dropped Ember — the only card it could play from the
 *     bench — which cost the Charmander line two thirds of its win rate before the harness caught it.
 *
 * Otherwise: keep the two strongest attacks, fill with the newest of the rest, and return them in learn order
 * so the kit still reads as a history.
 */
export function autoPickMoves(pool: readonly string[], content: ContentRegistry, cap = 4): string[] {
  if (pool.length <= cap) return [...pool];
  const power = (id: string) => content.move(id).power ?? 0;
  const ranged = (id: string) => content.move(id).range === 'ranged';

  const attacks = pool.filter((m) => power(m) > 0);
  const keep = [...attacks].sort((a, b) => power(b) - power(a)).slice(0, Math.min(2, attacks.length));
  const rest = pool.filter((m) => !keep.includes(m));
  const picked = new Set([...keep, ...rest.slice(rest.length - (cap - keep.length))]);

  // §6.3.6.5 — buy a Ranged card with the least useful slot we hold: a zero-power card first, then the
  // weakest attack, and never the last attack we have.
  if (!Array.from(picked).some(ranged)) {
    const candidate = pool.filter(ranged).sort((a, b) => power(b) - power(a))[0];
    if (candidate) {
      const held = Array.from(picked);
      const attacksHeld = held.filter((m) => power(m) > 0);
      const drop =
        held.filter((m) => power(m) === 0).sort((a, b) => held.indexOf(a) - held.indexOf(b))[0] ??
        (attacksHeld.length > 1 ? [...attacksHeld].sort((a, b) => power(a) - power(b))[0] : undefined);
      if (drop) {
        picked.delete(drop);
        picked.add(candidate);
      }
    }
  }
  return pool.filter((m) => picked.has(m));
}

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
  for (const id of knownMoves(content, mon.speciesId, mon.level)) {
    if (!learnMove(mon, id)) continue;
    learned.push(id);
    if (mon.moveIds.length < 4) {
      mon.moveIds.push(id);
      activated.push(id);
    }
  }

  const up: LevelUp = { uid: mon.uid, from, to: mon.level, learned, activated };
  if (isEvolutionReady(mon, content)) up.evolutionReady = true;
  return up;
}

/** §6.2.4 — is this Pokémon standing at its evolution threshold, with a branch to pick? */
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
  /** Level-scaled stat change from the species swap, at the Pokémon's current level. */
  statDelta: { hp: number; attack: number; defense: number; speed: number };
}

export function previewBranch(mon: PartyMon, branchId: string, content: ContentRegistry): BranchPreview {
  const branch = content.branch(branchId);
  const before = content.species(mon.speciesId);
  const after = content.species(branch.to);
  const lv = Math.max(1, mon.level) - 1;
  const at = (s: typeof before, k: 'hp' | 'attack' | 'defense' | 'speed') => s.baseStats[k] + s.growth[k] * lv;

  const upgrades: BranchPreview['upgrades'] = [];
  const adds = [...branch.adds];
  for (const u of branch.upgrades) {
    if (mon.pool.includes(u.from)) upgrades.push({ from: u.from, to: u.to, inKit: mon.moveIds.includes(u.from) });
    else if (!mon.pool.includes(u.to)) adds.push(u.to);
  }

  const granted = branch.abilityId ?? after.availableAbilities[0] ?? null;
  return {
    branchId,
    to: branch.to,
    upgrades,
    adds,
    abilityId: branch.abilityId || mon.abilityId === null ? granted : null,
    statDelta: {
      hp: at(after, 'hp') - at(before, 'hp'),
      attack: at(after, 'attack') - at(before, 'attack'),
      defense: at(after, 'defense') - at(before, 'defense'),
      speed: at(after, 'speed') - at(before, 'speed'),
    },
  };
}

/**
 * §6.3.5 — apply one branch's payload. Purely additive: an upgrade replaces its pool entry **in place** (and
 * takes the same slot in the active 4 if it had one, §6.7.3), an addition appends, and nothing is ever
 * removed. An upgrade whose `from` the Pokémon never learned simply arrives as an addition.
 */
export function applyBranch(mon: PartyMon, branchId: string, content: ContentRegistry): void {
  const branch = content.branch(branchId);
  mon.speciesId = branch.to;
  mon.archetype = branch.archetype;

  for (const u of branch.upgrades) {
    const inPool = mon.pool.indexOf(u.from);
    if (inPool >= 0) mon.pool[inPool] = u.to;
    else if (!mon.pool.includes(u.to)) mon.pool.push(u.to);
    const inKit = mon.moveIds.indexOf(u.from);
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
