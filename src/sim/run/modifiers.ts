import { DEFAULT_BATTLE_CONFIG, type BattleConfig } from '../combat/battleConfig';

// §8.8 / docs/design/catalogs/modifiers.md — difficulty modifiers. Opted into at run start, they last the
// whole run and multiply the XP it banks. There is no "easier" modifier: baseline is the floor (§8.8.4).
//
// Rows are gated by Trainer Level (`unlockLevel`, §8.8.2) from v0.6; whether an account has reached a row is
// `meta/unlocks.ts`'s question, so this table stays free of account state and the fixtures can name any row.
//
// Every row is here, including the three v0.4 cannot honour yet. A modifier that silently does nothing while
// still charging its XP premium would be a lie told to the only player who went looking for difficulty, so a
// pending row is `available: false`, the picker greys it out and says which version unblocks it.

export interface DifficultyModifier {
  id: string;
  name: string;
  /** The effect, in the player's words. This is the string the picker shows. */
  effect: string;
  /** §8.8.3 — multiplies the run's Trainer XP. Multipliers stack multiplicatively. */
  xpMultiplier: number;
  /** §8.8.2 — the gate, in the player's words ("Trainer Lv 15 + a Champion clear"). */
  unlock: string;
  /**
   * §8.8.2 — the Trainer Level that opens it. The track's "New difficulty modifier" (§8.3.5) can open a row
   * before its level; `meta/unlocks.ts` reads both.
   */
  unlockLevel: number;
  /** Selectable in this build. A false row names why in `pending`. */
  available: boolean;
  pending?: string;
  /** Available, but not the whole row yet. The picker prints this under the effect. */
  partial?: string;
  /** Numbers the sim reads, so a tuning pass edits this table and nothing else. */
  params?: Record<string, number>;
}

export const MODIFIERS: DifficultyModifier[] = [
  {
    id: 'iron-will',
    name: 'Iron Will',
    effect: 'Every wild Pokémon has +20 % Max HP.',
    xpMultiplier: 1.15,
    unlock: 'Trainer Lv 3',
    unlockLevel: 3,
    available: true,
    params: { hpMultiplier: 1.2 },
  },
  {
    id: 'dense-fog',
    name: 'Dense Fog',
    effect: 'Every non-boss enemy starts the fight with its intent hidden.',
    xpMultiplier: 1.15,
    unlock: 'Trainer Lv 5',
    unlockLevel: 5,
    available: true,
  },
  {
    id: 'no-refunds',
    name: 'No Refunds',
    effect: 'A consumable you play is gone. It does not come back at the end of the fight.',
    xpMultiplier: 1.3,
    unlock: 'Trainer Lv 6',
    unlockLevel: 6,
    available: true,
  },
  {
    id: 'box-squeeze',
    name: 'Box Squeeze',
    effect: 'The Box holds 4 instead of 6, and cannot be expanded.',
    xpMultiplier: 1.2,
    unlock: 'Trainer Lv 7',
    unlockLevel: 7,
    available: true,
    params: { boxCapacity: 4 },
  },
  {
    id: 'trauma-surge',
    name: 'Trauma Surge',
    effect: 'Trauma bites harder: 7 % Max HP per stack instead of 5 %, and 12 % instead of 10 % past the fifth.',
    xpMultiplier: 1.2,
    unlock: 'Trainer Lv 8',
    unlockLevel: 8,
    available: true,
    params: { zone1Pct: 7, zone2Pct: 12 },
  },
  {
    id: 'faint-echo',
    name: 'Faint Echo',
    effect: 'A fainted Pokémon leaves its cards jamming the discard pile until the end of the next turn.',
    xpMultiplier: 1.2,
    unlock: 'Trainer Lv 9',
    unlockLevel: 9,
    available: true,
  },
  {
    id: 'masters-challenge',
    name: "Master's Challenge",
    effect: 'Every boss and Elite gains one extra phase.',
    xpMultiplier: 1.5,
    unlock: 'Trainer Lv 15 + a Champion clear',
    unlockLevel: 15,
    available: true,
    // Canon's row ends "…aces get Phase 4", and §5.8.3 stops at three: there is no threshold, no entry
    // effect and no HP marker for a fourth. Promoting 1→2 and 2→3 is the half that has a definition, and
    // it still touches three of the four boss-tier enemies on a Region 1 route.
    // Player-facing, so no section number: a § tells us where the rule lives and tells a player nothing.
    partial: 'A Pokémon that already has three phases keeps three — a fourth arrives in v0.5.',
    params: { extraPhases: 1, maxPhases: 3 },
  },
  {
    id: 'one-path',
    name: 'One Path',
    effect: 'Both Gym fork routes show the same Gym type — no counter-pick.',
    xpMultiplier: 1.1,
    unlock: 'Trainer Lv 4',
    unlockLevel: 4,
    available: true,
  },
  {
    id: 'greater-threats',
    name: 'Greater Threats',
    effect: "Each Region's enemies use the next Region's stat tier.",
    xpMultiplier: 1.4,
    unlock: 'Trainer Lv 10',
    unlockLevel: 10,
    available: true,
  },
  {
    id: 'tight-schedule',
    name: 'Tight Schedule',
    effect: 'The League micro-rest heals 20 % instead of 30 %.',
    xpMultiplier: 1.15,
    unlock: 'Trainer Lv 4',
    unlockLevel: 4,
    available: false,
    pending: 'the League arrives in v0.8',
  },
];

const BY_ID = new Map(MODIFIERS.map((m) => [m.id, m]));
export const modifierById = (id: string): DifficultyModifier | undefined => BY_ID.get(id);

/** Selectable rows, hardest first — the picker's order, because the list exists to tempt. */
export const AVAILABLE_MODIFIERS = MODIFIERS.filter((m) => m.available).sort((a, b) => b.xpMultiplier - a.xpMultiplier);

/** Is this modifier switched on for the run? Unavailable rows always answer no, whatever the save says. */
export function hasModifier(modifiers: readonly string[], id: string): boolean {
  return modifiers.includes(id) && (modifierById(id)?.available ?? false);
}

/** One of a modifier's numbers, or `fallback` when the modifier is off. Keeps the call sites one-liners. */
export function modifierValue(modifiers: readonly string[], id: string, key: string, fallback: number): number {
  if (!hasModifier(modifiers, id)) return fallback;
  return modifierById(id)?.params?.[key] ?? fallback;
}

/** §8.8.3 — the run's XP multiplier: every active modifier, multiplied together. */
export function modifierXpMultiplier(modifiers: readonly string[]): number {
  return modifiers.reduce((m, id) => (hasModifier(modifiers, id) ? m * (modifierById(id)?.xpMultiplier ?? 1) : m), 1);
}

/**
 * §8.8 — the BattleConfig a run with these modifiers fights under. Only Trauma Surge touches a config number;
 * every other modifier changes the enemy list or a rule, not a constant. The numbers come off the table above
 * so a tuning pass has one place to edit.
 *
 * Deriving rather than mutating keeps replays honest: a golden master recorded with no modifiers asks for none
 * and gets the base object straight back.
 */
export function battleConfigFor(modifiers: readonly string[] = [], base: BattleConfig = DEFAULT_BATTLE_CONFIG): BattleConfig {
  if (!hasModifier(modifiers, 'trauma-surge')) return base;
  return {
    ...base,
    traumaZone1PenaltyPercent: modifierValue(modifiers, 'trauma-surge', 'zone1Pct', base.traumaZone1PenaltyPercent),
    traumaZone2PenaltyPercent: modifierValue(modifiers, 'trauma-surge', 'zone2Pct', base.traumaZone2PenaltyPercent),
  };
}
