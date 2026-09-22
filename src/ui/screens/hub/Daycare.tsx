import { useAccountStore } from '@/app/accountStore';
import { useAppStore } from '@/app/store';
import { getContent } from '@/content/registry';
import { MART_PRICE, META_STARTERS, MODIFIERS, SHELVES, STARTER_IDS, bondRank, levelFor, modifierSlots, modifierUnlocked, shelfOpen, startingRelicOffers, twinRun } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { TokenIcon } from './TokenIcon';
import styles from './Hub.module.css';

// §8.4.1 — the Daycare Lady: the starting roster and the run options, as the account has opened them. The
// choices themselves are made on the way into a run (StarterSelect); this is the board that shows what there
// is to choose from and what opens the rest, so a locked option is a goal rather than an absence.

export function Daycare() {
  const account = useAccountStore((s) => s.account);
  const goTo = useAppStore((s) => s.goTo);
  const content = getContent();
  const level = levelFor(account.xp);
  const slots = modifierSlots(account);
  const offers = startingRelicOffers(account);
  const twin = twinRun(account);
  // §8.5.2 — the meta-starters are sold at the Mart's Starters shelf; the board says the price and where.
  const shelfIsOpen = shelfOpen(account, 'starters');

  return (
    <div className={styles.daycare} data-testid="daycare">
      <div className={styles.martHead}>
        <span className={styles.lede}>
          What a run of yours can start with.
          <InfoDot tip={<Tip title="Run options" body={`You pick these on the way into a run. Today: ${slots} difficulty slot${slots === 1 ? '' : 's'}, ${offers} Starting Relic offers${twin ? ', and two starters' : ''}.`} footer="More is sold at the Poké Mart — starters, a second modifier slot, a second starter." />} />
        </span>
        <button type="button" className={styles.primary} onClick={() => goTo('starter')} data-testid="daycare-new-run">
          New run
        </button>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Starters
          <InfoDot tip={<Tip title="Who can start a run" body={`The three defaults, the three the Poké Mart sells on its Starters shelf from Level ${SHELVES.starters.level} — and any line you have taken to Soulbound (Bond rank 5) — see its page in the Pokédex.`} />} />
        </h2>
        <ul className={styles.starters}>
          {[...STARTER_IDS, ...META_STARTERS, ...Object.keys(account.bond).filter((line) => bondRank(account.bond[line]!) >= 5 && !(STARTER_IDS as readonly string[]).includes(line) && !META_STARTERS.includes(line))].map((id) => {
            const shipped = content.hasSpecies(id);
            const isDefault = (STARTER_IDS as readonly string[]).includes(id);
            const soulbound = bondRank(account.bond[id] ?? 0) >= 5;
            const unlocked = isDefault || soulbound || account.starters.includes(id);
            const price = MART_PRICE.starter[id];
            const name = shipped ? content.species(id).name : id.charAt(0).toUpperCase() + id.slice(1);
            const state = unlocked && shipped ? 'ready' : unlocked ? 'waiting' : 'locked';
            const tip = (
              <Tip
                title={name}
                meta={[isDefault ? 'From run 1' : soulbound ? 'Soulbound' : unlocked ? 'Bought' : `${price} Tokens`]}
                body={state === 'ready' ? 'Available on the starter screen.' : state === 'waiting' ? 'Yours. Its move kit is not written yet, so it is not on the starter screen yet.' : shelfIsOpen ? `Sold at the Poké Mart's Starters shelf for ${price} Tokens.` : `Sold at the Poké Mart's Starters shelf, which opens at Trainer Level ${SHELVES.starters.level}.`}
              />
            );
            return (
              <li key={id} className={`${styles.starter} ${styles[`starter_${state}`]}`} data-testid={`daycare-starter-${id}`} data-state={state}>
                <Tipped tip={tip} className={styles.starterInner}>
                  {shipped ? <MonIcon speciesId={id} size={44} /> : <span className={styles.starterBlank} aria-hidden="true">?</span>}
                  <span className={styles.starterName}>{name}</span>
                  <span className={styles.muted}>{state === 'ready' ? 'Ready' : state === 'waiting' ? 'Kit not yet' : shelfIsOpen ? <><TokenIcon size={13} /> {price}</> : `Mart · Lv ${SHELVES.starters.level}`}</span>
                </Tipped>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Difficulty modifiers
          <InfoDot tip={<Tip title="Difficulty modifiers" body={`Each opens at a Trainer Level and, once open, may be taken into any run. You may stack ${slots} — the Difficulty Modifier Slot +1 upgrade at the Poké Mart makes it two.`} footer="There is no easier setting. Baseline is the floor." />} />
        </h2>
        <ul className={styles.modList}>
          {[...MODIFIERS].sort((a, b) => a.unlockLevel - b.unlockLevel).map((m) => {
            const open = m.available && modifierUnlocked(account, m);
            const state = !m.available ? 'pending' : open ? 'open' : 'locked';
            return (
              <li key={m.id} className={`${styles.modRow} ${styles[`mod_${state}`]}`} data-testid={`daycare-mod-${m.id}`} data-state={state}>
                <Tipped tip={<Tip title={m.name} meta={[`×${m.xpMultiplier.toFixed(2)} XP`, m.unlock]} body={m.effect} footer={m.pending ? `Not yet: ${m.pending}.` : open ? 'Open.' : `Opens at Trainer Level ${m.unlockLevel} — you are ${level}.`} />} className={styles.modInner}>
                  <span className={styles.modName}>{m.name}</span>
                  <span className={`${styles.modState} tabular`} data-state={state}>{state === 'open' ? `×${m.xpMultiplier.toFixed(2)} XP` : state === 'pending' ? 'Not yet' : `Lv ${m.unlockLevel}`}</span>
                </Tipped>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
