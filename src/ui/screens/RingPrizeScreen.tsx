import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { RelicOffer } from '@/ui/components/RelicOffer';
import { ringPrizeTip } from '@/ui/tips';

// §2.9.4.1 — the Challenge Ring's top rung is won: a Rare relic, one of three — "what money cannot promise".
// Taking one (or none) closes the ladder and pays out whatever the lower rungs banked. An account with fewer
// than three Rares open is offered the rarity below in their place, and the copy says only what is true.

export function RingPrizeScreen() {
  const run = useRunStore((s) => s.run);
  const dispatch = useRunStore((s) => s.dispatch);
  const pick = run?.city?.ring?.pick ?? [];
  if (!run || pick.length === 0) return null;
  const banked = run.city!.ring!.banked;
  const content = getContent();
  const allRare = pick.every((id) => content.relic(id).rarity === 'rare');

  return (
    <RelicOffer
      testId="ring-prize-screen"
      heading="The ladder is yours"
      headingTip={ringPrizeTip(banked, allRare)}
      lede={allRare ? 'Three Rare relics. Take one, or none.' : 'Three relics. Take one, or none.'}
      offer={pick}
      onPick={(relicId) => dispatch({ type: 'ring-pick', relicId })}
      ids={{ offer: 'ring-prize-', take: 'btn-take-prize', decline: 'btn-decline-prize' }}
    />
  );
}
