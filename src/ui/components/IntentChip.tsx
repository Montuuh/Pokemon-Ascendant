import { IconQuestionMark } from '@tabler/icons-react';
import type { CombatCtx, CombatState, EnemyCombatant, TurnForecast } from '@/sim';
import { SLOT_LABEL, asLeadDamage, comboBreakAt, intentRecipient, slotOccupant, summonedBy } from '@/sim';
import { intentGlyph } from '@/ui/art';
import { INTENT_LABEL } from '@/ui/strings';
import { intentCardTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import styles from './EnemyPanel.module.css';

interface Props {
  state: CombatState;
  enemy: EnemyCombatant;
  ctx: CombatCtx;
  forecast: TurnForecast;
  /** §5.6.1 — 0 is the enemy's intent; 1 the second action of a Pokémon that acts twice. */
  action: 0 | 1;
}

// §9.2.5 — one intent as a chip: the kind glyph, the move, its target and — for a single hit — the HP it will take
// (the forecast's number for this action). An area intent says ALL and prints no number; a call names who comes.
// Resting on it opens the intent card (§9.2.6).
export function IntentChip({ state, enemy, ctx, forecast, action }: Props) {
  const intent = action === 0 ? enemy.intent : enemy.second ?? null;
  const move = intent?.moveId ? ctx.content.move(intent.moveId) : null;
  const slotOcc = intent?.targetSlot ? slotOccupant(state, intent.targetSlot) : null;
  const single = intent && slotOcc && (intent.kind === 'attack' || intent.kind === 'backstrike')
    ? forecast.byAction[`${enemy.uid}#${action}`]?.hits.find((h) => h.targetUid === slotOcc.uid)?.amount ?? 0
    : null;
  const ally = intent?.targetEnemyUid ? intentRecipient(state, enemy, intent) : null;
  const called = intent?.kind === 'summon' ? summonedBy(state, enemy, move, ctx.config.maxOnField).map((h) => ctx.content.species(h.species).name) : [];
  // §9.2.5 — a hit on your Lead, shown on everyone who could take the Lead instead (v0.8.6).
  const ifLead = intent && !intent.hidden && intent.targetSlot === 'lead' && move && move.power > 0
    ? state.player.team
        .map((m, i) => ({ m, i }))
        .filter(({ m, i }) => i !== state.player.leadIndex && m.hp > 0)
        .map(({ m, i }) => ({ name: m.name, ...(asLeadDamage(state, ctx, i, { enemyUid: enemy.uid, action }) ?? { amount: 0, ko: false }) }))
    : [];
  const tip = useTip(intentCardTip(state, enemy, forecast, action, ifLead, ctx));

  return (
    <div
      className={[styles.intent, intent?.hidden ? styles.intentHidden : '', intent?.kind === 'incapacitated' ? styles.intentIdle : '', action === 1 ? styles.intentSecond : '', intent?.broken ? styles.intentBroken : ''].join(' ')}
      data-testid={action === 0 ? 'intent-chip' : 'intent-chip-second'}
      tabIndex={0}
      {...tip}
    >
      {action === 1 && <span className={styles.secondLabel}>Also</span>}
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
                {' '}→ <span className={styles.nowrap}><b>{SLOT_LABEL[intent.targetSlot]}</b> ({slotOcc ? slotOcc.name : 'empty'})</span>
                {single !== null && single > 0 ? <> <span className={styles.nowrap}>· <b className={styles.dmg} data-testid="intent-dmg">{single} dmg</b></span></> : null}
              </>
            )}
            {intent.kind === 'buff' && (ally && ally.uid !== enemy.uid ? <> → <b>{ally.name}</b></> : ' — powering up')}
            {intent.kind === 'stall' && move && (ally && ally.uid !== enemy.uid ? <> → heals <b>{ally.name}</b></> : ' — recovering')}
            {/* §5.6.2 — a call names who will answer it. */}
            {intent.kind === 'summon' && <> → <b>{called.length ? `+${called.join(', +')}` : 'nobody left'}</b></>}
            {/* §5.6 — Cover names the Lead it steps in front of. */}
            {intent.kind === 'guard' && ally && <> → <b>{ally.name}</b></>}
            {intent.kind === 'incapacitated' && (enemy.status?.kind === 'sleep' ? ' — fast asleep' : enemy.status?.kind === 'freeze' ? ' — frozen solid' : ' — caught off guard')}
          </span>
        </>
      ) : (
        <span>…</span>
      )}
      {/* §5.6.1 — how close you are to breaking it: a quarter of its Max HP in your turn, or a super-effective hit. */}
      {action === 1 && intent && (
        intent.broken ? (
          <span className={styles.brokenTag} data-testid="combo-broken">Broken</span>
        ) : (
          <span className={styles.breakMeter} data-testid="combo-meter" aria-hidden="true">
            <i style={{ width: `${Math.min(100, Math.round(((enemy.stagger ?? 0) / comboBreakAt(enemy, ctx)) * 100))}%` }} />
          </span>
        )
      )}
    </div>
  );
}
