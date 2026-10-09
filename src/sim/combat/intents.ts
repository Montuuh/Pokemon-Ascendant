import type { EnemySetup, MoveDef } from '../content/defs';
import { doubleActionBudget } from './combo';
import type { GameRng } from '../rng/gameRng';
import type { IntentKind, SlotId } from '../types';
import type { BattleConfig } from './battleConfig';
import type { CombatCtx } from './context';
import { emit, log } from './context';
import { breakdownFor } from './damageFlow';
import { teamRevealsIntents, abilityBlocksMove } from './abilities';
import { relicsQueueIntents, relicsRevealIntents, relicsSkipFirstTurn } from './items';
import { bossArchetype, currentPhase } from './boss';
import { forecastOn, forecastTurn } from './forecast';
import { activeEnemy, slotOccupant, SLOT_LABEL } from './slots';
import type { Combatant, CombatState, EnemyCombatant, Intent, QueuedIntent } from './state';
import { hpFraction } from './stats';
import { cardsLocked, isImmuneToStatus, paralysisApBonus } from './status';
import { typeMultiplier } from './typeChart';

// §5 — enemy AI: candidate intents from the enemy's 4 moves, context-aware scoring, randomness floor,
// slot targeting. Pure over (state, enemy, rng). Nothing here mutates HP.

export interface Candidate {
  intent: Intent;
  move: MoveDef;
  score: number;
}

/** §5.2 — classify a move into an intent kind and pick its slot. */
export function classifyMove(state: CombatState, enemy: EnemyCombatant, move: MoveDef, ctx: CombatCtx): Intent | null {
  if (move.power > 0) {
    const targeting = move.targeting ?? 'single';
    if (targeting === 'cleave') return { kind: 'cleave', moveId: move.id, targetSlot: null, hidden: false };
    if (targeting === 'backstrike') {
      const slot = pickBackstrikeSlot(state, enemy, move, ctx);
      return slot ? { kind: 'backstrike', moveId: move.id, targetSlot: slot, hidden: false } : null;
    }
    return { kind: 'attack', moveId: move.id, targetSlot: 'lead', hidden: false };
  }
  // §5.6.2 — Call for Help: its own kind, aimed at nobody.
  if (move.effects.some((e) => e.kind === 'summon')) return { kind: 'summon', moveId: move.id, targetSlot: null, hidden: false };
  // §5.6 — Cover: a Defender stepping in front of its Lead, aimed at the Lead it covers.
  if (move.effects.some((e) => e.kind === 'cover')) {
    const leadEnemy = activeEnemy(state);
    return leadEnemy && leadEnemy.uid !== enemy.uid ? { kind: 'guard', moveId: move.id, targetSlot: null, hidden: false, targetEnemyUid: leadEnemy.uid } : null;
  }
  const status = move.effects.find((e) => e.kind === 'status' && !e.self);
  if (status) return { kind: 'status', moveId: move.id, targetSlot: 'lead', hidden: false };
  const debuff = move.effects.find((e) => e.kind === 'stage' && e.target === 'foe');
  if (debuff) return { kind: 'debuff', moveId: move.id, targetSlot: 'lead', hidden: false };
  const buff = move.effects.find((e) => e.kind === 'stage' && e.target === 'self');
  if (buff) return withAlly(state, enemy, move, { kind: 'buff', moveId: move.id, targetSlot: null, hidden: false });
  const healFx = move.effects.find((e) => e.kind === 'heal');
  if (healFx) return withAlly(state, enemy, move, { kind: 'stall', moveId: move.id, targetSlot: null, hidden: false });
  return null; // draw-only moves mean nothing to an enemy
}

/**
 * §5.6 — a Healer's heal and a Buffer's stat raise go to the enemy Lead, not to the support casting them. Only a
 * move that does nothing but heal or raise can be handed over: Rest would put the Lead to sleep, Belly Drum would
 * cut it, so a move with a self-status or a self-cost stays on its caster.
 */
function withAlly(state: CombatState, enemy: EnemyCombatant, move: MoveDef, intent: Intent): Intent {
  // §5.6 (v0.9.10) — every enemy keeps its own heals and raises: no role hands them to the Lead any more.
  void state;
  void enemy;
  void move;
  return intent;
}

/** §5.6 — a move whose every effect is a heal or a self-raise, so it means the same on an ally. */
export function allyGivable(move: MoveDef): boolean {
  return move.power <= 0 && move.effects.every((e) => e.kind === 'heal' || (e.kind === 'stage' && e.target === 'self'));
}

/** §5.6 — who a buff or a heal lands on: the ally it names (the enemy Lead now, whoever that is), else itself. */
export function intentRecipient(state: CombatState, enemy: EnemyCombatant, intent: Intent): EnemyCombatant {
  if (!intent.targetEnemyUid) return enemy;
  return activeEnemy(state) ?? enemy;
}

/**
 * §5.6 — a status another enemy of the group already declared this turn on the same slot. Intents are cleared at
 * the top of the Intent phase, so what is set here is this turn's plan: a Debuffer never double-applies.
 */
function groupPlansStatus(state: CombatState, enemy: EnemyCombatant, slot: SlotId, confusion: boolean, ctx: CombatCtx): boolean {
  return state.enemies.some((other) => {
    if (other.uid === enemy.uid || !other.intent || other.intent.kind !== 'status' || other.intent.targetSlot !== slot || !other.intent.moveId) return false;
    const fx = ctx.content.move(other.intent.moveId).effects.find((e) => e.kind === 'status' && !e.self);
    return !!fx && fx.kind === 'status' && (fx.status === 'confusion') === confusion;
  });
}

/** §5.4 — Backstrike picks the bench slot whose occupant takes the most damage; null if no bench is alive. */
function pickBackstrikeSlot(state: CombatState, enemy: EnemyCombatant, move: MoveDef, ctx: CombatCtx): SlotId | null {
  let best: { slot: SlotId; dmg: number } | null = null;
  for (const slot of ['bench1', 'bench2'] as const) {
    const occ = slotOccupant(state, slot);
    if (!occ) continue;
    const dmg = breakdownFor(enemy, occ, move, false, ctx).final;
    if (!best || dmg > best.dmg) best = { slot, dmg };
  }
  return best?.slot ?? null;
}

const OFFENSIVE: readonly IntentKind[] = ['attack', 'cleave', 'backstrike'];

/** §5.3 — Score = BaseWeight × TypeEff × StatusState × HPState × CooldownGate (× phase aggression, §5.8.3). */
export function scoreIntent(state: CombatState, enemy: EnemyCombatant, cand: { intent: Intent; move: MoveDef }, ctx: CombatCtx): number {
  const cfg = ctx.config;
  const { intent, move } = cand;
  let score = move.power > 0 ? move.power : cfg.defaultUtilityWeight;

  // CooldownGate — 0 while on cooldown.
  if ((enemy.cooldowns[move.id] ?? 0) > 0) return 0;
  // §4.2.2.3 — a Paralysed enemy cannot afford its heaviest moves (+1 AP against a 3-AP budget).
  if (move.apCost + paralysisApBonus(enemy, cfg) > cfg.baseApPerTurn) return 0;

  const occ = intent.targetSlot ? slotOccupant(state, intent.targetSlot) : null;
  if (intent.targetSlot && !occ) return 0; // never target an empty slot
  if (occ && abilityBlocksMove(occ, move, ctx.content)) return 0; // §6.6 — nor fire a move Damp will smother

  if (occ && (intent.kind === 'attack' || intent.kind === 'backstrike')) {
    const eff = typeMultiplier(move.type, occ.types);
    if (eff === 0) return 0; // never attack into an immunity
    score *= eff;
    if (hpFraction(occ) < cfg.lowTargetHpThreshold) score *= cfg.lowTargetHpMultiplier;
  }
  if (intent.kind === 'cleave') {
    // Average effectiveness over every occupied slot keeps Cleave honest against resist walls.
    const occs = (['lead', 'bench1', 'bench2'] as const).map((s) => slotOccupant(state, s)).filter((o): o is Combatant => !!o);
    if (occs.length === 0) return 0;
    score *= occs.reduce((acc, o) => acc + typeMultiplier(move.type, o.types), 0) / occs.length;
  }
  if (intent.kind === 'status' && occ) {
    const fx = move.effects.find((e) => e.kind === 'status' && !e.self);
    const status = fx && fx.kind === 'status' ? fx.status : null;
    if (!status) return 0;
    if (status === 'confusion' ? occ.confusionTurns > 0 : occ.status !== null) return 0; // never redundant
    if (isImmuneToStatus(occ.types, status)) return 0;
    // §5.6 — nor redundant with what an ally already means to put there this turn.
    if (intent.targetSlot && groupPlansStatus(state, enemy, intent.targetSlot, status === 'confusion', ctx)) return 0;
  }
  if (intent.kind === 'debuff' && occ) {
    const fx = move.effects.find((e) => e.kind === 'stage' && e.target === 'foe');
    if (fx && fx.kind === 'stage' && occ.stages[fx.stat] <= -6) return 0; // already floored
  }
  // §5.6.2 — a Call for Help needs a companion left to answer and a free place on the field; it is worth most to a
  // Pokémon standing alone, and it is never "setup": it waits for a turn the field has room.
  if (intent.kind === 'summon') {
    if (!enemy.helpers?.length || state.enemies.filter((e) => e.hp > 0).length >= cfg.maxOnField) return 0;
    if (plannedSummons(state, enemy) >= cfg.maxOnField - state.enemies.filter((e) => e.hp > 0).length) return 0;
    return score * (state.enemies.filter((e) => e.hp > 0).length === 1 ? cfg.summonAloneMultiplier : 1);
  }
  // §5.6 — Cover is worth it only for a Defender behind a Lead that is hurt, and only while it is the sturdier of the
  // two: then it is urgent. Otherwise it is never chosen, so a Defender at the front goes back to its other moves.
  if (intent.kind === 'guard') {
    const leadEnemy = activeEnemy(state);
    // No Pokémon carries Cover since roles went (v0.9.10); a kit that did would never choose it.
    void leadEnemy;
    return 0;
  }
  // §5.6 — a Defender's heal or a Buffer's raise is weighed on the ally it lands on, not on the caster.
  const recipient = intentRecipient(state, enemy, intent);
  if (intent.kind === 'buff') {
    const fx = move.effects.find((e) => e.kind === 'stage' && e.target === 'self');
    if (fx && fx.kind === 'stage') {
      // Each stage already banked makes the next one worth less: no Defense Curl loops while losing.
      const banked = Math.max(0, recipient.stages[fx.stat]);
      if (banked >= 6) return 0;
      score *= Math.max(0, 1 - banked / 3);
    }
  }
  const selfHp = hpFraction(enemy);
  if (intent.kind === 'stall') {
    // A heal is worth its missing HP: near full it is a wasted turn, at half HP it competes with a hit,
    // when losing it is the urgent play. Never treated as "setup".
    const recipientHp = hpFraction(recipient);
    const missing = 1 - recipientHp;
    if (missing <= 0.15) return 0;
    score *= missing * 2;
    if (recipientHp < cfg.lowSelfHpThreshold) score *= cfg.aggressiveSelfMultiplier;
    return score;
  }
  if (OFFENSIVE.includes(intent.kind) && selfHp < cfg.lowSelfHpThreshold) score *= cfg.aggressiveSelfMultiplier;
  if (intent.kind === 'buff' && hpFraction(recipient) > cfg.highSelfHpThreshold) score *= cfg.setupSelfMultiplier;

  // §5.8.3 — Phase 2+ bosses press the attack.
  if (enemy.phaseCount > 1 && currentPhase(enemy, cfg) >= 2 && OFFENSIVE.includes(intent.kind)) score *= cfg.bossPhaseAggressionMultiplier;
  return score;
}

/** §5.9.4 — Phase-2 archetype filters constrain intent TYPE, not target. */
function applyArchetypeFilter(enemy: EnemyCombatant, cands: Candidate[], config: BattleConfig): Candidate[] {
  if (enemy.phaseCount < 2 || currentPhase(enemy, config) < 2) return cands;
  const arch = bossArchetype(enemy);
  let filtered = cands;
  if (arch === 'onslaught') filtered = cands.filter((c) => OFFENSIVE.includes(c.intent.kind));
  if (arch === 'status-siege') filtered = cands.filter((c) => c.intent.kind === 'status');
  return filtered.some((c) => c.score > 0) ? filtered : cands;
}

/** Build, score and pick this enemy's intent for the turn. Returns null if it has no legal action. */
export function chooseIntent(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx, rng: GameRng, exclude?: string, maxAp = Infinity): Intent | null {
  const cands: Candidate[] = [];
  for (const moveId of enemy.moveIds) {
    // §5.6.1 — a second action is a different move from the first, and both fit the turn's AP budget.
    if (moveId === exclude) continue;
    const move = ctx.content.move(moveId);
    if (move.apCost > maxAp) continue;
    const intent = classifyMove(state, enemy, move, ctx);
    if (!intent) continue;
    cands.push({ intent, move, score: scoreIntent(state, enemy, { intent, move }, ctx) });
  }
  // Ties resolve toward pressure: offensive intents are considered before setup/utility with equal scores.
  const KIND_PRIORITY: Record<IntentKind, number> = { attack: 0, cleave: 0, backstrike: 0, status: 1, debuff: 2, summon: 3, guard: 3, stall: 3, buff: 4, unknown: 5, incapacitated: 5 };
  const pool = applyArchetypeFilter(enemy, cands, ctx.config)
    .filter((c) => c.score > 0)
    .sort((a, b) => KIND_PRIORITY[a.intent.kind] - KIND_PRIORITY[b.intent.kind]);
  if (pool.length === 0) return null;

  // §4.2.3.1 translated for enemies — a Confused enemy cannot plan: it picks uniformly among legal options.
  if (enemy.confusionTurns > 0) return pool[rng.range(0, pool.length)]!.intent;

  let top = 0;
  for (let i = 1; i < pool.length; i++) if (pool[i]!.score > pool[top]!.score) top = i;

  // §5.3 — randomness floor (suppressed while a boss is in an aggressive phase, §5.8.3).
  const aggressive = enemy.phaseCount > 1 && currentPhase(enemy, ctx.config) >= 2;
  if (!aggressive && pool.length >= 2 && rng.chance(ctx.config.randomnessFloorChance)) {
    const others = pool.filter((_, i) => i !== top);
    return rng.pickWeighted(others.map((c) => [c.intent, c.score] as const));
  }
  return pool[top]!.intent;
}

/**
 * §5.5.1 — a queued plan is kept only while it is still a move the enemy may play: off cooldown, affordable, into a
 * legal target, and planned in the boss phase it is in now. Anything else and the enemy thinks again.
 */
function plannedStillLegal(state: CombatState, enemy: EnemyCombatant, planned: QueuedIntent, ctx: CombatCtx): boolean {
  if (!planned.intent.moveId) return false;
  if (enemy.phaseCount > 1 && planned.phase !== currentPhase(enemy, ctx.config)) return false;
  const move = ctx.content.move(planned.intent.moveId);
  return scoreIntent(state, enemy, { intent: planned.intent, move }, ctx) > 0;
}

/** §3.2.3 — declare the enemy's intent (and apply boss phase transitions first). */
export function declareIntent(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx, rng: GameRng): void {
  if (enemy.hp <= 0) return;
  const locked = cardsLocked(enemy);
  const planned = enemy.next ?? null;
  enemy.next = null;
  // §7.3.5 Time Spinner — every enemy but a boss is caught flat-footed on turn 1, and the chip says so from the start.
  const spun = state.turn === 1 && enemy.tier !== 'boss' && relicsSkipFirstTurn(state, ctx.content);
  if (enemy.acts === 2) {
    enemy.second = null;
    enemy.stagger = 0;
  }
  // §5.6.1 — a Pokémon that acts twice spends one budget on both actions: the first leaves room for the cheapest other.
  const budget = enemy.acts === 2 ? doubleActionBudget(enemy, ctx) : Infinity;
  const roomFor = (except: string | null) => Math.min(...enemy.moveIds.filter((m) => m !== except).map((m) => ctx.content.move(m).apCost), Infinity);
  if (locked || spun) {
    enemy.intent = { kind: 'incapacitated', moveId: null, targetSlot: null, hidden: false };
  } else {
    // §5.5.1 — the plan you were shown last turn is the plan, unless it can no longer be played.
    const kept = planned && plannedStillLegal(state, enemy, planned, ctx) ? { ...planned.intent } : null;
    if (planned && !kept) log(state, 'enemy', `${enemy.name} changes its plan.`);
    const firstCap = enemy.acts === 2 ? Math.max(...enemy.moveIds.map((m) => ctx.content.move(m).apCost).filter((ap) => ap + roomFor(null) <= budget), 0) : Infinity;
    const intent = kept ?? chooseIntent(state, enemy, ctx, rng, undefined, firstCap) ?? chooseIntent(state, enemy, ctx, rng);
    enemy.intent = intent ?? { kind: 'stall', moveId: null, targetSlot: null, hidden: false };
    // §5.5 (CL-011) — Elite/Gym enemies hide their first intent until they have fired a move.
    // §8.8 Dense Fog extends the same one-intent blind to the ordinary enemies, which is the whole modifier:
    // it does not hide *more*, it hides the same amount from everyone.
    const fogged = state.modifiers.includes('dense-fog') && !enemy.witnessed;
    // §2.7.1 — a Hex Maniac's Pokémon plays by the Elite's rule: its first intent is hidden too.
    const hides = fogged || ((enemy.tier === 'boss' || enemy.tier === 'elite' || enemy.veiled === true) && !enemy.witnessed);
    // §5.13.1 Familiar — a species you have fought enough never hides from you again. §8.4.2 Pokédex Insight
    // shows one intent free the first time you meet a species you have not yet earned that on.
    const known = state.familiar.includes(enemy.speciesId) || (!enemy.witnessed && state.insight.includes(enemy.speciesId));
    // §7.3.7 Clear Mind does what §6.5.2's ability does, from the relic case instead of the party.
    enemy.intent.hidden = hides && !known && !teamRevealsIntents(state.player.team, ctx.content, !enemy.witnessed) && !relicsRevealIntents(state, ctx.content, !enemy.witnessed, state.turn);
    // §5.6.1 — a Pokémon that acts twice declares its second action now, chosen knowing the first: a different
    // move, and never a status the first (or the group) already means to put there. It hides what the first hides.
    if (enemy.acts === 2) {
      const spent = enemy.intent.moveId ? ctx.content.move(enemy.intent.moveId).apCost : 0;
      const second = chooseIntent(state, enemy, ctx, rng, enemy.intent.moveId ?? undefined, budget - spent);
      enemy.second = second ? { ...second, hidden: enemy.intent.hidden } : null;
    }
  }
  // §5.5.1 Trainer's Instinct — plan the next turn now, from what the enemy can see now, and show it. It hides
  // exactly as much as this turn's intent does: seeing further ahead is not seeing through a veil.
  if (relicsQueueIntents(state, ctx.content)) {
    const plan = chooseIntent(state, enemy, ctx, rng);
    if (plan) enemy.next = { intent: { ...plan, hidden: enemy.intent.hidden }, phase: currentPhase(enemy, ctx.config) };
  }
  emit(state, { t: 'intent', enemyUid: enemy.uid, intent: { ...enemy.intent } });
  if (!enemy.intent.hidden) log(state, 'enemy', `${enemy.name} ${describeIntent(state, enemy, ctx, enemy.intent, false)}`);
  else log(state, 'enemy', `${enemy.name} is planning something…`);
  if (enemy.second) {
    emit(state, { t: 'intent', enemyUid: enemy.uid, intent: { ...enemy.second } });
    log(state, 'enemy', enemy.second.hidden ? `…and something more.` : `…and then ${describeIntent(state, enemy, ctx, enemy.second, false)}`);
  }
}

/**
 * §9.2.5 — the HP this turn's intent takes off the CURRENT occupant of its slot (the Lead's share, for a Cleave),
 * recomputed live. It is the dry-run Resolution's number (`forecastTurn`), so it is the hit, not an estimate.
 * A plan for next turn (§5.5.1) has no Resolution to run yet, so it is priced by the formula with every term.
 */
export function predictIntentDamage(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx, intent: Intent | null = enemy.intent): number | null {
  if (!intent || !intent.moveId) return null;
  const move = ctx.content.move(intent.moveId);
  if (move.power <= 0) return null;
  const occ = slotOccupant(state, intent.kind === 'cleave' ? 'lead' : (intent.targetSlot ?? 'lead'));
  if (!occ) return intent.kind === 'cleave' ? null : 0;
  if (intent === enemy.intent) return forecastOn(forecastTurn(state, ctx), enemy.uid, occ.uid, 0);
  if (intent === enemy.second) return forecastOn(forecastTurn(state, ctx), enemy.uid, occ.uid, 1);
  return breakdownFor(enemy, occ, move, !!move.alwaysCrit, ctx, state).final;
}

// §5.5 — what a hidden intent still tells you: the KIND, never the magnitude or the target.
// A completely blind intent reads as an ambush rather than a read you missed, which is the one thing
// Pillar 1 cannot afford.
const HIDDEN_TEXT: Partial<Record<IntentKind, string>> = {
  summon: 'is calling out to someone…',
  guard: 'is moving to protect someone…',
  attack: 'is winding up an attack…',
  cleave: 'is winding up something that will hit everyone…',
  backstrike: 'is eyeing your bench…',
  status: 'is preparing something nasty…',
  debuff: 'is preparing to weaken you…',
  buff: 'is powering up…',
  stall: 'is digging in…',
  incapacitated: 'cannot act.',
};

export function describeIntent(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx, i: Intent | null = enemy.intent, withDamage = true): string {
  if (!i) return 'waits.';
  // §5.5 — a hidden intent still shows what KIND of thing is coming, just not how hard.
  if (i.hidden) return HIDDEN_TEXT[i.kind] ?? 'is planning something…';
  const move = i.moveId ? ctx.content.move(i.moveId) : null;
  const slotText = i.targetSlot ? `${SLOT_LABEL[i.targetSlot]} (${slotOccupant(state, i.targetSlot)?.name ?? 'empty'})` : '';
  // §9.2.5 — the combat log names the move and its target; the numbers live on the chips and the portraits, which
  // read the settled turn's forecast. While a turn is still being declared the later intents are not known yet (a
  // group declares one by one), so a number written into the log then could be off — and running a whole dry
  // Resolution per declaration just to print it made every harness run half again as slow.
  const dmg = withDamage && state.enemies.length <= 1 ? predictIntentDamage(state, enemy, ctx, i) : null;
  const ally = i.targetEnemyUid ? intentRecipient(state, enemy, i) : null;
  switch (i.kind) {
    case 'attack':
      return `readies ${move?.name} → ${slotText}${dmg !== null ? ` · ${dmg} dmg` : ''}`;
    case 'backstrike':
      return `aims ${move?.name} at ${slotText}${dmg !== null ? ` · ${dmg} dmg` : ''} (Backstrike)`;
    case 'cleave':
      // §9.2.5 — an area intent prints no single number: every target takes its own.
      return `winds up ${move?.name} → ALL SLOTS`;
    case 'buff':
      return ally && ally.uid !== enemy.uid ? `will power up ${ally.name} (${move?.name}).` : `is powering up (${move?.name}).`;
    case 'debuff':
      return `prepares ${move?.name} → ${slotText}`;
    case 'status':
      return `prepares ${move?.name} → ${slotText}`;
    case 'stall':
      if (ally && ally.uid !== enemy.uid && move) return `will heal ${ally.name} (${move.name}).`;
      return move ? `is recovering (${move.name}).` : 'is biding its time.';
    case 'incapacitated':
      return enemy.status?.kind === 'sleep' ? 'is fast asleep.' : enemy.status?.kind === 'freeze' ? 'is frozen solid.' : 'is caught off guard (Time Spinner).';
    case 'unknown':
      return 'is planning something…';
    case 'summon': {
      const who = summonedBy(state, enemy, move, ctx.config.maxOnField).map((h) => ctx.content.species(h.species).name);
      return `calls for help (${move?.name}) → ${who.length ? who.join(' and ') : 'nobody left'}`;
    }
    case 'guard':
      return `will step in front of ${ally?.name ?? 'its Lead'} (${move?.name}) and lead the group.`;
  }
}

/** §5.6.2 — how many companions a Call for Help move brings in. */
export function summonCount(move: MoveDef | null): number {
  const fx = move?.effects.find((e) => e.kind === 'summon');
  return fx && fx.kind === 'summon' ? fx.count : 0;
}

/** §5.6.2 — companions the rest of the group already means to call this turn, so two callers do not overfill the field. */
function plannedSummons(state: CombatState, enemy: EnemyCombatant): number {
  let n = 0;
  for (const other of state.enemies) {
    if (other.uid === enemy.uid) continue;
    for (const i of [other.intent, other.second]) if (i?.kind === 'summon') n += 1;
  }
  return n;
}

/**
 * §5.6.2 — who a call will bring in, by setup: the caller's next companions, as many as the move brings and the
 * field has room for. The chip, the intent card, the log and the resolution all read this one answer.
 */
export function summonedBy(state: CombatState, enemy: EnemyCombatant, move: MoveDef | null, maxOnField: number): EnemySetup[] {
  const room = maxOnField - state.enemies.filter((e) => e.hp > 0).length;
  return (enemy.helpers ?? []).slice(0, Math.max(0, Math.min(summonCount(move), room)));
}
