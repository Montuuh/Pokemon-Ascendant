import { RHYTHM_TEXT } from '@/ui/strings';
import styles from './RhythmTiers.module.css';

/**
 * §4.1.3.1 — the dial tooltip's table: the Speed the ring reads (level taken out, with the card's own number beside it so
 * the two are never confused) and every tier of its side, the one it sits in marked. Fastest first, as the sim walks them.
 */
export function RhythmTiers({ tiers, side, mine, speed, card, level, factor }: { tiers: readonly { speed: number; every: number }[]; side: 'ally' | 'foe'; mine: number; speed: number; card: number; level: number; factor: number }) {
  return (
    <div className={styles.root} data-testid="rhythm-tiers">
      <p className={styles.reads}>{RHYTHM_TEXT.reads(Math.round(speed), Math.round(card), level, factor)}</p>
      <table className={styles.table}>
        <tbody>
          {tiers.map((t, i) => (
            <tr key={t.speed} className={i === mine ? styles.mine : undefined} aria-current={i === mine ? 'true' : undefined}>
              <th scope="row">{i === tiers.length - 1 && i > 0 ? RHYTHM_TEXT.tierBelow(tiers[i - 1]!.speed) : RHYTHM_TEXT.tierFrom(t.speed)}</th>
              <td>{RHYTHM_TEXT.tierFills(t.every, side)}</td>
              <td className={styles.here}>{i === mine ? RHYTHM_TEXT.here : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
