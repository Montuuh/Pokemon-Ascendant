import { useState, type CSSProperties, type ReactNode } from 'react';
import { Tabs } from 'radix-ui';
import { IconArrowsExchange, IconCheck, IconDice5, IconLock, IconX } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import {
  atLegendaryCap, BLACK_MARKET, candyPrice, DEFAULT_PROGRESSION, fencePrice, marketTakesRelic, relicValue, wagerChance,
  type BlackMarketState, type PartyMon, type RunState,
} from '@/sim';
import { blackMarketArt, itemIcon, spriteOf, trainerSprite } from '@/ui/art';
import { ConfirmLeave } from '@/ui/components/ConfirmLeave';
import { ItemCard, type Rarity } from '@/ui/components/ItemCard';
import { MonIcon } from '@/ui/components/MonIcon';
import { Money, Price } from '@/ui/components/Money';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { LEAVE_WARNING, MARKET_TEXT, RUN_REJECT_TEXT } from '@/ui/strings';
import { candyTip, dealtTip, fenceTip, marketTip, moneyTip, showcaseTip, stakeTip, tradeTip, wagerTip } from '@/ui/tips';
import { InfoDot, Tipped, useTip } from '@/ui/tooltip';
import styles from './BlackMarketScreen.module.css';

// §2.11.6 — Team Rocket's Black Market, down the stairs behind the Game Corner's poster. The room is the Rocket
// Hideout's B1F (its wall, its floor, the stairs back up), and four Rocket people stand in it, each at a counter:
// pick one and their counter opens below. Nothing here is a rule — every price, chance and limit is the sim's
// (`BLACK_MARKET`, `candyPrice`, `wagerChance`, `fencePrice`), and every counter the sim has closed says so.
// Walking back up the stairs locks the door for the visit, so it asks first (§2.11.0); the showcase's deal locks it
// too, so it asks as well.

type Act = Parameters<ReturnType<typeof useRunStore.getState>['dispatch']>[0];
type Counter = 'trader' | 'fence' | 'gambler' | 'showcase';
const DEALER: Record<Counter, { sprite: string; text: { name: string; line: string } }> = {
  trader: { sprite: 'rocketgruntf', text: MARKET_TEXT.trader },
  fence: { sprite: 'rocketgrunt', text: MARKET_TEXT.fence },
  gambler: { sprite: 'gambler', text: MARKET_TEXT.gambler },
  showcase: { sprite: 'archer', text: MARKET_TEXT.showcase },
};
const COUNTERS: Counter[] = ['trader', 'fence', 'gambler', 'showcase'];
const pct = (chance: number) => Math.round(chance * 100);

export function BlackMarketScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const [counter, setCounter] = useState<Counter>('trader');
  const [toast, setToast] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const market = run.city!.blackMarket!;

  function say(line: string) {
    setToast(line);
    window.setTimeout(() => setToast(null), 2600);
  }
  function act(action: Act): boolean {
    const ok = dispatch(action);
    if (!ok) say(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? RUN_REJECT_TEXT['wrong-phase']!);
    return ok;
  }
  const dealt: Record<Counter, boolean> = {
    trader: market.traded,
    fence: false,
    gambler: !!market.wager,
    showcase: !market.legendary,
  };

  return (
    <main
      className={`${styles.root} theme-stage`}
      style={{ '--floor': `url(${blackMarketArt('floor')})`, '--wall': `url(${blackMarketArt('wall')})` } as CSSProperties}
      data-testid="black-market-screen"
    >
      <header className={styles.wall}>
        <h1 className={`${styles.title} display`}>
          {MARKET_TEXT.title}
          <InfoDot tip={marketTip()} />
        </h1>
        <Tipped tip={moneyTip(run.money)} className={styles.wallet}>
          <Money amount={run.money} size={18} />
        </Tipped>
      </header>

      <Tabs.Root className={styles.hall} value={counter} onValueChange={(v) => setCounter(v as Counter)}>
        <Tabs.List className={styles.dealers} aria-label={MARKET_TEXT.counters}>
          {COUNTERS.map((c) => (
            <Tabs.Trigger key={c} value={c} className={styles.dealer} data-testid={`market-${c}`} data-dealt={dealt[c] || undefined}>
              <img className={styles.dealerSprite} src={trainerSprite(DEALER[c].sprite)} alt="" width={96} height={96} />
              <span className={`${styles.dealerName} display`}>{DEALER[c].text.name}</span>
              {dealt[c] && (
                <Tipped tip={dealtTip()} className={styles.dealtMark}>
                  <IconCheck size={16} aria-hidden="true" />
                  <span className="sr-only">{MARKET_TEXT.dealt}</span>
                </Tipped>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {COUNTERS.map((c) => (
          <Tabs.Content key={c} value={c} className={styles.counter}>
            <p className={styles.line}>“{DEALER[c].text.line}”</p>
            {c === 'trader' && <Trader run={run} market={market} act={act} />}
            {c === 'fence' && <Fence run={run} market={market} act={act} />}
            {c === 'gambler' && <Gambler run={run} market={market} act={act} />}
            {c === 'showcase' && <Showcase run={run} market={market} act={act} />}
          </Tabs.Content>
        ))}
      </Tabs.Root>

      <footer className={styles.footer}>
        {toast && <p className={styles.toast} role="status">{toast}</p>}
        <p className="sr-only" role="status" aria-live="polite">{run.log.slice(-1).join(' ')}</p>
        <button type="button" className={styles.up} onClick={() => setLeaving(true)} data-testid="btn-leave-market">
          <img className={styles.stairsArt} src={blackMarketArt('stairs')} alt="" width={36} height={52} />
          {MARKET_TEXT.up}
        </button>
      </footer>

      {leaving && <ConfirmLeave body={LEAVE_WARNING.market} onStay={() => setLeaving(false)} onLeave={() => act({ type: 'leave-black-market' })} />}
    </main>
  );
}

// ── Shared pieces ────────────────────────────────────────────────────────────────────────────────────────

/**
 * A chip to pick. One that cannot be picked keeps its full ink — you still read it to plan — and says why by shape:
 * a dashed border when the counter is full, and a lock where the dealer will not take it at all.
 */
function Chip({ selected, disabled, locked, onClick, testId, tip, children }: { selected: boolean; disabled?: boolean; locked?: boolean; onClick: () => void; testId: string; tip?: ReactNode; children: ReactNode }) {
  const tipProps = useTip(tip ?? null);
  return (
    <button
      type="button"
      className={`${styles.chip} ${selected ? styles.chipOn : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      data-locked={locked || undefined}
      onClick={onClick}
      data-testid={testId}
      {...tipProps}
    >
      {children}
      {locked && <IconLock size={14} className={styles.chipLock} aria-hidden="true" />}
    </button>
  );
}

/** One of your Pokémon as a pickable chip: icon, name, level. */
function MonChip({ mon, selected, disabled, locked, onClick, testId }: { mon: PartyMon; selected: boolean; disabled?: boolean; locked?: boolean; onClick: () => void; testId: string }) {
  const s = getContent().species(mon.speciesId);
  return (
    <Chip selected={selected} disabled={disabled} locked={locked} onClick={onClick} testId={testId}>
      <MonIcon speciesId={s.id} size={34} />
      <span className={styles.chipName}>{s.name}</span>
      <span className={`${styles.chipMeta} tabular`}>Lv {mon.level}</span>
    </Chip>
  );
}

/** One of your relics as a pickable chip, with what the counter would give for it. */
function RelicChip({ relicId, selected, disabled, locked, extra, tip, onClick, testId }: { relicId: string; selected: boolean; disabled?: boolean; locked?: boolean; extra: ReactNode; tip: ReactNode; onClick: () => void; testId: string }) {
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
  const [offer, setOffer] = useState<number | null>(null);
  const [give, setGive] = useState<string | null>(null);
  if (market.traded) return <Done>{MARKET_TEXT.traded}</Done>;
  const given = run.box.find((m) => m.uid === give) ?? null;
  return (
    <div className={styles.stack}>
      <div className={styles.offers} role="group" aria-label="On offer">
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
              <img className={styles.monSprite} src={spriteOf({ speciesId: id }, 'front')} alt="" width={96} height={96} />
              <span className={`${styles.monName} display`}>{s.name}</span>
              <span className={styles.types}>{s.types.map((t) => <TypeBadge key={t} type={t} size={14} />)}</span>
            </Tipped>
          );
        })}
      </div>
      <h3 className={styles.ask}>{MARKET_TEXT.pickGive}</h3>
      <div className={styles.chips}>
        {run.box.map((m) => (
          <MonChip key={m.uid} mon={m} selected={give === m.uid} onClick={() => setGive(give === m.uid ? null : m.uid)} testId={`trade-give-${m.uid}`} />
        ))}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={offer === null || !given} onClick={() => offer !== null && give && act({ type: 'market-trade', offer, giveUid: give })} data-testid="btn-trade">
          <IconArrowsExchange size={18} aria-hidden="true" />
          {offer !== null && given ? MARKET_TEXT.tradeFor(content.species(given.speciesId).name, content.species(market.trades[offer]!).name, given.level) : MARKET_TEXT.trade}
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
        <b>{MARKET_TEXT.candy}</b> <Price amount={price} affordable={run.money >= price} /> <span className="tabular">×{market.candies}</span>
      </Tipped>
      <div className={styles.chips}>
        {run.box.map((m) => {
          const top = m.level >= DEFAULT_PROGRESSION.maxLevel;
          return <MonChip key={m.uid} mon={m} selected={uid === m.uid} disabled={top} locked={top} onClick={() => setUid(uid === m.uid ? null : m.uid)} testId={`candy-${m.uid}`} />;
        })}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={!mon || !candyOk} onClick={() => mon && act({ type: 'market-candy', uid: mon.uid })} data-testid="btn-candy">
          {mon ? MARKET_TEXT.candyFor(content.species(mon.speciesId).name, mon.level + 1) : MARKET_TEXT.pickMon}
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
                extra={armed ? <b>{MARKET_TEXT.sellArmed} <Money amount={pay} size={12} /></b> : <Money amount={pay} size={12} />}
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
        {w.won ? MARKET_TEXT.won(pct(w.chance), content.relic(w.target).name) : MARKET_TEXT.lost(pct(w.chance))}
      </Done>
    );
  }
  const open = market.wagerTargets.filter((id) => !run.relics.includes(id));
  const chance = target && stake.length ? wagerChance(content, stake, target) : null;
  const staked = stake.reduce((a, id) => a + relicValue(content, id), 0);
  const full = stake.length >= BLACK_MARKET.maxStake;
  const toggle = (id: string) => setStake(stake.includes(id) ? stake.filter((x) => x !== id) : full ? stake : [...stake, id]);
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
          <Tipped tip={wagerTip(chance, staked, relicValue(content, target))} className={styles.chance} data-testid="wager-chance">
            <IconDice5 size={20} aria-hidden="true" /> <b className="tabular">{pct(chance)} %</b>
          </Tipped>
        )}
        <button type="button" className={styles.primary} disabled={chance === null} onClick={() => target && act({ type: 'market-wager', target, stake })} data-testid="btn-wager">
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
  if (!market.legendary) return <Done>{MARKET_TEXT.soldOut}</Done>;
  const r = content.relic(market.legendary);
  const price = BLACK_MARKET.legendaryPrice;
  const atCap = atLegendaryCap(run, content);
  const canPay = run.box.length - price >= 1;
  const full = give.length >= price;
  const toggle = (uid: string) => setGive(give.includes(uid) ? give.filter((u) => u !== uid) : full ? give : [...give, uid]);
  const names = run.box.filter((m) => give.includes(m.uid)).map((m) => content.species(m.speciesId).name).join(', ');
  return (
    <div className={styles.stack}>
      <div className={styles.targets}>
        <ItemCard id={r.id} kind="relic" name={r.name} description={r.description} rarity="legendary" footer={<span className={styles.priceTag}>{MARKET_TEXT.priceTag(price)}</span>} />
      </div>
      <p className={styles.ask}>
        {atCap ? RUN_REJECT_TEXT['legendary-cap'] : canPay ? MARKET_TEXT.pickThree(give.length, price) : MARKET_TEXT.keepOne}
        <InfoDot tip={showcaseTip(r, price, atCap)} />
      </p>
      <div className={styles.chips}>
        {run.box.map((m) => {
          const on = give.includes(m.uid);
          return <MonChip key={m.uid} mon={m} selected={on} disabled={atCap || !canPay || (!on && full)} locked={atCap || !canPay} onClick={() => toggle(m.uid)} testId={`showcase-give-${m.uid}`} />;
        })}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={atCap || give.length !== price} onClick={() => setSure(true)} data-testid="btn-showcase">
          {give.length === price ? MARKET_TEXT.handOver(names) : MARKET_TEXT.pickN(price)}
        </button>
      </div>
      {sure && (
        <ConfirmLeave
          testId="confirm-showcase"
          heading={MARKET_TEXT.dealTitle}
          body={MARKET_TEXT.dealBody(names, r.name)}
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
