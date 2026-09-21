import { useEffect, useMemo, useRef, useState } from 'react';
import { IconBuildingStore, IconCheck } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { ScrollArea } from 'radix-ui';
import { MAX_LEVEL, REWARD_TRACK, SHELVES, levelFor, xpForLevel, type AccountState, type TrackReward } from '@/sim';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { Tipped } from '@/ui/tooltip';
import { trackRewardTip } from '@/ui/tips';
import { TokenIcon } from './TokenIcon';
import { describeReward, trackRewardLabel } from './trackText';
import styles from './RewardTrack.module.css';

// §8.3.5 — the reward track as a road: twenty-nine stops on a line, each drawn as what it pays, the next one
// lit and named. Every stop pays Tokens now, so the face *is* the number — a road of identical ticket icons
// would say nothing — and the four stops that open a shelf at the Poké Mart wear a storefront instead, bigger,
// because those are the ones worth walking toward. Horizontal so the *order* is the reading.

/** What the stop shows inside its circle: the amount, or the storefront on a stop that opens a shelf. */
function StopFace({ reward, size }: { reward: TrackReward; size: number }) {
  if (reward.opens) return <IconBuildingStore size={size} stroke={2.2} />;
  return (
    <span className={`${styles.amount} tabular`}>
      <TokenIcon size={Math.round(size * 0.7)} />+{reward.tokens}
    </span>
  );
}

export function RewardTrack({ account }: { account: AccountState }) {
  const level = levelFor(account.xp);
  const nextLevel = Math.min(MAX_LEVEL, level + 1);
  const animate = useMotionPref();
  const [selected, setSelected] = useState<number>(level >= MAX_LEVEL ? MAX_LEVEL : nextLevel);
  const nextRef = useRef<HTMLLIElement>(null);

  // Open with the next stop in view: the track is longer than any screen and "where am I" is the question.
  useEffect(() => {
    nextRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: animate ? 'smooth' : 'auto' });
  }, [animate]);

  const stops = useMemo(() => Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 2), []);
  const sel = REWARD_TRACK[selected]!;
  const selState = account.claimedLevels.includes(selected) ? 'claimed' : selected === nextLevel && level < MAX_LEVEL ? 'next' : 'locked';
  const xpToSel = Math.max(0, xpForLevel(selected) - account.xp);

  return (
    <div className={styles.root} data-testid="reward-track">
      <ScrollArea.Root className={styles.scroll} type="auto">
        <ScrollArea.Viewport className={styles.viewport}>
          <ol className={styles.road}>
            {stops.map((lv, i) => {
              const reward = REWARD_TRACK[lv]!;
              const state = account.claimedLevels.includes(lv) ? 'claimed' : lv === nextLevel && level < MAX_LEVEL ? 'next' : 'locked';
              const label = trackRewardLabel(reward);
              return (
                <motion.li
                  key={lv}
                  ref={state === 'next' ? nextRef : undefined}
                  className={`${styles.stop} ${styles[`stop_${state}`]} ${selected === lv ? styles.stopSelected : ''} ${reward.opens ? styles.stopShelf : ''}`}
                  data-testid={`track-${lv}`}
                  data-state={state}
                  data-opens={reward.opens}
                  initial={animate ? { opacity: 0, y: 8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 12) * 0.03, duration: 0.25 }}
                >
                  <Tipped
                    as="button"
                    type="button"
                    tip={trackRewardTip(lv, label, state, Math.max(0, xpForLevel(lv) - account.xp))}
                    className={styles.stopButton}
                    onClick={() => setSelected(lv)}
                    aria-pressed={selected === lv}
                    aria-label={`Level ${lv}: ${label}`}
                  >
                    <span className={styles.face}>
                      <StopFace reward={reward} size={22} />
                      {state === 'claimed' && <span className={styles.check}><IconCheck size={11} stroke={3} /></span>}
                    </span>
                    <span className={`${styles.lvl} tabular`}>{lv}</span>
                  </Tipped>
                </motion.li>
              );
            })}
          </ol>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className={styles.scrollbar} orientation="horizontal">
          <ScrollArea.Thumb className={styles.thumb} />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <div className={styles.detail} data-testid="track-detail" data-state={selState}>
        <span className={styles.detailFace}>
          <StopFace reward={sel} size={26} />
        </span>
        <span className={styles.detailBody}>
          <span className={styles.detailKicker}>
            Level {selected} · {sel.opens ? `Tokens + ${SHELVES[sel.opens].name}` : 'Tokens'}
            {selState === 'claimed' ? ' · claimed' : selState === 'next' ? ' · next' : ''}
          </span>
          <span className={`${styles.detailTitle} display`}>{trackRewardLabel(sel)}</span>
          <span className={styles.detailWhy}>{describeReward(sel)}</span>
        </span>
        <span className={`${styles.detailXp} tabular`}>
          {selState === 'claimed' ? 'Yours' : xpToSel > 0 ? `${xpToSel} XP away` : 'Now'}
        </span>
      </div>
    </div>
  );
}
