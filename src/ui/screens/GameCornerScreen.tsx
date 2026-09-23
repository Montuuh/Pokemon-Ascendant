import { useState } from 'react';
import { IconClover, IconDoorExit, IconMinus, IconPlus } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { CASINO, casinoExpectedValue } from '@/sim';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { Money } from '@/ui/components/Money';
import { SlotFace } from '@/ui/components/SlotFace';
import { RUN_REJECT_TEXT, SLOT_FACE_LABEL } from '@/ui/strings';
import { gameCornerTip, machineTip, moneyTip } from '@/ui/tips';
import { InfoDot, Tipped } from '@/ui/tooltip';
import styles from './GameCornerScreen.module.css';

// §2.11.5 — Celadon's Game Corner: the Wheel and the Slots, each with its table printed beside it. The sim rolls
// the outcome against the table first and only then picks what to show (the segment, the reels); this screen
// draws that result and nothing else — the odds on screen are the odds, and a reload shows the same next result.
// An animated outcome is revealed when the animation lands: the result line, the lit odds row and the wallet
// wait for the wheel to stop and the reels to settle, so the screen never tells you before the machine does.

const SEGMENTS = CASINO.wheel.segments;
const SLICE = 360 / SEGMENTS.length;

/** Each outcome's share of the table, for the printed odds. */
const pct = (share: number) => `${Number((share * 100).toFixed(1))} %`;
const wheelRows = [0, 2, 4, 8].map((m) => ({ m, share: SEGMENTS.filter((x) => x === m).length / SEGMENTS.length }));
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
  const [stake, setStake] = useState(50);
  const [turn, setTurn] = useState(0);
  const [rolling, setRolling] = useState(false);
  // Whether the Wheel's last result has landed on screen yet. A result already there on entry has.
  const [wheelShown, setWheelShown] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const { minStake, maxStake, step } = CASINO.wheel;
  const top = Math.max(minStake, Math.min(maxStake, Math.floor(run.money / step) * step));

  function act(action: Parameters<typeof dispatch>[0]): boolean {
    const ok = dispatch(action);
    if (!ok) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
    }
    return ok;
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

  return (
    <main className={styles.root} data-testid="game-corner-screen">
      <header className={styles.topBar}>
        <h1 className={`${styles.title} display`}>
          <IconClover size={26} aria-hidden="true" /> Game Corner
          <InfoDot tip={gameCornerTip()} />
        </h1>
        <Tipped tip={moneyTip(shownMoney)} className={styles.wallet} data-testid="casino-money">
          <Money amount={shownMoney} size={18} />
        </Tipped>
      </header>

      <div className={styles.machines}>
        {/* The Wheel: a bet you size. */}
        <section className={styles.machine} aria-label="The Wheel" data-testid="machine-wheel">
          <h2 className={`${styles.machineName} display`}>
            The Wheel
            <InfoDot tip={machineTip('wheel', wheelRows.map((r) => `×${r.m} ${pct(r.share)}`).join(' · '), casinoExpectedValue('wheel'))} />
          </h2>
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
          <ul className={styles.table} aria-label="The Wheel's odds">
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

        {/* The Slots: a ticket at a fixed price, and one dream. */}
        <section className={styles.machine} aria-label="The Slots" data-testid="machine-slots">
          <h2 className={`${styles.machineName} display`}>
            The Slots
            <InfoDot tip={machineTip('slots', slotRows.map((r) => `${r.m ? `×${r.m}` : 'nothing'} ${pct(r.share)}`).join(' · '), casinoExpectedValue('slots'))} />
          </h2>
          <div
            className={`${styles.reels} ${rolling ? styles.rolling : ''}`}
            data-testid="slot-reels"
            role="group"
            aria-label={rolling ? 'The reels are spinning' : reels.map((f) => SLOT_FACE_LABEL[f] ?? f).join(', ')}
            onAnimationEnd={() => setRolling(false)}
          >
            {reels.map((f, i) => <Face key={i} face={f} size={52} />)}
          </div>
          <ul className={styles.table} aria-label="The Slots' odds">
            {slotRows.map((r) => (
              <li key={r.m} className={slotsLast && slotsLast.multiplier === r.m ? styles.hit : ''}>
                <span className={styles.rowFaces}>
                  {r.face ? [0, 1, 2].map((k) => <Face key={k} face={r.face!} size={18} />) : 'anything else'}
                </span>
                {r.m ? `×${r.m}` : ''}
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
      </div>

      <footer className={styles.footer}>
        {toast && <p className={styles.toast} role="status">{toast}</p>}
        <button type="button" className={styles.leave} onClick={() => act({ type: 'leave-game-corner' })} data-testid="btn-leave-game-corner">
          <IconDoorExit size={18} /> Back to town
        </button>
      </footer>
    </main>
  );
}
