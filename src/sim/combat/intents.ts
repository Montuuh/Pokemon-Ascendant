import { arenaCleaves } from './arenaRules';
import { markRhythm } from './rhythm';
import type { EnemySetup, MoveDef } from '../content/defs';
import { doubleActionBudget } from './combo';
import type { GameRng } from '../rng/gameRng';
import type { IntentKind, SlotId } from '../types';
import type { BattleConfig } from './battleConfig';
import type { CombatCtx } from './context';
import { emit, log } from './context';
import { applyMoveEffects, breakdownFor } from './damageFlow';
import { fieldApDelta, fieldStands, isStance, ppLeft, protectBlocked, sideHas } from './keywords';
import type { FieldId } from './fields';
import { teamRevealsIntents, abilityBlocksMove } from './abilities';
import { relicsQueueIntents, relicsRevealIntents, relicsSkipFirstTurn } from './items';
import { bossArchetype } from './boss';
import { signatureIntent, spendSignature } from './phases';
import { forecastOn, forecastTurn } from './forecast';
import { activeEnemy, slotOccupant, SLOT_LABEL } from './slots';
import type { Combatant, CombatState, EnemyCombatant, Intent, QueuedIntent } from './state';
import { hpFraction } from './stats';
import { cardsLocked, controlBlocked, isImmuneToStatus, paralysisApBonus } from './status';
import { objectiveHoldsBack, objectiveIntent } from './objective';
import { typeMultiplier } from './typeChart';

// §5 — enemy AI: candidate intents from the enemy's 4 moves, context-aware scoring, randomness floor,
// slot targeting. Pure over (state, enemy, rng). Nothing here mutates HP.

/** §3.2.4 / §4.3.15 — what a move costs an enemy now: printed, its Paralysis, and what the field adds or takes off. */
export function enemyMoveCost(state: CombatState, enemy: EnemyCombatant, move: MoveDef, ctx: CombatCtx): number {
  return Math.max(0, move.apCost + paralysisApBonus(enemy, ctx.config) + fieldApDelta(state, move, ctx.content));
}

export interface Candidate {
  intent: Intent;
  move: MoveDef;
  score: number;
}

/** §5.2 — classify a move into an intent kind and pick its slot. */
export function classifyMove(state: CombatState, enemy: EnemyCombatant, move: MoveDef, ctx: CombatCtx): Intent | null {
  if (move.power > 0) {
    // §2.12.2.1 Thundercloud — from Phase 2 a Legendary's Thunder is a Cleave.
    const targeting = arenaCleaves(state, enemy, move) ? 'cleave' : (move.targeting ?? 'single');
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
  // §5.2.1 — a stance guards its user: declared, it is up.
  if (isStance(move)) return { kind: 'buff', moveId: move.id, targetSlot: null, hidden: false, stance: true };
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

/**
 * §5.3 — Score = BaseWeight × TypeEff × StatusState × HPState × CooldownGate (× phase aggression, §5.8.3).
 * `waive` names the one move whose cooldown does not count: an ace's signature, for its single declaration (§5.8.3).
 */
export function scoreIntent(state: CombatState, enemy: EnemyCombatant, cand: { intent: Intent; move: MoveDef }, ctx: CombatCtx, waive?: string): number {
  const cfg = ctx.config;
  const { intent, move } = cand;
  let score = move.power > 0 ? move.power : cfg.defaultUtilityWeight;

  // CooldownGate — 0 while on cooldown.
  if (move.id !== waive && (enemy.cooldowns[move.id] ?? 0) > 0) return 0;
  // §4.2.2.3 — a Paralysed enemy cannot afford its heaviest moves (+1 AP against a 3-AP budget); §4.3.15 the field prices too.
  if (enemyMoveCost(state, enemy, move, ctx) > cfg.baseApPerTurn) return 0;
  // §3.11.1 — no PP left; §3.11.2 — no Protect two turns running.
  if (ppLeft(enemy, move) === 0 || protectBlocked(state, enemy, move)) return 0;
  // §5.3.1 — a stance is weighed by what it guards against now, never as setup (§5.2.1).
  if (intent.stance) return stanceScore(state, enemy, move, ctx);
  // §5.3.1 — a charge gives a turn's warning and an ultimate a turn's recharge: both are worth less than their power.
  if (move.effects.some((e) => e.kind === 'charge')) score *= cfg.keywordAi.charge;
  if (move.effects.some((e) => e.kind === 'recharge')) score *= cfg.keywordAi.recharge;
  // §5.3.1 — a sacrifice (Self-Destruct, Explosion: half its hit or more back) is the desperate play, not the opener.
  const sacrifice = move.effects.some((e) => e.kind === 'recoil' && e.percentOfDamage >= cfg.keywordAi.sacrificeRecoil);
  if (sacrifice && hpFraction(enemy) >= cfg.lowSelfHpThreshold) score *= cfg.keywordAi.sacrificeHealthy;

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
    if ((status === 'sleep' || status === 'freeze') && controlBlocked(occ, state.turn)) return 0;
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

  // §5.8.3 — a boss that has entered Phase 2 or 3 presses the attack.
  if (enemy.phaseCount > 1 && enemy.phase >= 2 && OFFENSIVE.includes(intent.kind)) score *= cfg.bossPhaseAggressionMultiplier;
  return score;
}

/** §5.3.1 — what a stance is worth this turn: its best effect, by the enemy's HP and what already stands. */
function stanceScore(state: CombatState, enemy: EnemyCombatant, move: MoveDef, ctx: CombatCtx): number {
  const w = ctx.config.keywordAi;
  const hp = hpFraction(enemy);
  let best = 0;
  for (const fx of move.effects) {
    if (fx.kind === 'protect') best = Math.max(best, hp < w.protectBelowHp ? w.protect : w.protectIdle);
    if (fx.kind === 'endure') best = Math.max(best, hp < w.endureBelowHp ? w.endure : 0);
    if (fx.kind === 'guard') best = Math.max(best, w.guard);
    if (fx.kind === 'substitute') best = Math.max(best, (enemy.substitute ?? 0) > 0 || hp <= fx.percentOfMaxHp * 2 ? 0 : w.substitute);
    if (fx.kind === 'counter') best = Math.max(best, w.counter);
    if (fx.kind === 'side-condition') best = Math.max(best, sideHas(state, 'enemy', fx.condition) ? 0 : w.screen);
    if (fx.kind === 'set-field') best = Math.max(best, fieldFavours(state, enemy, fx.field, ctx) ? w.fieldSet : 0);
    // A brace that also raises a stat is weighed as the raise is (§5.3): its decay with the stages banked, its setup bonus.
    if (fx.kind === 'stage' && fx.target === 'self' && fx.stages > 0) {
      const banked = Math.max(0, enemy.stages[fx.stat]);
      const raise = banked >= 6 ? 0 : ctx.config.defaultUtilityWeight * Math.max(0, 1 - banked / 3) * (hp > ctx.config.highSelfHpThreshold ? ctx.config.setupSelfMultiplier : 1);
      best = Math.max(best, raise);
    }
  }
  return best;
}

/** §5.3.1 — a field is worth setting when it is not up already and its own kit gains by it. */
function fieldFavours(state: CombatState, enemy: EnemyCombatant, field: FieldId, ctx: CombatCtx): boolean {
  if (fieldStands(state, field, ctx.content)) return false;
  const moves = enemy.moveIds.map((id) => ctx.content.move(id));
  const reads = moves.some((m) => m.effects.some((e) => (e.kind === 'field-cost' && e.field === field && e.delta < 0) || (e.kind === 'charge' && e.skipIn === field)));
  if (reads) return true;
  if (field === 'rain-dance') return moves.some((m) => m.power > 0 && m.type === 'water');
  if (field === 'sunny-day') return moves.some((m) => m.power > 0 && m.type === 'fire');
  if (field === 'hail') return enemy.types.includes('ice');
  if (field === 'sandstorm') return enemy.types.some((t) => t === 'rock' || t === 'ground' || t === 'steel');
  return false;
}

/** §5.9.4 — Phase-2 archetype filters constrain intent TYPE, not target. §5.8.3 — they stop at Phase 3's entry. */
function applyArchetypeFilter(enemy: EnemyCombatant, cands: Candidate[], config: BattleConfig): Candidate[] {
  void config;
  if (enemy.phaseCount < 2 || enemy.phase !== 2) return cands;
  const arch = bossArchetype(enemy);
  let filtered = cands;
  if (arch === 'onslaught') filtered = cands.filter((c) => OFFENSIVE.includes(c.intent.kind));
  if (arch === 'status-siege') filtered = cands.filter((c) => c.intent.kind === 'status');
  return filtered.some((c) => c.score > 0) ? filtered : cands;
}

/** Build, score and pick this enemy's intent for the turn. Returns null if it has no legal action. */
export function chooseIntent(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx, rng: GameRng, exclude?: string, maxAp = Infinity, waive?: string): Intent | null {
  const cands: Candidate[] = [];
  for (const moveId of enemy.moveIds) {
    // §5.6.1 — a second action is a different move from the first, and both fit the turn's AP budget.
    if (moveId === exclude || objectiveHoldsBack(state, moveId, ctx)) continue;
    const move = ctx.content.move(moveId);
    if (enemyMoveCost(state, enemy, move, ctx) > maxAp) continue;
    const intent = classifyMove(state, enemy, move, ctx);
    if (!intent) continue;
    cands.push({ intent, move, score: scoreIntent(state, enemy, { intent, move }, ctx, waive) });
  }
  // Ties resolve toward pressure: offensive intents are considered before setup/utility with equal scores.
  const KIND_PRIORITY: Record<IntentKind, number> = { attack: 0, cleave: 0, backstrike: 0, status: 1, debuff: 2, summon: 3, guard: 3, stall: 3, buff: 4, unknown: 5, incapacitated: 5, getaway: 6 };
  const pool = applyArchetypeFilter(enemy, cands, ctx.config)
    .filter((c) => c.score > 0)
    .sort((a, b) => KIND_PRIORITY[a.intent.kind] - KIND_PRIORITY[b.intent.kind]);
  if (pool.length === 0) return null;

  // §4.2.3.1 translated for enemies — a Confused enemy cannot plan: it picks uniformly among legal options.
  if (enemy.confusionTurns > 0) return pool[rng.range(0, pool.length)]!.intent;

  let top = 0;
  for (let i = 1; i < pool.length; i++) if (pool[i]!.score > pool[top]!.score) top = i;

  // §5.3 — randomness floor (suppressed while a boss is in an aggressive phase, §5.8.3).
  const aggressive = enemy.phaseCount > 1 && enemy.phase >= 2;
  if (!aggressive && pool.length >= 2 && rng.chance(ctx.config.randomnessFloorChance)) {
    const others = pool.filter((_, i) => i !== top);
    return rng.pickWeighted(others.map((c) => [c.intent, c.score] as const));
  }
  return pool[top]!.intent;
}

/** §3.11.9 / §3.11.10 — the intent a rampage or a waiting charge dictates, when one does. */
function keywordIntent(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx): Intent | null {
  const v = enemy.volatile;
  const moveId = v?.charge && v.charge.turn < state.turn ? v.charge.moveId : v?.rampage && v.rampage.left > 0 ? v.rampage.moveId : null;
  if (!moveId) return null;
  return classifyMove(state, enemy, ctx.content.move(moveId), ctx);
}

/**
 * §5.5.1 — a queued plan is kept only while it is still a move the enemy may play: off cooldown, affordable, into a
 * legal target, and planned in the boss phase it is in now. Anything else and the enemy thinks again.
 */
function plannedStillLegal(state: CombatState, enemy: EnemyCombatant, planned: QueuedIntent, ctx: CombatCtx): boolean {
  if (!planned.intent.moveId) return false;
  if (enemy.phaseCount > 1 && planned.phase !== enemy.phase) return false;
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
  // §3.11.8 — last turn's Fatigue comes off this turn's budget.
  const fatigue = enemy.volatile?.fatigue ?? 0;
  if (enemy.volatile?.fatigue) delete enemy.volatile.fatigue;
  // §5.6.1 — a Pokémon that acts twice spends one budget on both actions: the first leaves room for the cheapest other.
  const budget = (enemy.acts === 2 ? doubleActionBudget(enemy, ctx) : ctx.config.baseApPerTurn) - fatigue;
  const costOf = (id: string) => enemyMoveCost(state, enemy, ctx.content.move(id), ctx);
  const roomFor = (except: string | null) => Math.min(...enemy.moveIds.filter((m) => m !== except).map(costOf), Infinity);
  // §5.8.3 — an open signature opportunity: declared now as the first action, or the reason it waits is recorded (the
  // intent card shows it; it is never presented as this turn's action).
  const sig = enemy.signature?.state === 'ready' ? signatureIntent(state, enemy, ctx) : null;
  if (enemy.signature) delete enemy.signature.wait;
  if (sig && 'wait' in sig) enemy.signature!.wait = sig.wait;
  let veiled = false;
  // §3.11.9 / §3.11.10 — a rampage replays its move, a charged hit is released: either is this turn's intent. Asleep or
  // frozen, the charge is lost and the rampage broken off.
  if (locked && enemy.volatile) {
    delete enemy.volatile.charge;
    delete enemy.volatile.rampage;
  }
  const keyworded = locked || spun ? null : keywordIntent(state, enemy, ctx);
  if (locked || spun) {
    enemy.intent = { kind: 'incapacitated', moveId: null, targetSlot: null, hidden: false };
  } else {
    // §5.5.1 — the plan you were shown last turn is the plan, unless it can no longer be played.
    const kept = planned && plannedStillLegal(state, enemy, planned, ctx) ? { ...planned.intent } : null;
    if (planned && !kept) log(state, 'enemy', `${enemy.name} changes its plan.`);
    const firstCap = enemy.acts === 2 ? Math.max(...enemy.moveIds.map(costOf).filter((ap) => ap + roomFor(null) <= budget), 0) : Infinity;
    // §5.6.5 — the objective's last turn dictates: the runner's getaway, the guard's finisher.
    const forced = objectiveIntent(state, enemy, ctx);
    // §5.8.3 — the signature takes the first action over an older plan, the Phase-2 filter and the room a second action
    // would want. A Confused ace keeps its uniform pick, the signature (cooldown waived) among the options.
    const open = !forced && sig && 'intent' in sig ? sig.intent : null;
    const confusedPick = open && enemy.confusionTurns > 0 ? chooseIntent(state, enemy, ctx, rng, undefined, Infinity, open.moveId ?? undefined) : null;
    const signature = open && enemy.confusionTurns <= 0 ? open : confusedPick && confusedPick.moveId === open?.moveId ? { ...confusedPick, signature: true } : null;
    const intent = forced ?? keyworded ?? signature ?? confusedPick ?? kept ?? chooseIntent(state, enemy, ctx, rng, undefined, Math.min(firstCap, budget)) ?? chooseIntent(state, enemy, ctx, rng, undefined, budget);
    if (signature) spendSignature(state, enemy);
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
    veiled = !forced && hides && !known && !teamRevealsIntents(state.player.team, ctx.content, !enemy.witnessed) && !relicsRevealIntents(state, ctx.content, !enemy.witnessed, state.turn);
    // §5.8.3 — a declared signature is always fully visible, under an Elite's first-action veil or Dense Fog alike.
    enemy.intent.hidden = enemy.intent.signature ? false : veiled;
    // §5.6.1 — a Pokémon that acts twice declares its second action now, chosen knowing the first: a different
    // move, and never a status the first (or the group) already means to put there. It hides what the first hides.
    if (enemy.acts === 2) {
      const spent = enemy.intent.moveId ? costOf(enemy.intent.moveId) : 0;
      const second = chooseIntent(state, enemy, ctx, rng, enemy.intent.moveId ?? undefined, budget - spent);
      enemy.second = second ? { ...second, hidden: veiled } : null;
    }
    // §4.1.3.1 — a full critical rhythm is declared here, on the hit that will spend it.
    markRhythm(enemy, ctx);
    // §5.2.1 — a stance is up the moment it is declared: the cards you are about to play already meet it.
    for (const i of [enemy.intent, enemy.second]) {
      if (!i?.stance || !i.moveId) continue;
      applyMoveEffects(state, { ...ctx, rng }, enemy, null, ctx.content.move(i.moveId));
    }
  }
  // §5.5.1 Trainer's Instinct — plan the next turn now, from what the enemy can see now, and show it. It hides
  // exactly as much as this turn's intent does: seeing further ahead is not seeing through a veil.
  if (relicsQueueIntents(state, ctx.content)) {
    const plan = chooseIntent(state, enemy, ctx, rng);
    if (plan) enemy.next = { intent: { ...plan, hidden: veiled }, phase: enemy.phase };
  }
  emit(state, { t: 'intent', enemyUid: enemy.uid, intent: { ...enemy.intent } });
  if (!enemy.intent.hidden) log(state, 'intent', `${enemy.name} ${describeIntent(state, enemy, ctx, enemy.intent, false)}`);
  else log(state, 'intent', `${enemy.name} is planning something…`);
  if (enemy.second) {
    emit(state, { t: 'intent', enemyUid: enemy.uid, intent: { ...enemy.second } });
    log(state, 'intent', enemy.second.hidden ? `…and something more.` : `…and then ${describeIntent(state, enemy, ctx, enemy.second, false)}`);
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
  // §4.1.3.1 — a rhythm crit is part of the declaration.
  const crit = i.crit ? ' · CRITICAL' : '';
  switch (i.kind) {
    case 'attack':
      return `readies ${move?.name} → ${slotText}${dmg !== null ? ` · ${dmg} dmg` : ''}${crit}`;
    case 'backstrike':
      return `aims ${move?.name} at ${slotText}${dmg !== null ? ` · ${dmg} dmg` : ''} (Backstrike)${crit}`;
    case 'cleave':
      // §9.2.5 — an area intent prints no single number: every target takes its own.
      return `winds up ${move?.name} → ALL SLOTS${crit}`;
    case 'buff':
      // §5.2.1 — a stance is already up.
      if (i.stance) return `raises ${move?.name} — it is up now.`;
      return ally && ally.uid !== enemy.uid ? `will power up ${ally.name} (${move?.name}).` : `is powering up (${move?.name}).`;
    case 'debuff':
      return `prepares ${move?.name} → ${slotText}`;
    case 'status':
      return `prepares ${move?.name} → ${slotText}`;
    case 'stall':
      if (ally && ally.uid !== enemy.uid && move) return `will heal ${ally.name} (${move.name}).`;
      return move ? `is recovering (${move.name}).` : 'is biding its time.';
    case 'incapacitated':
      return enemy.status?.kind === 'sleep' ? 'is fast asleep.' : enemy.status?.kind === 'freeze' ? 'is frozen solid.' : enemy.volatile?.recharge === 'active' ? 'must recharge.' : 'is caught off guard (Time Spinner).';
    case 'unknown':
      return 'is planning something…';
    case 'summon': {
      const who = summonedBy(state, enemy, move, ctx.config.maxOnField).map((h) => ctx.content.species(h.species).name);
      return `calls for help (${move?.name}) → ${who.length ? who.join(' and ') : 'nobody left'}`;
    }
    case 'guard':
      return `will step in front of ${ally?.name ?? 'its Lead'} (${move?.name}) and lead the group.`;
    case 'getaway':
      return move ? `is about to get away (${move.name})!` : 'is about to run away!';
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
