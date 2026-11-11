import { DEFAULT_BATTLE_CONFIG, type BattleConfig } from '../combat/battleConfig';

// §8.8 / docs/design/catalogs/modifiers.md — difficulty modifiers. Opted into at run start, they last the
// whole run and multiply the XP it banks. There is no "easier" modifier: baseline is the floor (§8.8.4).
//
// Each row is a rung of the League Ladder (`rung`, §8.8.5) since v0.9.110: the ladder stacks them in that order, and
// a rung won opens its row for a custom run. Whether an account has reached a row is `meta/unlocks.ts`'s question, so
// this table stays free of account state and the fixtures can name any row.
//
// Every row is here, including any the build cannot honour yet. A modifier that silently does nothing while
// still charging its XP premium would be a lie told to the only player who went looking for difficulty, so a
// pending row is `available: false`: the new-run step lists it on its locked shelf, says why in its own words, and
// never lets it be taken.

export interface DifficultyModifier {
  id: string;
  name: string;
  /** The effect, in the player's words. This is the string the picker shows. */
  effect: string;
  /** §8.8.3 — multiplies the run's Trainer XP. Multipliers stack multiplicatively. */
  xpMultiplier: number;
  /** §8.8.2 — the gate, in the player's words ("League Ladder rung 3"). */
  unlock: string;
  /** §8.8.5 — the League Ladder rung that introduces it, 1–10. Rung N stacks rows 1..N. */
  rung: number;
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
    unlock: 'League Ladder rung 1',
    rung: 1,
    available: true,
    params: { hpMultiplier: 1.2 },
  },
  {
    id: 'dense-fog',
    name: 'Dense Fog',
    effect: 'Every non-boss enemy starts the fight with its intent hidden.',
    xpMultiplier: 1.15,
    unlock: 'League Ladder rung 4',
    rung: 4,
    available: true,
  },
  {
    // §8.8 — was No Refunds until v0.8.6 made every consumable spent; the row kept its slot and its premium and
    // now takes away the fights' supplies instead. Old saves migrate the id (save v16).
    id: 'lean-pack',
    name: 'Lean Pack',
    effect: 'Fights drop no consumables and no Poké Balls. Supplies come only from shops, events and gifts.',
    xpMultiplier: 1.3,
    unlock: 'League Ladder rung 5',
    rung: 5,
    available: true,
  },
  {
    // §8.8 (the user's note, 2026-10-19) — two places fewer than the Box the account has bought, not a flat four: an
    // Expanded Box holds 8, so squeezed it holds 6. No relic expands it.
    id: 'box-squeeze',
    name: 'Box Squeeze',
    effect: 'The Box holds 4 instead of 6, and no relic expands it.',
    xpMultiplier: 1.2,
    unlock: 'League Ladder rung 6',
    rung: 6,
    available: true,
    params: { boxCut: 2 },
  },
  {
    id: 'trauma-surge',
    name: 'Trauma Surge',
    effect: 'Trauma bites harder: 7 % Max HP per stack instead of 5 %, and 12 % instead of 10 % past the fifth.',
    xpMultiplier: 1.2,
    unlock: 'League Ladder rung 7',
    rung: 7,
    available: true,
    params: { zone1Pct: 7, zone2Pct: 12 },
  },
  {
    id: 'faint-echo',
    name: 'Faint Echo',
    effect: 'A fainted Pokémon leaves its cards jamming the discard pile until the end of the next turn.',
    xpMultiplier: 1.2,
    unlock: 'League Ladder rung 8',
    rung: 8,
    available: true,
  },
  {
    id: 'masters-challenge',
    name: "Master's Challenge",
    effect: 'Every boss and Elite gains one extra phase.',
    xpMultiplier: 1.5,
    unlock: 'League Ladder rung 10',
    rung: 10,
    available: true,
    // Canon's row ends "…aces get Phase 4", and §5.8.3 stops at three: there is no threshold, no entry
    // effect and no HP marker for a fourth. Promoting 1→2 and 2→3 is the half that has a definition, and
    // it still touches three of the four boss-tier enemies on a Region 1 route.
    // Player-facing, so no section number: a § tells us where the rule lives and tells a player nothing.
    partial: 'A Pokémon that already has three phases keeps three.',
    params: { extraPhases: 1, maxPhases: 3 },
  },
  {
    id: 'one-path',
    name: 'One Path',
    effect: 'Both Gym fork routes show the same Gym type — no counter-pick.',
    xpMultiplier: 1.1,
    unlock: 'League Ladder rung 2',
    rung: 2,
    available: true,
  },
  {
    id: 'greater-threats',
    name: 'Greater Threats',
    effect: 'Every enemy hits 25 % harder.',
    xpMultiplier: 1.4,
    unlock: 'League Ladder rung 9',
    rung: 9,
    available: true,
  },
  {
    id: 'tight-schedule',
    name: 'Tight Schedule',
    effect: 'The League micro-rest heals 20 % instead of 30 %.',
    xpMultiplier: 1.15,
    unlock: 'League Ladder rung 3',
    rung: 3,
    available: true,
    params: { microRest: 20 },
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
