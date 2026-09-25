import { useState, type CSSProperties } from 'react';
import { IconStairsDown } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { gameCornerArt } from '@/ui/art';
import { Modal } from '@/ui/components/Modal';
import { MARKET_TEXT, RUN_REJECT_TEXT } from '@/ui/strings';
import { posterTip, stairsTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import styles from './GameCornerRoom.module.css';

// §2.11.6 — the back of the Celadon Game Corner, as FireRed / LeafGreen drew it: the prize counter, the Rocket
// poster, and the paper poster with a Rocket Grunt standing guard under it. Nothing on the screen says there is a
// Black Market; the Grunt says to keep away from the poster, and the poster, looked at closely, does not sit flat.
// Pushing the switch behind it sends the Grunt off and opens the stairs in the corner; the stairs lead down.
//
// The wall is the real map, 288 × 64 px, shown at a whole-pixel scale (×2, ×3 on a tall screen) so its pixels stay
// square; every spot on it is placed in the map's own pixels, as a share of the wall.

const WALL = { w: 288, h: 64 };
/** A spot on the wall, in the map's pixels: left, top, width, height. */
const SPOT = {
  poster: [176, 6, 16, 18],
  grunt: [176, 24, 16, 24],
  stairs: [254, 28, 34, 24],
} as const;
const place = ([x, y, w, h]: readonly number[]): CSSProperties => ({
  left: `${(x! / WALL.w) * 100}%`,
  top: `${(y! / WALL.h) * 100}%`,
  width: `${(w! / WALL.w) * 100}%`,
  height: `${(h! / WALL.h) * 100}%`,
});
/** The Grunt speaks to his left, over the counter, where the wall has room for the line at every scale. */
const BUBBLE: CSSProperties = { right: `${(1 - SPOT.grunt[0] / WALL.w) * 100}%`, top: `${(SPOT.grunt[1] / WALL.h) * 100}%` };

export function GameCornerRoom({ onSay }: { onSay: (line: string) => void }) {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const market = run.city?.blackMarket ?? null;
  const found = !!market?.found;
  const stairsOpen = found && !market!.entered && !market!.done;
  const [asking, setAsking] = useState(false);
  const [warned, setWarned] = useState(false);

  const posterProps = useTip(posterTip(found));
  const stairsProps = useTip(stairsTip(stairsOpen));

  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) onSay(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? RUN_REJECT_TEXT['wrong-phase']!);
  }
  function poster() {
    // A City visit that began before the market existed (a v0.7.6 save) rolled none: it is only a poster, this time.
    if (!market) return onSay(MARKET_TEXT.justPoster);
    if (!found) setAsking(true);
  }
  const warn = () => setWarned(true);

  return (
    <section className={styles.room} aria-label="The back of the Game Corner" data-testid="game-corner-room">
      <div className={styles.wall} style={{ aspectRatio: `${WALL.w} / ${WALL.h}` }}>
        <img className={styles.art} src={gameCornerArt(found ? 'room-open' : 'room')} alt="" draggable={false} />
        {/* Walking up to the poster, or to him, is what makes the Grunt speak up: his line is the only hint there is. */}
        <button
          type="button"
          className={`${styles.spot} ${styles.poster}`}
          style={place(SPOT.poster)}
          onClick={poster}
          aria-label={MARKET_TEXT.poster}
          data-testid="gc-poster"
          {...posterProps}
          onMouseEnter={(e) => {
            posterProps.onMouseEnter(e);
            warn();
          }}
          onFocus={(e) => {
            posterProps.onFocus(e);
            warn();
          }}
        />
        {!found && (
          <>
            <button type="button" className={`${styles.spot} ${styles.grunt}`} style={place(SPOT.grunt)} onClick={warn} onMouseEnter={warn} onFocus={warn} aria-label={MARKET_TEXT.gruntName} data-testid="gc-grunt" />
            {warned && (
              <p className={styles.bubble} style={BUBBLE} role="status" data-testid="gc-grunt-line">
                {MARKET_TEXT.grunt}
              </p>
            )}
          </>
        )}
        {found && (
          <button
            type="button"
            className={`${styles.spot} ${styles.stairs}`}
            style={place(SPOT.stairs)}
            onClick={() => (stairsOpen ? act({ type: 'enter-black-market' }) : onSay(MARKET_TEXT.stairsShut))}
            aria-label={stairsOpen ? MARKET_TEXT.stairs : `${MARKET_TEXT.stairs} — locked`}
            data-state={stairsOpen ? 'open' : 'locked'}
            data-testid="gc-stairs"
            {...stairsProps}
          >
            <span className={styles.stairsPlate}>
              <IconStairsDown size={14} aria-hidden="true" /> {MARKET_TEXT.stairs}
            </span>
          </button>
        )}
      </div>

      {asking && (
        <Modal title={MARKET_TEXT.poster} testId="gc-switch" onDismiss={() => setAsking(false)}>
          <p className={styles.lede}>{MARKET_TEXT.found}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => setAsking(false)} data-testid="btn-switch-leave">
              {MARKET_TEXT.leaveIt}
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                setAsking(false);
                act({ type: 'push-switch' });
              }}
              data-testid="btn-switch-push"
            >
              {MARKET_TEXT.push}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
