import { useRunStore } from '@/app/runStore';
import { LEAGUE_MEMBERS } from '@/sim';
import { summitSign, trainerSprite } from '@/ui/art';
import { MonIcon } from '@/ui/components/MonIcon';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { RelicOffer } from '@/ui/components/RelicOffer';
import { LEAGUE_TEXT, NODE_LABEL, VICTORY_TEXT } from '@/ui/strings';
import { leagueAheadTip, summitTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './SummitScreen.module.css';

// §2.12.4 — the Summit: the Box healed in full (said with the Box itself), a Legendary relic to choose — or none —
// and the League's gate, one way. The relic pick is the gate: taking or declining it goes through.

export function SummitScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const offer = run.pendingSummit?.relics ?? [];
  return (
      <RelicOffer
        testId="summit-screen"
        heading={NODE_LABEL.summit!}
        headingTip={summitTip()}
        lede={VICTORY_TEXT.summitLede}
        header={
          <>
          <div className={styles.healed}>
            <img className={`pixel ${styles.peak}`} src={summitSign()} alt="" width={48} height={48} />
            <ul className={styles.box} aria-label={VICTORY_TEXT.summitHealed}>
              {run.box.map((m) => (
                <li key={m.uid}>
                  <MonIcon speciesId={m.speciesId} size={32} />
                </li>
              ))}
            </ul>
            <span className={styles.healedText}>{VICTORY_TEXT.summitHealed}</span>
          </div>
          {/* §2.12.4 — the League ahead: its five as silhouettes and the types they are known by; names wait at the doors. */}
          <Tipped tip={leagueAheadTip()} className={styles.leagueRow} data-testid="summit-league-row">
            <ul className={styles.league} aria-label={VICTORY_TEXT.leagueAhead} data-testid="summit-league">
              {LEAGUE_MEMBERS.map((m) => (
                <li key={m.id} className={styles.member}>
                  <img className={styles.silhouette} src={trainerSprite(m.sprite)} alt="" width={40} height={40} />
                  {m.type ? <TypeBadge type={m.type} size={12} defenderTypes={[m.type]} /> : <span className={styles.many}>{LEAGUE_TEXT.manyTypes}</span>}
                </li>
              ))}
            </ul>
          </Tipped>
          </>
        }
        offer={offer}
        onPick={(relicId) => dispatch({ type: 'enter-league', relicId })}
        ids={{ offer: 'summit-offer-', take: 'btn-take-summit-relic', decline: 'btn-decline-summit-relic' }}
      />
  );
}
