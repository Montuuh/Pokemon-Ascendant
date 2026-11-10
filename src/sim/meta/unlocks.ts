import type { ContentRegistry, RelicDef } from '../content/defs';
import type { DifficultyModifier } from '../run/modifiers';
import { STARTER_IDS } from '../run/region';
import type { RunPerks } from '../run/types';
import { KIT, hasHubUpgrade, type AccountContext, type AccountState } from './account';
import { BOND_TIER, bondRank, bondUnlocks } from './bond';
import { LADDER_TOP } from './ladder';
import { isVaulted, lockedKeys } from './vault';

// §8.4–§8.6, §8.8 — what an account has opened, answered from the account and the content tables.
//
// account.ts owns the fold and knows nothing about the modifier list or what a run reads; this file is the seam
// where the two meet, and the one place the app asks "what may this player start a run with?".

// ── The vault (§8.6) ─────────────────────────────────────────────────────────────────────────────────────

/** Is this relic in the account's pool? Everything the vault does not hold back, plus what the account has opened. */
export const relicUnlocked = (account: AccountState, r: RelicDef): boolean => !isVaulted(account, 'relic', r.id);

/** §8.6.2 — the relic ids a run started by this account may drop, offer or stock. */
export const relicPoolFor = (account: AccountState, content: ContentRegistry): string[] =>
  content.allRelics().filter((r) => relicUnlocked(account, r)).map((r) => r.id);

// ── Difficulty modifiers and the League Ladder (§8.8) ────────────────────────────────────────────────────

/** §8.8.5 — the Ladder opens with the first Champion. */
export const ladderOpen = (account: AccountState): boolean => account.stats.wins > 0;

/** §8.8.5 — the rung this account may attempt next; null before the Ladder opens or once the top is won. */
export const nextRung = (account: AccountState): number | null => (ladderOpen(account) && account.ladder < LADDER_TOP ? account.ladder + 1 : null);

/** §8.8.2 — a modifier is free for a custom run once the rung that introduces it has been won. */
export function modifierUnlocked(account: AccountState, m: DifficultyModifier): boolean {
  return account.ladder >= m.rung;
}

/** §8.8.1 — how many modifiers a custom run may stack. */
export const modifierSlots = (account: AccountState): number => 1 + (hasHubUpgrade(account, 'modifier-slot-plus-one') ? 1 : 0);

// ── Starters (§8.5) ──────────────────────────────────────────────────────────────────────────────────────

/**
 * §8.5.2 — the three defaults plus whatever the Mart has sold, filtered to species this build ships.
 * Pikachu is on the Starters shelf and has no authored kit yet; bought, it stays on the account and off the
 * picker, and the picker says so.
 */
export function unlockedStarters(account: AccountState, content: ContentRegistry): string[] {
  const extra = account.starters.filter((id) => content.hasSpecies(id));
  // §6.8.2 — a Soulbound line may start a run, whatever it is.
  const bonded = Object.entries(account.bond)
    .filter(([line, pts]) => bondRank(pts) >= BOND_TIER.soulbound && content.hasSpecies(line))
    .map(([line]) => line);
  return [...new Set([...STARTER_IDS, ...extra, ...bonded])];
}

/** §6.8.2 — the Mastery tier a line may carry: all of it from Deep Bond, none before (the stage picks the card). */
export function masteryTierFor(account: AccountState, line: string, _content?: ContentRegistry): number {
  return bondUnlocks(bondRank(account.bond[line] ?? 0)).mastery;
}

/** §8.4.2 Twin Run — two starters, and the Box one larger. */
export const twinRun = (account: AccountState): boolean => hasHubUpgrade(account, 'twin-run');

/** §8.6.3 — how many Starting Relics the run-start offer shows. */
export const startingRelicOffers = (account: AccountState): number => 3 + (hasHubUpgrade(account, 'starting-relic-plus-one') ? 1 : 0);

// ── The run's snapshot (§8.10) ───────────────────────────────────────────────────────────────────────────

/** The account before any of this existed: the fixtures, the harness, and a fresh install. */
export const defaultPerks = (): RunPerks => ({ boxBonus: 0, relicPool: null, mastery: {}, bond: {}, familiar: [], insight: false });

/** §6.8.2 Acquainted — every species of a line the account knows. */
function acquaintedSpecies(account: AccountState, content: ContentRegistry): string[] {
  const lines = new Set(Object.entries(account.bond).filter(([, pts]) => bondRank(pts) >= BOND_TIER.acquainted).map(([line]) => line));
  return lines.size ? content.allSpecies().filter((s) => lines.has(content.lineBase(s.id))).map((s) => s.id) : [];
}

/** §8.10 — everything a run takes from the account, frozen at its start. */
export function runPerksFor(account: AccountState, content: ContentRegistry, twin = false): RunPerks {
  const kit: NonNullable<RunPerks['kit']> = {};
  if (hasHubUpgrade(account, 'moms-allowance')) kit.money = KIT.allowance;
  if (hasHubUpgrade(account, 'first-aid-pouch')) kit.potions = KIT.potions;
  if (hasHubUpgrade(account, 'ball-case')) kit.balls = KIT.balls;
  if (hasHubUpgrade(account, 'head-start')) kit.starterLevels = KIT.headStartLevels;
  if (hasHubUpgrade(account, 'exp-share')) kit.benchXpShare = KIT.benchXpShare;
  if (hasHubUpgrade(account, 'tm-case')) kit.tm = true;
  const familiar = Object.entries(account.dex).filter(([, e]) => e.tier >= 1).map(([id]) => id);
  return {
    boxBonus: (hasHubUpgrade(account, 'expanded-box') ? 2 : 0) + (twin ? 1 : 0),
    relicPool: relicPoolFor(account, content),
    mastery: Object.fromEntries(Object.keys(account.bond).map((line) => [line, masteryTierFor(account, line, content)]).filter(([, t]) => (t as number) > 0)),
    bond: Object.fromEntries(Object.entries(account.bond).map(([line, pts]) => [line, bondRank(pts)]).filter(([, r]) => (r as number) > 0)),
    // §5.13.1 Familiar, and §6.8.2 Acquainted: a line you have played is one you know.
    familiar: [...new Set([...familiar, ...acquaintedSpecies(account, content)])],
    insight: hasHubUpgrade(account, 'pokedex-insight'),
    salveCache: hasHubUpgrade(account, 'trauma-salve-cache'),
    apexReveal: hasHubUpgrade(account, 'apex-reveal'),
    locked: lockedKeys(account),
    ...(Object.keys(kit).length ? { kit } : {}),
  };
}

/** The fold's context for this account: the content and the run's XP multiplier. */
export function accountContextFor(content: ContentRegistry, xpMultiplier = 1): AccountContext {
  return { content, xpMultiplier };
}
