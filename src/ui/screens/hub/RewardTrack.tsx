import { useEffect, useMemo, useRef, useState } from 'react';
import { IconAward, IconBuildingStore, IconCheck, IconDiamond, IconPokeball, IconTicket } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { ScrollArea } from 'radix-ui';
import { getContent } from '@/content/registry';
import { HUB_UPGRADE_LABEL, MAX_LEVEL, REWARD_TRACK, levelFor, xpForLevel, type AccountState, type TrackReward } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { Tipped } from '@/ui/tooltip';
import { trackRewardTip } from '@/ui/tips';
import { trackRewardLabel } from './trackText';
import styles from './RewardTrack.module.css';

// §8.3.5 — the reward track as a road: twenty-nine stops on a line, each drawn as the thing it hands out, the
// next one lit and named. The v0.6.0 version was a grid of twenty-nine text rows, which is a table of contents,
// not a journey. Horizontal so the *order* is the reading — the eye walks left to right the way the player will.

const KIND_ICON: Record<TrackReward['kind'], (size: number) => React.ReactNode> = {
  tokens: (s) => <IconTicket size={s} stroke={2.2} />,
  starter: (s) => <IconPokeball size={s} stroke={2.2} />,
  hub: (s) => <IconBuildingStore size={s} stroke={2.2} />,
  relic: (s) => <IconDiamond size={s} stroke={2.2} />,
  title: (s) => <IconAward size={s} stroke={2.2} />,
};

const KIND_NAME: Record<TrackReward['kind'], string> = {
  tokens: 'Tokens',
  starter: 'Starter',
  hub: 'Hub upgrade',
  relic: 'Relic pool +1',
  title: 'Title',
};

/** What the stop shows inside its circle: a portrait for a starter that ships, an icon otherwise. */
function StopFace({ reward, size }: { reward: TrackReward; size: number }) {
  const content = getContent();
  if (reward.kind === 'starter' && content.hasSpecies(reward.speciesId)) return <MonIcon speciesId={reward.speciesId} size={size + 8} />;
  return KIND_ICON[reward.kind](size);
}

export function RewardTrack({ account }: { account: AccountState }) {
  const content = getContent();
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
              const label = trackRewardLabel(reward, content);
              return (
                <motion.li
                  key={lv}
                  ref={state === 'next' ? nextRef : undefined}
                  className={`${styles.stop} ${styles[`stop_${state}`]} ${selected === lv ? styles.stopSelected : ''}`}
                  data-testid={`track-${lv}`}
                  data-state={state}
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
                      <StopFace reward={reward} size={20} />
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
            Level {selected} · {KIND_NAME[sel.kind]}
            {selState === 'claimed' ? ' · claimed' : selState === 'next' ? ' · next' : ''}
          </span>
          <span className={`${styles.detailTitle} display`}>{trackRewardLabel(sel, content)}</span>
          <span className={styles.detailWhy}>{describeReward(sel)}</span>
        </span>
        <span className={`${styles.detailXp} tabular`}>
          {selState === 'claimed' ? 'Yours' : xpToSel > 0 ? `${xpToSel} XP away` : 'Now'}
        </span>
      </div>
    </div>
  );
}

/** One sentence on what the reward actually changes, in the player's words. */
function describeReward(r: TrackReward): string {
  switch (r.kind) {
    case 'tokens':
      return 'Tokens buy Tier-3 relics at the Poké Mart, five each.';
    case 'starter':
      return 'A new Pokémon to start a run with, on the starter screen.';
    case 'hub':
      return HUB_UPGRADE_LABEL[r.upgrade].effect;
    case 'relic':
      return 'One more Tier-2 relic joins the pool your runs draw from.';
    case 'title':
      return 'Worn on your Trainer Card. Cosmetic.';
  }
}
