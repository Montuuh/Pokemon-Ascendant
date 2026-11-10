import { type TrackReward } from '@/sim';

// §8.3.5 — the rank road in the player's words. One place, so the Trainer Card and the Field Report say the same
// thing about the same rank: what arrives, and the purse that comes with it.

export function trackRewardLabel(reward: TrackReward): string {
  const tokens = `+${reward.tokens} Token${reward.tokens === 1 ? '' : 's'}`;
  return `${reward.arrives} · ${tokens}`;
}
