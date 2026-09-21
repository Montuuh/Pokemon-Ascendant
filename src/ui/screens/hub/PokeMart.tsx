import { useState } from 'react';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { TIER3_PRICE, discoveryProgress, isOfferable, levelFor, masteryRelics, relicTier, relicUnlocked } from '@/sim';
import { ItemCard } from '@/ui/components/ItemCard';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { relicTierTip, tokenTip } from '@/ui/tips';
import styles from './Hub.module.css';

// §8.4.1 / §8.6.1 — the Poké Mart: the one place Tokens are spent, on Tier-3 Mastery relics, five each, from
// Trainer Level 10. Below that the shelf is visible and priced, and the lock says what opens it — a door you
// can see is a goal; a door you cannot is nothing (§7.7).
//
// The second half is the Tier-2 board: every discoverable relic with its criterion and progress, so "why is
// my pool small?" has an answer on the same screen as the thing that grows it.

export function PokeMart() {
  const account = useAccountStore((s) => s.account);
  const buy = useAccountStore((s) => s.buy);
  const content = getContent();
  const level = levelFor(account.xp);
  const open = level >= 10;
  const [notice, setNotice] = useState<string | null>(null);

  const shelf = masteryRelics(content);
  const discoverable = content.allRelics().filter((r) => relicTier(r) === 2 && isOfferable(r));

  function purchase(id: string) {
    const err = buy(id);
    setNotice(
      err === null ? `${content.relic(id).name} joins your pool.`
      : err === 'locked' ? 'The Mastery lane opens at Trainer Level 10.'
      : err === 'owned' ? 'Already yours.'
      : `Five Tokens each — you have ${account.tokens}.`,
    );
  }

  return (
    <div className={styles.mart} data-testid="poke-mart">
      <div className={styles.martHead}>
        <span className={styles.lede}>
          Tier-3 relics, {TIER3_PRICE} Tokens each{open ? '.' : ` — from Trainer Level 10 (you are ${level}).`}
          <InfoDot tip={<Tip title="The Mastery lane" body="Ten relics that change how a run works rather than how hard it hits. Buy them in any order; a bought relic is in your pool for every run after." footer="Tokens come from every fifth Trainer Level and from Gold and Platinum medals." />} />
        </span>
        <Tipped tip={tokenTip(account.tokens, account.tokensEarned)}>
          <span className={styles.tokens} data-testid="mart-tokens"><span aria-hidden="true">🎟</span> <b className="tabular">{account.tokens}</b></span>
        </Tipped>
      </div>
      {notice && <p className={styles.notice} role="status" data-testid="mart-notice">{notice}</p>}

      <ul className={styles.shelf} data-testid="mart-shelf">
        {shelf.map((r) => {
          const owned = account.relics.includes(r.id);
          const offerable = isOfferable(r);
          const affordable = account.tokens >= TIER3_PRICE;
          const canBuy = open && !owned && offerable && affordable;
          return (
            <li key={r.id}>
              <ItemCard
                id={r.id}
                kind="relic"
                name={r.name}
                description={r.description}
                rarity={r.rarity}
                tag={owned ? 'Yours' : 'Tier 3'}
                pending={r.pending}
                dim={owned || !open}
                onClick={!owned && offerable ? () => purchase(r.id) : undefined}
                testId={`mart-${r.id}`}
                footer={
                  <span className={`${styles.price} ${canBuy ? styles.priceOk : ''}`} data-testid={`mart-price-${r.id}`}>
                    {owned ? 'In your pool' : !open ? `Lv 10 · ${TIER3_PRICE} 🎟` : `${TIER3_PRICE} 🎟`}
                  </span>
                }
              />
            </li>
          );
        })}
      </ul>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Tier-2 discoveries
          <InfoDot tip={<Tip title="Discovered relics" body="Twenty relics enter your pool the first time you do a particular thing, in any run. The reward track also opens one at a time, in this order, at Levels 2, 16, 22, 24, 26 and 28." footer="Tier is not rarity: it decides whether a relic is in your pool at all; rarity decides how often it drops once it is." />} />
        </h2>
        <ul className={styles.discoveries} data-testid="discoveries">
          {discoverable.map((r) => {
            const got = relicUnlocked(account, r);
            const prog = discoveryProgress(account, r);
            return (
              <li key={r.id} className={`${styles.discovery} ${got ? styles.discoveryOn : ''}`} data-testid={`discovery-${r.id}`} data-state={got ? 'open' : 'locked'}>
                <Tipped tip={relicTierTip(r, got ? 'owned' : 'discoverable', prog)} className={styles.discoveryInner}>
                  <span className={styles.discoveryName}>{r.name}</span>
                  <span className={styles.discoveryHow}>
                    {got ? 'In your pool' : prog ? `${prog.text}${prog.goal > 1 ? ` · ${prog.have} / ${prog.goal}` : ''}` : 'Reward track'}
                  </span>
                </Tipped>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
