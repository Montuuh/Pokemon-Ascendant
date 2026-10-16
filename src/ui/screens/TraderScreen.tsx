import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { IconArrowsExchange, IconLock } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { TRADER, runHelpers, tradeLevel, tradeRefusal, type PartyMon } from '@/sim';
import { itemIcon, spriteOf, trainerSprite } from '@/ui/art';
import { ArenaSprite } from '@/ui/components/ArenaSprite';
import { BackButton } from '@/ui/components/BackButton';
import { HpBar } from '@/ui/components/HpBar';
import { MonIcon } from '@/ui/components/MonIcon';
import { TypeLabel } from '@/ui/components/TypeBadge';
import card from '@/ui/components/UnitCard.module.css';
import { SHOP_TEXT, TRADER_TEXT } from '@/ui/strings';
import { traderTip, tradeGiveTip, tradeOfferTip } from '@/ui/tips';
import { InfoDot, Tipped, useTip } from '@/ui/tooltip';
import styles from './TraderScreen.module.css';

// §2.9.6 — the roadside trader. Two choices and a reveal: who you give (anyone but your last one standing), then one
// of three face-down offers — a type and the level it arrives at — and the newcomer, out of its ball. The way on is the
// corner arrow every stop shares; walking on without trading is always open.

export function TraderScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const trade = run.pendingTrade;
  const [giveUid, setGiveUid] = useState<string | null>(null);
  const [offer, setOffer] = useState<number | null>(null);
  const give = run.box.find((m) => m.uid === giveUid) ?? null;
  const done = trade?.done ?? null;
  const received = done ? run.box.find((m) => m.uid === done.receivedUid) ?? null : null;

  return (
    <main className={styles.root} data-testid="trader-screen">
      <div className={styles.corner}>
        <BackButton label={done ? TRADER_TEXT.walkOn : SHOP_TEXT.backToRoute} onClick={() => dispatch({ type: 'leave-trader' })} testId="btn-leave-trader" />
      </div>
      <section className={styles.head}>
        <img className={styles.trader} src={trainerSprite(TRADER.sprite)} alt="" width={120} height={120} />
        <div className={styles.text}>
          <h1 className={`${styles.title} display`}>
            {TRADER_TEXT.title}
            <InfoDot tip={traderTip()} />
          </h1>
          <p className={styles.sub}>{done && received ? TRADER_TEXT.wentWith(content.species(done.given.speciesId).name) : give ? TRADER_TEXT.pickOffer : TRADER_TEXT.pickGive}</p>
        </div>
      </section>

      {done && received ? (
        <Reveal mon={received} onContinue={() => dispatch({ type: 'leave-trader' })} />
      ) : (
        <>
          <ul className={styles.box} aria-label={TRADER_TEXT.pickGive}>
            {run.box.map((m) => (
              <Giveable
                key={m.uid}
                mon={m}
                active={run.activeUids.includes(m.uid)}
                picked={m.uid === giveUid}
                locked={!!tradeRefusal(run, m.uid)}
                onPick={() => setGiveUid(m.uid === giveUid ? null : m.uid)}
              />
            ))}
          </ul>

          <ul className={styles.offers} aria-label={TRADER_TEXT.offersLabel}>
            {(trade?.offers ?? []).map((o, i) => (
              <li key={i}>
                <Tipped
                  as="button"
                  type="button"
                  tip={tradeOfferTip(o.shownType, give ? tradeLevel(give.level) : null)}
                  className={`${styles.offer} ${offer === i ? styles.offerPicked : ''}`}
                  style={{ '--unit-type': `var(--type-${o.shownType})` } as CSSProperties}
                  onClick={() => setOffer(offer === i ? null : i)}
                  aria-pressed={offer === i}
                  data-testid={`trade-offer-${i}`}
                >
                  <span className={styles.facedown} aria-hidden="true">
                    <img className="pixel" src={itemIcon('poke-ball')} alt="" width={48} height={48} />
                  </span>
                  <TypeLabel type={o.shownType} size={20} />
                </Tipped>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={styles.trade}
            disabled={!give || offer === null}
            onClick={() => give && offer !== null && dispatch({ type: 'trade', giveUid: give.uid, offer })}
            data-testid="btn-trade"
          >
            <IconArrowsExchange size={20} aria-hidden="true" />
            {give ? TRADER_TEXT.trade(content.species(give.speciesId).name) : TRADER_TEXT.give}
          </button>
        </>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {run.log.slice(-1).join(' ')}
      </p>
    </main>
  );
}

/**
 * One of your Box, as a choice to give: locked when it is your last one standing (the lock beside its level, the reason
 * in its bubble). Picked, it says the level the newcomer will arrive at — said once, here, where it varies.
 */
function Giveable({ mon, active, picked, locked, onPick }: { mon: PartyMon; active: boolean; picked: boolean; locked: boolean; onPick: () => void }) {
  const content = getContent();
  const s = content.species(mon.speciesId);
  const max = runHelpers.maxHpOf(mon, content);
  const tip = useTip(tradeGiveTip(s.name, mon.level, mon.hp, max, active, mon.heldItem ? content.heldItem(mon.heldItem).name : null, locked));
  return (
    <li>
      <button
        type="button"
        className={`${styles.mon} ${picked ? styles.monPicked : ''}`}
        onClick={locked ? undefined : onPick}
        aria-disabled={locked || undefined}
        aria-pressed={picked}
        data-testid={`trade-give-${mon.uid}`}
        {...tip}
      >
        <MonIcon speciesId={s.id} size={44} />
        <span className={styles.monText}>
          <span className={`${styles.name} display`}>{s.name}</span>
          <span className={`${styles.monLevel} tabular`}>
            {locked && <IconLock size={12} aria-hidden="true" />}
            {picked ? TRADER_TEXT.arrivesAt(mon.level, tradeLevel(mon.level)) : `Lv ${mon.level}`}
          </span>
        </span>
        <HpBar hp={mon.hp} maxHp={max} height={6} />
        {locked && <span className="sr-only">{TRADER_TEXT.lastStanding}</span>}
      </button>
    </li>
  );
}

/** The newcomer, out of its ball, in the window a combat card gives a Pokémon (§9.2.1). */
function Reveal({ mon, onContinue }: { mon: PartyMon; onContinue: () => void }) {
  const content = getContent();
  const s = content.species(mon.speciesId);
  // The trade button that had the focus is gone: the way on takes it.
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => next.current?.focus(), []);
  return (
    <section className={styles.reveal} data-testid="trade-reveal">
      <div className={`${card.window} ${styles.revealWindow}`} style={{ '--unit-type': `var(--type-${s.types[0] ?? 'normal'})` } as CSSProperties}>
        <span className={card.stand}>
          <ArenaSprite src={spriteOf({ speciesId: s.id }, 'front', !!mon.shiny)} className={`${card.sprite} ${styles.arrive}`} imgClassName={card.breathe} />
        </span>
      </div>
      <p className={`${styles.joined} display`}>{TRADER_TEXT.joined(s.name)}</p>
      <p className={styles.joinedMeta}>
        {s.types.map((t) => (
          <TypeLabel key={t} type={t} size={16} />
        ))}
        <span className="tabular">Lv {mon.level}</span>
      </p>
      <button ref={next} type="button" className={styles.trade} onClick={onContinue} data-testid="btn-trade-continue">
        {TRADER_TEXT.walkOn}
      </button>
    </section>
  );
}
