import { useEffect, useMemo, useRef, useState } from 'react';
import { IconBackpack, IconBuildingStore, IconCheck, IconCoins, IconMicroscope, IconPackages } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { ScrollArea } from 'radix-ui';
import { ARRIVAL_RANK, KIT_SLOT_RANKS, MAX_LEVEL, REWARD_TRACK, levelFor, rankRow, xpForLevel, type AccountState } from '@/sim';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { Tipped } from '@/ui/tooltip';
import { trackRewardTip } from '@/ui/tips';
import { TokenIcon } from './TokenIcon';
import { trackRewardLabel } from './trackText';
import styles from './RewardTrack.module.css';

// §8.3.5 — the rank road: eight stops on a line, each drawn as what it brings — the aide, the clerk, a Kit slot,
// a fuller parcel, a purse — the next one lit and named. A rank is worth walking toward because every one has a face.
// Horizontal so the *order* is the reading.

/** What the stop shows inside its circle: who or what the rank brings. */
function StopFace({ rank, size }: { rank: number; size: number }) {
  if (rank === ARRIVAL_RANK.aide) return <IconMicroscope size={size} stroke={2.2} />;
  if (rank === ARRIVAL_RANK.clerk) return <IconBuildingStore size={size} stroke={2.2} />;
  if ((KIT_SLOT_RANKS as readonly number[]).includes(rank)) return <IconBackpack size={size} stroke={2.2} />;
  if (rank === 6) return <IconPackages size={size} stroke={2.2} />;
  return <IconCoins size={size} stroke={2.2} />;
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
                  className={`${styles.stop} ${styles[`stop_${state}`]} ${selected === lv ? styles.stopSelected : ''}`}
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
                    aria-label={`${rankRow(lv).name}, rank ${lv}: ${label}`}
                  >
                    <span className={styles.face}>
                      <StopFace rank={lv} size={22} />
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
          <StopFace rank={selected} size={26} />
        </span>
        <span className={styles.detailBody}>
          <span className={styles.detailKicker}>
            {rankRow(selected).name} · Rank {selected}
            {selState === 'claimed' ? ' · reached' : selState === 'next' ? ' · next' : ''}
          </span>
          <span className={`${styles.detailTitle} display`}>{sel.arrives}</span>
          <span className={styles.detailWhy}>{sel.why} <TokenIcon size={13} /> +{sel.tokens}</span>
        </span>
        <span className={`${styles.detailXp} tabular`}>
          {selState === 'claimed' ? 'Yours' : xpToSel > 0 ? `${xpToSel} XP away` : 'Now'}
        </span>
      </div>
    </div>
  );
}
