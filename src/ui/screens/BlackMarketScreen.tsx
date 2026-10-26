import { useRef, useState, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { IconArrowsExchange, IconDice5, IconLock, IconX } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import {
  BLACK_MARKET,
  candyPrice,
  DEFAULT_PROGRESSION,
  fencePrice,
  marketTakesRelic,
  relicValue,
  showcaseLevel,
  wagerChance,
  type BlackMarketState,
  type PartyMon,
  type RunState,
} from '@/sim';
import { itemIcon, spriteOf } from '@/ui/art';
import { ConfirmLeave } from '@/ui/components/ConfirmLeave';
import { ItemCard, type Rarity } from '@/ui/components/ItemCard';
import { MonIcon } from '@/ui/components/MonIcon';
import { ownedMonTip } from '@/ui/ownedMonTip';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { Money, Price } from '@/ui/components/Money';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { LEAVE_WARNING, MARKET_TEXT, RUN_REJECT_TEXT, STATUS_LABEL } from '@/ui/strings';
import {
  candyTip,
  fenceTip,
  marketTip,
  marketDonorTip,
  moneyTip,
  showcaseTip,
  stakeTip,
  tradeTip,
  wagerTip,
} from '@/ui/tips';
import { InfoDot, Tipped, useTip } from '@/ui/tooltip';
import { BackButton } from '@/ui/components/BackButton';
import styles from './BlackMarketScreen.module.css';
import { BlackMarketRoom } from './black-market/BlackMarketRoom';
import { type MarketCounter as Counter } from './black-market/room';

// §2.11.6 — Team Rocket's Black Market, down the stairs behind the Game Corner's poster. The room is the Rocket
// Hideout's native tiles, arranged into four working counters and a separate Executive's office:
// pick one and their transaction opens over the room. Nothing here is a rule — every price, chance and limit is the sim's
// (`BLACK_MARKET`, `candyPrice`, `wagerChance`, `fencePrice`), and every counter the sim has closed says so.
// Walking back up the stairs locks the door for the visit, so it asks first (§2.11.0); the showcase's deal locks it
// too, so it asks as well.

type Act = Parameters<ReturnType<typeof useRunStore.getState>['dispatch']>[0];
const pct = (chance: number) => Math.round(chance * 100);

export function BlackMarketScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const [counter, setCounter] = useState<Counter | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const market = run.city!.blackMarket!;

  function say(line: string) {
    setToast(line);
    window.setTimeout(() => setToast(null), 2600);
  }
  function act(action: Act): boolean {
    const ok = dispatch(action);
    if (!ok)
      say(
        RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? RUN_REJECT_TEXT['wrong-phase']!,
      );
    return ok;
  }
  const dealt: Record<Counter, boolean> = {
    trader: market.traded,
    fence: false,
    gambler: !!market.wager,
    showcase: !market.showcase,
  };

  return (
    <main className={`${styles.root} theme-stage`} data-testid="black-market-screen">
      <header className={styles.wall}>
        {/* Back up the stairs to the Game Corner; the door locks behind you, so it asks first (§2.11.0). */}
        <BackButton label={MARKET_TEXT.up} onClick={() => setLeaving(true)} testId="btn-leave-market" />
        <h1 className={`${styles.title} display`}>
          {MARKET_TEXT.title}
          <InfoDot tip={marketTip()} />
        </h1>
        <Tipped tip={moneyTip(run.money)} className={styles.wallet}>
          <Money amount={run.money} size={18} />
        </Tipped>
      </header>

      <BlackMarketRoom
        chosen={counter}
        dealt={dealt}
        onChoose={(id) => {
          returnTo.current = document.activeElement as HTMLElement;
          setCounter(id);
        }}
        onExit={() => setLeaving(true)}
      />

      <Dialog.Root
        open={counter !== null}
        onOpenChange={(open) => {
          if (!open) setCounter(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.scrim} />
          <Dialog.Content
            className={`${styles.counter} theme-stage`}
            aria-describedby={undefined}
            data-testid="market-counter"
            data-counter={counter}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              document.querySelector<HTMLElement>('[data-testid="btn-close-market-counter"]')?.focus();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              returnTo.current?.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (document.querySelector('[data-testid="confirm-showcase"]')) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (document.querySelector('[data-testid="confirm-showcase"]')) event.preventDefault();
            }}
          >
            {counter && (
              <>
                <header className={styles.counterHead}>
                  <BackButton
                    label={MARKET_TEXT.counters}
                    onClick={() => setCounter(null)}
                    testId="btn-close-market-counter"
                  />
                  <Dialog.Title className={`${styles.counterTitle} display`}>
                    {MARKET_TEXT[counter].name}
                  </Dialog.Title>
                  <Money amount={run.money} size={16} />
                </header>
                <div className={styles.counterBody}>
                  <p className={styles.line}>“{MARKET_TEXT[counter].line}”</p>
                  {counter === 'trader' && <Trader run={run} market={market} act={act} />}
                  {counter === 'fence' && <Fence run={run} market={market} act={act} />}
                  {counter === 'gambler' && <Gambler run={run} market={market} act={act} />}
                  {counter === 'showcase' && <Showcase run={run} market={market} act={act} />}
                  {toast && (
                    <p className={styles.toast} role="status">
                      {toast}
                    </p>
                  )}
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <footer className={styles.footer}>
        {toast && !counter && (
          <p className={styles.toast} role="status">
            {toast}
          </p>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {run.log.slice(-1).join(' ')}
        </p>
      </footer>

      {leaving && (
        <ConfirmLeave
          body={LEAVE_WARNING.market}
          onStay={() => setLeaving(false)}
          onLeave={() => act({ type: 'leave-black-market' })}
        />
      )}
    </main>
  );
}

// ── Shared pieces ────────────────────────────────────────────────────────────────────────────────────────

/**
 * A chip to pick. One that cannot be picked keeps its full ink — you still read it to plan — and says why by shape:
 * a dashed border when the counter is full, and a lock where the dealer will not take it at all.
 */
function Chip({
  selected,
  disabled,
  locked,
  onClick,
  testId,
  tip,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  locked?: boolean;
  onClick: () => void;
  testId: string;
  tip?: ReactNode;
  children: ReactNode;
}) {
  const tipProps = useTip(tip ?? null);
  return (
    <button
      type="button"
      className={`${styles.chip} ${selected ? styles.chipOn : ''}`}
      aria-pressed={selected}
      disabled={disabled && !tip}
      aria-disabled={disabled || undefined}
      data-locked={locked || undefined}
      onClick={disabled ? undefined : onClick}
      data-testid={testId}
      {...tipProps}
    >
      {children}
      {locked && <IconLock size={14} className={styles.chipLock} aria-hidden="true" />}
    </button>
  );
}

/** One of your Pokémon as a pickable chip: icon, name, level. */
function MonChip({
  mon,
  selected,
  disabled,
  locked,
  onClick,
  testId,
  tip,
}: {
  mon: PartyMon;
  selected: boolean;
  disabled?: boolean;
  locked?: boolean;
  onClick: () => void;
  testId: string;
  tip?: ReactNode;
}) {
  const s = getContent().species(mon.speciesId);
  return (
    <Chip
      selected={selected}
      disabled={disabled}
      locked={locked}
      onClick={onClick}
      testId={testId}
      tip={ownedMonTip(mon, tip)}
    >
      <MonIcon speciesId={s.id} shiny={mon.shiny} size={34} />
      <span className={styles.chipName}>{s.name}</span>
      <span className={`${styles.chipMeta} tabular`}>Lv {mon.level}</span>
    </Chip>
  );
}

/** One of your relics as a pickable chip, with what the counter would give for it. */
function RelicChip({
  relicId,
  selected,
  disabled,
  locked,
  extra,
  tip,
  onClick,
  testId,
}: {
  relicId: string;
  selected: boolean;
  disabled?: boolean;
  locked?: boolean;
  extra: ReactNode;
  tip: ReactNode;
  onClick: () => void;
  testId: string;
}) {
  const r = getContent().relic(relicId);
  return (
    <Chip selected={selected} disabled={disabled} locked={locked} onClick={onClick} testId={testId} tip={tip}>
      <img className={styles.relicIcon} src={itemIcon(relicId)} alt="" width={30} height={30} />
      <span className={styles.chipName}>{r.name}</span>
      <span className={styles.chipMeta}>{extra}</span>
    </Chip>
  );
}

function Done({ children }: { children: ReactNode }) {
  return <p className={styles.done}>{children}</p>;
}

type CounterProps = { run: RunState; market: BlackMarketState; act: (a: Act) => boolean };

// ── The Trader ───────────────────────────────────────────────────────────────────────────────────────────

function Trader({ run, market, act }: CounterProps) {
  const content = getContent();
  const animate = useMotionPref();
  const [offer, setOffer] = useState<number | null>(null);
  const [give, setGive] = useState<string | null>(null);
  if (market.traded) return <Done>{MARKET_TEXT.traded}</Done>;
  const given = run.box.find((m) => m.uid === give) ?? null;
  return (
    <div className={styles.stack}>
      <div className={styles.exchange}>
        <section className={styles.tradeSide} aria-label={MARKET_TEXT.youGive}>
          <h3 className={styles.ask}>{MARKET_TEXT.youGive}</h3>
          {given ? (
            <Tipped
              as="div"
              className={styles.donor}
              data-testid="trade-outgoing"
              tip={ownedMonTip(given, marketDonorTip(given, run.activeUids.includes(given.uid)))}
            >
              <MonIcon speciesId={given.speciesId} shiny={given.shiny} size={64} />
              <div className={styles.donorText}>
                <b className={`${styles.monName} display`}>{content.species(given.speciesId).name}</b>
                <b className="tabular">Lv {given.level}</b>
                <span>{MARKET_TEXT.donorCondition(given.hp, given.traumaStacks)}</span>
                {given.status && <span>{STATUS_LABEL[given.status.kind]}</span>}
                {given.confusionTurns > 0 && <span>{STATUS_LABEL.confusion}</span>}
                {given.heldItem && (
                  <span>{MARKET_TEXT.itemToBag(content.heldItem(given.heldItem).name)}</span>
                )}
              </div>
            </Tipped>
          ) : (
            <p className={styles.tradeEmpty}>{MARKET_TEXT.pickGive}</p>
          )}
        </section>
        <IconArrowsExchange className={styles.exchangeArrow} size={24} aria-hidden="true" />
        <section className={styles.tradeSide} aria-label={MARKET_TEXT.youReceive}>
          <h3 className={styles.ask}>{MARKET_TEXT.youReceive}</h3>
          <div className={styles.offers} role="group" aria-label={MARKET_TEXT.pickOffer}>
            {market.trades.map((id, i) => {
              const s = content.species(id);
              return (
                <Tipped
                  key={id}
                  as="button"
                  type="button"
                  tip={tradeTip(s.name, s.types)}
                  className={`${styles.mon} ${offer === i ? styles.monOn : ''}`}
                  aria-pressed={offer === i}
                  onClick={() => setOffer(offer === i ? null : i)}
                  data-testid={`trade-offer-${i}`}
                >
                  <img
                    className={styles.monSprite}
                    src={spriteOf({ speciesId: id }, 'front', false, animate)}
                    alt=""
                    width={96}
                    height={96}
                  />
                  <span className={`${styles.monName} display`}>{s.name}</span>
                  <span className={styles.types}>
                    {s.types.map((t) => (
                      <TypeBadge key={t} type={t} size={14} defenderTypes={s.types} />
                    ))}
                  </span>
                  <span className="tabular">{given ? `Lv ${given.level}` : 'Lv —'}</span>
                </Tipped>
              );
            })}
          </div>
          <Tipped
            tip={tradeTip(
              offer === null ? MARKET_TEXT.youReceive : content.species(market.trades[offer]!).name,
              [],
            )}
            className={styles.tradeCondition}
          >
            {MARKET_TEXT.fresh}
          </Tipped>
        </section>
      </div>
      <div className={styles.chips} role="group" aria-label={MARKET_TEXT.pickGive}>
        {run.box.map((m) => (
          <MonChip
            key={m.uid}
            mon={m}
            selected={give === m.uid}
            onClick={() => setGive(give === m.uid ? null : m.uid)}
            testId={`trade-give-${m.uid}`}
            tip={marketDonorTip(m, run.activeUids.includes(m.uid))}
          />
        ))}
      </div>
      <div className={`${styles.actions} ${styles.tradeActions}`}>
        <button
          type="button"
          className={styles.primary}
          disabled={offer === null || !given}
          onClick={() => offer !== null && give && act({ type: 'market-trade', offer, giveUid: give })}
          data-testid="btn-trade"
          aria-label={
            offer !== null && given
              ? `${MARKET_TEXT.confirmTrade}: ${MARKET_TEXT.tradeFor(
                  content.species(given.speciesId).name,
                  content.species(market.trades[offer]!).name,
                  given.level,
                )}`
              : undefined
          }
        >
          <IconArrowsExchange size={18} aria-hidden="true" />
          {offer !== null && given
            ? MARKET_TEXT.confirmTrade
            : !given
              ? MARKET_TEXT.pickMon
              : MARKET_TEXT.pickOffer}
        </button>
      </div>
    </div>
  );
}

// ── The Fence ────────────────────────────────────────────────────────────────────────────────────────────

function Fence({ run, market, act }: CounterProps) {
  const content = getContent();
  const [uid, setUid] = useState<string | null>(null);
  const [selling, setSelling] = useState<string | null>(null);
  const price = candyPrice(run, content);
  const candyOk = market.candies > 0 && run.money >= price;
  const mon = run.box.find((m) => m.uid === uid) ?? null;
  return (
    <div className={styles.stack}>
      <Tipped tip={candyTip(price, market.candies)} className={styles.candy}>
        <img className={styles.relicIcon} src={itemIcon('rare-candy')} alt="" width={30} height={30} />
        <b>{MARKET_TEXT.candy}</b> <Price amount={price} affordable={run.money >= price} />{' '}
        <span className="tabular">×{market.candies}</span>
      </Tipped>
      <div className={styles.chips}>
        {run.box.map((m) => {
          const top = m.level >= DEFAULT_PROGRESSION.maxLevel;
          return (
            <MonChip
              key={m.uid}
              mon={m}
              selected={uid === m.uid}
              disabled={top}
              locked={top}
              onClick={() => setUid(uid === m.uid ? null : m.uid)}
              testId={`candy-${m.uid}`}
            />
          );
        })}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={!mon || !candyOk}
          onClick={() => mon && act({ type: 'market-candy', uid: mon.uid })}
          data-testid="btn-candy"
        >
          {mon
            ? MARKET_TEXT.candyFor(content.species(mon.speciesId).name, mon.level + 1)
            : MARKET_TEXT.pickMon}
        </button>
      </div>

      <h3 className={styles.ask}>{MARKET_TEXT.buys}</h3>
      {run.relics.length === 0 ? (
        <p className={styles.empty}>{MARKET_TEXT.noRelics}</p>
      ) : (
        <div className={styles.chips}>
          {run.relics.map((id) => {
            const takes = marketTakesRelic(run, id);
            const pay = fencePrice(content, id);
            const armed = selling === id;
            return (
              <RelicChip
                key={id}
                relicId={id}
                selected={armed}
                disabled={!takes}
                locked={!takes}
                tip={fenceTip(content.relic(id), pay, takes)}
                extra={
                  armed ? (
                    <b>
                      {MARKET_TEXT.sellArmed} <Money amount={pay} size={12} />
                    </b>
                  ) : (
                    <Money amount={pay} size={12} />
                  )
                }
                onClick={() => {
                  // Two presses: a relic sold is gone for good, and a stray click should not be the one that does it.
                  if (!armed) return setSelling(id);
                  setSelling(null);
                  act({ type: 'market-sell-relic', relicId: id });
                }}
                testId={`sell-${id}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── The Gambler ──────────────────────────────────────────────────────────────────────────────────────────

function Gambler({ run, market, act }: CounterProps) {
  const content = getContent();
  const [target, setTarget] = useState<string | null>(null);
  const [stake, setStake] = useState<string[]>([]);
  if (market.wager) {
    const w = market.wager;
    return (
      <Done>
        {w.won ? <IconDice5 size={18} aria-hidden="true" /> : <IconX size={18} aria-hidden="true" />}
        {w.won
          ? MARKET_TEXT.won(pct(w.chance), content.relic(w.target).name)
          : MARKET_TEXT.lost(pct(w.chance))}
      </Done>
    );
  }
  const open = market.wagerTargets.filter((id) => !run.relics.includes(id));
  const chance = target && stake.length ? wagerChance(content, stake, target) : null;
  const staked = stake.reduce((a, id) => a + relicValue(content, id), 0);
  const full = stake.length >= BLACK_MARKET.maxStake;
  const toggle = (id: string) =>
    setStake(stake.includes(id) ? stake.filter((x) => x !== id) : full ? stake : [...stake, id]);
  return (
    <div className={styles.stack}>
      <div className={styles.targets} role="group" aria-label={MARKET_TEXT.pickTarget}>
        {open.map((id) => {
          const r = content.relic(id);
          return (
            <ItemCard
              key={id}
              id={id}
              kind="relic"
              name={r.name}
              description={r.description}
              rarity={r.rarity as Rarity}
              selected={target === id}
              onClick={() => setTarget(target === id ? null : id)}
              testId={`wager-target-${id}`}
            />
          );
        })}
      </div>
      <h3 className={styles.ask}>{MARKET_TEXT.stakeUpTo(BLACK_MARKET.maxStake)}</h3>
      {run.relics.length === 0 ? (
        <p className={styles.empty}>{MARKET_TEXT.noStake}</p>
      ) : (
        <div className={styles.chips}>
          {run.relics.map((id) => {
            const takes = marketTakesRelic(run, id);
            const on = stake.includes(id);
            return (
              <RelicChip
                key={id}
                relicId={id}
                selected={on}
                disabled={!takes || (!on && full)}
                locked={!takes}
                tip={stakeTip(content.relic(id), relicValue(content, id), takes)}
                extra={<Money amount={relicValue(content, id)} size={12} />}
                onClick={() => toggle(id)}
                testId={`stake-${id}`}
              />
            );
          })}
        </div>
      )}
      <div className={styles.actions}>
        {chance !== null && target && (
          <Tipped
            tip={wagerTip(chance, staked, relicValue(content, target))}
            className={styles.chance}
            data-testid="wager-chance"
          >
            <IconDice5 size={20} aria-hidden="true" /> <b className="tabular">{pct(chance)} %</b>
          </Tipped>
        )}
        <button
          type="button"
          className={styles.primary}
          disabled={chance === null}
          onClick={() => target && act({ type: 'market-wager', target, stake })}
          data-testid="btn-wager"
        >
          {target ? MARKET_TEXT.wagerOn(content.relic(target).name) : MARKET_TEXT.pickTarget}
        </button>
      </div>
    </div>
  );
}

// ── The showcase ─────────────────────────────────────────────────────────────────────────────────────────

function Showcase({ run, market, act }: CounterProps) {
  const content = getContent();
  const [give, setGive] = useState<string[]>([]);
  const [sure, setSure] = useState(false);
  if (!market.showcase) return <Done>{MARKET_TEXT.soldOut}</Done>;
  // §2.11.6 — a Legendary Pokémon, every visit; it arrives at the level of the strongest you hand over.
  const s = content.species(market.showcase);
  const price = BLACK_MARKET.legendaryPrice;
  const canPay = run.box.length - price >= 1;
  const full = give.length >= price;
  const toggle = (uid: string) =>
    setGive(give.includes(uid) ? give.filter((u) => u !== uid) : full ? give : [...give, uid]);
  const names = run.box
    .filter((m) => give.includes(m.uid))
    .map((m) => content.species(m.speciesId).name)
    .join(', ');
  return (
    <div className={styles.stack}>
      <div className={styles.targets}>
        <Tipped
          as="div"
          tip={showcaseTip(s.name, price)}
          className={`${styles.mon} ${styles.showcase}`}
          data-testid="showcase-legendary"
        >
          <img
            className={styles.monSprite}
            src={spriteOf({ speciesId: s.id }, 'front')}
            alt=""
            width={96}
            height={96}
          />
          <span className={`${styles.monName} display`}>{s.name}</span>
          <span className={styles.types}>
            {s.types.map((t) => (
              <TypeBadge key={t} type={t} size={14} defenderTypes={s.types} />
            ))}
          </span>
          <span className={styles.priceTag}>
            {MARKET_TEXT.arrivesAt(give.length ? showcaseLevel(run, give) : null)}
          </span>
        </Tipped>
      </div>
      <p className={styles.ask}>
        {canPay ? MARKET_TEXT.pickThree(give.length, price) : MARKET_TEXT.keepOne}
        <InfoDot tip={showcaseTip(s.name, price)} />
      </p>
      <div className={styles.chips}>
        {run.box.map((m) => {
          const on = give.includes(m.uid);
          return (
            <MonChip
              key={m.uid}
              mon={m}
              selected={on}
              disabled={!canPay || (!on && full)}
              locked={!canPay}
              onClick={() => toggle(m.uid)}
              testId={`showcase-give-${m.uid}`}
            />
          );
        })}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={give.length !== price}
          onClick={() => setSure(true)}
          data-testid="btn-showcase"
        >
          {give.length === price ? MARKET_TEXT.handOver(names) : MARKET_TEXT.pickN(price)}
        </button>
      </div>
      {sure && (
        <ConfirmLeave
          testId="confirm-showcase"
          heading={MARKET_TEXT.dealTitle}
          body={MARKET_TEXT.dealBody(names, s.name)}
          leaveLabel={MARKET_TEXT.deal}
          exitIcon={false}
          onStay={() => setSure(false)}
          onLeave={() => {
            setSure(false);
            act({ type: 'market-legendary', giveUids: give });
          }}
        />
      )}
    </div>
  );
}
