import { useEffect, useMemo, useRef, useState } from 'react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { prizeLabel, reelChances } from '@/sim';
import { itemIcon } from '@/ui/art';
import { playSfx } from '@/ui/audio/sfx';
import { BackButton } from '@/ui/components/BackButton';
import { PrizeFace } from '@/ui/components/FindPrize';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { FIND_TEXT, SHOP_TEXT, WILD_TIER_LABEL } from '@/ui/strings';
import { findTip, prizeTip } from '@/ui/tips';
import { InfoDot, Tipped } from '@/ui/tooltip';
import styles from './FindScreen.module.css';

// §2.9.5 — the item ball (the user, 2026-10-20): its seven prizes run past a marker and slow to a stop on the one that is
// yours. The sim spun it on the way in and the prize is already in the bag; this screen is the spin, seen — it eases
// out over a few seconds, a tick for every tile that passes, and says what you got only when the reel has stopped (D8).
// A held item's or a relic's "?" turns into the one it was as it lands, and every tile then opens its bubble. A click or
// Enter, Space or Escape stops it at once; once stopped, focus is on the way on and Escape walks on. With motion off the
// reel stands stopped.

/** The reel's tiles, in px, and how long the spin runs. */
const TILE = 112;
const GAP = 12;
const STEP = TILE + GAP;
const SPIN_MS = 3600;
/** How many times the seven tiles go round before the one that stops. */
const LAPS = 6;
/** The order the tiles run in: the rows interleaved, so a Rare never sits beside the other Rare. */
const ORDER = [0, 3, 5, 1, 4, 6, 2];
/** A prize's face on a tile: the 30-px bag sprites at ×1.5, two of them still side by side. */
const FACE = 45;

/** easeOutQuart: fast, then a long slow-down — the stop is the drama. */
const ease = (t: number) => 1 - Math.pow(1 - t, 4);

export function FindScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const animate = useMotionPref();
  const find = run.pendingFind!;
  const chances = useMemo(() => reelChances(find.tiles), [find.tiles]);
  // The strip: the tiles in their running order, round and round, ending a lap past the one that stops.
  const strip = useMemo(() => {
    const order = ORDER.filter((i) => i < find.tiles.length).concat(find.tiles.map((_, i) => i).filter((i) => !ORDER.includes(i)));
    const laps = Array.from({ length: LAPS + 1 }, () => order).flat();
    const stopAt = LAPS * order.length + order.indexOf(find.won);
    return { cells: [...laps, ...order], stopAt };
  }, [find.tiles, find.won]);

  const [landed, setLanded] = useState(!animate);
  const window_ = useRef<HTMLDivElement>(null);
  const reel = useRef<HTMLDivElement>(null);
  const walkOn = useRef<HTMLButtonElement>(null);
  const frame = useRef<number | null>(null);
  const stopped = useRef(!animate);

  const tile = find.tiles[find.won]!;
  const label = prizeLabel(tile.prize, content, find.got);

  // Where the strip stands for a share `p` of the spin: the stopping tile's centre under the marker at p = 1.
  const offsetAt = (p: number, width: number) => -(strip.stopAt * STEP + TILE / 2 - width / 2) * p;

  function land() {
    if (stopped.current) return;
    stopped.current = true;
    if (frame.current) cancelAnimationFrame(frame.current);
    const w = window_.current?.clientWidth ?? 0;
    if (reel.current) reel.current.style.transform = `translateX(${offsetAt(1, w)}px)`;
    setLanded(true);
    playSfx(tile.tier === 'rare' ? 'reel-rare' : 'reel-land');
  }

  useEffect(() => {
    const w = window_.current?.clientWidth ?? 0;
    if (!animate) {
      if (reel.current) reel.current.style.transform = `translateX(${offsetAt(1, w)}px)`;
      playSfx(tile.tier === 'rare' ? 'reel-rare' : 'reel-land');
      return;
    }
    const start = performance.now();
    const distance = strip.stopAt * STEP;
    let passed = 0;
    const step = (now: number) => {
      if (stopped.current) return;
      const t = Math.min(1, (now - start) / SPIN_MS);
      const p = ease(t);
      if (reel.current) reel.current.style.transform = `translateX(${offsetAt(p, w)}px)`;
      // A tick each time a tile's edge crosses the marker.
      const crossed = Math.floor((p * distance) / STEP);
      if (crossed > passed) {
        passed = crossed;
        playSfx('reel-tick');
      }
      if (t < 1) frame.current = requestAnimationFrame(step);
      else land();
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // Once per find: the reel is the run's record of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stopped: the way on takes the focus, and Escape walks on. Spinning: Enter, Space or Escape stops it.
  useEffect(() => {
    if (landed) walkOn.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (!landed && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) {
        e.preventDefault();
        land();
      } else if (landed && e.key === 'Escape') {
        e.preventDefault();
        dispatch({ type: 'leave-find' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landed]);

  return (
    <main className={styles.root} data-testid="find-screen" data-landed={landed || undefined}>
      <div className={styles.corner}>
        <BackButton label={SHOP_TEXT.backToRoute} onClick={() => (landed ? dispatch({ type: 'leave-find' }) : land())} testId="btn-leave-find" />
      </div>
      <header className={styles.head}>
        <img className={styles.ball} src={itemIcon('poke-ball')} alt="" width={32} height={32} />
        <h1 className={`${styles.title} display`}>
          {FIND_TEXT.title}
          <InfoDot tip={findTip()} />
        </h1>
      </header>

      <div ref={window_} className={styles.window} onClick={land} data-testid="find-reel" aria-hidden={!landed || undefined}>
        <div ref={reel} className={styles.strip} style={{ gap: GAP }}>
          {strip.cells.map((i, k) => {
            const t = find.tiles[i]!;
            const won = landed && k === strip.stopAt;
            const face = <PrizeFace prize={t.prize} got={won ? find.got : {}} size={FACE} />;
            const props = { className: styles.tile, 'data-tier': t.tier, 'data-won': won || undefined, style: { width: TILE, height: TILE } };
            // Stopped, every tile opens its bubble: the near misses are worth a look too.
            return landed ? (
              <Tipped key={k} as="div" tabIndex={-1} tip={prizeTip(t.prize, chances[i]!, won ? find.got : {})} {...props}>
                {face}
              </Tipped>
            ) : (
              <div key={k} {...props}>
                {face}
              </div>
            );
          })}
        </div>
        <span className={styles.marker} aria-hidden="true" />
      </div>

      <section className={styles.result} aria-live="polite" data-testid="find-result">
        {landed ? (
          <Tipped as="div" tip={prizeTip(tile.prize, chances[find.won]!, find.got)} className={styles.prize} data-tier={tile.tier} tabIndex={0}>
            <span className={styles.tier}>{WILD_TIER_LABEL[tile.tier]}</span>
            <b className={`${styles.name} display`} data-testid="find-prize">
              {label}
            </b>
            <span className={styles.bagged}>{FIND_TEXT.bagged(tile.prize, find.got)}</span>
          </Tipped>
        ) : (
          <p className={styles.spinning}>{FIND_TEXT.spinning}</p>
        )}
      </section>

      <button ref={walkOn} type="button" className={styles.walkOn} onClick={() => (landed ? dispatch({ type: 'leave-find' }) : land())} data-testid="btn-find-done">
        {landed ? FIND_TEXT.walkOn : FIND_TEXT.skip}
      </button>
    </main>
  );
}
