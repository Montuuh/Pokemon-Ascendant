import type { CSSProperties } from 'react';
import { effectiveSpeed, rhythmEvery, rhythmLevelFactor, rhythmSpeed, rhythmTierIndex, type BattleConfig, type Combatant } from '@/sim';
import { RHYTHM_TEXT } from '@/ui/strings';
import { Tip, Tipped } from '@/ui/tooltip';
import { RhythmTiers } from './RhythmTiers';
import styles from './RhythmDial.module.css';

/**
 * §4.1.3.1 / §9.2.1 — the critical rhythm as a dial on the card's outer edge, at the middle of its window: the one
 * place on the card no tag, type, chip, HP number or intent arrow uses (the user's choice, v0.9.60). The ring counts the
 * acts its Speed asks for; its face says how many are left; full, a turning star and a CRIT tab. Its bezel takes the
 * card's frame colour, so it reads as part of the card.
 */
export function RhythmDial({ c, config, side, lead }: { c: Combatant; config: BattleConfig; side: 'ally' | 'foe'; lead: boolean }) {
  const every = rhythmEvery(c, config);
  const filled = Math.min(c.rhythm, every);
  const ready = filled >= every;
  const left = every - filled;
  // v0.9.80 — the tier it sits in, read back to a Speed: the table of every tier, this one marked.
  const tiers = side === 'ally' ? config.critRhythm.tiers : config.critRhythm.enemyTiers;
  const speed = rhythmSpeed(c, config);
  const card = effectiveSpeed(c, config);
  return (
    <Tipped
      className={[styles.dial, styles[side], lead ? styles.lead : '', ready ? styles.ready : ''].join(' ')}
      style={{ '--fill': `${(filled / every) * 100}%`, '--segs': every } as CSSProperties}
      aria-label={ready ? RHYTHM_TEXT.readyLabel : RHYTHM_TEXT.label(left)}
      data-testid="rhythm-dial"
      data-ready={ready || undefined}
      tip={<Tip title={ready ? RHYTHM_TEXT.readyTitle : RHYTHM_TEXT.title} meta={[`${filled} / ${every}`]} body={ready ? RHYTHM_TEXT.readyBody(side) : RHYTHM_TEXT.body(left, side)} footer={<RhythmTiers tiers={tiers} side={side} mine={rhythmTierIndex(c, config)} speed={speed} card={card} level={c.level} factor={rhythmLevelFactor(c)} />} />}
    >
      <span className={styles.face}>{ready ? <span className={styles.star}>✦</span> : <b>{left}</b>}</span>
      {ready && <span className={styles.tag}>CRIT</span>}
    </Tipped>
  );
}
