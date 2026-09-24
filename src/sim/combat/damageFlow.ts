import type { MoveDef } from '../content/defs';
import type { RunCtx } from './context';
import { emit, log } from './context';
import { computeDamage, type DamageBreakdown } from './damage';
import { drawSkillCards, purgeOwner } from './deck';
import {
  abilityAttackMultiplier,
  abilityBlocksStatus,
  abilityConditionalReduction,
  abilityDefenceMultiplier,
  abilityFlatReduction,
  abilityIgnoresRecoil,
  abilityOnEnterLead,
  abilityOnKill,
  abilityRiposte,
  abilityAbsorbBuff,
  abilityTypeAbsorb,
  hasSturdy,
  ridersAlwaysApply,
} from './abilities';
import { statusApplyDrawBonus, statusChillMultiplier, firstHitRelic, itemAttackMultiplier, itemCureHeal, itemDefenceMultiplier, itemEndures, itemFlatReduction, itemHealMultiplier, itemPinchHeal, itemReactiveStages, itemStatusExtraTurns, teamEndureRelic, type ReactiveStage } from './items';
import type { Combatant, CombatState, EnemyCombatant } from './state';
import { effectiveAttack, effectiveDefense } from './stats';
import { applyStatus, cureStatus } from './status';
import { effectivenessLabel } from './typeChart';

// Shared damage / effect pipeline used by player cards and enemy intents.

export interface HitOptions {
  crit: boolean;
  /** §4.2.2.5 — ×1.5 Fire damage into a Frozen target ("thaw window"). Computed by the caller. */
  bonusMultiplier?: number;
}

/** §7.4 — Pin Missile: N deterministic hits, so the printed power is the total and each hit is power/N. */
export function hitsOf(move: MoveDef): number {
  const fx = move.effects.find((e) => e.kind === 'multi-hit');
  return fx && fx.kind === 'multi-hit' ? Math.max(1, fx.hits) : 1;
}

/** Full damage breakdown for `move` from `attacker` into `target`, including ability multipliers. */
export function breakdownFor(attacker: Combatant, target: Combatant, move: MoveDef, crit: boolean, ctx: Pick<RunCtx, 'content' | 'config'>, state?: CombatState): DamageBreakdown {
  const abilityMul = abilityAttackMultiplier(attacker, move, ctx.content, ctx.config);
  const frozenFire = target.status?.kind === 'freeze' && move.type === 'fire' ? ctx.config.freezeFireDamageMultiplier : 1;
  const raw = computeDamage(
    {
      power: move.power,
      attack: effectiveAttack(attacker, ctx.config),
      // §7.4 Fissure — a ground-splitter ignores a braced stance, so Defence *stages* do not apply.
      defense: move.ignoresDefenseStages ? Math.max(1, target.base.defense) : effectiveDefense(target, ctx.config),
      range: move.range,
      moveType: move.type,
      attackerTypes: attacker.types,
      defenderTypes: target.types,
      crit,
      ...(move.alwaysCrit ? { alwaysCrit: true } : {}),
    },
    ctx.config,
  );
  let defenceMul = abilityDefenceMultiplier(target, raw.typeMultiplier, ctx.content) * abilityConditionalReduction(target, move, ctx.content);
  let itemMul = 1;
  if (state) {
    // §7.3.6 — relic, item, badge and field terms all multiply independently into the same formula.
    itemMul = itemAttackMultiplier(state, attacker, move, ctx.content, { typeMultiplier: raw.typeMultiplier });
    defenceMul *= itemDefenceMultiplier(state, target, ctx.content, {
      cleave: move.targeting === 'cleave',
      isLead: isLeadOf(state, target),
      fullyEvolved: ctx.content.species(target.speciesId).evolvesTo.length === 0,
      firstHitAvailable: firstHitRelic(state, ctx.content) !== null,
    });
  }
  // §5.10.3 Glacier Badge — a chilled attacker's next hit is blunted. On the combatant, not the relic list, so the
  // intent's predicted damage (which has no state to read) shows the smaller number too (Pillar 1).
  const chill = attacker.chill ?? 1;
  // Ability and thaw multipliers are applied to the pre-floor value so a single floor remains (§4.1.1).
  const final = Math.floor(raw.base * raw.critMultiplier * raw.stabMultiplier * raw.typeMultiplier * abilityMul * itemMul * defenceMul * frozenFire * chill);
  return { ...raw, final };
}

/**
 * The whole damage step for one attacker into one target: multi-hit, the hit itself, recoil and on-kill.
 * Both the player's card path and the enemy's intent path go through here so the four cannot drift apart.
 */
export function strike(
  state: CombatState,
  ctx: RunCtx,
  attacker: Combatant,
  target: Combatant,
  move: MoveDef,
  crit: boolean,
): { breakdown: DamageBreakdown; dealt: number } {
  const hits = hitsOf(move);
  const bd = breakdownFor(attacker, target, move, crit, ctx, state);
  emit(state, { t: 'attack', sourceUid: attacker.uid, targetUid: target.uid, moveId: move.id });

  let dealt = 0;
  if (hits > 1) {
    // Deterministic, and the printed power is the total: five hits of power/5, each floored on its own.
    const per = Math.max(1, Math.floor(bd.final / hits));
    for (let i = 0; i < hits && target.hp > 0; i++) {
      dealt += dealDamage(state, ctx, attacker.uid, target, per, { crit: bd.isCrit, effectiveness: effectivenessLabel(bd.typeMultiplier), cause: 'move' });
    }
    log(state, 'system', `Hit ${hits} times for ${dealt}.`);
  } else {
    dealt = dealDamage(state, ctx, attacker.uid, target, bd.final, {
      crit: bd.isCrit,
      effectiveness: effectivenessLabel(bd.typeMultiplier),
      cause: 'move',
      cleave: move.targeting === 'cleave',
    });
  }

  // §5.10.3 — the chill is spent by the attack it blunted.
  if (attacker.chill !== undefined) delete attacker.chill;
  riposte(state, ctx, attacker, target, move);
  applyOnKill(state, ctx, attacker, move, target);
  applyRecoil(state, ctx, attacker, move, dealt);
  applyDrain(state, attacker, move, dealt, ctx);
  return { breakdown: bd, dealt };
}

export function isLeadOf(state: CombatState, c: Combatant): boolean {
  return state.player.team[state.player.leadIndex]?.uid === c.uid;
}

/**
 * §6.5.2 — a whole type heals the wearer instead of hurting it (Water Absorb). Returns true when the hit was
 * swallowed, in which case no damage, no rider and no faint check follow.
 */
export function absorbedByAbility(state: CombatState, ctx: RunCtx, target: Combatant, move: MoveDef): boolean {
  if (move.power <= 0 || target.hp <= 0) return false;
  const amount = abilityTypeAbsorb(target, move.type, ctx.content);
  if (amount === null) return false;
  // §6.5.2 Flash Fire — the same swallow, but the wearer is buffed rather than healed.
  const buff = abilityAbsorbBuff(target, move.type, ctx.content);
  if (buff) {
    changeStage(state, target, buff, 1);
    log(state, 'system', `${target.name} absorbed the ${move.type} and its ${buff} rose.`);
    return true;
  }
  const healed = heal(state, target, amount, 'ability');
  log(state, 'system', healed > 0 ? `${target.name} absorbed the ${move.type} and recovered ${healed} HP.` : `${target.name} absorbed the ${move.type}.`);
  return true;
}

/**
 * §6.5.2 — Poison Point / Effect Spore: touching the wearer costs the attacker something. Runs after the hit
 * lands, so an attacker that fainted the target still catches it.
 */
export function riposte(state: CombatState, ctx: RunCtx, attacker: Combatant, target: Combatant, move: MoveDef): void {
  if (attacker.hp <= 0 || move.power <= 0) return;
  const back = abilityRiposte(target, move, ctx.content);
  if (!back || !ctx.rng.chance(back.chance)) return;
  if (abilityBlocksStatus(attacker, back.status, ctx.content)) return;
  if (applyStatus(attacker, back.status, state.turn, ctx.config) !== 'applied') return;
  emit(state, { t: 'status-applied', targetUid: attacker.uid, status: back.status });
  log(state, 'system', `${attacker.name} was ${statusVerb(back.status)} on contact!`);
  chillOnStatus(state, ctx, attacker);
}

/**
 * §5.10.3 Glacier Badge — when a status lands on an enemy, by any road (a move's rider, a contact ability), its
 * next attack deals less. Set, not stacked: a Pokémon holds one status at a time, so it can be chilled once.
 */
function chillOnStatus(state: CombatState, ctx: RunCtx, target: Combatant): void {
  if (isPlayers(state, target)) return;
  const m = statusChillMultiplier(state, ctx.content);
  if (m === 1) return;
  target.chill = m;
  log(state, 'system', `The Glacier Badge chills ${target.name}: its next attack is weaker.`);
}

/**
 * §6.5.3.5 — Intimidate and Steadfast fire on *entering* the Lead slot, by any route: a manual swap, a
 * Step-Forward, or a replacement after a faint. One place, so no route can forget.
 */
export function onEnterLead(state: CombatState, ctx: RunCtx, index: number): void {
  const entering = state.player.team[index];
  if (!entering || entering.hp <= 0) return;
  for (const fx of abilityOnEnterLead(entering, ctx.content)) {
    if (fx.target === 'self') changeStage(state, entering, fx.stat, fx.stages);
    else for (const e of state.enemies) changeStage(state, e, fx.stat, fx.stages);
  }
}

/**
 * Apply `amount` damage to `target`. Handles Shell Armor, Sturdy (§5.8.3 / §6.6), fainting, deck purge (§3.3.5),
 * Trauma (§8.2) and sequential enemy replacement (§5.9.3). Returns the damage actually dealt.
 */
export function dealDamage(
  state: CombatState,
  ctx: RunCtx,
  sourceUid: string | null,
  target: Combatant,
  amount: number,
  meta: { crit: boolean; effectiveness: ReturnType<typeof effectivenessLabel>; cause: 'move' | 'burn' | 'poison'; cleave?: boolean },
): number {
  if (target.hp <= 0) return 0;
  let dmg = Math.max(0, amount);
  if (meta.cause === 'move') {
    const isLead = isLeadOf(state, target);
    // §6.6 abilities first, then §5.10.1's Boulder Badge. Both are flat and both floor at zero, so the order
    // between them cannot matter; what matters is that they land *after* the multipliers and not before.
    dmg = Math.max(0, dmg - abilityFlatReduction(target, isLead, ctx.content) - itemFlatReduction(state, target, ctx.content, isLead, !!meta.cleave));
  }
  // §7.4 Wide Guard — one charge, spent on the first Cleave that lands on the team.
  const guard = state.player.guards.cleave;
  if (meta.cleave && guard.charges > 0 && state.player.team.some((m) => m.uid === target.uid)) {
    guard.charges -= 1;
    dmg = Math.floor((dmg * (100 - guard.percent)) / 100);
    log(state, 'system', `The team's guard absorbed most of the Cleave.`);
  }
  // §7.3.6 — Barrier Charm's one charge, spent on the first hit that actually lands.
  if (meta.cause === 'move' && isPlayers(state, target)) {
    const first = firstHitRelic(state, ctx.content);
    if (first) state.player.spent.push(first.id);
  }

  // §7.3.7 Battle Hardened — the shield eats damage before HP does, and never comes back.
  if (target.shield > 0 && dmg > 0) {
    const absorbed = Math.min(target.shield, dmg);
    target.shield -= absorbed;
    dmg -= absorbed;
    log(state, 'system', `${target.name}'s shield absorbed ${absorbed}.`);
  }

  // §7.3.6 — faint prevention, in the order the canon fixes: Sturdy (ability) → Last Stand (Legendary) →
  // Focus Sash (held item) → Phoenix Feather (the consumed relic, and the true last resort).
  //
  // The order is the whole rule. Each rung is scarcer than the one above it, so spending them out of order
  // would burn the once-per-run feather on a hit the free ability charge would have eaten.
  if (dmg >= target.hp && target.hp > 1) {
    const teamEndure = isPlayers(state, target) ? teamEndureRelic(state, ctx.content) : null;
    if (target.sturdyAvailable && hasSturdy(target, ctx.content)) {
      dmg = target.hp - 1;
      target.sturdyAvailable = false;
      emit(state, { t: 'sturdy', uid: target.uid });
      log(state, 'system', `${target.name} endured the hit with Sturdy!`);
    } else if (teamEndure && !teamEndure.params?.oncePerRun) {
      dmg = target.hp - 1;
      state.player.spent.push(teamEndure.id);
      emit(state, { t: 'sturdy', uid: target.uid });
      log(state, 'system', `${target.name} refuses to go down.`);
    } else if (itemEndures(target, ctx.content)) {
      dmg = target.hp - 1;
      target.endureAvailable = false;
      emit(state, { t: 'sturdy', uid: target.uid });
      log(state, 'system', `${target.name} hung on with its Focus Sash!`);
    } else if (teamEndure) {
      dmg = target.hp - 1;
      state.player.spent.push(teamEndure.id);
      emit(state, { t: 'sturdy', uid: target.uid });
      log(state, 'system', `The Phoenix Feather burns away, and ${target.name} stands back up.`);
    }
  }
  target.hp = Math.max(0, target.hp - dmg);
  // §8.7 — the tally is of damage the *player* took, whatever caused it: a burn that chips you is still
  // damage taken, and "win without taking any" would be a lie if it were not counted.
  if (isPlayers(state, target)) state.player.totalDamageTaken += dmg;
  emit(state, { t: 'damage', sourceUid, targetUid: target.uid, amount: dmg, crit: meta.crit, effectiveness: meta.effectiveness, hpAfter: target.hp, cause: meta.cause });

  if (target.hp === 0) {
    // §7.3.5 Champion's Crest — credit the Pokémon that actually landed the blow, and only for an enemy.
    // Burn and poison have no source, which is right: a status tick is not a knockout you earned.
    const killer = sourceUid ? state.player.team.find((m) => m.uid === sourceUid) : undefined;
    if (killer && !state.player.team.some((m) => m.uid === target.uid)) killer.defeats += 1;
    onFaint(state, ctx, target);
  }
  else itemReactions(state, ctx, target);
  return dmg;
}

const isPlayers = (state: CombatState, c: Combatant) => state.player.team.some((m) => m.uid === c.uid);

/**
 * §7.3.4 — the relics that answer *being hurt*: Vital Pendant pulls a Pokémon back from the brink, Bond
 * Bracelet braces the bench the first time the Lead is in trouble. Both are once-per-combat and both fire
 * here, right after the damage lands, so the player sees cause and effect in one beat.
 */
function itemReactions(state: CombatState, ctx: RunCtx, target: Combatant): void {
  if (!isPlayers(state, target)) return;

  const pinch = itemPinchHeal(state, target, ctx.content);
  if (pinch) {
    state.player.spent.push(pinch.relicId);
    const to = Math.floor((target.maxHp * pinch.toPercent) / 100);
    if (to > target.hp) {
      const healed = heal(state, target, to - target.hp, 'ability');
      log(state, 'system', `${target.name} was pulled back from the brink (+${healed}).`);
    }
  }

  if (isLeadOf(state, target) && target.hp > 0) {
    for (const fx of itemReactiveStages(state, 'lead-low', ctx.content)) {
      if (state.player.spent.includes(fx.relicId)) continue;
      const below = (target.hp / target.maxHp) * 100;
      if (below >= 50) continue;
      state.player.spent.push(fx.relicId);
      applyReactiveStage(state, fx, target);
    }
  }
}

/** Apply one reactive stage to whichever scope its relic names. */
export function applyReactiveStage(state: CombatState, fx: ReactiveStage, focus: Combatant | null): void {
  const leadMon = state.player.team[state.player.leadIndex];
  const targets =
    fx.target === 'lead'
      ? [leadMon]
      : fx.target === 'bench'
        ? state.player.team.filter((m) => m.uid !== (focus ?? leadMon)?.uid)
        : state.player.team;
  for (const m of targets) if (m && m.hp > 0) changeStage(state, m, fx.stat, fx.stages);
}

export function onFaint(state: CombatState, ctx: RunCtx, c: Combatant): void {
  const isPlayer = state.player.team.some((m) => m.uid === c.uid);
  // §7.3.4 Adrenal Surge — the rest of the team answers a loss. Applied before the purge so the log reads
  // in the order it happened.
  if (isPlayer) for (const fx of itemReactiveStages(state, 'faint', ctx.content)) applyReactiveStage(state, fx, c);
  c.status = null;
  c.confusionTurns = 0;
  c.regen = null;
  emit(state, { t: 'faint', uid: c.uid, side: isPlayer ? 'player' : 'enemy' });
  log(state, isPlayer ? 'player' : 'enemy', `${c.name} fainted!`);
  if (isPlayer) {
    // §3.3.5 — purge the fainted Pokémon's cards from deck AND discard; §8.2 — +1 Trauma.
    purgeOwner(state, c.uid);
    c.traumaStacks += 1;
  } else {
    const e = c as EnemyCombatant;
    e.intent = null;
    state.enemies = state.enemies.filter((x) => x.uid !== e.uid);
    state.defeatedEnemies.push(e);
    const next = state.enemyQueue.shift();
    if (next) {
      state.enemies.push(next);
      emit(state, { t: 'enemy-enter', enemyUid: next.uid });
      log(state, 'enemy', `${state.trainer?.name ?? 'The enemy'} sent out ${next.name}!`);
      // Telegraph immediately so the player can still react with remaining AP (§5.1).
      ctx.declareIntentFor?.(state, next);
    }
  }
}

/** Heal capped at EffectiveMaxHP (§3.10). Returns the amount actually healed. */
export function heal(state: CombatState, target: Combatant, amount: number, cause: 'move' | 'consumable' | 'regen' | 'ability', content?: RunCtx['content']): number {
  if (target.hp <= 0) return 0;
  // §7.3.3 Berry Pouch — healing *items* restore more; a move's own heal is the move's business.
  if (cause === 'consumable' && content) amount *= itemHealMultiplier(state, content);
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + Math.max(0, Math.floor(amount)));
  const healed = target.hp - before;
  if (healed > 0) emit(state, { t: 'heal', targetUid: target.uid, amount: healed, hpAfter: target.hp, cause });
  return healed;
}

export function changeStage(state: CombatState, target: Combatant, stat: 'attack' | 'defense' | 'speed', delta: number): void {
  if (target.hp <= 0 || delta === 0) return;
  const before = target.stages[stat];
  target.stages[stat] = Math.max(-6, Math.min(6, before + delta));
  const applied = target.stages[stat] - before;
  emit(state, { t: 'stage', targetUid: target.uid, stat, delta: applied, total: target.stages[stat] });
  const dir = applied > 0 ? 'rose' : applied < 0 ? 'fell' : "can't change";
  log(state, 'system', `${target.name}'s ${stat} ${dir}${Math.abs(applied) > 1 ? ' sharply' : ''}.`);
}

/**
 * §7.4 — a team-wide shield spends a charge to stop the next condition. Player side only: these come from the
 * player's own cards, and an enemy Safeguard is not a thing the catalogue asks for.
 */
function teamGuardBlocksStatus(state: CombatState, target: Combatant): boolean {
  if (state.player.guards.status <= 0) return false;
  if (!state.player.team.some((m) => m.uid === target.uid)) return false;
  state.player.guards.status -= 1;
  return true;
}

/** Apply a move's secondary effects after damage (riders, stages, heal/regen). `draw` is handled by the caller. */
export function applyMoveEffects(state: CombatState, ctx: RunCtx, attacker: Combatant, target: Combatant | null, move: MoveDef): void {
  const alwaysRider = ridersAlwaysApply(attacker, ctx.content);
  for (const fx of move.effects) {
    switch (fx.kind) {
      case 'status': {
        const recipient = fx.self ? attacker : target;
        if (!recipient || recipient.hp <= 0) {
          // §8.6.1 Wide Lens's discovery — your rider had a target and the target was already down.
          if (recipient && !fx.self && isPlayers(state, attacker)) state.player.tally.riderFizzles += 1;
          break;
        }
        const roll = fx.chance >= 1 || alwaysRider ? true : ctx.rng.chance(fx.chance);
        if (!roll) break;
        // §6.5.2 — an ability immunity reads exactly like a type immunity to the player.
        if (abilityBlocksStatus(recipient, fx.status, ctx.content) || teamGuardBlocksStatus(state, recipient)) {
          emit(state, { t: 'status-immune', targetUid: recipient.uid, status: fx.status });
          log(state, 'system', `${recipient.name} is immune to ${fx.status}.`);
          break;
        }
        const res = applyStatus(recipient, fx.status, state.turn, ctx.config, fx.escalating);
        // §7.3.4 Status Lance — the statuses *you* apply stick around a turn longer. Sleep and Freeze are
        // excluded on purpose: both already remove a turn of agency and a fourth would not be fun.
        const extra = fx.self || !isPlayers(state, attacker) ? 0 : itemStatusExtraTurns(state, ctx.content);
        if (res === 'applied' && extra > 0 && recipient.status?.turnsLeft != null && fx.status !== 'sleep' && fx.status !== 'freeze') {
          recipient.status.turnsLeft += extra;
        }
        if (res === 'applied') {
          emit(state, { t: 'status-applied', targetUid: recipient.uid, status: fx.status });
          log(state, 'system', `${recipient.name} was ${statusVerb(fx.status)}!`);
          chillOnStatus(state, ctx, recipient);
          // §5.10.2 Soul Badge — a status you put on an enemy hands you a card, now, while the turn is yours.
          if (!fx.self && isPlayers(state, attacker) && !isPlayers(state, recipient)) {
            const cards = statusApplyDrawBonus(state, ctx.content);
            const drawn = cards > 0 ? drawSkillCards(state, cards, ctx.rng) : [];
            if (drawn.length) {
              emit(state, { t: 'draw', cardIds: drawn.map((c) => c.id), consumableIds: [] });
              log(state, 'system', `The Soul Badge turns the ${fx.status} into ${drawn.length === 1 ? 'a card' : `${drawn.length} cards`}.`);
            }
          }
        } else if (res === 'immune') {
          emit(state, { t: 'status-immune', targetUid: recipient.uid, status: fx.status });
          log(state, 'system', `${recipient.name} is immune to ${fx.status}.`);
        } else if (res === 'already') {
          // §4.2.2.4 — reads like an immunity on screen: the play is spent and nothing lands.
          emit(state, { t: 'status-immune', targetUid: recipient.uid, status: fx.status });
          log(state, 'system', `${recipient.name} is already ${recipient.status?.kind === 'freeze' ? 'frozen' : 'asleep'} — it cannot be put under again.`);
        }
        break;
      }
      case 'stage': {
        // §7.4 Aromatic Mist — a stage the caster hands to everyone *but* itself, which is what makes it a
        // support card rather than a cheaper self-buff.
        if (fx.target === 'bench') {
          for (const m of state.player.team) if (m.hp > 0 && m.uid !== attacker.uid) changeStage(state, m, fx.stat, fx.stages);
          break;
        }
        const recipient = fx.target === 'self' ? attacker : target;
        if (recipient) changeStage(state, recipient, fx.stat, fx.stages);
        break;
      }

      case 'team-cure': {
        // §7.3 Healer's Kit pays per Pokémon actually cured — Aromatherapy on a clean team still heals nobody.
        const bonus = itemCureHeal(state, ctx.content);
        for (const m of state.player.team) {
          if (m.hp <= 0) continue;
          const removed = cureStatus(m, 'all');
          for (const s of removed) {
            emit(state, { t: 'status-cleared', targetUid: m.uid, status: s, cause: 'cured' });
            log(state, 'system', `${m.name} was cured of ${s}.`);
          }
          if (removed.length && bonus > 0) heal(state, m, bonus, 'consumable', ctx.content);
        }
        break;
      }
      case 'heal': {
        if (fx.durationTurns && fx.durationTurns > 0) {
          attacker.regen = { percentOfMaxHp: fx.percentOfMaxHp, turnsLeft: fx.durationTurns };
          log(state, 'system', `${attacker.name} is surrounded by a healing veil.`);
        } else {
          const amount = heal(state, attacker, attacker.maxHp * fx.percentOfMaxHp, 'move');
          if (amount > 0) log(state, 'system', `${attacker.name} recovered ${amount} HP.`);
        }
        break;
      }
      case 'team-guard': {
        // Player-only: these are cards your team plays for your team.
        if (!state.player.team.some((m) => m.uid === attacker.uid)) break;
        if (fx.guard === 'status') {
          state.player.guards.status += 1;
          log(state, 'system', 'A shield settles over the team — the next status is blocked.');
        } else {
          state.player.guards.cleave = { charges: state.player.guards.cleave.charges + 1, percent: fx.percent ?? 50 };
          log(state, 'system', `The team braces — the next Cleave deals ${100 - (fx.percent ?? 50)} % less.`);
        }
        break;
      }

      case 'recoil':
      case 'drain':
      case 'multi-hit':
      case 'on-kill-stage':
      case 'draw':
        // Resolved where the damage is, or by the action reducer which owns the hand.
        break;
    }
  }
}

/**
 * §4.1.6 — drain: the attacker recovers a share of the damage it actually dealt. Before v0.7.5 the drain moves
 * healed a share of Max HP whatever they hit, which made Mega Drain the best sustain per AP in the Grass kit.
 */
export function applyDrain(state: CombatState, attacker: Combatant, move: MoveDef, dealt: number, ctx: RunCtx): void {
  const fx = move.effects.find((e) => e.kind === 'drain');
  if (!fx || fx.kind !== 'drain' || dealt <= 0 || attacker.hp <= 0) return;
  const amount = heal(state, attacker, Math.max(1, Math.floor(dealt * fx.percentOfDamage)), 'move', ctx.content);
  if (amount > 0) log(state, 'system', `${attacker.name} drained ${amount} HP.`);
}

/**
 * §7.4 — recoil, and the one ability that answers it. Rock Head exists precisely so a recoil move can be a
 * Pokémon's identity without also being its clock, so it cancels the self-damage rather than reducing it.
 */
export function applyRecoil(state: CombatState, ctx: RunCtx, attacker: Combatant, move: MoveDef, dealt: number): void {
  const fx = move.effects.find((e) => e.kind === 'recoil');
  if (!fx || fx.kind !== 'recoil' || dealt <= 0 || attacker.hp <= 0) return;
  if (abilityIgnoresRecoil(attacker, ctx.content)) {
    log(state, 'system', `${attacker.name}'s Rock Head shrugged off the recoil.`);
    return;
  }
  const self = Math.max(1, Math.floor(dealt * fx.percentOfDamage));
  log(state, 'system', `${attacker.name} is hit by the recoil.`);
  dealDamage(state, ctx, attacker.uid, attacker, self, { crit: false, effectiveness: 'neutral', cause: 'move' });
}

/**
 * §7.4 — Fell Stinger's stage change, and Moxie. Both only fire when the move actually took the target down,
 * which is why they cannot live in `applyMoveEffects`: that runs while the target is still standing.
 */
export function applyOnKill(state: CombatState, ctx: RunCtx, attacker: Combatant, move: MoveDef, target: Combatant): void {
  if (target.hp > 0 || attacker.hp <= 0) return;
  for (const fx of move.effects) {
    if (fx.kind === 'on-kill-stage') changeStage(state, attacker, fx.stat, fx.stages);
  }
  for (const boost of abilityOnKill(attacker, ctx.content)) changeStage(state, attacker, boost.stat, boost.stages);
}

export function statusVerb(status: string): string {
  switch (status) {
    case 'burn':
      return 'burned';
    case 'poison':
      return 'poisoned';
    case 'paralysis':
      return 'paralysed';
    case 'sleep':
      return 'put to sleep';
    case 'freeze':
      return 'frozen solid';
    case 'confusion':
      return 'confused';
    default:
      return status;
  }
}

export const effectivenessOf = effectivenessLabel;
