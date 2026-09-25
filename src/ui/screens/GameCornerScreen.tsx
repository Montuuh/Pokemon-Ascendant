import { useState, type ReactNode } from 'react';
import { IconClover, IconDoorExit, IconMinus, IconPlus } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { CASINO, casinoExpectedValue } from '@/sim';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { Modal } from '@/ui/components/Modal';
import { Money } from '@/ui/components/Money';
import { SlotFace } from '@/ui/components/SlotFace';
import { CASINO_TEXT, RUN_REJECT_TEXT, SLOT_FACE_LABEL } from '@/ui/strings';
import { gameCornerTip, machineTip, moneyTip } from '@/ui/tips';
import { InfoDot, Tipped } from '@/ui/tooltip';
import { GameCornerRoom, type Machine } from './GameCornerRoom';
import styles from './GameCornerScreen.module.css';

// §2.11.5 — Celadon's Game Corner. The screen is the room (`GameCornerRoom`, FireRed / LeafGreen's own map): walk up
// to a bank of slot machines and the Slots open; to a roulette table and the Roulette opens — each in a panel with
// its table printed beside it. The sim rolls the outcome against the table first and only then picks what to show
// (the segment, the reels); a panel draws that result and nothing else — the odds on screen are the odds, and a
// reload shows the same next result. An animated outcome is revealed when the animation lands: the result line, the
// lit odds row and the wallet wait for the wheel to stop and the reels to settle, so the screen never tells you
// before the machine does. The room also holds the way to Team Rocket's Black Market (§2.11.6).

const SEGMENTS = CASINO.wheel.segments;
const SLICE = 360 / SEGMENTS.length;

/** Each outcome's share of the table, for the printed odds. */
const pct = (share: number) => `${Number((share * 100).toFixed(1))} %`;
const wheelRows = [...new Set(SEGMENTS)].sort((a, b) => a - b).map((m) => ({ m, share: SEGMENTS.filter((x) => x === m).length / SEGMENTS.length }));
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
  const [turn, setTurn] = useState(0);
  const [rolling, setRolling] = useState(false);
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
    if (landing) say(landing.multiplier ? CASINO_TEXT.landed(landing.multiplier, landing.payout) : CASINO_TEXT.lost);
    setOpen(null);
    setWheelShown(true);
    setRolling(false);
  }

  function spin() {
    if (!act({ type: 'spin-wheel', stake })) return;
    const face = useRunStore.getState().run!.city!.casino.wheel!.face as number;
    setWheelShown(!animate);
    // Always forward: whole turns plus the angle that puts the segment's centre under the pointer at the top.
    setTurn((t) => {
      const base = Math.ceil(t / 360) * 360 + (animate ? 5 * 360 : 0);
      return base + (360 - (face + 0.5) * SLICE);
    });
  }

  function pull() {
    if (!act({ type: 'pull-slots' })) return;
    // The reels settle on their own animation's end (--motion-reel), not on a timer of their own.
    if (animate) setRolling(true);
  }

  const wheelLast = wheelShown ? (run.city?.casino.wheel ?? null) : null;
  const slotsLast = rolling ? null : (run.city?.casino.slots ?? null);
  const reels = (run.city?.casino.slots?.face as string[] | undefined) ?? ['seven', 'bar', 'cherry'];
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
            <div className={styles.wheelWrap}>
              <span className={styles.pointer} aria-hidden="true" />
              <svg
                className={styles.wheel}
                viewBox="-100 -100 200 200"
                style={{ transform: `rotate(${turn}deg)`, transition: animate ? undefined : 'none' }}
                onTransitionEnd={() => setWheelShown(true)}
                aria-hidden="true"
              >
                {SEGMENTS.map((m, i) => {
                  const a0 = ((i * SLICE - 90) * Math.PI) / 180;
                  const a1 = (((i + 1) * SLICE - 90) * Math.PI) / 180;
                  const d = `M0 0 L${96 * Math.cos(a0)} ${96 * Math.sin(a0)} A96 96 0 0 1 ${96 * Math.cos(a1)} ${96 * Math.sin(a1)} Z`;
                  return <path key={i} d={d} className={styles[`seg${m}`]} />;
                })}
                <circle r="22" className={styles.hub} />
              </svg>
            </div>
            <h3 className={styles.oddsHead}>
              {CASINO_TEXT.odds}
              <InfoDot tip={machineTip('wheel', wheelRows.map((r) => `×${r.m} ${pct(r.share)}`).join(' · '), casinoExpectedValue('wheel'))} />
            </h3>
            <ul className={styles.table} aria-label={CASINO_TEXT.oddsOf(CASINO_TEXT.wheelTitle)}>
              {wheelRows.map((r) => (
                <li key={r.m} className={wheelLast && wheelLast.multiplier === r.m ? styles.hit : ''}>
                  <span className={`${styles.swatch} ${styles[`seg${r.m}`]}`} aria-hidden="true" />×{r.m}
                  <b className="tabular">{pct(r.share)}</b>
                </li>
              ))}
            </ul>
            <div className={styles.controls}>
              <div className={styles.stepper} role="group" aria-label="Stake">
                <button type="button" onClick={() => setStake((s) => Math.max(minStake, s - step))} disabled={stake <= minStake} aria-label="Lower the stake" data-testid="stake-down">
                  <IconMinus size={16} />
                </button>
                <span className={styles.stake} data-testid="wheel-stake"><Money amount={stake} size={16} /></span>
                <button type="button" onClick={() => setStake((s) => Math.min(top, s + step))} disabled={stake >= top} aria-label="Raise the stake" data-testid="stake-up">
                  <IconPlus size={16} />
                </button>
              </div>
              <button type="button" className={styles.play} onClick={spin} disabled={!wheelShown || run.money < stake} data-testid="btn-spin">
                Spin
              </button>
            </div>
            <p className={styles.result} role="status" data-testid="wheel-result">
              {wheelLast ? (wheelLast.multiplier ? <>×{wheelLast.multiplier} — <Money amount={wheelLast.payout} size={14} /></> : '×0 — the stake is gone') : ' '}
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
              className={`${styles.reels} ${rolling ? styles.rolling : ''}`}
              data-testid="slot-reels"
              role="group"
              aria-label={rolling ? 'The reels are spinning' : reels.map((f) => SLOT_FACE_LABEL[f] ?? f).join(', ')}
              onAnimationEnd={() => setRolling(false)}
            >
              {reels.map((f, i) => <Face key={i} face={f} size={52} />)}
            </div>
            <h3 className={styles.oddsHead}>
              {CASINO_TEXT.odds}
              <InfoDot tip={machineTip('slots', slotRows.map((r) => `${r.m ? `×${r.m}` : 'nothing'} ${pct(r.share)}`).join(' · '), casinoExpectedValue('slots'))} />
            </h3>
            <ul className={styles.table} aria-label={CASINO_TEXT.oddsOf(CASINO_TEXT.slotsTitle)}>
              {slotRows.map((r) => (
                <li key={r.m} className={slotsLast && slotsLast.multiplier === r.m ? styles.hit : ''}>
                  <span className={styles.rowFaces}>
                    {r.face ? [0, 1, 2].map((k) => <Face key={k} face={r.face!} size={18} />) : 'anything else'}
                  </span>
                  <span>{r.m ? `×${r.m}` : ''}</span>
                  <b className="tabular">{pct(r.share)}</b>
                </li>
              ))}
            </ul>
            <div className={styles.controls}>
              <span className={styles.stake}><Money amount={CASINO.slots.stake} size={16} /> a pull</span>
              <button type="button" className={styles.play} onClick={pull} disabled={rolling || run.money < CASINO.slots.stake} data-testid="btn-pull">
                Pull
              </button>
            </div>
            <p className={styles.result} role="status" data-testid="slots-result">
              {slotsLast ? (slotsLast.multiplier ? <>×{slotsLast.multiplier} — <Money amount={slotsLast.payout} size={14} /></> : 'Nothing lines up') : ' '}
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
