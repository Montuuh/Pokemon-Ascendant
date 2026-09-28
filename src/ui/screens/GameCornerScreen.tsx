import { useState, type AnimationEvent, type CSSProperties, type ReactNode } from 'react';
import { IconClover, IconDoorExit, IconMinus, IconPlus } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { betChance, CASINO, casinoExpectedValue, pocketColour, type CasinoResult, type WheelBet } from '@/sim';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { Modal } from '@/ui/components/Modal';
import { Money } from '@/ui/components/Money';
import { SlotFace } from '@/ui/components/SlotFace';
import { BET_NAME, CASINO_TEXT, RUN_REJECT_TEXT, SLOT_FACE_LABEL } from '@/ui/strings';
import { gameCornerTip, machineTip, moneyTip } from '@/ui/tips';
import { InfoDot, Tipped } from '@/ui/tooltip';
import { GameCornerRoom, type Machine } from './GameCornerRoom';
import styles from './GameCornerScreen.module.css';

// §2.11.5 — Celadon's Game Corner. The screen is the room (`GameCornerRoom`, FireRed / LeafGreen's own map): walk up
// to a bank of slot machines and the Slots open; to a roulette table and the Roulette opens — each in a panel with
// its table printed beside it. The sim rolls the outcome against the table first and only then picks what to show
// (the pocket, the reels); a panel draws that result and nothing else — the odds on screen are the odds, and a
// reload shows the same next result. An animated outcome is revealed when the animation lands: the result line, the
// lit odds row and the wallet wait for the ball to drop and the last reel to stop, so the screen never tells you
// before the machine does. The room also holds the way to Team Rocket's Black Market (§2.11.6).
//
// The Roulette is the classic European wheel: the rim turns one way and the ball the other, and both are aimed so
// the ball's last position is the rolled pocket's centre. The Slots' three reels are strips of faces ending on the
// result, each a little longer and slower than the last, so they stop in turn, left to right.

const POCKETS = CASINO.wheel.pockets;
const SLICE = 360 / POCKETS.length;
const BETS: readonly WheelBet[] = ['red', 'black', 'green'];

/** Each outcome's share of the table, for the printed odds. */
const pct = (share: number) => `${Number((share * 100).toFixed(1))} %`;
const betRows = BETS.map((b) => ({ bet: b, pays: CASINO.wheel.pays[b], share: betChance(b) }));
/** The pocket the ball sits in, for a result. */
const pocketOf = (r: CasinoResult) => POCKETS[r.face as number]!;
/** A point on the wheel, `r` from its centre at `deg` clockwise from the top, in the wheel's own units. */
const polar = (r: number, deg: number) => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)] as const;

/**
 * A reel's strip, top to bottom: the face above the payline, the landing face, then the faces that pass before it
 * lands (it scrolls down, so they come in from the bottom of the list). At rest the same strip shows only its first
 * three, so a stopped reel keeps the neighbour it landed with. The window shows the payline face whole and most of
 * each neighbour. Presentation only: the faces around the result are a fixed shuffle, never a roll.
 */
const REEL_PASS = [14, 20, 26];
function reelStrip(reel: number, landing: string, pull: number, rolling: boolean): string[] {
  const symbols = CASINO.slots.symbols;
  const above = symbols[(symbols.indexOf(landing) + 1) % symbols.length]!;
  const strip = [above, landing, ...Array.from({ length: REEL_PASS[reel]! }, (_, k) => symbols[(k * 3 + reel * 5 + pull * 7 + (k >> 2)) % symbols.length]!)];
  return rolling ? strip : strip.slice(0, 3);
}

const slotTotal = CASINO.slots.table.reduce((a, r) => a + r.weight, 0);
const slotRows = CASINO.slots.table.map((r) => ({ m: r.multiplier, share: r.weight / slotTotal, face: CASINO.slots.faces[r.multiplier] }));

function Face({ face, size }: { face: string; size: number }) {
  return (
    <span className={styles.face} role="img" aria-label={SLOT_FACE_LABEL[face] ?? face}>
      <SlotFace face={face} size={size} />
    </span>
  );
}

export function GameCornerScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const animate = useMotionPref();
  const [open, setOpen] = useState<Machine | null>(null);
  const [stake, setStake] = useState(50);
  const [bet, setBet] = useState<WheelBet>('red');
  // The rim's turn and the ball's, in degrees; the ball starts in the pocket of the result already on the table.
  const [turn, setTurn] = useState(0);
  const [ballTurn, setBallTurn] = useState(() => {
    const last = run.city?.casino.wheel;
    return last ? (last.face as number) * SLICE : 0;
  });
  const [spins, setSpins] = useState(0);
  const [pulls, setPulls] = useState(0);
  const [rolling, setRolling] = useState(false);
  // A win the reels have just landed on: the window pulses once, and only then (never on reopening the panel).
  const [justWon, setJustWon] = useState(false);
  // Whether the Wheel's last result has landed on screen yet. A result already there on entry has.
  const [wheelShown, setWheelShown] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const { minStake, maxStake, step } = CASINO.wheel;
  const top = Math.max(minStake, Math.min(maxStake, Math.floor(run.money / step) * step));

  function say(line: string) {
    setToast(line);
    window.setTimeout(() => setToast(null), 2600);
  }
  function act(action: Parameters<typeof dispatch>[0]): boolean {
    const ok = dispatch(action);
    if (!ok) say(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
    return ok;
  }
  // Stepping away mid-spin lands the result at once — the outcome was rolled before the wheel ever moved — and says
  // it, so the wallet never changes without the room being told why.
  function close() {
    const casino = run.city?.casino;
    const landing = !wheelShown ? casino?.wheel : rolling ? casino?.slots : null;
    if (landing) {
      if (landing.machine === 'wheel') say(CASINO_TEXT.ballLanded(pocketOf(landing), BET_NAME[pocketColour(pocketOf(landing))], landing.payout));
      else say(landing.multiplier ? CASINO_TEXT.slotsWon(landing.multiplier, landing.payout) : CASINO_TEXT.slotsLost);
    }
    setOpen(null);
    setJustWon(false);
    setWheelShown(true);
    setRolling(false);
  }

  function spin() {
    if (!act({ type: 'spin-wheel', stake, bet })) return;
    const face = useRunStore.getState().run!.city!.casino.wheel!.face as number;
    setWheelShown(!animate);
    setSpins((n) => n + 1);
    // The rim turns forward two and a bit; the ball runs the other way at least three whole turns and stops over the
    // rolled pocket's centre wherever the rim has carried it.
    const rim = turn + (animate ? 2 * 360 + 23 : 0);
    const target = rim + face * SLICE;
    const floor = ballTurn - (animate ? 3 * 360 : 0);
    setTurn(rim);
    setBallTurn(target - 360 * Math.ceil((target - floor) / 360));
  }

  function pull() {
    if (!act({ type: 'pull-slots' })) return;
    setPulls((n) => n + 1);
    setJustWon(false);
    // The reels settle on the last one's own animation end (--motion-reel), not on a timer of their own.
    if (animate) setRolling(true);
  }
  // Only the last reel's stop, and not a reel's landing flash, is the machine stopping.
  function reelStopped(e: AnimationEvent) {
    if (!(e.target as HTMLElement).dataset.lastReel) return;
    setRolling(false);
    setJustWon(!!run.city?.casino.slots?.multiplier);
  }

  const wheelLast = wheelShown ? (run.city?.casino.wheel ?? null) : null;
  const slotsLast = rolling ? null : (run.city?.casino.slots ?? null);
  const reels = (run.city?.casino.slots?.face as string[] | undefined) ?? ['seven', 'bar', 'cherry'];
  const landedColour = wheelLast ? pocketColour(pocketOf(wheelLast)) : null;
  const spinning = !wheelShown;
  // The wallet as the machines have shown it: a payout still spinning is not in it yet.
  const pending = (wheelShown ? 0 : (run.city?.casino.wheel?.payout ?? 0)) + (rolling ? (run.city?.casino.slots?.payout ?? 0) : 0);
  const shownMoney = run.money - pending;
  const wallet = (testId: string) => (
    <Tipped tip={moneyTip(shownMoney)} className={styles.wallet} data-testid={testId}>
      <Money amount={shownMoney} size={18} />
    </Tipped>
  );

  return (
    <main className={styles.root} data-testid="game-corner-screen">
      <header className={styles.topBar}>
        <h1 className={`${styles.title} display`}>
          <IconClover size={26} aria-hidden="true" /> Game Corner
          <InfoDot tip={gameCornerTip()} />
        </h1>
        {wallet('casino-money')}
      </header>

      <GameCornerRoom onSay={say} onPlay={setOpen} />

      <footer className={styles.footer}>
        {toast && <p className={styles.toast} role="status">{toast}</p>}
        <button type="button" className={styles.leave} onClick={() => act({ type: 'leave-game-corner' })} data-testid="btn-leave-game-corner">
          <IconDoorExit size={18} /> Back to town
        </button>
      </footer>

      {/* The Roulette: a bet you size. */}
      {open === 'wheel' && (
        <Modal title={CASINO_TEXT.wheelTitle} testId="machine-wheel" size="reading" onDismiss={close}>
          <section className={styles.machine} aria-label={CASINO_TEXT.wheelTitle}>
            <div className={styles.wheelWrap} data-testid="roulette-wheel" data-spinning={spinning || undefined}>
              <svg
                className={styles.wheel}
                viewBox="-100 -100 200 200"
                style={{ transform: `rotate(${turn}deg)`, transition: animate ? undefined : 'none' }}
                aria-hidden="true"
              >
                <circle r="99" className={styles.rim} />
                <circle r="88" className={styles.track} />
                {POCKETS.map((n, i) => {
                  const a0 = i * SLICE - SLICE / 2;
                  const a1 = a0 + SLICE;
                  const [x0, y0] = polar(81, a0);
                  const [x1, y1] = polar(81, a1);
                  const [x2, y2] = polar(56, a1);
                  const [x3, y3] = polar(56, a0);
                  return (
                    <g key={n}>
                      <path d={`M${x0} ${y0} A81 81 0 0 1 ${x1} ${y1} L${x2} ${y2} A56 56 0 0 0 ${x3} ${y3} Z`} className={styles[pocketColour(n)]} />
                      <text className={styles.num} transform={`rotate(${i * SLICE})`} y={-73}>
                        {n}
                      </text>
                    </g>
                  );
                })}
                <circle r="56" className={styles.cone} />
                <circle r="40" className={styles.coneInner} />
                <path d="M-3 -24 H3 V-3 H24 V3 H3 V24 H-3 V3 H-24 V-3 H-3 Z" className={styles.turret} />
                <circle r="8" className={styles.hub} />
              </svg>
              <div className={styles.ballOrbit} style={{ transform: `rotate(${ballTurn}deg)`, transition: animate ? undefined : 'none' }} aria-hidden="true">
                <span key={spins} className={`${styles.ball} ${spinning && animate ? styles.ballRolling : ''}`} onAnimationEnd={() => setWheelShown(true)} />
              </div>
            </div>
            <h3 className={styles.oddsHead}>
              {CASINO_TEXT.betHead}
              <InfoDot tip={machineTip('wheel', casinoExpectedValue('wheel'))} />
            </h3>
            <div className={styles.table} role="group" aria-label={CASINO_TEXT.oddsOf(CASINO_TEXT.wheelTitle)}>
              {betRows.map((r) => (
                <button
                  key={r.bet}
                  type="button"
                  className={`${styles.bet} ${bet === r.bet ? styles.chosen : ''} ${landedColour === r.bet ? styles.hit : ''}`}
                  aria-pressed={bet === r.bet}
                  onClick={() => setBet(r.bet)}
                  disabled={spinning}
                  data-testid={`bet-${r.bet}`}
                >
                  <span className={`${styles.swatch} ${styles[r.bet]}`} aria-hidden="true" />
                  {BET_NAME[r.bet]}
                  <span className="tabular">×{r.pays}</span>
                  <b className="tabular">{pct(r.share)}</b>
                </button>
              ))}
            </div>
            <div className={styles.controls}>
              <div className={styles.stepper} role="group" aria-label="Stake">
                <button type="button" onClick={() => setStake((s) => Math.max(minStake, s - step))} disabled={spinning || stake <= minStake} aria-label="Lower the stake" data-testid="stake-down">
                  <IconMinus size={16} />
                </button>
                <span className={styles.stake} data-testid="wheel-stake"><Money amount={stake} size={16} /></span>
                <button type="button" onClick={() => setStake((s) => Math.min(top, s + step))} disabled={spinning || stake >= top} aria-label="Raise the stake" data-testid="stake-up">
                  <IconPlus size={16} />
                </button>
              </div>
              <button type="button" className={styles.play} onClick={spin} disabled={spinning || run.money < stake} aria-label={CASINO_TEXT.spinOn(BET_NAME[bet])} data-testid="btn-spin">
                <span className={`${styles.swatch} ${styles[bet]}`} aria-hidden="true" /> {CASINO_TEXT.spin}
              </button>
            </div>
            <p className={styles.result} role="status" data-testid="wheel-result">
              {wheelLast ? (
                <>
                  <span className={`${styles.pocket} ${styles[landedColour!]}`}>{pocketOf(wheelLast)}</span>
                  {BET_NAME[landedColour!]} —{' '}
                  {wheelLast.multiplier ? <>×{wheelLast.multiplier}, <Money amount={wheelLast.payout} size={14} /></> : CASINO_TEXT.stakeGone}
                </>
              ) : ' '}
            </p>
          </section>
          <PanelFoot wallet={wallet('machine-money')} onClose={close} />
        </Modal>
      )}

      {/* The Slots: a ticket at a fixed price, and one dream. */}
      {open === 'slots' && (
        <Modal title={CASINO_TEXT.slotsTitle} testId="machine-slots" size="reading" onDismiss={close}>
          <section className={styles.machine} aria-label={CASINO_TEXT.slotsTitle}>
            <div
              className={`${styles.reels} ${rolling ? styles.rolling : ''} ${justWon && slotsLast?.multiplier ? styles.won : ''}`}
              data-testid="slot-reels"
              data-rolling={rolling || undefined}
              role="group"
              aria-label={rolling ? CASINO_TEXT.reelsSpinning : reels.map((f) => SLOT_FACE_LABEL[f] ?? f).join(', ')}
              onAnimationEnd={reelStopped}
            >
              {reels.map((f, i) => (
                <span key={i} className={styles.reel} style={{ '--reel': i } as CSSProperties}>
                  <span key={rolling ? pulls : 'rest'} className={styles.strip} data-last-reel={(rolling && i === reels.length - 1) || undefined} style={{ '--pass': REEL_PASS[i] } as CSSProperties} aria-hidden="true">
                    {reelStrip(i, f, pulls, rolling).map((g, k) => <Face key={k} face={g} size={48} />)}
                  </span>
                </span>
              ))}
              <span className={styles.payline} aria-hidden="true" />
            </div>
            <h3 className={styles.oddsHead}>
              {CASINO_TEXT.odds}
              <InfoDot tip={machineTip('slots', casinoExpectedValue('slots'))} />
            </h3>
            <ul className={styles.table} aria-label={CASINO_TEXT.oddsOf(CASINO_TEXT.slotsTitle)}>
              {slotRows.map((r) => (
                <li key={r.m} className={slotsLast && slotsLast.multiplier === r.m ? styles.hit : ''}>
                  <span className={styles.rowFaces}>
                    {r.face ? [0, 1, 2].map((k) => <Face key={k} face={r.face!} size={18} />) : CASINO_TEXT.anythingElse}
                  </span>
                  <span>{r.m ? `×${r.m}` : ''}</span>
                  <b className="tabular">{pct(r.share)}</b>
                </li>
              ))}
            </ul>
            <div className={styles.controls}>
              <span className={styles.stake}><Money amount={CASINO.slots.stake} size={16} /> a pull</span>
              <button type="button" className={styles.play} onClick={pull} disabled={rolling || run.money < CASINO.slots.stake} data-testid="btn-pull">
                {CASINO_TEXT.pull}
              </button>
            </div>
            <p className={styles.result} role="status" data-testid="slots-result">
              {slotsLast ? (slotsLast.multiplier ? <>×{slotsLast.multiplier} — <Money amount={slotsLast.payout} size={14} /></> : CASINO_TEXT.nothingLinesUp) : ' '}
            </p>
          </section>
          <PanelFoot wallet={wallet('machine-money')} onClose={close} />
        </Modal>
      )}
    </main>
  );
}

/** Under a machine: the wallet as the machine has shown it, and the way back to the room. */
function PanelFoot({ wallet, onClose }: { wallet: ReactNode; onClose: () => void }) {
  return (
    <div className={styles.panelFoot}>
      {wallet}
      <button type="button" className={styles.leave} onClick={onClose} data-testid="btn-machine-close">
        {CASINO_TEXT.stepAway}
      </button>
    </div>
  );
}
