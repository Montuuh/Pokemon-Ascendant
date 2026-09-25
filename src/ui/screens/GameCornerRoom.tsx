import { useState, type CSSProperties } from 'react';
import { IconStairsDown } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { gameCornerArt } from '@/ui/art';
import { Modal } from '@/ui/components/Modal';
import { CASINO_TEXT, MARKET_TEXT, RUN_REJECT_TEXT } from '@/ui/strings';
import { hatchTip, posterTip, rouletteTableTip, slotsBankTip, stairsTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import styles from './GameCornerRoom.module.css';

// §2.11.5 / §2.11.6 — the Celadon Game Corner, as FireRed / LeafGreen drew it, is the Game Corner screen: the prize
// counter, four banks of slot machines with their players, two roulette tables on the floor by the door, and — at
// the back — the paper poster with a Rocket Grunt standing guard under it. A bank of slots opens the Slots; a table
// opens the Roulette. Nothing says there is a Black Market: the Grunt says to keep away from the poster, and the
// poster, pressed, hides a switch. Once it is pushed the Grunt is gone and the poster is only a poster; the stairs
// stand open in the corner until you have been down, and after that a locked hatch covers them.
//
// The room is the real map, 288 × 224 px, shown at a whole-pixel scale (×2, ×3 on a tall screen) so its pixels stay
// square; every spot on it is placed in the map's own pixels, as a share of the room.

export type Machine = 'wheel' | 'slots';

const ROOM = { w: 288, h: 224 };
type Box = readonly [number, number, number, number];
/** A spot in the room, in the map's pixels: left, top, width, height. */
const SPOT = {
  poster: [176, 6, 16, 18],
  grunt: [176, 24, 16, 24],
  stairs: [254, 28, 34, 24],
  hatch: [256, 29, 32, 22],
} as const;
/** The four banks of slot machines, left to right, and the two roulette tables either side of the door. */
const SLOT_BANKS: readonly Box[] = [[0, 80, 16, 96], [80, 80, 32, 96], [176, 80, 32, 96], [272, 80, 16, 96]];
const TABLES: readonly Box[] = [[36, 186, 64, 30], [184, 186, 64, 30]];
/** Which banks wear a name plate: the two in the middle of the floor. The edge ones are the same machines. */
const PLATED_BANKS = new Set([1, 2]);

const place = ([x, y, w, h]: Box): CSSProperties => ({
  left: `${(x / ROOM.w) * 100}%`,
  top: `${(y / ROOM.h) * 100}%`,
  width: `${(w / ROOM.w) * 100}%`,
  height: `${(h / ROOM.h) * 100}%`,
});
/** The Grunt speaks to his left, over the counter, where the room has space for the line at every scale. */
const BUBBLE: CSSProperties = { right: `${(1 - SPOT.grunt[0] / ROOM.w) * 100}%`, top: `${(SPOT.grunt[1] / ROOM.h) * 100}%` };

export function GameCornerRoom({ onSay, onPlay }: { onSay: (line: string) => void; onPlay: (machine: Machine) => void }) {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const market = run.city?.blackMarket ?? null;
  const found = !!market?.found;
  const stairsOpen = found && !market!.entered && !market!.done;
  const shut = found && !stairsOpen;
  const [asking, setAsking] = useState(false);
  const [warned, setWarned] = useState(false);

  const posterProps = useTip(posterTip());
  const stairsProps = useTip(stairsTip());
  const hatchProps = useTip(hatchTip());

  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) onSay(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? RUN_REJECT_TEXT['wrong-phase']!);
  }
  function poster() {
    // A City visit that began before the market existed (a v0.7.6 save) rolled none: it is only a poster, this time.
    if (!market) return onSay(MARKET_TEXT.justPoster);
    setAsking(true);
  }
  const warn = () => setWarned(true);
  const art = found ? (stairsOpen ? 'room-open' : 'room-shut') : 'room';

  return (
    <section className={styles.room} aria-label={CASINO_TEXT.room} data-testid="game-corner-room">
      <div className={styles.floor} style={{ aspectRatio: `${ROOM.w} / ${ROOM.h}` }}>
        <img className={styles.art} src={gameCornerArt(art)} alt="" draggable={false} />

        {SLOT_BANKS.map((b, i) => (
          // One Tab stop per machine kind: the plated banks take the focus, the edge ones are the same machines.
          <Spot key={`slots-${i}`} box={b} tip={slotsBankTip()} label={CASINO_TEXT.slotsLabel} plate={PLATED_BANKS.has(i) ? CASINO_TEXT.slots : null} focusable={i === 1} onClick={() => onPlay('slots')} testId={`gc-slots-${i}`} />
        ))}
        {TABLES.map((b, i) => (
          <Spot key={`table-${i}`} box={b} tip={rouletteTableTip()} label={CASINO_TEXT.rouletteLabel} plate={CASINO_TEXT.roulette} art="roulette" focusable={i === 0} onClick={() => onPlay('wheel')} testId={`gc-roulette-${i}`} />
        ))}

        {/* The poster and its Grunt, until the switch is pushed: then it is only a poster, and he is gone. */}
        {!found && (
          <>
            <button
              type="button"
              className={styles.spot}
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
            <button type="button" className={styles.spot} style={place(SPOT.grunt)} onClick={warn} onMouseEnter={warn} onFocus={warn} aria-label={MARKET_TEXT.gruntName} data-testid="gc-grunt" />
            {warned && (
              <p className={styles.bubble} style={BUBBLE} role="status" data-testid="gc-grunt-line">
                {MARKET_TEXT.grunt}
              </p>
            )}
          </>
        )}

        {stairsOpen && (
          <button type="button" className={`${styles.spot} ${styles.stairs}`} style={place(SPOT.stairs)} onClick={() => act({ type: 'enter-black-market' })} aria-label={MARKET_TEXT.stairs} data-testid="gc-stairs" {...stairsProps}>
            <span className={styles.plate}>
              <IconStairsDown size={14} aria-hidden="true" /> {MARKET_TEXT.stairs}
            </span>
          </button>
        )}
        {/* Back up the stairs, the door is locked for the visit: a hatch, shut, where the stairs were. */}
        {shut && (
          <button type="button" className={`${styles.spot} ${styles.hatch}`} style={place(SPOT.hatch)} onClick={() => onSay(MARKET_TEXT.stairsShut)} aria-label={MARKET_TEXT.hatch} data-testid="gc-hatch" {...hatchProps}>
            <img className={styles.sprite} src={gameCornerArt('hatch')} alt="" draggable={false} />
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

/** A machine in the room: its box lights on hover, an optional plate names it, and a sprite stands on it if the map has none. */
function Spot({ box, tip, label, plate, art, focusable, onClick, testId }: { box: Box; tip: ReturnType<typeof slotsBankTip>; label: string; plate: string | null; art?: 'roulette'; focusable: boolean; onClick: () => void; testId: string }) {
  const tipProps = useTip(tip);
  return (
    <button type="button" className={styles.spot} style={place(box)} onClick={onClick} aria-label={label} tabIndex={focusable ? undefined : -1} data-testid={testId} {...tipProps}>
      {art && <img className={styles.sprite} src={gameCornerArt(art)} alt="" draggable={false} />}
      {plate && <span className={styles.plate}>{plate}</span>}
    </button>
  );
}
