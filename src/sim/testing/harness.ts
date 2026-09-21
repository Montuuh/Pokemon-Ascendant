import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import type { ScenarioDef, TeamMemberSetup, EnemySetup } from '../content/defs';
import { DEFAULT_BATTLE_CONFIG } from '../combat/battleConfig';
import type { CombatCtx } from '../combat/context';
import { combatReducer } from '../combat/reducer';
import { createCombat } from '../combat/setup';
import type { CombatAction, CombatState } from '../combat/state';

// Shared test scaffolding. Content is the real registry; config is the canon default unless overridden.

export const content = buildRegistry();
export const ctx: CombatCtx = { content, config: DEFAULT_BATTLE_CONFIG };

export function scenario(partial: {
  id?: string;
  kind?: ScenarioDef['kind'];
  seed?: number;
  team: TeamMemberSetup[];
  leadIndex?: number;
  consumables?: string[];
  balls?: number;
  enemies: EnemySetup[];
  trainer?: { name: string; sprite: string };
  /** §7.3 — the relics the run is carrying into this fight. */
  relics?: string[];
  /** §5.10 — the Badges the run has won. Same hook vocabulary as relics (§7.3.6). */
  badges?: string[];
  /** §2.11.3 — the Region Modifier in force. One at a time, so one id. */
  regionModifier?: string;
  /** §8.8 — the run's difficulty modifiers. */
  modifiers?: string[];
  /** §5.13.1 / §8.4.2 — species whose intents the account has earned a look at. */
  familiar?: string[];
  insight?: string[];
}): ScenarioDef {
  const def: ScenarioDef = {
    id: partial.id ?? 'test',
    name: 'test',
    description: 'test',
    kind: partial.kind ?? 'wild',
    stage: 'meadow',
    seed: partial.seed ?? 42,
    player: {
      team: partial.team,
      leadIndex: partial.leadIndex ?? 0,
      consumables: partial.consumables ?? [],
      balls: partial.balls ?? 0,
      relics: partial.relics ?? [],
      badges: partial.badges ?? [],
      ...(partial.regionModifier ? { regionModifier: partial.regionModifier } : {}),
      ...(partial.familiar ? { familiar: partial.familiar } : {}),
      ...(partial.insight ? { insight: partial.insight } : {}),
    },
    enemies: partial.enemies,
  };
  if (partial.trainer) def.trainer = partial.trainer;
  if (partial.modifiers) def.modifiers = partial.modifiers;
  return def;
}

export function start(def: ScenarioDef, seed?: number): CombatState {
  return createCombat(def, ctx, seed);
}

export function startFixture(id: string, seed?: number): CombatState {
  return createCombat(content.scenario(id), ctx, seed);
}

/** Dispatch and throw on rejection — tests that expect a rejection use `reject` instead. */
export function dispatch(state: CombatState, action: CombatAction): CombatState {
  const r = combatReducer(state, action, ctx);
  if (r.rejected) throw new Error(`action ${action.type} rejected: ${r.rejected}`);
  return r.state;
}

export function reject(state: CombatState, action: CombatAction): string | null {
  return combatReducer(state, action, ctx).rejected;
}

/** Mutate a (frozen) state for a test setup. */
export function tweak(state: CombatState, fn: (draft: CombatState) => void): CombatState {
  return produce(state, fn);
}

export function handCard(state: CombatState, moveId: string, ownerUid?: string) {
  const c = state.player.hand.find((k) => k.moveId === moveId && (!ownerUid || k.ownerUid === ownerUid));
  if (!c) throw new Error(`no ${moveId} in hand: [${state.player.hand.map((k) => k.moveId).join(', ')}]`);
  return c;
}

/** Force a specific hand: put the wanted cards (by move id) in hand, everything else in the deck. */
export function withHand(state: CombatState, moveIds: string[]): CombatState {
  return tweak(state, (d) => {
    const all = [...d.player.hand, ...d.player.deck, ...d.player.discard];
    const hand: typeof all = [];
    for (const id of moveIds) {
      const idx = all.findIndex((c) => c.moveId === id && !hand.includes(c));
      if (idx < 0) throw new Error(`no card for ${id}`);
      hand.push(all.splice(idx, 1)[0]!);
    }
    d.player.hand = hand;
    d.player.deck = all;
    d.player.discard = [];
  });
}

export function consumableCard(state: CombatState, consumableId: string) {
  const c = state.player.consumables.hand.find((k) => k.consumableId === consumableId);
  if (!c) throw new Error(`no ${consumableId} in consumable hand`);
  return c;
}

export function withConsumableHand(state: CombatState, ids: string[]): CombatState {
  return tweak(state, (d) => {
    const all = [...d.player.consumables.hand, ...d.player.consumables.pool];
    const hand: typeof all = [];
    for (const id of ids) {
      const idx = all.findIndex((c) => c.consumableId === id && !hand.includes(c));
      if (idx < 0) throw new Error(`no consumable ${id}`);
      hand.push(all.splice(idx, 1)[0]!);
    }
    d.player.consumables.hand = hand;
    d.player.consumables.pool = all;
  });
}

export const enemyOf = (state: CombatState) => state.enemies[0]!;
export const leadOf = (state: CombatState) => state.player.team[state.player.leadIndex]!;
export const eventsOf = (state: CombatState, t: string) => state.events.filter((e) => e.t === t);

// Common builds
export const STARTERS: TeamMemberSetup[] = [
  { species: 'charmander', level: 8 },
  { species: 'squirtle', level: 8 },
  { species: 'bulbasaur', level: 8 },
];

/**
 * A team whose Lead has a pinned kit. Since §6.9 derives moves from level, a test that needs a specific card
 * in the deck must say so rather than relying on what a level-8 starter happens to know.
 */
export function teamWithKit(moves: string[], species = 'squirtle', level = 12): TeamMemberSetup[] {
  return [{ species, level, moves }, STARTERS[0]!, STARTERS[2]!];
}
export const PIDGEY: EnemySetup = { species: 'pidgey', level: 7, tier: 'wild', phaseCount: 1 };
export const GEODUDE: EnemySetup = { species: 'geodude', level: 7, tier: 'wild', phaseCount: 1 };
