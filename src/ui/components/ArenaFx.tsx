import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { itemIcon, moveArt, spriteOf } from '@/ui/art';
import { catchTimeline, type BallFlight, type CatchFx, type Ghost, type MoveHit, type SpriteSlot } from '@/ui/hooks/useCombatFx';
import { ArenaSprite } from './ArenaSprite';
import styles from './ArenaFx.module.css';

// §9.9.1 — the arena's beats that outlive the sim's state (v0.9.3): a Pokémon that has fainted or been caught is no
// longer on the field when its event arrives, so it is drawn here one more time, where it stood. A Poké Ball flies
// between a trainer's hand and the field. The catch is drawn whole: the ball thrown, the Pokémon drawn into it, the
// ball dropping and rocking — one wobble per shake check that passed, the fourth the click — to the checks the sim
// rolled before the throw left the hand (§2.6.4.4).

/** §9.2.1 — where a slot's Pokémon stands on the stage, measured from its unit (`data-fx-slot`): the box every beat
 *  of that slot is drawn in. */
type SlotStyle = (slot: SpriteSlot) => CSSProperties;

export function ArenaFx({ ghosts, balls, hits = [], catching, slotStyle }: { ghosts: readonly Ghost[]; balls: readonly BallFlight[]; hits?: readonly MoveHit[]; catching: CatchFx | null; slotStyle: SlotStyle }) {
  return (
    <>
      {/* §9.2.3 — the card's own picture, landing on what it hits: at 3×, whole pixels (D9). */}
      {hits.map((h) => (
        <div key={h.id} className={`${styles.box} ${styles.hit}`} style={slotStyle(h.slot)} data-testid="move-hit" data-move={h.moveId} aria-hidden="true">
          <img className={`pixel ${styles.hitArt}`} src={moveArt(h.moveId)} alt="" draggable={false} onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
      ))}
      {ghosts.map((g) => (
        <div key={g.id} className={`${styles.box} ${styles.ghost} fx-ghost-${g.kind}`} style={{ ...slotStyle(g.slot), '--ghost-at': `${g.at}ms` } as CSSProperties} data-testid="arena-ghost" data-kind={g.kind} data-slot={g.slot} aria-hidden="true">
          <ArenaSprite src={spriteOf({ speciesId: g.speciesId }, g.slot === 'player' ? 'back' : 'front', g.shiny)} />
        </div>
      ))}
      {balls.map((b) => (
        <Flight key={b.id} b={b} slotStyle={slotStyle} />
      ))}
      {catching && <CatchBeat key={catching.id} c={catching} slotStyle={slotStyle} />}
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

function Flight({ b, slotStyle }: { b: BallFlight; slotStyle: SlotStyle }) {
  const spot = useRef<HTMLSpanElement>(null);
  useHand(spot, b.hand);
  return (
    <div className={`${styles.box} ${styles.flight}`} style={slotStyle(b.slot)} data-testid="ball-flight" data-dir={b.dir} data-hand={b.hand} aria-hidden="true">
      <span ref={spot} className={styles.spot}>
        <img className={`pixel ${styles.flyBall} ${b.dir === 'in' ? styles.flyIn : styles.flyOut}`} src={itemIcon(b.ball)} alt="" draggable={false} />
        <span className={b.dir === 'in' ? styles.openFlash : styles.redFlash} />
      </span>
    </div>
  );
}

/** The throw's apex over its landing point, and how high the ball hangs there before it drops (`catchDrop`). */
const ARC_RISE = 130;
const DROP_HOLD = 90;
const ARC_MARGIN = 8;

function CatchBeat({ c, slotStyle }: { c: CatchFx; slotStyle: SlotStyle }) {
  const spot = useRef<HTMLSpanElement>(null);
  useHand(spot, 'player');
  // §9.9.1 — the arc rises no higher than the field has room for: a Bench 1 at 720 p sits near the stage's top, and a
  // fixed apex threw the ball out of sight for a third of the throw (v0.9.16).
  useLayoutEffect(() => {
    const el = spot.current;
    const stage = el?.closest('[data-fx-stage]');
    const ball = el?.querySelector('img');
    if (!el || !stage || !ball) return;
    const room = el.getBoundingClientRect().top - stage.getBoundingClientRect().top;
    const rise = Math.max(0, Math.min(ARC_RISE, room - DROP_HOLD - ball.offsetHeight - ARC_MARGIN));
    el.style.setProperty('--arc-rise', `${rise}px`);
    el.style.setProperty('--drop-hold', `${DROP_HOLD}px`);
  }, []);
  const t = catchTimeline(c.wobbles, c.success);
  const vars = {
    '--at-absorb': `${t.absorbAt}ms`,
    '--at-drop': `${t.dropAt}ms`,
    '--at-wobble': `${t.wobbleAt}ms`,
    '--at-result': `${t.resultAt}ms`,
    '--wobbles': c.wobbles,
  } as CSSProperties;
  return (
    <div className={`${styles.box} ${styles.catch}`} style={{ ...slotStyle(c.slot), ...vars }} data-testid="catch-fx" data-slot={c.slot} data-success={c.success} data-wobbles={c.wobbles} data-checks={c.checks} aria-hidden="true">
      <ArenaSprite src={spriteOf({ speciesId: c.speciesId }, 'front', c.shiny)} imgClassName={styles.mon} />
      <span ref={spot} className={styles.spot}>
        <span className={styles.arc}>
          <span className={styles.arcY}>
            <span className={styles.fall}>
              <img className={`pixel ${styles.ball} ${c.success ? styles.caught : styles.broke}`} src={itemIcon(c.ball)} alt="" draggable={false} />
            </span>
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
    </div>
  );
}
