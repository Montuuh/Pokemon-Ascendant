import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { IconCheck, IconSparkles } from '@tabler/icons-react';
import { asset } from '@/content/paths';
import type { RingRung } from '@/sim';
import { trainerSprite } from '@/ui/art';
import { Money } from '@/ui/components/Money';
import { PixelSprite } from '@/ui/components/PixelSprite';
import { rungTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './RingArena.module.css';

const ringPrizeLabel = (rung: RingRung, rare: boolean) => ('money' in rung.prize ? `${rung.prize.money} ₽` : `${rare ? 'Rare relic' : 'Relic'}, 1 of 3`);

// §2.9.4.1 — the climb is a place: outdoor stone rings in Pallet; a tiered city arena in Celadon.
// The anchors match the native court centres recorded by scripts/build-ring-art.mjs.
const COURTS = { 'pallet-town': [[144, 112], [336, 72]], 'celadon-city': [[96, 128], [240, 96], [384, 64]] } as const;

export function RingArena({ city, rungs, cleared, rare }: { city: keyof typeof COURTS; rungs: RingRung[]; cleared: number; rare: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.5);
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => setScale(Math.max(1, Math.floor(Math.min(el.clientWidth / 480, el.clientHeight / 192) * 2) / 2));
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(el);
    return () => resize.disconnect();
  }, []);
  return (
    <div ref={frame} className={styles.frame} data-testid="ring-arena" data-venue={city} data-scale={scale}>
      <div className={styles.scene} style={{ width: 480 * scale, height: 192 * scale, '--ring-scale': scale } as CSSProperties}>
        <img className={styles.art} src={asset(`art/ring/${city === 'pallet-town' ? 'pallet-ring' : 'celadon-coliseum'}.png`)} width={480 * scale} height={192 * scale} alt="" draggable={false} />
        <ol className={styles.ladder} aria-label="The ladder" data-testid="ring-ladder">
          {rungs.map((rung, i) => {
            const state = i < cleared ? 'won' : i === cleared ? 'next' : 'ahead';
            const level = Math.min(...rung.team.map((m) => m.level));
            const [x, y] = COURTS[city][i]!;
            return (
              <li key={i} className={styles.stop} style={{ left: `${x / 480 * 100}%`, top: `${y / 192 * 100}%` }} data-state={state}>
                <span className={styles.trainer}><PixelSprite src={trainerSprite(rung.sprite)} width={48 * scale} height={48 * scale} alt="" /></span>
                <Tipped tip={rungTip(i, ringPrizeLabel(rung, rare), level, state, i === rungs.length - 1)} className={styles.rung} data-testid={`ring-rung-${i}`} data-state={state}>
                  <span className={styles.mark} aria-hidden="true">{state === 'won' ? <IconCheck size={16} /> : i + 1}</span>
                  <span className="sr-only">Rung {i + 1}{state === 'won' ? ', won' : state === 'next' ? ', next' : ''}:</span>
                  <span className={styles.prize}>{'money' in rung.prize ? <Money amount={rung.prize.money} size={16} /> : <><IconSparkles size={16} aria-hidden="true" /> {rare ? 'Rare relic' : 'Relic'}</>}</span>
                  <span className="sr-only">, Lv {level}+</span>
                </Tipped>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
