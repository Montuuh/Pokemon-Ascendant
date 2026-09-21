import type { ContentRegistry, RelicDef } from '../content/defs';
import type { DifficultyModifier } from '../run/modifiers';
import { STARTER_IDS } from '../run/region';
import type { RunPerks } from '../run/types';
import { hasHubUpgrade, levelFor, type AccountContext, type AccountState } from './account';
import { bondRank, bondUnlocks, isThreeStageLine } from './bond';

// §8.4–§8.6, §8.8 — what an account has opened, answered from the account and the content tables.
//
// account.ts owns the fold and knows nothing about relic tiers or the modifier list; this file is the seam
// where the two meet, and the one place the app asks "what may this player start a run with?".

// ── Relic tiers (§8.6) ───────────────────────────────────────────────────────────────────────────────────

export const relicTier = (r: RelicDef): 1 | 2 | 3 => r.tier ?? 1;

/** §8.6.1 — the Tier-2 rows in catalogue order: the order the track's "Relic pool +1" discovers them in. */
export const discoverableRelics = (content: ContentRegistry): string[] =>
  content.allRelics().filter((r) => relicTier(r) === 2 && !r.pending).map((r) => r.id);

/** §8.6.1 — the Pokémart's shelf: every Tier-3 row plus the one Tier-2 row that is also sold there. */
export const masteryRelics = (content: ContentRegistry): RelicDef[] =>
  content.allRelics().filter((r) => relicTier(r) === 3 || r.mastery === true);

/** Is this relic in the account's pool? Tier 1 and Legendary always; Tier 2 and 3 once unlocked. */
export function relicUnlocked(account: AccountState, r: RelicDef): boolean {
  return relicTier(r) === 1 || r.rarity === 'legendary' || account.relics.includes(r.id);
}

/** §8.6.2 — the ids a run started by this account may drop, offer or stock. */
export const relicPoolFor = (account: AccountState, content: ContentRegistry): string[] =>
  content.allRelics().filter((r) => relicUnlocked(account, r)).map((r) => r.id);

/** Tier-2 discovery progress for the Pokédex/Pokémart surfaces: null when the row has no criterion. */
export function discoveryProgress(account: AccountState, r: RelicDef): { have: number; goal: number; text: string } | null {
  if (!r.discovery) return null;
  return { have: Math.min(r.discovery.goal, account.counters[r.discovery.counter] ?? 0), goal: r.discovery.goal, text: r.discovery.text };
}

// ── Difficulty modifiers (§8.8) ──────────────────────────────────────────────────────────────────────────

/** §8.8.2 — unlocked by Trainer Level (or by an explicit grant on the account, of which there are none yet). */
export function modifierUnlocked(account: AccountState, m: DifficultyModifier): boolean {
  return levelFor(account.xp) >= m.unlockLevel || account.modifiers.includes(m.id);
}

/** §8.8.1 — how many modifiers a run may stack. */
export const modifierSlots = (account: AccountState): number => 1 + (hasHubUpgrade(account, 'modifier-slot-plus-one') ? 1 : 0);

// ── Starters (§8.5) ──────────────────────────────────────────────────────────────────────────────────────

/**
 * §8.5.2 — the three defaults plus whatever the track has unlocked, filtered to species this build ships.
 * Pikachu is on the track at Level 4 and has no authored kit yet; it stays unlocked on the account and off
 * the picker, and the picker says so.
 */
export function unlockedStarters(account: AccountState, content: ContentRegistry): string[] {
  const extra = account.starters.filter((id) => content.hasSpecies(id));
  // §6.8.2 rank 5 — a Soulbound line may start a run, whatever it is.
  const bonded = Object.entries(account.bond)
    .filter(([line, pts]) => bondRank(pts) >= 5 && content.hasSpecies(line))
    .map(([line]) => line);
  return [...new Set([...STARTER_IDS, ...extra, ...bonded])];
}

/** §6.8.2 — the Mastery tier a line may carry, from its Bond rank and whether it has a third stage. */
export function masteryTierFor(account: AccountState, line: string, content: ContentRegistry): number {
  return bondUnlocks(bondRank(account.bond[line] ?? 0), isThreeStageLine(line, content)).mastery;
}

/** §8.4.2 Twin Run — two starters, and the Box one larger. */
export const twinRun = (account: AccountState): boolean => hasHubUpgrade(account, 'twin-run');

/** §8.6.3 — how many Starting Relics the run-start offer shows. */
export const startingRelicOffers = (account: AccountState): number => 3 + (hasHubUpgrade(account, 'starting-relic-plus-one') ? 1 : 0);

// ── The run's snapshot (§8.10) ───────────────────────────────────────────────────────────────────────────

/** The account before any of this existed: the fixtures, the harness, and a fresh install. */
export const defaultPerks = (): RunPerks => ({ boxBonus: 0, relicPool: null, mastery: {}, bond: {}, familiar: [], insight: false });

/** §8.10 — everything a run takes from the account, frozen at its start. */
export function runPerksFor(account: AccountState, content: ContentRegistry, twin = false): RunPerks {
  return {
    boxBonus: (hasHubUpgrade(account, 'expanded-box') ? 2 : 0) + (twin ? 1 : 0),
    relicPool: relicPoolFor(account, content),
    mastery: Object.fromEntries(Object.keys(account.bond).map((line) => [line, masteryTierFor(account, line, content)]).filter(([, t]) => (t as number) > 0)),
    bond: Object.fromEntries(Object.entries(account.bond).map(([line, pts]) => [line, bondRank(pts)]).filter(([, r]) => (r as number) > 0)),
    familiar: Object.entries(account.dex).filter(([, e]) => e.tier >= 1).map(([id]) => id),
    insight: hasHubUpgrade(account, 'pokedex-insight'),
  };
}

/** The fold's context for this account: what is still discoverable, and the run's XP multiplier. */
export function accountContextFor(content: ContentRegistry, xpMultiplier = 1): AccountContext {
  return { content, xpMultiplier, discoverableRelics: discoverableRelics(content) };
}
