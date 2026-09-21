import { SHELVES, type TrackReward } from '@/sim';

// §8.3.5 — the reward track in the player's words. One place, so the Trainer Card, the run-end summary and
// the level-up toast all say the same thing about the same level.

export function trackRewardLabel(reward: TrackReward): string {
  const tokens = `+${reward.tokens} Token${reward.tokens === 1 ? '' : 's'}`;
  return reward.opens ? `${tokens} · ${SHELVES[reward.opens].name} shelf opens` : tokens;
}

/** One sentence on what the stop changes at the Poké Mart. */
export function describeReward(reward: TrackReward): string {
  if (reward.opens) return `The ${SHELVES[reward.opens].name} shelf opens at the Poké Mart: ${SHELVES[reward.opens].sells}`;
  return 'Tokens are spent at the Poké Mart — on starters, Hub upgrades, relics and cosmetics, as their shelves open.';
}
