import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  IconArrowBackUp, IconCheck, IconClock, IconEye, IconHelpCircle, IconPlayerPlay, IconShoe, IconTrees,
} from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { markSafariGuideSeen, safariGuideSeen } from '@/app/safariGuideSeen';
import { getContent } from '@/content/registry';
import {
  afterTurn, canToss, planOf, playerCanStand, SAFARI, throwOdds, tileAt, traitsOf, walkDistance,
  type SafariHunt, type SafariSpot, type SafariState,
} from '@/sim';
import { itemIcon, safariArt, spriteOf } from '@/ui/art';
import { ConfirmLeave } from '@/ui/components/ConfirmLeave';
import { Money } from '@/ui/components/Money';
import { SwapOrSkip } from '@/ui/components/SwapOrSkip';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { LEAVE_WARNING, RUN_REJECT_TEXT, SAFARI_GUIDE, SAFARI_RESULT_LABEL, SAFARI_TEXT, SAFARI_TIER_LABEL, SAFARI_TRAIT } from '@/ui/strings';
import {
  moneyTip, safariAlarmTip, safariApTip, safariBaitTip, safariBallsTip, safariBoardTip, safariClockTip, safariRockTip, safariStateTip,
  safariThrowTip, safariTicketTip, safariTierTip, safariTraitTip,
} from '@/ui/tips';
import { InfoDot, Tipped, useTip } from '@/ui/tooltip';
import { SafariGuide } from './SafariGuide';
import { CellArt } from './CellArt';
import { boardStyle, cellClass, frameClass, sightClass, targetClass, tileClass, useTilePx } from './tiles';
import styles from './SafariScreen.module.css';

// §2.11.6 — the Safari Zone. Two views of one place: the entrance, where today's lineup stands in full before
// the ticket is bought (Pillar 1), and the stalk, a board you read — where it will walk, where it will look —
// and then act on. Nothing here is a rule: every highlight is a sim function (planOf, afterTurn, canToss,
// throwOdds) asked about the board on screen, so what it shows is exactly what the turn will do.

type Mode = 'move' | 'bait' | 'rock';
type Act = Parameters<ReturnType<typeof useRunStore.getState>['dispatch']>[0];
const TIER_CLASS = { common: '', uncommon: styles.tierUncommon, rare: styles.tierRare } as const;

export function SafariScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const [toast, setToast] = useState<string | null>(null);
  const safari = run.city?.safari ?? null;
  // §2.11.6 — the How to play opens by itself on this browser's first walk into the park.
  const [guide, setGuide] = useState(() => !safariGuideSeen());
  function closeGuide() {
    markSafariGuideSeen();
    setGuide(false);
  }
  const help = () => setGuide(true);

  function say(line: string) {
    setToast(line);
    window.setTimeout(() => setToast(null), 2600);
  }
  function act(action: Act): boolean {
    const ok = dispatch(action);
    if (!ok) say(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? RUN_REJECT_TEXT['wrong-phase']!);
    return ok;
  }

  return (
    <main
      className={`${styles.root} ${safari?.hunt ? styles.floor : styles.grounds}`}
      // The entrance stands on the FRLG map of the Safari's entrance; the stalk on the park's forest, dimmed.
      style={{ '--grounds': `url(${safariArt('entrance')})`, '--floor': `url(${safariArt('forest')})` } as CSSProperties}
      data-testid="safari-screen"
    >
      {safari?.hunt ? <Stalk safari={safari} hunt={safari.hunt} act={act} say={say} onHelp={help} paused={guide} /> : <Entrance safari={safari} money={run.money} act={act} onHelp={help} />}
      {toast && <p className={styles.toast} role="status">{toast}</p>}
      <p className="sr-only" role="status" aria-live="polite">{run.log.slice(-1).join(' ')}</p>
      {run.phase === 'swap-or-skip' && <SwapOrSkip />}
      {guide && <SafariGuide onClose={closeGuide} balls={safari?.balls ?? null} clock={safari?.clock ?? null} />}
    </main>
  );
}

// ── The entrance ─────────────────────────────────────────────────────────────────────────────────────────

function Entrance({ safari, money, act, onHelp }: { safari: SafariState | null; money: number; act: (a: Act) => boolean; onHelp: () => void }) {
  const lastLine = useRunStore((s) => s.run?.log.at(-1) ?? '');
  // §2.11.0 — with a ticket bought and the park still open, walking out closes it: that exit asks first.
  const [leaving, setLeaving] = useState(false);
  const committed = !!safari?.entered && !safari.done;
  const leave = (
    <button type="button" className={styles.secondary} onClick={() => (committed ? setLeaving(true) : act({ type: 'leave-safari' }))} data-testid="btn-leave-safari">
      Back to town
    </button>
  );
  // A City visit that began before the park existed (a v0.7.5 save) rolled none: the gate is shut this time.
  if (!safari) {
    return (
      <>
        <Header money={money} onHelp={onHelp} />
        <p className={styles.closed}>{SAFARI_TEXT.closed}</p>
        <footer className={styles.footer}>{leave}</footer>
      </>
    );
  }
  const open = safari.entered && !safari.done;
  // The last line is worth printing once a stalk has ended: it says how (a catch, a bolt). The ticket's own line
  // would only repeat the chips above.
  const stalked = safari.lineup.some((l) => l.result !== null);
  return (
    <>
      <Header money={money} safari={safari.entered ? safari : null} onHelp={onHelp} />
      <ul className={styles.lineup} aria-label="Today's Pokémon" data-testid="safari-lineup">
        {safari.lineup.map((spot, i) => (
          <LineupCard key={spot.species} spot={spot} index={i} canStalk={open && spot.result === null} onStalk={() => act({ type: 'safari-approach', spot: i })} />
        ))}
      </ul>
      <footer className={styles.footer}>
        {stalked && lastLine && <p className={styles.lastLine}>{lastLine}</p>}
        {leave}
        {!safari.entered && (
          <Tipped tip={safariTicketTip(safari.fee, safari.balls, safari.clock)} as="span" className={styles.ticketWrap}>
            <button type="button" className={styles.primary} disabled={money < safari.fee} onClick={() => act({ type: 'enter-safari' })} data-testid="btn-safari-ticket">
              Buy a ticket <Money amount={safari.fee} size={16} />
            </button>
          </Tipped>
        )}
      </footer>
      {leaving && <ConfirmLeave body={LEAVE_WARNING.safari} onStay={() => setLeaving(false)} onLeave={() => act({ type: 'leave-safari' })} />}
    </>
  );
}

function Header({ money, safari, heading, onHelp }: { money: number; safari?: SafariState | null; heading?: string; onHelp: () => void }) {
  return (
    <header className={styles.topBar}>
      <h1 className={`${styles.title} display`}>
        <IconTrees size={26} aria-hidden="true" /> {heading ?? 'Safari Zone'}
      </h1>
      <button type="button" className={styles.help} onClick={onHelp} data-testid="btn-safari-help">
        <IconHelpCircle size={18} aria-hidden="true" /> {SAFARI_GUIDE.button}
      </button>
      <div className={styles.purse}>
        {safari && (
          <>
            <Tipped tip={safariBallsTip(safari.balls)} className={styles.stat} data-testid="safari-balls">
              <img src={itemIcon('safari-ball')} alt="" width={22} height={22} className={styles.pixel} />
              <b className="tabular">{safari.balls}</b>
            </Tipped>
            <Tipped tip={safariClockTip(safari.clock)} className={styles.stat} data-testid="safari-clock">
              <IconClock size={20} aria-hidden="true" />
              <b className="tabular">{safari.clock}</b>
              <span className="sr-only">turns left</span>
            </Tipped>
          </>
        )}
        <Tipped tip={moneyTip(money)} className={styles.stat}>
          <Money amount={money} size={18} />
        </Tipped>
      </div>
    </header>
  );
}

function LineupCard({ spot, index, canStalk, onStalk }: { spot: SafariSpot; index: number; canStalk: boolean; onStalk: () => void }) {
  const s = getContent().species(spot.species);
  const tr = traitsOf(spot);
  const tier = SAFARI_TIER_LABEL[spot.tier]!;
  return (
    <li className={`${styles.card} ${spot.result ? styles.cardDone : ''}`} data-testid={`safari-spot-${index}`} data-tier={spot.tier} data-result={spot.result ?? 'open'}>
      <Tipped tip={safariTierTip(tier, tr)} className={`${styles.tier} ${TIER_CLASS[spot.tier]}`}>{tier}</Tipped>
      <img className={`${styles.cardSprite} ${styles.pixel}`} src={spriteOf({ speciesId: s.id }, 'front')} alt="" width={120} height={120} />
      <h2 className={`${styles.cardName} display`}>
        {s.name} <span className="tabular">Lv {spot.level}</span>
      </h2>
      <span className={styles.types}>{s.types.map((t) => <TypeBadge key={t} type={t} size={14} />)}</span>
      <Traits spot={spot} />
      <Tipped tip={safariAlarmTip(0, tr.temper)} className={styles.temper}>
        <Pips filled={0} total={tr.temper} />
        <span className="sr-only">Takes {tr.temper} alarm{tr.temper === 1 ? '' : 's'}</span>
      </Tipped>
      {spot.result ? (
        <span className={`${styles.stamp} ${spot.result === 'caught' ? styles.stampCaught : ''}`} data-testid={`safari-result-${index}`}>
          {spot.result === 'caught' && <IconCheck size={16} aria-hidden="true" />} {SAFARI_RESULT_LABEL[spot.result]}
        </span>
      ) : canStalk && (
        <button type="button" className={styles.stalk} onClick={onStalk} data-testid={`btn-stalk-${index}`}>
          <IconShoe size={16} aria-hidden="true" /> Stalk
        </button>
      )}
    </li>
  );
}

function Traits({ spot }: { spot: SafariSpot }) {
  const tr = traitsOf(spot);
  const keys = [tr.trait, tr.water ? 'water' : null].filter((k): k is string => !!k);
  if (!keys.length) return <span className={styles.traits} />;
  return (
    <span className={styles.traits}>
      {keys.map((k) => (
        <Tipped key={k} tip={safariTraitTip(SAFARI_TRAIT[k]!.label, SAFARI_TRAIT[k]!.hint)} className={styles.trait}>
          {SAFARI_TRAIT[k]!.label}
        </Tipped>
      ))}
    </span>
  );
}

function Pips({ filled, total, ap = false }: { filled: number; total: number; ap?: boolean }) {
  return (
    <span className={`${styles.pips} ${ap ? styles.apPips : ''}`} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <span key={i} className={`${styles.pip} ${i < filled ? styles.pipOn : ''}`} />)}
    </span>
  );
}

// ── The stalk ────────────────────────────────────────────────────────────────────────────────────────────

const MODES = ['move', 'bait', 'rock'] as const;

function Stalk({ safari, hunt, act, say, onHelp, paused }: { safari: SafariState; hunt: SafariHunt; act: (a: Act) => boolean; say: (line: string) => void; onHelp: () => void; paused: boolean }) {
  const content = getContent();
  const money = useRunStore((s) => s.run!.money);
  // A chosen mode and an armed "Sure?" belong to the moment they were set: the next action or turn drops them,
  // without an effect to reset them.
  const moment = hunt.turn + ':' + hunt.ap;
  const [picked, setPicked] = useState<{ mode: Mode; at: string }>({ mode: 'move', at: moment });
  const mode: Mode = picked.at === moment ? picked.mode : 'move';
  const [sureAt, setSureAt] = useState<string | null>(null);
  const sure = sureAt === moment;
  const spot = safari.lineup[hunt.spot]!;
  const species = content.species(spot.species);
  const tr = traitsOf(spot);
  const plan = planOf(hunt, spot);
  const end = afterTurn(hunt, spot, plan);
  const odds = throwOdds(hunt, spot, content);
  const canThrow = !!odds && hunt.ap >= SAFARI.cost.ball;
  const key = (x: number, y: number) => `${x},${y}`;
  const watched = new Set(end.cone.map((p) => key(p[0], p[1])));
  const path = new Set(plan.steps.map((p) => key(p[0], p[1])));
  // §9 — the board takes the largest whole-pixel tile that fits the space it has.
  const wrap = useRef<HTMLDivElement>(null);
  const tile = useTilePx(wrap, hunt.width, hunt.height);

  // Why a mode is off right now, or null when it is on. Asked by the button and by its bubble.
  const offWhy: Record<Mode, string | null> = {
    move: hunt.ap <= 0 ? RUN_REJECT_TEXT['no-ap']! : null,
    bait: hunt.ap <= 0 ? RUN_REJECT_TEXT['no-ap']! : hunt.bait || hunt.eating > 0 ? 'One bait at a time.' : null,
    rock: hunt.ap <= 0 ? RUN_REJECT_TEXT['no-ap']! : hunt.held || hunt.heldLast ? 'Not two turns running.' : null,
  };

  // Arrow keys walk, the same as clicking the tile; Escape takes back an armed "Sure?". Not while the How to play
  // is open over the board: a key pressed there is the guide's.
  useEffect(() => {
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setSureAt(null);
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault();
      act({ type: 'safari-step', x: hunt.player[0] + d[0]!, y: hunt.player[1] + d[1]! });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hunt, act, paused]);

  function targetable(x: number, y: number): boolean {
    if (hunt.ap <= 0) return false;
    if (mode === 'move') return walkDistance(hunt.player, [x, y]) === 1 && playerCanStand(hunt, x, y);
    return canToss(hunt, spot, mode, [x, y]);
  }
  /**
   * Would it notice you, standing here when the turn ends? Asked of every tile you could stand on, with you on it —
   * standing in its way changes where it walks. Red and an eye is that; pale red is only its look, which the grass
   * covers.
   */
  const seenFrom = (x: number, y: number) => playerCanStand(hunt, x, y) && afterTurn({ ...hunt, player: [x, y] }, spot).spots;
  function onTile(x: number, y: number) {
    if (!targetable(x, y)) return;
    if (mode === 'move') act({ type: 'safari-step', x, y });
    else act({ type: mode === 'bait' ? 'safari-bait' : 'safari-rock', x, y });
  }
  const monState = hunt.eating > 0 ? SAFARI_TEXT.eating(hunt.eating) : hunt.held ? SAFARI_TEXT.held : null;

  const tiles = [];
  for (let y = 0; y < hunt.height; y++) {
    for (let x = 0; x < hunt.width; x++) {
      const t = tileAt(hunt, x, y)!;
      const k = key(x, y);
      const isPlayer = hunt.player[0] === x && hunt.player[1] === y;
      const isMon = hunt.mon[0] === x && hunt.mon[1] === y;
      const isBait = hunt.bait?.[0] === x && hunt.bait?.[1] === y;
      const can = targetable(x, y);
      const seen = seenFrom(x, y);
      const cls = [tileClass(t, x, y, (a, b) => tileAt(hunt, a, b)), cellClass, sightClass(seen, watched.has(k)), can ? targetClass : ''].join(' ');
      const label = `${SAFARI_TEXT.tile[t]}, column ${x + 1}, row ${y + 1}${seen ? ', it would see you here' : watched.has(k) ? ', in its sight but hidden' : ''}`;
      const inner = (
        <CellArt
          step={path.has(k)}
          bait={isBait}
          seen={seen}
          mon={isMon ? { species: species.id, name: species.name, facing: hunt.facing, state: hunt.eating > 0 ? 'eating' : hunt.held ? 'held' : null, stateTip: monState ? safariStateTip(monState) : undefined } : undefined}
          player={isPlayer ? { exposed: end.spots } : undefined}
        />
      );
      tiles.push(
        can ? (
          <button key={k} type="button" className={cls} onClick={() => onTile(x, y)} aria-label={label} data-testid={`tile-${x}-${y}`} data-seen={seen ? 'yes' : 'no'}>
            {inner}
          </button>
        ) : (
          <div key={k} className={cls} data-testid={`tile-${x}-${y}`} data-seen={seen ? 'yes' : 'no'}>
            {inner}
          </div>
        ),
      );
    }
  }

  // Off buttons stay hoverable (aria-disabled, not disabled): the bubble is where they say why.
  const throwTip = useTip(safariThrowTip(odds, !!odds && hunt.ap < SAFARI.cost.ball));
  const modeTips = { move: null, bait: useTip(safariBaitTip(offWhy.bait)), rock: useTip(safariRockTip(offWhy.rock)) };
  const lastThrow = hunt.lastThrow && !hunt.lastThrow.caught ? SAFARI_TEXT.missed(Math.round(hunt.lastThrow.chance * 100)) : null;

  return (
    <>
      <Header money={money} safari={safari} heading={`Stalking ${species.name}`} onHelp={onHelp} />
      <div className={styles.stalkBody}>
        <div className={styles.boardWrap} ref={wrap}>
          <div className={styles.boardSlot}>
            <div className={frameClass} style={boardStyle(hunt.width, hunt.height, tile)} data-testid="safari-board" data-mode={mode}>
              {tiles}
            </div>
            <span className={styles.boardDot}>
              <InfoDot tip={safariBoardTip()} label="How to read the board" />
            </span>
          </div>
        </div>

        <aside className={styles.side} aria-label="The stalk">
          <section className={styles.quarry}>
            <img src={spriteOf({ speciesId: species.id }, 'front')} alt="" width={96} height={96} className={styles.pixel} />
            <div className={styles.targetBody}>
              <h2 className={`${styles.cardName} display`}>{species.name} <span className="tabular">Lv {spot.level}</span></h2>
              <Traits spot={spot} />
              <Tipped tip={safariAlarmTip(hunt.alarms, tr.temper)} className={styles.temper} data-testid="safari-alarms" data-alarms={hunt.alarms}>
                <Pips filled={hunt.alarms} total={tr.temper} />
                <span className="sr-only">{hunt.alarms} of {tr.temper} alarms</span>
              </Tipped>
            </div>
          </section>

          <Tipped tip={safariApTip(hunt.ap)} className={styles.turnRow}>
            <span className={styles.apLabel}>This turn</span>
            <Pips filled={hunt.ap} total={SAFARI.ap} ap />
            <span className="sr-only">{hunt.ap} actions left</span>
          </Tipped>

          {/* The slot is always there, so the buttons below never jump when it comes and goes. */}
          <p className={`${styles.warning} ${end.spots ? '' : styles.slotEmpty}`} aria-hidden={!end.spots} data-testid="safari-exposed" data-on={end.spots ? 'yes' : 'no'}>
            <IconEye size={18} aria-hidden="true" /> {SAFARI_TEXT.exposed}
          </p>

          <div className={styles.modes} role="group" aria-label="What a tile click does">
            {MODES.map((m) => {
              const off = offWhy[m];
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  aria-disabled={off ? true : undefined}
                  className={`${styles.mode} ${mode === m ? styles.modeOn : ''}`}
                  onClick={() => (off ? say(off) : setPicked({ mode: m, at: moment }))}
                  data-testid={`btn-mode-${m}`}
                  {...(modeTips[m] ?? {})}
                >
                  {m === 'move' ? <IconShoe size={20} aria-hidden="true" /> : <img className={`${styles.toolIcon} ${styles.pixel}`} src={safariArt(m)} alt="" />} {SAFARI_TEXT.modes[m]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.throw}
            aria-disabled={canThrow ? undefined : true}
            onClick={() => canThrow && act({ type: 'safari-throw' })}
            data-testid="btn-safari-throw"
            {...throwTip}
          >
            <img src={itemIcon('safari-ball')} alt="" width={26} height={26} className={styles.pixel} />
            Throw {odds ? <b className="tabular">{Math.round(odds.chance * 100)} %</b> : <span className={styles.reach}>{SAFARI_TEXT.outOfReach}</span>}
          </button>

          <button type="button" className={styles.secondary} onClick={() => act({ type: 'safari-wait' })} data-testid="btn-safari-wait">
            <IconPlayerPlay size={16} aria-hidden="true" /> End turn
          </button>
          <button
            type="button"
            className={`${styles.quiet} ${sure ? styles.armed : ''}`}
            onClick={() => (sure ? act({ type: 'safari-retreat' }) : setSureAt(moment))}
            data-testid="btn-safari-retreat"
          >
            <IconArrowBackUp size={16} aria-hidden="true" /> {sure ? SAFARI_TEXT.sure(species.name) : SAFARI_TEXT.backAway}
          </button>

          {lastThrow && <p className={styles.lastLine} data-testid="safari-last-throw">{lastThrow}</p>}
        </aside>
      </div>
    </>
  );
}
