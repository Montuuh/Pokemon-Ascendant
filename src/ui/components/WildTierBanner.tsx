import { useEffect, useState, type CSSProperties } from 'react';
import { IconStarFilled } from '@tabler/icons-react';
import { WILD_TEXT } from '@/ui/strings';
import styles from './WildTierBanner.module.css';

// §2.6.2 / §9.9.1 — the rarity a Wild Area rolled, said as the fight opens (v0.9.8): the word rises over the arena
// and fades as the fight begins; a Rare one shines. Under reduced motion it stands still and goes after a beat.

/** How long the word stays: the animation's whole length (the CSS reads it), or a still beat under reduced motion. */
const HOLD_MS = { animated: 2800, still: 1800 } as const;

export function WildTierBanner({ tier, animate }: { tier: 'common' | 'uncommon' | 'rare'; animate: boolean }) {
  const [shown, setShown] = useState(true);
  // A live region announces a change, not what it was mounted with: the word is written in a tick after the mount.
  const [said, setSaid] = useState(false);
  useEffect(() => {
    const say = window.setTimeout(() => setSaid(true), 0);
    const hide = window.setTimeout(() => setShown(false), animate ? HOLD_MS.animated : HOLD_MS.still);
    return () => {
      window.clearTimeout(say);
      window.clearTimeout(hide);
    };
  }, [animate]);
  if (!shown) return null;
  return (
    <div
      className={`${styles.banner} ${animate ? styles.moving : ''}`}
      style={{ '--rarity-hold': `${HOLD_MS.animated}ms` } as CSSProperties}
      data-tier={tier}
      data-testid="wild-tier-banner"
      role="status"
    >
      {said && (
        <>
          {tier === 'rare' && <IconStarFilled size={24} aria-hidden="true" className={styles.star} />}
          <span className={`${styles.word} display`}>{WILD_TEXT.banner(tier)}</span>
          <span className={styles.sub}>{WILD_TEXT.bannerSub}</span>
        </>
      )}
    </div>
  );
}
