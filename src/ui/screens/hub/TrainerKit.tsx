import { IconLock } from '@tabler/icons-react';
import { useAccountStore } from '@/app/accountStore';
import { AIDES, HUB_UPGRADE_LABEL, KIT_SLOT_RANKS, MART_PRICE, isKitPerk, kitSlots, rankRow, type HubUpgrade } from '@/sim';
import { InfoDot, Tipped } from '@/ui/tooltip';
import { hubUpgradeTip, kitSlotTip, kitTip } from '@/ui/tips';
import { JOURNEY_TEXT } from '@/ui/strings';
import { TokenIcon } from './TokenIcon';
import { UPGRADE_ICON } from './upgradeIcons';
import styles from './Journey.module.css';

// §8.4.5 — the Trainer Kit desk: the slots the rank has opened, and the perks to pack into them.
//
// The slots are the picture: three places, some of them still shut, each one holding a perk's glyph and name or
// waiting for one. A perk is in one place at a time — on the shelf with Pack, or in a slot, where pressing it takes
// it out — and what it does is its bubble; a full Kit says so on the perk rather than refusing in silence. What you
// do not own yet is a name and where it comes from: a perk you can see is a goal.

const PERKS = (Object.keys(HUB_UPGRADE_LABEL) as HubUpgrade[]).filter(isKitPerk);

export function TrainerKit() {
  const account = useAccountStore((s) => s.account);
  const pack = useAccountStore((s) => s.pack);
  const slots = kitSlots(account);
  const packed = account.kit.slice(0, slots) as HubUpgrade[];
  const full = packed.length >= slots;
  const shelf = PERKS.filter((p) => account.hub.includes(p) && !packed.includes(p));
  const missing = PERKS.filter((p) => !account.hub.includes(p));
  const owned = PERKS.length - missing.length;
  const tipOf = (p: HubUpgrade, got: boolean) =>
    hubUpgradeTip(HUB_UPGRADE_LABEL[p].name, HUB_UPGRADE_LABEL[p].effect, MART_PRICE.hub[p] ?? null, KIT_SLOT_RANKS[0], got, HUB_UPGRADE_LABEL[p].pending, true, AIDES.find((a) => a.perk === p)?.owned);

  return (
    <div className={styles.kit} data-testid="trainer-kit" data-slots={slots}>
      <section>
        <h2 className={styles.kitGroup}>
          {JOURNEY_TEXT.kit.slots} <span className="tabular">{packed.length} / {slots}</span>
          <InfoDot tip={kitTip(slots)} />
        </h2>
        <ol className={styles.slots}>
          {KIT_SLOT_RANKS.map((rank, i) => {
            const open = i < slots;
            const perk = open ? packed[i] : undefined;
            return (
              <li key={rank} data-testid={`kit-slot-${i + 1}`} data-state={!open ? 'locked' : perk ? 'packed' : 'empty'}>
                {perk ? (
                  <Tipped as="button" type="button" tip={tipOf(perk, true)} className={styles.slot} onClick={() => pack(perk, false)} aria-label={JOURNEY_TEXT.kit.unpackLabel(HUB_UPGRADE_LABEL[perk].name)} data-testid={`kit-unpack-${perk}`}>
                    <span className={styles.slotIcon} aria-hidden="true">{UPGRADE_ICON[perk](26)}</span>
                    <span className={`${styles.slotName} display`}>{HUB_UPGRADE_LABEL[perk].name}</span>
                    <span className={styles.perkAction}>{JOURNEY_TEXT.kit.unpack}</span>
                  </Tipped>
                ) : (
                  <Tipped tip={kitSlotTip(open, rankRow(rank).name)} className={styles.slot} tabIndex={0}>
                    <span className={styles.slotIcon} aria-hidden="true">{!open && <IconLock size={22} />}</span>
                    <span className={styles.slotText}>{open ? JOURNEY_TEXT.kit.empty : rankRow(rank).name}</span>
                  </Tipped>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {(owned === 0 || shelf.length > 0) && (
        <section>
          <h2 className={styles.kitGroup}>{JOURNEY_TEXT.kit.yours} <span className="tabular">{shelf.length}</span></h2>
          {owned === 0 ? (
            <p className={styles.none}>{JOURNEY_TEXT.kit.none}</p>
          ) : (
            <ul className={styles.perks}>
              {shelf.map((p) => (
                <li key={p}>
                  <Tipped
                    as="button"
                    type="button"
                    tip={tipOf(p, true)}
                    className={styles.perk}
                    onClick={() => pack(p, true)}
                    aria-disabled={full}
                    data-testid={`kit-perk-${p}`}
                    data-state={full ? 'full' : 'ready'}
                  >
                    <span className={styles.perkIcon} aria-hidden="true">{UPGRADE_ICON[p](22)}</span>
                    <span className={`${styles.perkName} display`}>{HUB_UPGRADE_LABEL[p].name}</span>
                    <span className={styles.perkAction}>{full ? JOURNEY_TEXT.kit.full : JOURNEY_TEXT.kit.pack}</span>
                  </Tipped>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {missing.length > 0 && (
        <section>
          <h2 className={styles.kitGroup}>{JOURNEY_TEXT.kit.toFind} <span className="tabular">{missing.length}</span></h2>
          <ul className={styles.perks}>
            {missing.map((p) => {
              const price = MART_PRICE.hub[p];
              const aide = AIDES.find((a) => a.perk === p);
              return (
                <li key={p}>
                  <Tipped tip={tipOf(p, false)} className={`${styles.perk} ${styles.perkMissing}`} tabIndex={0} data-testid={`kit-perk-${p}`} data-state="missing">
                    <span className={styles.perkIcon} aria-hidden="true">{UPGRADE_ICON[p](22)}</span>
                    <span className={`${styles.perkName} display`}>{HUB_UPGRADE_LABEL[p].name}</span>
                    <span className={styles.perkAction}>
                      {price !== undefined ? <><TokenIcon size={13} /> {price}</> : JOURNEY_TEXT.kit.atAide(aide?.owned ?? 0)}
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
