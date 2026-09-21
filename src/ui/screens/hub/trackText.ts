import { HUB_UPGRADE_LABEL, type ContentRegistry, type TrackReward } from '@/sim';

// §8.3.5 — the reward track in the player's words. One place, so the Trainer Card, the run-end summary and
// the level-up toast all say the same thing about the same level.

export function trackRewardLabel(reward: TrackReward, content: ContentRegistry): string {
  switch (reward.kind) {
    case 'tokens':
      return `+${reward.amount} Tokens`;
    case 'starter':
      // §8.5.2 — Pikachu is on the track before its kit ships; the row says so rather than promising a starter.
      return content.hasSpecies(reward.speciesId)
        ? `Starter: ${content.species(reward.speciesId).name}`
        : `Starter: ${reward.speciesId.charAt(0).toUpperCase() + reward.speciesId.slice(1)} (kit arrives in v0.7)`;
    case 'hub':
      return `Hub: ${HUB_UPGRADE_LABEL[reward.upgrade].name}`;
    case 'relic':
      return 'Relic pool +1';
    case 'title':
      return `Title: ${reward.title}`;
  }
}
