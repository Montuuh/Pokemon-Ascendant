import { IconBackpack, IconLock } from '@tabler/icons-react';
import { useAccountStore } from '@/app/accountStore';
import { AIDES, HUB_UPGRADE_LABEL, KIT_SLOT_RANKS, MART_PRICE, isKitPerk, kitSlots, rankRow, type HubUpgrade } from '@/sim';
import { InfoDot, Tipped } from '@/ui/tooltip';
import { hubUpgradeTip, kitTip } from '@/ui/tips';
import { JOURNEY_TEXT } from '@/ui/strings';
import { TokenIcon } from './TokenIcon';
import styles from './Journey.module.css';

// §8.4.5 — the Trainer Kit desk: the slots the rank has opened, and the perks to pack into them.
//
// The slots are the picture: three places, some of them still shut, each one holding a perk or waiting for one. A
// perk is packed with one click and unpacked with another; a full Kit says so on the perk rather than refusing in
// silence. What you do not own yet is listed too, with where it comes from — a perk you can see is a goal.

const PERKS = (Object.keys(HUB_UPGRADE_LABEL) as HubUpgrade[]).filter(isKitPerk);

export function TrainerKit() {
  const account = useAccountStore((s) => s.account);
  const pack = useAccountStore((s) => s.pack);
  const slots = kitSlots(account);
  const packed = account.kit.slice(0, slots) as HubUpgrade[];
  const full = packed.length >= slots;
  const owned = PERKS.filter((p) => account.hub.includes(p));
  const missing = PERKS.filter((p) => !account.hub.includes(p));

  return (
    <div className={styles.kit} data-testid="trainer-kit" data-slots={slots}>
      <h2 className={`${styles.kitTitle} display`}>
        <IconBackpack size={22} aria-hidden="true" /> {JOURNEY_TEXT.kit.title}
        <InfoDot tip={kitTip(slots)} />
      </h2>

      <ol className={styles.slots} aria-label={JOURNEY_TEXT.kit.slots}>
        {KIT_SLOT_RANKS.map((rank, i) => {
          const open = i < slots;
          const perk = open ? packed[i] : undefined;
          return (
            <li key={rank} className={styles.slot} data-state={!open ? 'locked' : perk ? 'packed' : 'empty'} data-testid={`kit-slot-${i + 1}`}>
              {!open ? (
                <>
                  <IconLock size={20} aria-hidden="true" />
                  <span className={styles.slotText}>{JOURNEY_TEXT.kit.opensAt(rankRow(rank).name)}</span>
                </>
              ) : perk ? (
                <>
                  <span className={`${styles.slotName} display`}>{HUB_UPGRADE_LABEL[perk].name}</span>
                  <span className={styles.slotText}>{HUB_UPGRADE_LABEL[perk].effect}</span>
                </>
              ) : (
                <span className={styles.slotText}>{JOURNEY_TEXT.kit.empty}</span>
              )}
            </li>
          );
        })}
      </ol>

      <section>
        <h3 className={styles.kitGroup}>{JOURNEY_TEXT.kit.yours} <span className="tabular">{owned.length}</span></h3>
        {owned.length === 0 ? (
          <p className={styles.kitNone}>{JOURNEY_TEXT.kit.none}</p>
        ) : (
          <ul className={styles.perks}>
            {owned.map((p) => {
              const row = HUB_UPGRADE_LABEL[p];
              const on = packed.includes(p);
              const blocked = !on && full;
              return (
                <li key={p}>
                  <Tipped
                    as="button"
                    type="button"
                    tip={hubUpgradeTip(row.name, row.effect, MART_PRICE.hub[p] ?? null, 4, true, row.pending, true)}
                    className={`${styles.perk} ${on ? styles.perkOn : ''}`}
                    onClick={() => pack(p, !on)}
                    aria-pressed={on}
                    aria-disabled={blocked}
                    data-testid={`kit-perk-${p}`}
                    data-state={on ? 'packed' : blocked ? 'full' : 'ready'}
                  >
                    <span className={`${styles.perkName} display`}>{row.name}</span>
                    <span className={styles.perkEffect}>{row.effect}</span>
                    <span className={styles.perkAction}>{on ? JOURNEY_TEXT.kit.unpack : blocked ? JOURNEY_TEXT.kit.full : JOURNEY_TEXT.kit.pack}</span>
                  </Tipped>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {missing.length > 0 && (
        <section>
          <h3 className={styles.kitGroup}>{JOURNEY_TEXT.kit.toFind} <span className="tabular">{missing.length}</span></h3>
          <ul className={styles.perks}>
            {missing.map((p) => {
              const row = HUB_UPGRADE_LABEL[p];
              const price = MART_PRICE.hub[p];
              const aide = AIDES.find((a) => a.perk === p);
              return (
                <li key={p}>
                  <Tipped tip={hubUpgradeTip(row.name, row.effect, price ?? null, 4, false, row.pending, true)} className={`${styles.perk} ${styles.perkMissing}`} data-testid={`kit-perk-${p}`} data-state="missing">
                    <span className={`${styles.perkName} display`}>{row.name}</span>
                    <span className={styles.perkEffect}>{row.effect}</span>
                    <span className={styles.perkAction}>
                      {price !== undefined ? <><TokenIcon size={13} /> {price} · {JOURNEY_TEXT.kit.atMart}</> : JOURNEY_TEXT.kit.atAide(aide?.owned ?? 0)}
                    </span>
                  </Tipped>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
