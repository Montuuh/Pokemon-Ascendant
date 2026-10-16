import { useRunStore } from '@/app/runStore';
import { summitSign } from '@/ui/art';
import { MonIcon } from '@/ui/components/MonIcon';
import { RelicOffer } from '@/ui/components/RelicOffer';
import { NODE_LABEL, VICTORY_TEXT } from '@/ui/strings';
import { summitTip } from '@/ui/tips';
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
        }
        offer={offer}
        onPick={(relicId) => dispatch({ type: 'enter-league', relicId })}
        ids={{ offer: 'summit-offer-', take: 'btn-take-summit-relic', decline: 'btn-decline-summit-relic' }}
      />
  );
}
