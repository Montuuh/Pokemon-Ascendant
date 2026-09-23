import type { EnemySetup, ScenarioDef, TeamMemberSetup } from '../content/defs';
import { GameRng } from '../rng/gameRng';
import { RngStreams } from '../rng/rngStreams';
import type { CombatCtx } from './context';
import { emit, log } from './context';
import { buildConsumablePool, buildSkillDeck } from './deck';
import type { Combatant, CombatState, EnemyCombatant } from './state';
import { activeMoves, effectiveMaxHp, statAtLevel } from './stats';
import { applyStatus } from './status';
import { abilityFreeFirstSwap, startStageBoosts } from './abilities';
import { itemFreeSwaps, itemStatusShield, startShield } from './items';
import { beginTurn } from './turn';

// §3.2.1 — Combat Start: lock the team, build the Skill Deck (4 × 3) and the Consumable Pile, set the Lead,
// carry HP in, clear stages/statuses (unless the scenario seeds them), apply start-of-combat abilities.

function makeCombatant(uid: string, setup: TeamMemberSetup | EnemySetup, ctx: CombatCtx, traumaStacks = 0): Combatant {
  const species = ctx.content.species(setup.species);
  const baseMax = statAtLevel(species, 'hp', setup.level);
  // §8.8 Iron Will — a flat scale on the enemy's pool, applied before Trauma so the curve keeps its shape.
  const scaled = Math.round(baseMax * ((setup as EnemySetup).hpMultiplier ?? 1));
  const maxHp = effectiveMaxHp(scaled, traumaStacks, ctx.config);
  const hp = setup.hpPercent !== undefined ? Math.max(1, Math.round((maxHp * setup.hpPercent) / 100)) : maxHp;
  // §6.5.1 — the pool's first entry is granted at the first evolution; a base form has no passive.
  const granted = setup.abilityId ?? (species.stage === 'basic' ? undefined : species.availableAbilities[0]);
  const abilityIds = granted ? [granted] : [];
  return {
    uid,
    speciesId: species.id,
    name: species.name,
    types: [...species.types],
    level: setup.level,
    maxHp,
    hp,
    base: {
      // §2.2 — the Region's stat tier reaches an enemy's Attack here, once, like Iron Will reaches its HP.
      attack: Math.round(statAtLevel(species, 'attack', setup.level) * ((setup as EnemySetup).attackMultiplier ?? 1)),
      defense: statAtLevel(species, 'defense', setup.level),
      speed: statAtLevel(species, 'speed', setup.level),
    },
    stages: { attack: 0, defense: 0, speed: 0 },
    status: null,
    confusionTurns: 0,
    confusionAppliedTurn: 0,
    abilityIds,
    sturdyAvailable: abilityIds.some((id) => ctx.content.ability(id).hook === 'sturdy'),
    moveIds: setup.moves ? [...setup.moves] : activeMoves(ctx.content, species.id, setup.level),
    masteryMoveId: (setup as TeamMemberSetup).masteryMove ?? null,
    traumaStacks,
    regen: null,
    heldItemId: (setup as TeamMemberSetup).heldItem ?? null,
    endureAvailable: true,
    // §7.3.5 — the run carries the record in; a fixture fight starts everyone at zero.
    defeats: (setup as TeamMemberSetup).defeats ?? 0,
    // §7.3.7 — granted below, once the player's relics are known. A Combatant is built before they are.
    shield: 0,
  };
}

function makeEnemy(uid: string, setup: EnemySetup, ctx: CombatCtx): EnemyCombatant {
  return {
    ...makeCombatant(uid, setup, ctx),
    tier: setup.tier,
    phaseCount: setup.phaseCount,
    phase: 1,
    enteredPhase2: false,
    enteredPhase3: false,
    intent: null,
    cooldowns: {},
    witnessed: false,
    ...(setup.veiled ? { veiled: true } : {}),
  };
}

/** Build the initial state and run the first Draw + Intent phases so the player starts in the Action phase. */
export function createCombat(scenario: ScenarioDef, ctx: CombatCtx, seedOverride?: number): CombatState {
  const seed = seedOverride ?? scenario.seed;
  const streams = new RngStreams(seed);
  const rng = streams.get('CombatRNG');

  const state: CombatState = {
    scenarioId: scenario.id,
    kind: scenario.kind,
    modifiers: [...(scenario.modifiers ?? [])],
    familiar: [...(scenario.player.familiar ?? [])],
    insight: [...(scenario.player.insight ?? [])],
    stage: scenario.stage,
    trainer: scenario.trainer ? { ...scenario.trainer } : null,
    seed,
    rngCursor: rng.cursor,
    turn: 0,
    phase: 'draw',
    player: {
      team: [],
      leadIndex: Math.min(scenario.player.leadIndex, scenario.player.team.length - 1),
      ap: 0,
      swapCounter: 0,
      defensiveDiscount: false,
      deck: [],
      discard: [],
      hand: [],
      consumables: { pool: [], hand: [], used: [] },
      balls: scenario.kind === 'wild' ? scenario.player.balls : 0,
      critChance: 0,
      pendingLeadPick: false,
      guards: { status: 0, cleave: { charges: 0, percent: 0 } },
      freeSwaps: 0,
      relics: [...(scenario.player.relics ?? [])],
      badges: [...(scenario.player.badges ?? [])],
      regionModifier: scenario.player.regionModifier ?? null,
      playedThisTurn: [],
      bankedAp: 0,
      reshuffled: false,
      spent: [],
      echoing: false,
      queuedCards: [],
      totalManualSwaps: 0,
      totalDamageTaken: 0,
      leadTurns: {},
      tally: { crits: 0, reshuffles: 0, statusesApplied: [], statusesTaken: 0, statusesCured: 0, riderFizzles: 0, maxApMove: 0, peakHandAtTurnEnd: 0, catchFails: 0, koBy: {}, faintsOf: {}, damageBy: {} },
    },
    enemies: [],
    enemyQueue: [],
    defeatedEnemies: [],
    outcome: 'in-progress',
    events: [],
    log: [],
    nextSeq: 0,
    nextCardSerial: 0,
  };

  state.player.team = scenario.player.team.map((m, i) => makeCombatant(`p${i}`, m, ctx, m.traumaStacks ?? 0));
  // §6.5.2 Run Down + §7.3 Tactician's Coin — free manual swaps, banked once at combat start.
  state.player.freeSwaps =
    (state.player.team.some((c) => abilityFreeFirstSwap(c, ctx.content)) ? 1 : 0) + itemFreeSwaps(state, ctx.content);
  // §7.3 Cleanse Tag — a team-wide status shield the relic grants before the first turn.
  state.player.guards.status += itemStatusShield(state, ctx.content);
  // §7.3.7 Battle Hardened — every Active Pokémon opens behind a shield worth a share of its own max HP,
  // so the fragile one is not handed the same slab of HP as the wall.
  for (const c of state.player.team) c.shield = startShield(state, c, ctx.content);
  const enemies = scenario.enemies.map((e, i) => makeEnemy(`e${i}`, e, ctx));
  state.enemies = [enemies[0]!];
  state.enemyQueue = enemies.slice(1);

  // Seeded statuses (fixtures) count as applied "before" the fight so they act from turn 1 (§4.2.1 G7).
  // §4.2.7.1 — a status carried from the run's last fight is the same thing with its clock restored: what was
  // left of it when that fight ended, not a fresh duration.
  scenario.player.team.forEach((m, i) => {
    const c = state.player.team[i]!;
    const setup: TeamMemberSetup = m;
    if (setup.status) {
      const applied = applyStatus(c, setup.status, -1, ctx.config, setup.statusEscalating !== undefined);
      if (applied === 'applied' && c.status) {
        if (setup.statusTurnsLeft !== undefined) c.status.turnsLeft = setup.statusTurnsLeft;
        if (setup.statusEscalating !== undefined) c.status.escalatingTicks = setup.statusEscalating;
      }
    }
    if (setup.confusionTurns && setup.confusionTurns > 0 && c.hp > 0) {
      c.confusionTurns = setup.confusionTurns;
      c.confusionAppliedTurn = -1;
    }
  });
  scenario.enemies.forEach((e, i) => {
    if (e.status) applyStatus(enemies[i]!, e.status, -1, ctx.config);
  });

  // §3.2.1 — deck from the 4 moves of each Active Pokémon, shuffled once.
  // §5.13.2 — plus the Mastery card of any member whose line has one: 12 + 1 per such member, 15 at most.
  const deck = buildSkillDeck(
    state,
    state.player.team.map((c) => [c.uid, c.moveIds, c.masteryMoveId] as [string, string[], string | null]),
  );
  state.player.deck = rng.shuffle(deck);
  // §6.8.2 — a Soulbound two-stage line's Mastery card is drawn first: moved to the top *after* the shuffle,
  // so the rest of the order (and the RNG) is exactly what it would have been.
  scenario.player.team.forEach((m, i) => {
    if (!m.masteryOpener) return;
    const at = state.player.deck.findIndex((c) => c.ownerUid === `p${i}` && c.mastery);
    if (at >= 0) state.player.deck.push(...state.player.deck.splice(at, 1));
  });

  // §3.5 / §2.6.4 — the Consumable Pile; Poké Ball cards only exist in wild encounters with balls in stock.
  const consumables = scenario.player.consumables.filter((id) => {
    const isBall = ctx.content.consumable(id).effect.kind === 'catch';
    return !isBall || (scenario.kind === 'wild' && scenario.player.balls > 0);
  });
  state.player.consumables.pool = buildConsumablePool(state, consumables);

  // §6.5.1 — start-of-combat ability stages (Iron Shell).
  for (const c of [...state.player.team, ...state.enemies]) {
    for (const boost of startStageBoosts(c, ctx.content)) {
      c.stages[boost.stat] = Math.max(-6, Math.min(6, c.stages[boost.stat] + boost.stages));
      emit(state, { t: 'stage', targetUid: c.uid, stat: boost.stat, delta: boost.stages, total: c.stages[boost.stat] });
    }
  }

  emit(state, { t: 'combat-start' });
  log(state, 'system', scenario.trainer ? `${scenario.trainer.name} wants to battle!` : `A wild ${state.enemies[0]!.name} appeared!`);
  emit(state, { t: 'enemy-enter', enemyUid: state.enemies[0]!.uid });

  beginTurn(state, { ...ctx, rng });
  state.rngCursor = rng.cursor;
  return state;
}

/** Rebuild the live RNG from a state's cursor (used by the reducer and by replay). */
export function rngFromState(state: CombatState): GameRng {
  const r = new GameRng(1);
  r.cursor = state.rngCursor;
  return r;
}
