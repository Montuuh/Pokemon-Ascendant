import { SHELVES, type TrackReward } from '@/sim';

// §8.3.5 — the reward track in the player's words. One place, so the Trainer Card, the run-end summary and
// the level-up toast all say the same thing about the same level.

export function trackRewardLabel(reward: TrackReward): string {
  const tokens = `+${reward.tokens} Token${reward.tokens === 1 ? '' : 's'}`;
  return reward.opens ? `${tokens} · ${SHELVES[reward.opens].name} shelf opens` : tokens;
}
