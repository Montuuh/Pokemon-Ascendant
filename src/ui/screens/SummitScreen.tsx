import { useState } from 'react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { LEAGUE_MEMBERS } from '@/sim';
import { trainerSprite } from '@/ui/art';
import { ItemCard } from '@/ui/components/ItemCard';
import { MonIcon } from '@/ui/components/MonIcon';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { LEAGUE_TEXT, NODE_LABEL, VICTORY_TEXT } from '@/ui/strings';
import { leagueAheadTip, summitTip } from '@/ui/tips';
import { InfoDot, Tipped } from '@/ui/tooltip';
import { LEAGUE_ART, SUMMIT_SCENE } from './league/scene';
import styles from './SummitScreen.module.css';

// §2.12.4 — the healed Box, anonymous League preview and real Legendary offer frame the Indigo arrival.
// Selecting only previews a relic; confirming or declining dispatches the existing one-way gate.
export function SummitScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const [pick, setPick] = useState<string | null>(null);
  const content = getContent();
  const offer = run.pendingSummit?.relics ?? [];
  return (
    <main className={styles.root} data-testid="summit-screen">
      <div className={styles.arrival}>
        <header className={styles.heading}>
          <h1 className="display">{NODE_LABEL.summit}<InfoDot tip={summitTip()} /></h1>
          <p>{VICTORY_TEXT.summitLede}</p>
        </header>
        <div className={styles.content}>
          <div className={styles.scene}>
            <img className={styles.backdrop} src={LEAGUE_ART.summit} alt="" width={SUMMIT_SCENE.width} height={SUMMIT_SCENE.height} />
            <span className={`${styles.place} display`}>{VICTORY_TEXT.summitPlace}</span>
          </div>
          <section className={styles.gift} aria-label={VICTORY_TEXT.summitOffer}>
            <div className={styles.healed}>
              <ul className={styles.box} aria-label={VICTORY_TEXT.summitHealed}>
                {run.box.map((m) => <li key={m.uid}><MonIcon speciesId={m.speciesId} size={32} /></li>)}
              </ul>
              <span>{VICTORY_TEXT.summitHealed}<InfoDot tip={summitTip()} /></span>
            </div>
            <div className={styles.offerHeading}>
              <h2 className="display">{VICTORY_TEXT.summitOffer}</h2>
              <span>{VICTORY_TEXT.summitPick}</span>
            </div>
            <div className={styles.offer}>
              {offer.map((id) => {
                const relic = content.relic(id);
                return <ItemCard key={id} id={id} kind="relic" name={relic.name} description={relic.description} rarity={relic.rarity}
                  {...(relic.pending ? { pending: relic.pending } : {})}
                  selected={pick === id} onClick={() => setPick(pick === id ? null : id)} testId={`summit-offer-${id}`}
                  footer={pick === id ? VICTORY_TEXT.summitSelected : undefined} />;
              })}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.confirm} disabled={!pick} onClick={() => pick && dispatch({ type: 'enter-league', relicId: pick })} data-testid="btn-take-summit-relic">
                {pick ? VICTORY_TEXT.summitConfirm(content.relic(pick).name) : VICTORY_TEXT.summitPickPrompt}
              </button>
              <button type="button" className={styles.decline} onClick={() => dispatch({ type: 'enter-league', relicId: null })} data-testid="btn-decline-summit-relic">
                {VICTORY_TEXT.summitDecline}
              </button>
            </div>
          </section>
        </div>
        <section className={styles.ahead}>
          <h2 className="display">{VICTORY_TEXT.leagueAhead}<InfoDot tip={leagueAheadTip()} /></h2>
          {/* §2.12.4 — names wait at the doors: the Summit shows silhouettes and type identities. */}
          <Tipped tip={leagueAheadTip()} className={styles.leagueRow}>
            <ul className={styles.league} aria-label={VICTORY_TEXT.leagueAhead} data-testid="summit-league">
              {LEAGUE_MEMBERS.map((member) => <li key={member.id} className={styles.member}>
                <img className={styles.silhouette} src={trainerSprite(member.sprite)} alt="" width={40} height={40} />
                {member.type ? <TypeBadge type={member.type} size={12} defenderTypes={[member.type]} /> : <span className={styles.many}>{LEAGUE_TEXT.manyTypes}</span>}
              </li>)}
            </ul>
          </Tipped>
        </section>
      </div>
    </main>
  );
}
