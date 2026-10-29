import { useEffect, useRef, type CSSProperties } from 'react';
import { rhythmActs, rhythmLeft, rhythmModifier, rhythmReady, type BattleConfig, type Combatant } from '@/sim';
import { playSfx } from '@/ui/audio/sfx';
import { RHYTHM_TEXT } from '@/ui/strings';
import { Tip, Tipped } from '@/ui/tooltip';
import { RhythmPace } from './RhythmPace';
import styles from './RhythmDial.module.css';

/**
 * §4.1.3.1 / §9.2.1 — the critical rhythm as a dial on the card's outer edge, at the middle of its window: the one
 * place on the card no tag, type, chip, HP number or intent arrow uses (the user's choice, v0.9.60). The ring counts the
 * acts its Speed asks for; its face says how many are left; full, a turning star and a CRIT tab. Its bezel takes the
 * card's frame colour, so it reads as part of the card.
 *
 * Three things say what is happening to it without a hover: a card under the pointer draws where the ring *would* stand as a
 * lighter ghost arc (`ghost`); a small chevron on the rim says Speed stages or Paralysis are making it fill quicker or
 * slower; and your ring filling up plays a short rising cue.
 */
export function RhythmDial({ c, config, side, lead, ghost = null }: { c: Combatant; config: BattleConfig; side: 'ally' | 'foe'; lead: boolean; ghost?: number | null }) {
  // A continuous meter: the ring is its fill, the face the whole acts still to go at today's pace, and the ring's gaps the
  // acts a full ring takes now, to the nearest whole one (a stage or Paralysis changes them while you watch).
  const ready = rhythmReady(c);
  const left = rhythmLeft(c, config);
  const acts = rhythmActs(c, config);
  const modifier = rhythmModifier(c, config);
  const pace = modifier > 1.0001 ? 'quicker' : modifier < 0.9999 ? 'slower' : null;
  const fill = Math.min(1, c.rhythm);
  // Your ring completing, from a card or a Speed change: heard once, a beat after the card's own sounds, never on the screen opening full.
  const wasReady = useRef(ready);
  useEffect(() => {
    if (ready && !wasReady.current && side === 'ally') playSfx('rhythm-ready', 0.35);
    wasReady.current = ready;
  }, [ready, side]);
  return (
    <Tipped
      className={[styles.dial, side === 'ally' ? styles.ally : styles.foe, lead ? styles.lead : '', ready ? styles.ready : ''].join(' ')}
      style={{ '--fill': `${fill * 100}%`, '--ghost': `${Math.max(fill, ghost ?? 0) * 100}%`, '--segs': Math.max(2, Math.round(acts)) } as CSSProperties}
      aria-label={ready ? RHYTHM_TEXT.readyLabel : RHYTHM_TEXT.label(left, side)}
      data-testid="rhythm-dial"
      data-ready={ready || undefined}
      data-ghost={ghost !== null && ghost > fill ? '' : undefined}
      data-pace={pace ?? undefined}
      tip={<Tip title={ready ? RHYTHM_TEXT.readyTitle : RHYTHM_TEXT.title} body={ready ? RHYTHM_TEXT.readyBody(side) : RHYTHM_TEXT.body(left, side)} footer={<RhythmPace c={c} config={config} side={side} />} />}
    >
      <span className={styles.face}>{ready ? <span className={styles.star}>✦</span> : <b>{left}</b>}</span>
      {ready && <span className={styles.tag}>CRIT</span>}
      {pace && <span className={styles.pace} aria-hidden="true" data-testid="rhythm-pace-mark">{pace === 'quicker' ? '▲' : '▼'}</span>}
    </Tipped>
  );
}
