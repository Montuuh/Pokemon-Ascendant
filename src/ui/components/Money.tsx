import { IconCoinOff } from '@tabler/icons-react';
import styles from './Money.module.css';
import { Tip, Tipped } from '@/ui/tooltip';

// §2.14 — Poké Dollars on screen. One component so the currency looks the same in the Shop, the Dojo, the
// map HUD and a reward line, and so the glyph is drawn rather than typed: ₽ (U+20BD) is the sign the games
// use, but it is missing from enough fallback stacks that a tofu box was a real risk on a first load. An
// inline SVG cannot go missing.

/** The coin glyph on its own. Decorative — the amount beside it carries the meaning. */
export function PokeDollar({ size = 14 }: { size?: number }) {
  return (
    <svg className={styles.glyph} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="7" className={styles.coin} />
      <circle cx="8" cy="8" r="5.6" className={styles.rim} />
      {/* A ₽: the stem, the bowl, and the crossbar that tells it from a P. */}
      <path className={styles.mark} d="M6.1 11.6V4.6h2.4a1.9 1.9 0 0 1 0 3.8H6.1M5.1 9.6h3.1" />
    </svg>
  );
}

export function Money({ amount, size = 14, className = '' }: { amount: number; size?: number; className?: string }) {
  return (
    <span className={`${styles.money} ${className}`}>
      <PokeDollar size={size} />
      <b className="tabular">{amount.toLocaleString('en-GB')}</b>
    </span>
  );
}

/**
 * A price tag. `affordable` is the whole point: per docs/design/ui/01-design-system.md, a light-theme screen
 * may not colour running text with a semantic accent, so "you cannot pay for this" is carried by the chip, and
 * the number itself stays ink. Colour is never the only channel (D5): the coin becomes a crossed-out coin and
 * the edge turns dashed, so it reads in greyscale too — this chip is the one place an offer says "not yet",
 * since the offer itself no longer fades.
 */
export function Price({ amount, affordable, size = 14 }: { amount: number; affordable: boolean; size?: number }) {
  return (
    <Tipped tip={affordable ? null : <Tip title="Not enough money" body="Poké Dollars come from fights. Wild fights pay little, trainers more, the Elite and the Gym most." />} className={`${styles.price} ${affordable ? '' : styles.short}`} tabIndex={affordable ? -1 : 0}>
      {affordable ? <PokeDollar size={size} /> : <IconCoinOff size={size} className={styles.coinOff} aria-hidden="true" />}
      <b className="tabular">{amount.toLocaleString('en-GB')}</b>
      {!affordable && <span className="sr-only">, not enough money</span>}
    </Tipped>
  );
}
