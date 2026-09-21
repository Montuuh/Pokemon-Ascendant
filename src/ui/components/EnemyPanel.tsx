import { IconQuestionMark } from '@tabler/icons-react';
import type { CombatCtx, CombatState, EnemyCombatant } from '@/sim';
import { SLOT_LABEL, catchPercent, catchStatus, currentPhase, phaseMarkers, predictIntentDamage, slotOccupant } from '@/sim';
import { iconOf, intentGlyph } from '@/ui/art';
import { INTENT_LABEL } from '@/ui/strings';
import { HpBar } from './HpBar';
import { StatusBadge, TypeBadge } from './TypeBadge';
import { catchTip, intentTip } from '@/ui/tips';
import { Tip, Tipped, useTip } from '@/ui/tooltip';
import styles from './EnemyPanel.module.css';

interface Props {
  state: CombatState;
  enemy: EnemyCombatant;
  ctx: CombatCtx;
  targetable: boolean;
  onClick: () => void;
  fxClass?: string;
}

// Per §9.2.2.2 / §9.2.5 — enemy zone: intent chip (kind glyph + magnitude + slot with current occupant),
// HP bar with phase markers for bosses, status/stage chips, and the catch pill for wild fights.
// The animated sprite lives in the arena; this panel is the readable HUD card.
export function EnemyPanel({ state, enemy, ctx, targetable, onClick, fxClass }: Props) {
  const intent = enemy.intent;
  const predicted = intent ? predictIntentDamage(state, enemy, ctx) : null;
  const move = intent?.moveId ? ctx.content.move(intent.moveId) : null;
  const slotOcc = intent?.targetSlot ? slotOccupant(state, intent.targetSlot) : null;
  const phase = currentPhase(enemy, ctx.config);
  const gauge = catchStatus(state, ctx);
  const intentTipProps = useTip(intent ? intentTip(intent.kind, move ? move.name : undefined, intent.hidden) : null);
  const catchTipProps = useTip(gauge ? catchTip(gauge) : null);
  const stageChips = (['attack', 'defense'] as const).filter((s) => enemy.stages[s] !== 0);
  // §2.8.2 — an Elite Wild is boss-*tier* and is not a Gym Leader, so the label reads the scenario's kind
  // first. Tier is how hard it hits; kind is what it is, and the chip is telling the player what it is.
  const tierLabel =
    enemy.tier === 'boss' && state.kind === 'wild' ? 'Boss Wild'
    : enemy.tier === 'boss' ? 'Gym Leader'
    : enemy.tier === 'elite' ? 'Elite'
    : enemy.tier === 'trainer' ? 'Trainer'
    : 'Wild';

  return (
    <div className={styles.zone} data-testid="foe-panel">
      <div className={[styles.intent, intent?.hidden ? styles.intentHidden : '', intent?.kind === 'incapacitated' ? styles.intentIdle : ''].join(' ')} data-testid="intent-chip" {...intentTipProps}>
        {intent?.hidden ? (
          <>
            <IconQuestionMark size={18} />
            <span>Unknown intent</span>
          </>
        ) : intent ? (
          <>
            <img src={intentGlyph(intent.kind === 'incapacitated' ? 'stall' : intent.kind === 'debuff' ? 'status' : intent.kind)} alt="" width={20} height={20} className={styles.intentIcon} />
            <span className={styles.intentText}>
              <b>{move ? move.name : INTENT_LABEL[intent.kind]}</b>
              {intent.kind === 'cleave' && <> → <b>ALL SLOTS</b>{predicted !== null ? ` · ~${predicted} each` : ''}</>}
              {intent.targetSlot && (
                <>
                  {' '}→ <b>{SLOT_LABEL[intent.targetSlot]}</b> ({slotOcc ? slotOcc.name : 'empty'})
                  {predicted !== null && predicted > 0 ? <> · <b className={styles.dmg}>{predicted} dmg</b></> : null}
                </>
              )}
              {intent.kind === 'buff' && ' — powering up'}
              {intent.kind === 'stall' && move && ' — recovering'}
              {intent.kind === 'incapacitated' && (enemy.status?.kind === 'sleep' ? ' — fast asleep' : ' — frozen solid')}
              {intent.kind === 'backstrike' && <small> Backstrike bypasses the Lead</small>}
            </span>
          </>
        ) : (
          <span>…</span>
        )}
      </div>

      <button
        type="button"
        className={[styles.card, targetable ? styles.targetable : '', enemy.hp <= 0 ? styles.fainted : '', fxClass ?? ''].join(' ')}
        onClick={onClick}
        data-testid={`enemy-${enemy.speciesId}`}
      >
        <span className={styles.header}>
          <img className={`${styles.icon} pixel`} src={iconOf(enemy)} alt="" width={48} height={40} />
          <span className={styles.types}>
            {enemy.types.map((t) => (
              <TypeBadge key={t} type={t} size={24} defenderTypes={enemy.types} />
            ))}
          </span>
          <span className={styles.nameBlock}>
            <span className={`${styles.name} display`}>{enemy.name}</span>
            <span className={styles.meta}>
              Lv {enemy.level} · {tierLabel}
              {enemy.phaseCount > 1 && <> · <b className={styles.phase}>Phase {phase}/{enemy.phaseCount}</b></>}
            </span>
          </span>
          <span className={styles.badges}>
            {enemy.status && (
              <StatusBadge status={enemy.status.kind} size={28} />
            )}
            {enemy.confusionTurns > 0 && (
              <StatusBadge status="confusion" size={28} />
            )}
          </span>
        </span>
        <HpBar hp={enemy.hp} maxHp={enemy.maxHp} phaseMarkers={phaseMarkers(enemy, ctx.config)} height={14} />
        <span className={styles.hpRow}>
          <span className={`display tabular ${styles.hpText}`}>
            {enemy.hp} / {enemy.maxHp}
          </span>
          <span className={styles.chips}>
            {stageChips.map((s) => (
              <span key={s} className={enemy.stages[s] > 0 ? styles.chipUp : styles.chipDown}>
                {s === 'attack' ? 'Atk' : 'Def'} {enemy.stages[s] > 0 ? '+' : ''}
                {enemy.stages[s]}
              </span>
            ))}
            {enemy.sturdyAvailable && (
              <Tipped tip={<Tip title="Sturdy" body="Survives one hit that would have knocked it out, at 1 HP. Once per fight." />} className={styles.chipInfo}>
                Sturdy
              </Tipped>
            )}
          </span>
        </span>
      </button>

      {gauge && (
        <div className={[styles.catch, gauge.chance >= 0.5 ? styles.catchReady : ''].join(' ')} data-testid="catch-pill" data-chance={catchPercent(gauge)} {...catchTipProps}>
          <span className={styles.ball} />
          <span className={styles.catchTrack}>
            <span className={styles.catchFill} style={{ width: `${catchPercent(gauge)}%` }} />
          </span>
          {/* §2.6.4 (2026-09-21) — the number *is* the chance now, so it is printed as one. Weaken or status
              the target and watch it climb; the bar is the same number as a length. */}
          <span className={`${styles.catchLabel} display`}>{gauge.ballsLeft === 0 ? 'no balls' : gauge.guaranteed ? 'SURE' : `${catchPercent(gauge)}%`}</span>
          <span className={styles.catchBalls}>×{gauge.ballsLeft}</span>
        </div>
      )}
    </div>
  );
}
