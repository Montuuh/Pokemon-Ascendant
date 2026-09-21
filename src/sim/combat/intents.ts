import type { MoveDef } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import type { IntentKind, SlotId } from '../types';
import type { BattleConfig } from './battleConfig';
import type { CombatCtx } from './context';
import { emit, log } from './context';
import { breakdownFor } from './damageFlow';
import { teamRevealsIntents } from './abilities';
import { relicsRevealIntents } from './items';
import { bossArchetype, currentPhase } from './boss';
import { slotOccupant, SLOT_LABEL } from './slots';
import type { Combatant, CombatState, EnemyCombatant, Intent } from './state';
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
  const status = move.effects.find((e) => e.kind === 'status' && !e.self);
  if (status) return { kind: 'status', moveId: move.id, targetSlot: 'lead', hidden: false };
  const debuff = move.effects.find((e) => e.kind === 'stage' && e.target === 'foe');
  if (debuff) return { kind: 'debuff', moveId: move.id, targetSlot: 'lead', hidden: false };
  const buff = move.effects.find((e) => e.kind === 'stage' && e.target === 'self');
  if (buff) return { kind: 'buff', moveId: move.id, targetSlot: null, hidden: false };
  const healFx = move.effects.find((e) => e.kind === 'heal');
  if (healFx) return { kind: 'stall', moveId: move.id, targetSlot: null, hidden: false };
  return null; // draw-only moves mean nothing to an enemy
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
  }
  if (intent.kind === 'debuff' && occ) {
    const fx = move.effects.find((e) => e.kind === 'stage' && e.target === 'foe');
    if (fx && fx.kind === 'stage' && occ.stages[fx.stat] <= -6) return 0; // already floored
  }
  if (intent.kind === 'buff') {
    const fx = move.effects.find((e) => e.kind === 'stage' && e.target === 'self');
    if (fx && fx.kind === 'stage') {
      // Each stage already banked makes the next one worth less: no Defense Curl loops while losing.
      const banked = Math.max(0, enemy.stages[fx.stat]);
      if (banked >= 6) return 0;
      score *= Math.max(0, 1 - banked / 3);
    }
  }
  const selfHp = hpFraction(enemy);
  if (intent.kind === 'stall') {
    // A heal is worth its missing HP: near full it is a wasted turn, at half HP it competes with a hit,
    // when losing it is the urgent play. Never treated as "setup".
    const missing = 1 - selfHp;
    if (missing <= 0.15) return 0;
    score *= missing * 2;
    if (selfHp < cfg.lowSelfHpThreshold) score *= cfg.aggressiveSelfMultiplier;
    return score;
  }
  if (OFFENSIVE.includes(intent.kind) && selfHp < cfg.lowSelfHpThreshold) score *= cfg.aggressiveSelfMultiplier;
  if (intent.kind === 'buff' && selfHp > cfg.highSelfHpThreshold) score *= cfg.setupSelfMultiplier;

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
export function chooseIntent(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx, rng: GameRng): Intent | null {
  const cands: Candidate[] = [];
  for (const moveId of enemy.moveIds) {
    const move = ctx.content.move(moveId);
    const intent = classifyMove(state, enemy, move, ctx);
    if (!intent) continue;
    cands.push({ intent, move, score: scoreIntent(state, enemy, { intent, move }, ctx) });
  }
  // Ties resolve toward pressure: offensive intents are considered before setup/utility with equal scores.
  const KIND_PRIORITY: Record<IntentKind, number> = { attack: 0, cleave: 0, backstrike: 0, status: 1, debuff: 2, stall: 3, buff: 4, unknown: 5, incapacitated: 5 };
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

/** §3.2.3 — declare the enemy's intent (and apply boss phase transitions first). */
export function declareIntent(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx, rng: GameRng): void {
  if (enemy.hp <= 0) return;
  const locked = cardsLocked(enemy);
  if (locked) {
    enemy.intent = { kind: 'incapacitated', moveId: null, targetSlot: null, hidden: false };
  } else {
    const intent = chooseIntent(state, enemy, ctx, rng);
    enemy.intent = intent ?? { kind: 'stall', moveId: null, targetSlot: null, hidden: false };
    // §5.5 (CL-011) — Elite/Gym enemies hide their first intent until they have fired a move.
    // §8.8 Dense Fog extends the same one-intent blind to the ordinary enemies, which is the whole modifier:
    // it does not hide *more*, it hides the same amount from everyone.
    const fogged = state.modifiers.includes('dense-fog') && !enemy.witnessed;
    const hides = fogged || ((enemy.tier === 'boss' || enemy.tier === 'elite') && !enemy.witnessed);
    // §5.13.1 Familiar — a species you have fought enough never hides from you again. §8.4.2 Pokédex Insight
    // shows one intent free the first time you meet a species you have not yet earned that on.
    const known = state.familiar.includes(enemy.speciesId) || (!enemy.witnessed && state.insight.includes(enemy.speciesId));
    // §7.3.7 Clear Mind does what §6.5.2's ability does, from the relic case instead of the party.
    enemy.intent.hidden = hides && !known && !teamRevealsIntents(state.player.team, ctx.content, !enemy.witnessed) && !relicsRevealIntents(state, ctx.content, !enemy.witnessed);
  }
  emit(state, { t: 'intent', enemyUid: enemy.uid, intent: { ...enemy.intent } });
  if (!enemy.intent.hidden) log(state, 'enemy', `${enemy.name} ${describeIntent(state, enemy, ctx)}`);
  else log(state, 'enemy', `${enemy.name} is planning something…`);
}

/** Predicted damage of an intent against the CURRENT occupant of its slot (recomputed live for the UI). */
export function predictIntentDamage(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx): number | null {
  const intent = enemy.intent;
  if (!intent || !intent.moveId) return null;
  const move = ctx.content.move(intent.moveId);
  if (move.power <= 0) return null;
  if (intent.kind === 'cleave') {
    const occ = slotOccupant(state, 'lead');
    return occ ? breakdownFor(enemy, occ, move, !!move.alwaysCrit, ctx).final : null;
  }
  const occ = intent.targetSlot ? slotOccupant(state, intent.targetSlot) : null;
  if (!occ) return 0;
  return breakdownFor(enemy, occ, move, !!move.alwaysCrit, ctx).final;
}

// §5.5 — what a hidden intent still tells you: the KIND, never the magnitude or the target.
// A completely blind intent reads as an ambush rather than a read you missed, which is the one thing
// Pillar 1 cannot afford.
const HIDDEN_TEXT: Partial<Record<IntentKind, string>> = {
  attack: 'is winding up an attack…',
  cleave: 'is winding up something that will hit everyone…',
  backstrike: 'is eyeing your bench…',
  status: 'is preparing something nasty…',
  debuff: 'is preparing to weaken you…',
  buff: 'is powering up…',
  stall: 'is digging in…',
  incapacitated: 'cannot act.',
};

export function describeIntent(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx): string {
  const i = enemy.intent;
  if (!i) return 'waits.';
  // §5.5 — a hidden intent still shows what KIND of thing is coming, just not how hard.
  if (i.hidden) return HIDDEN_TEXT[i.kind] ?? 'is planning something…';
  const move = i.moveId ? ctx.content.move(i.moveId) : null;
  const slotText = i.targetSlot ? `${SLOT_LABEL[i.targetSlot]} (${slotOccupant(state, i.targetSlot)?.name ?? 'empty'})` : '';
  const dmg = predictIntentDamage(state, enemy, ctx);
  switch (i.kind) {
    case 'attack':
      return `readies ${move?.name} → ${slotText}${dmg !== null ? ` · ${dmg} dmg` : ''}`;
    case 'backstrike':
      return `aims ${move?.name} at ${slotText}${dmg !== null ? ` · ${dmg} dmg` : ''} (Backstrike)`;
    case 'cleave':
      return `winds up ${move?.name} → ALL SLOTS${dmg !== null ? ` · ~${dmg} dmg` : ''}`;
    case 'buff':
      return `is powering up (${move?.name}).`;
    case 'debuff':
      return `prepares ${move?.name} → ${slotText}`;
    case 'status':
      return `prepares ${move?.name} → ${slotText}`;
    case 'stall':
      return move ? `is recovering (${move.name}).` : 'is biding its time.';
    case 'incapacitated':
      return enemy.status?.kind === 'sleep' ? 'is fast asleep.' : 'is frozen solid.';
    case 'unknown':
      return 'is planning something…';
  }
}
