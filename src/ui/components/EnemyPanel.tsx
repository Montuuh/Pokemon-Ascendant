import { IconLock, IconQuestionMark } from '@tabler/icons-react';
import type { CombatCtx, CombatState, EnemyCombatant, TurnForecast } from '@/sim';
import { SLOT_LABEL, catchPercent, catchStatus, currentPhase, describeIntent, enemySlotLabel, intentRecipient, phaseMarkers, slotOccupant } from '@/sim';
import { iconOf, intentGlyph } from '@/ui/art';
import { INTENT_LABEL, ROLE_LABEL } from '@/ui/strings';
import { HpBar } from './HpBar';
import { StatusBadge, TypeBadge } from './TypeBadge';
import { catchTip, intentCardTip, nextIntentTip, roleTip } from '@/ui/tips';
import { Tip, Tipped, useTip } from '@/ui/tooltip';
import styles from './EnemyPanel.module.css';

/** §9.2.4 — what the card in hand would do to this enemy: its own number, or that it cannot reach it. */
export interface TargetPreview {
  final: number;
  ko: boolean;
  reachable: boolean;
}

interface Props {
  state: CombatState;
  enemy: EnemyCombatant;
  ctx: CombatCtx;
  forecast: TurnForecast;
  /** §5.6 — two or three enemies stand together: the panel is drawn compact and names its place. */
  compact: boolean;
  targetable: boolean;
  /** The card being dragged or pointed is over this enemy. */
  aimed: boolean;
  preview: TargetPreview | null;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
  fxClass?: string;
}

// Per §9.2.2.3 / §9.2.5 — one enemy's HUD: the intent chip (kind glyph, the move, its target, and for a single
// hit the number it lands), the card with HP, phase markers, status and stages, the catch pill in a wild fight,
// and — while a card is held — the number that card would deal here (§9.2.4). The sprite lives in the arena.
export function EnemyPanel({ state, enemy, ctx, forecast, compact, targetable, aimed, preview, onClick, onHover, fxClass }: Props) {
  const intent = enemy.intent;
  const move = intent?.moveId ? ctx.content.move(intent.moveId) : null;
  const slotOcc = intent?.targetSlot ? slotOccupant(state, intent.targetSlot) : null;
  // §9.2.5 — the forecast's number for a single-target hit: the HP it takes off whoever stands there now.
  const single = intent && slotOcc && (intent.kind === 'attack' || intent.kind === 'backstrike')
    ? forecast.byEnemy[enemy.uid]?.hits.find((h) => h.targetUid === slotOcc.uid)?.amount ?? 0
    : null;
  const ally = intent?.targetEnemyUid ? intentRecipient(state, enemy, intent) : null;
  const phase = currentPhase(enemy, ctx.config);
  const gauge = catchStatus(state, ctx, enemy.uid);
  const intentTipProps = useTip(intentCardTip(state, enemy, forecast));
  const catchTipProps = useTip(gauge ? catchTip(gauge) : null);
  const place = state.enemies.length > 1 ? enemySlotLabel(state, enemy) : null;
  // §5.6 — in a group the enemy's card is the door to its place and role.
  const cardTipProps = useTip(place ? roleTip(place, enemy.role ?? null, ctx.config.supportEscalateFromTurn) : null);
  // §5.5.1 — under Trainer's Instinct the enemy's committed plan for next turn sits under this turn's.
  const next = enemy.next?.intent ?? null;
  const nextMove = next?.moveId ? ctx.content.move(next.moveId) : null;
  const nextTipProps = useTip(next ? nextIntentTip(`${enemy.name} ${describeIntent(state, enemy, ctx, next)}`) : null);
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
    <div className={[styles.zone, compact ? styles.compact : ''].join(' ')} data-testid="foe-panel" data-enemy-uid={enemy.uid} onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}>
      <div className={[styles.intent, intent?.hidden ? styles.intentHidden : '', intent?.kind === 'incapacitated' ? styles.intentIdle : ''].join(' ')} data-testid="intent-chip" tabIndex={0} {...intentTipProps}>
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
              {/* §9.2.5 — an area intent prints no number: every target takes its own, on its portrait. */}
              {intent.kind === 'cleave' && <> → <b>ALL</b></>}
              {intent.targetSlot && (
                <>
                  {' '}→ <b>{SLOT_LABEL[intent.targetSlot]}</b> ({slotOcc ? slotOcc.name : 'empty'})
                  {single !== null && single > 0 ? <> · <b className={styles.dmg} data-testid="intent-dmg">{single} dmg</b></> : null}
                </>
              )}
              {intent.kind === 'buff' && (ally && ally.uid !== enemy.uid ? <> → <b>{ally.name}</b></> : ' — powering up')}
              {intent.kind === 'stall' && move && (ally && ally.uid !== enemy.uid ? <> → heals <b>{ally.name}</b></> : ' — recovering')}
              {intent.kind === 'incapacitated' && (enemy.status?.kind === 'sleep' ? ' — fast asleep' : enemy.status?.kind === 'freeze' ? ' — frozen solid' : ' — caught off guard')}
            </span>
          </>
        ) : (
          <span>…</span>
        )}
      </div>

      {next && enemy.hp > 0 && (
        <div className={styles.next} data-testid="intent-next" tabIndex={0} {...nextTipProps}>
          <span className={styles.nextLabel}>Then</span>
          {next.hidden ? (
            <IconQuestionMark size={14} />
          ) : (
            <img src={intentGlyph(next.kind === 'debuff' ? 'status' : next.kind === 'incapacitated' ? 'stall' : next.kind)} alt="" width={16} height={16} className={styles.intentIcon} />
          )}
          <span>
            {next.hidden ? 'Unknown' : nextMove ? nextMove.name : INTENT_LABEL[next.kind]}
            {!next.hidden && next.targetSlot && <> → <b>{SLOT_LABEL[next.targetSlot]}</b></>}
            {!next.hidden && next.kind === 'cleave' && <> → <b>All</b></>}
          </span>
        </div>
      )}

      <button
        type="button"
        className={[styles.card, targetable ? styles.targetable : '', aimed ? styles.aimed : '', preview && !preview.reachable ? styles.outOfReach : '', enemy.hp <= 0 ? styles.fainted : '', fxClass ?? ''].join(' ')}
        onClick={onClick}
        {...cardTipProps}
        onFocus={(e) => {
          cardTipProps.onFocus?.(e);
          onHover(true);
        }}
        onBlur={(e) => {
          cardTipProps.onBlur?.(e);
          onHover(false);
        }}
        data-testid={`enemy-${enemy.speciesId}`}
        data-enemy-uid={enemy.uid}
        aria-label={`${enemy.name}${place ? `, ${place}` : ''}, ${enemy.hp} of ${enemy.maxHp} HP${preview ? (preview.reachable ? `; the card deals ${preview.final}${preview.ko ? ', a knockout' : ''}` : '; out of reach of this card') : ''}`}
      >
        {/* §9.2.4 / §5.6 — the held card's number on this enemy; blue is position: a Melee card cannot reach it. */}
        {preview && (
          preview.reachable ? (
            <span className={[styles.hitPreview, preview.ko ? styles.hitKo : ''].join(' ')} data-testid="target-preview">
              <span className="display tabular">{preview.final}</span>
              {preview.ko && <b>KO</b>}
            </span>
          ) : (
            <span className={styles.reachLock} data-testid="target-out-of-reach">
              <IconLock size={12} /> Out of reach
            </span>
          )
        )}
        <span className={styles.header}>
          <img className={`${styles.icon} pixel`} src={iconOf(enemy)} alt="" width={48} height={40} />
          <span className={styles.types}>
            {enemy.types.map((t) => (
              <TypeBadge key={t} type={t} size={compact ? 14 : 18} defenderTypes={enemy.types} />
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
            {enemy.status && <StatusBadge status={enemy.status.kind} size={compact ? 22 : 28} />}
            {enemy.confusionTurns > 0 && <StatusBadge status="confusion" size={compact ? 22 : 28} />}
          </span>
        </span>
        <HpBar hp={enemy.hp} maxHp={enemy.maxHp} phaseMarkers={phaseMarkers(enemy, ctx.config)} height={compact ? 10 : 14} />
        <span className={styles.hpRow}>
          <span className={`display tabular ${styles.hpText}`}>
            {enemy.hp} / {enemy.maxHp}
          </span>
          <span className={styles.chips}>
            {place && (
              <span className={place === 'Lead' ? styles.chipLead : styles.chipRole} data-testid="foe-place">
                {place}
                {enemy.role && place !== 'Lead' ? ` · ${ROLE_LABEL[enemy.role]}` : ''}
              </span>
            )}
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

      {gauge && compact && (
        <div className={styles.catchInline} data-testid="catch-pill" data-chance={catchPercent(gauge)} {...catchTipProps}>
          <span className={styles.ball} />
          <span className="display tabular">{gauge.ballsLeft === 0 ? 'no balls' : gauge.guaranteed ? 'SURE' : `${catchPercent(gauge)}%`}</span>
        </div>
      )}
      {gauge && !compact && (
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
