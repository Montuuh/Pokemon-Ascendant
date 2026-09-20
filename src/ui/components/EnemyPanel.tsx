import { IconQuestionMark } from '@tabler/icons-react';
import type { CombatCtx, CombatState, EnemyCombatant } from '@/sim';
import { SLOT_LABEL, catchStatus, currentPhase, phaseMarkers, predictIntentDamage, slotOccupant } from '@/sim';
import { iconOf, intentGlyph } from '@/ui/art';
import { INTENT_LABEL, STATUS_HINT, STATUS_LABEL } from '@/ui/strings';
import { HpBar } from './HpBar';
import { StatusBadge, TypeBadge } from './TypeBadge';
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
      <div className={[styles.intent, intent?.hidden ? styles.intentHidden : '', intent?.kind === 'incapacitated' ? styles.intentIdle : ''].join(' ')} data-testid="intent-chip" title="What the enemy will do this turn, and where it lands">
        {intent?.hidden ? (
          <>
            <IconQuestionMark size={18} />
            <span>Unknown intent — survive its first move to reveal its pattern.</span>
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
        title={targetable ? 'Click to play the selected card here' : `${enemy.name} Lv ${enemy.level}`}
      >
        <span className={styles.header}>
          <img className={`${styles.icon} pixel`} src={iconOf(enemy)} alt="" width={48} height={40} />
          <span className={styles.types}>
            {enemy.types.map((t) => (
              <TypeBadge key={t} type={t} size={24} />
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
              <span title={`${STATUS_LABEL[enemy.status.kind]} — ${STATUS_HINT[enemy.status.kind]}`}>
                <StatusBadge status={enemy.status.kind} size={28} />
              </span>
            )}
            {enemy.confusionTurns > 0 && (
              <span title={`${STATUS_LABEL.confusion} — picks its moves at random`}>
                <StatusBadge status="confusion" size={28} />
              </span>
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
              <span className={styles.chipInfo} title="Sturdy: survives one lethal hit at 1 HP">
                Sturdy
              </span>
            )}
          </span>
        </span>
      </button>

      {gauge && (
        <div className={[styles.catch, gauge.ready ? styles.catchReady : ''].join(' ')} data-testid="catch-pill" title={`Catch when the gauge is READY: HP ≤ ${gauge.thresholdPercent}%${gauge.hasStatus ? ' (status bonus active)' : ' — a status raises it to 50%'}. Balls left: ${gauge.ballsLeft}.`}>
          <span className={styles.ball} />
          <span className={styles.catchTrack}>
            <span className={styles.catchFill} style={{ width: `${gauge.gauge}%` }} />
          </span>
          <span className={`${styles.catchLabel} display`}>{gauge.ballsLeft === 0 ? 'no balls' : gauge.ready ? 'READY' : `${gauge.gauge}%`}</span>
          <span className={styles.catchBalls}>×{gauge.ballsLeft}</span>
        </div>
      )}
    </div>
  );
}
