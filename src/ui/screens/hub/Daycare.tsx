import { useAccountStore } from '@/app/accountStore';
import { useAppStore } from '@/app/store';
import { getContent } from '@/content/registry';
import { MODIFIERS, REWARD_TRACK, STARTER_IDS, levelFor, modifierSlots, modifierUnlocked, startingRelicOffers, twinRun } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import styles from './Hub.module.css';

// §8.4.1 — the Daycare Lady: the starting roster and the run options, as the account has opened them. The
// choices themselves are made on the way into a run (StarterSelect); this is the board that shows what there
// is to choose from and what opens the rest, so a locked option is a goal rather than an absence.

/** §8.5.2 — the level each meta-starter arrives at, read off the track so the two cannot disagree. */
function starterLevel(speciesId: string): number | null {
  for (const [lv, r] of Object.entries(REWARD_TRACK)) if (r.kind === 'starter' && r.speciesId === speciesId) return Number(lv);
  return null;
}

const META_STARTERS = ['pikachu', 'eevee', 'magikarp'];

export function Daycare() {
  const account = useAccountStore((s) => s.account);
  const goTo = useAppStore((s) => s.goTo);
  const content = getContent();
  const level = levelFor(account.xp);
  const slots = modifierSlots(account);
  const offers = startingRelicOffers(account);
  const twin = twinRun(account);

  return (
    <div className={styles.daycare} data-testid="daycare">
      <div className={styles.martHead}>
        <span className={styles.lede}>
          What a run of yours can start with.
          <InfoDot tip={<Tip title="Run options" body={`You pick these on the way into a run. Today: ${slots} difficulty slot${slots === 1 ? '' : 's'}, ${offers} Starting Relic offers${twin ? ', and two starters' : ''}.`} footer="More opens on the reward track — see the Trainer Card." />} />
        </span>
        <button type="button" className={styles.primary} onClick={() => goTo('starter')} data-testid="daycare-new-run">
          New run
        </button>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Starters</h2>
        <ul className={styles.starters}>
          {[...STARTER_IDS, ...META_STARTERS].map((id) => {
            const shipped = content.hasSpecies(id);
            const isDefault = (STARTER_IDS as readonly string[]).includes(id);
            const unlocked = isDefault || account.starters.includes(id);
            const at = starterLevel(id);
            const name = shipped ? content.species(id).name : id.charAt(0).toUpperCase() + id.slice(1);
            const state = unlocked && shipped ? 'ready' : unlocked ? 'waiting' : 'locked';
            const tip = (
              <Tip
                title={name}
                meta={[isDefault ? 'From run 1' : `Level ${at}`]}
                body={state === 'ready' ? 'Available on the starter screen.' : state === 'waiting' ? 'Unlocked on your account. Its move kit is authored for v0.7, so it is not on the starter screen yet.' : `Reaches your account at Trainer Level ${at}.`}
              />
            );
            return (
              <li key={id} className={`${styles.starter} ${styles[`starter_${state}`]}`} data-testid={`daycare-starter-${id}`} data-state={state}>
                <Tipped tip={tip} className={styles.starterInner}>
                  {shipped ? <MonIcon speciesId={id} size={44} /> : <span className={styles.starterBlank} aria-hidden="true">?</span>}
                  <span className={styles.starterName}>{name}</span>
                  <span className={styles.muted}>{state === 'ready' ? 'Ready' : state === 'waiting' ? 'Kit in v0.7' : `Lv ${at}`}</span>
                </Tipped>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Difficulty modifiers
          <InfoDot tip={<Tip title="Difficulty modifiers" body={`Each opens at a Trainer Level and, once open, may be taken into any run. You may stack ${slots} — the Difficulty Modifier Slot +1 upgrade at Level 13 makes it two.`} footer="There is no easier setting. Baseline is the floor." />} />
        </h2>
        <ul className={styles.modList}>
          {[...MODIFIERS].sort((a, b) => a.unlockLevel - b.unlockLevel).map((m) => {
            const open = m.available && modifierUnlocked(account, m);
            const state = !m.available ? 'pending' : open ? 'open' : 'locked';
            return (
              <li key={m.id} className={`${styles.modRow} ${styles[`mod_${state}`]}`} data-testid={`daycare-mod-${m.id}`} data-state={state}>
                <Tipped tip={<Tip title={m.name} meta={[`×${m.xpMultiplier.toFixed(2)} XP`, m.unlock]} body={m.effect} footer={m.pending ? `Not yet: ${m.pending}.` : open ? 'Open.' : `Opens at Trainer Level ${m.unlockLevel} — you are ${level}.`} />} className={styles.modInner}>
                  <span className={styles.modName}>{m.name}</span>
                  <span className={styles.modEffect}>{m.effect}</span>
                  <span className={`${styles.muted} tabular`}>{state === 'open' ? `×${m.xpMultiplier.toFixed(2)}` : state === 'pending' ? 'Later' : `Lv ${m.unlockLevel}`}</span>
                </Tipped>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
