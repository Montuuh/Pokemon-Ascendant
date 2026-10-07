import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { SHAKE_CHECKS } from '@/sim/combat/catch';
import { itemIcon, spriteOf } from '@/ui/art';
import { catchTimeline, type BallFlight, type CatchFx, type Ghost, type SpriteSlot } from '@/ui/hooks/useCombatFx';
import styles from './ArenaFx.module.css';

// §9.9.1 — the arena's beats that outlive the sim's state (v0.9.3): a Pokémon that has fainted or been caught is no
// longer on the field when its event arrives, so it is drawn here one more time, where it stood. A Poké Ball flies
// between a trainer's hand and the field. The catch is drawn whole: the ball thrown, the Pokémon drawn into it, the
// ball dropping and rocking, one shake check after each wobble and the fourth at the click — to the checks the sim
// rolled before the throw left the hand (§2.6.4.4).

type SlotClass = (slot: SpriteSlot) => string;

export function ArenaFx({ ghosts, balls, catching, slotClass }: { ghosts: readonly Ghost[]; balls: readonly BallFlight[]; catching: CatchFx | null; slotClass: SlotClass }) {
  return (
    <>
      {ghosts.map((g) => (
        <div key={g.id} className={`${slotClass(g.slot)} ${styles.ghost} fx-ghost-${g.kind}`} style={{ '--ghost-at': `${g.at}ms` } as CSSProperties} data-testid="arena-ghost" data-kind={g.kind} data-slot={g.slot} aria-hidden="true">
          <img className="pixel" src={spriteOf({ speciesId: g.speciesId }, g.slot === 'player' ? 'back' : 'front', g.shiny)} alt="" draggable={false} />
        </div>
      ))}
      {balls.map((b) => (
        <Flight key={b.id} b={b} slotClass={slotClass} />
      ))}
      {catching && <CatchBeat key={catching.id} c={catching} slotClass={slotClass} />}
    </>
  );
}

/**
 * Where a hand stands from a ball's resting spot, as `--hand-x` / `--hand-y` on the spot: the hands are the arena's
 * `data-fx-hand` marks (the trainer's, and yours off the left edge), so a ball flies from wherever they are drawn.
 */
function useHand(spot: RefObject<HTMLSpanElement | null>, hand: BallFlight['hand']) {
  useLayoutEffect(() => {
    const el = spot.current;
    const mark = document.querySelector(`[data-fx-hand="${hand}"]`);
    if (!el || !mark) return;
    const a = el.getBoundingClientRect();
    const h = mark.getBoundingClientRect();
    el.style.setProperty('--hand-x', `${h.left + h.width / 2 - a.left}px`);
    el.style.setProperty('--hand-y', `${h.top + h.height / 2 - a.top}px`);
  }, [spot, hand]);
}

function Flight({ b, slotClass }: { b: BallFlight; slotClass: SlotClass }) {
  const spot = useRef<HTMLSpanElement>(null);
  useHand(spot, b.hand);
  return (
    <div className={`${slotClass(b.slot)} ${styles.flight}`} data-testid="ball-flight" data-dir={b.dir} data-hand={b.hand} aria-hidden="true">
      <span ref={spot} className={styles.spot}>
        <img className={`pixel ${styles.flyBall} ${b.dir === 'in' ? styles.flyIn : styles.flyOut}`} src={itemIcon(b.ball)} alt="" draggable={false} />
        <span className={b.dir === 'in' ? styles.openFlash : styles.redFlash} />
      </span>
    </div>
  );
}

function CatchBeat({ c, slotClass }: { c: CatchFx; slotClass: SlotClass }) {
  const spot = useRef<HTMLSpanElement>(null);
  useHand(spot, 'player');
  const pct = Math.round(c.chance * 100);
  const t = catchTimeline(c.wobbles);
  const vars = {
    '--at-absorb': `${t.absorbAt}ms`,
    '--at-drop': `${t.dropAt}ms`,
    '--at-wobble': `${t.wobbleAt}ms`,
    '--at-result': `${t.resultAt}ms`,
    '--wobbles': c.wobbles,
  } as CSSProperties;
  // §2.6.4.4 — one light per shake check: lit as it passes, red where the Pokémon broke out. The first three land at
  // the end of their wobble; the fourth is the click.
  const pips = Array.from({ length: SHAKE_CHECKS }, (_, i) => {
    const k = i + 1;
    const state = k <= c.checks ? 'pass' : !c.success && k === c.checks + 1 ? 'fail' : 'idle';
    const at = k < SHAKE_CHECKS && state === 'pass' ? t.checkAt(k) : t.resultAt;
    return { k, state, at };
  });
  return (
    <div className={`${slotClass(c.slot)} ${styles.catch}`} style={vars} data-testid="catch-fx" data-success={c.success} data-wobbles={c.wobbles} data-checks={c.checks} aria-hidden="true">
      <img className={`pixel ${styles.mon}`} src={spriteOf({ speciesId: c.speciesId }, 'front', c.shiny)} alt="" draggable={false} />
      <span ref={spot} className={styles.spot}>
        <span className={styles.arc}>
          <span className={styles.fall}>
            <img className={`pixel ${styles.ball} ${c.success ? styles.caught : styles.broke}`} src={itemIcon(c.ball)} alt="" draggable={false} />
          </span>
        </span>
        <span className={styles.flash} />
        {c.success && (
          <span className={styles.stars}>
            <i />
            <i />
            <i />
          </span>
        )}
      </span>
      <span className={styles.checks}>
        {pips.map((p) => (
          <i key={p.k} className={styles.pip} data-state={p.state} style={{ animationDelay: `${p.at}ms` }} />
        ))}
        <b className={`${styles.pct} tabular`}>{pct}%</b>
      </span>
    </div>
  );
}
