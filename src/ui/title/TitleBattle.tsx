import { useCallback, useEffect, useState, type CSSProperties, type SyntheticEvent } from 'react';
import { getContent } from '@/content/registry';
import { moveArt, spriteOf, stageBackdrop } from '@/ui/art';
import { HpBar } from '@/ui/components/HpBar';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { TITLE_MATCHUPS, titleHits, type TitleMatchup } from './matchups';
import styles from './TitleBattle.module.css';

/**
 * §9.13.1 — the battle behind the title and the new-run screens (v0.9.17): two real battle sprites on one of the game's
 * backdrops, standing on the series' battle bases, trading their own moves — the attacker lunges, the move's picture
 * lands on the target, it flinches and its bar drains — until one faints; then the next matchup comes in. Decoration
 * only (aria-hidden, no pointer events). With motion off it is one still frame: both standing, both bars full.
 */
export function TitleBattle({ className }: { className?: string }) {
  const animate = useMotionPref();
  const [match, setMatch] = useState(resume.match);
  const m = TITLE_MATCHUPS[match % TITLE_MATCHUPS.length]!;
  const next = useCallback(() => {
    resume.match = (match + 1) % TITLE_MATCHUPS.length;
    setMatch(resume.match);
  }, [match]);
  // D9 — the far Pokémon at the half step nearest the screen's height over SCALE_STEP (2× at 720 p, 3.5× at 1080 p);
  // yours, nearer the camera, half a step larger.
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [farScale, setFarScale] = useState(2);
  useEffect(() => {
    if (!root || typeof ResizeObserver === 'undefined') return;
    const measure = () => setFarScale(Math.max(1, Math.round((root.clientHeight / SCALE_STEP) * 2) / 2));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [root]);
  return (
    <div
      ref={setRoot}
      className={`${styles.root} ${className ?? ''}`}
      style={{ '--far-scale': farScale, '--near-scale': farScale + 0.5 } as CSSProperties}
      aria-hidden="true"
      data-testid="title-battle"
    >
      <Fight key={match} m={m} animate={animate} onDone={next} />
    </div>
  );
}

/** The screen height a far sprite's pixel is drawn at 1× for. */
const SCALE_STEP = 330;

/** A sprite's (or a move picture's) own width, for the CSS to multiply by its scale. */
const natural = (e: SyntheticEvent<HTMLImageElement>) => e.currentTarget.style.setProperty('--n-w', String(e.currentTarget.naturalWidth));

/** Where the battle is when it is mounted again: the menu and the new-run screens show one battle, carried on. */
const resume = { match: 0 };

/** The beats of one fight, in ms from its start. */
const T = {
  /** Both come in: the far one steps in, the near one out of its ball. */
  enter: 900,
  /** Between two hits: the lunge, the picture, the flinch, the bar, and a breath. */
  hit: 1500,
  /** Into a hit: when the picture lands on the target, and when its bar drains. */
  land: 180,
  drain: 320,
  /** The picture's stay. */
  art: 600,
  /** After the last hit, before the faint; the faint; and the fade to the next fight. */
  beforeFaint: 450,
  faint: 1000,
  out: 500,
} as const;

type Side = 'near' | 'far';
interface Beat {
  hp: Record<Side, number>;
  /** Who is lunging, who is flinching, what is landing on whom (keyed so a repeat restarts it). */
  lunge: Side | null;
  flinch: Side | null;
  art: { on: Side; moveId: string; key: number } | null;
  fainted: Side | null;
  out: boolean;
}

function Fight({ m, animate, onDone }: { m: TitleMatchup; animate: boolean; onDone: () => void }) {
  const [beat, setBeat] = useState<Beat>({ hp: { near: 1, far: 1 }, lunge: null, flinch: null, art: null, fainted: null, out: false });
  useEffect(() => {
    if (!animate) return;
    const timers: number[] = [];
    const at = (ms: number, fn: (b: Beat) => Beat) => timers.push(window.setTimeout(() => setBeat(fn), ms));
    const hits = titleHits(m);
    hits.forEach((h, i) => {
      const t0 = T.enter + i * T.hit;
      const target: Side = h.by === 'near' ? 'far' : 'near';
      at(t0, (b) => ({ ...b, lunge: h.by }));
      at(t0 + T.land, (b) => ({ ...b, art: { on: target, moveId: h.moveId, key: i }, flinch: target }));
      at(t0 + T.drain, (b) => ({ ...b, lunge: null, hp: { ...b.hp, [target]: Math.max(0, b.hp[target] - h.damage) } }));
      at(t0 + T.land + T.art, (b) => ({ ...b, art: null, flinch: null }));
    });
    const end = T.enter + hits.length * T.hit + T.beforeFaint;
    const loser: Side = m.winner === 'near' ? 'far' : 'near';
    at(end, (b) => ({ ...b, fainted: loser }));
    at(end + T.faint, (b) => ({ ...b, out: true }));
    timers.push(window.setTimeout(onDone, end + T.faint + T.out));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [m, animate, onDone]);

  return (
    <div
      className={`${styles.scene} ${animate ? styles.live : ''} ${beat.out ? styles.out : ''}`}
      style={{ '--t-out': `${T.out}ms`, '--t-faint': `${T.faint}ms`, '--t-art': `${T.art}ms` } as CSSProperties}
      data-match={`${m.near.speciesId}-${m.far.speciesId}`}
    >
      {/* Every picture lazy: decoration never holds up the page's load (the menu is the door to everything). */}
      <img className={styles.backdrop} src={stageBackdrop(m.stage)} alt="" draggable={false} loading="lazy" decoding="async" />
      {(['far', 'near'] as const).map((side) => {
        const f = m[side];
        return (
          <div key={side} className={`${styles.fighter} ${styles[side]}`} data-side={side} data-fainted={beat.fainted === side || undefined} data-testid="title-fighter">
            <span className={styles.base} />
            <span className={[styles.body, beat.lunge === side ? styles.lunge : '', beat.flinch === side ? styles.flinch : ''].join(' ')}>
              {/* The entrance on its own layer: on the body, a lunge or a flinch ending replayed it. */}
              <span className={styles.enter}>
                <img className={`pixel ${styles.sprite}`} src={spriteOf({ speciesId: f.speciesId }, side === 'near' ? 'back' : 'front')} alt="" draggable={false} loading="lazy" decoding="async" onLoad={natural} />
              </span>
            </span>
            {beat.art?.on === side && <img key={beat.art.key} className={`pixel ${styles.art}`} src={moveArt(beat.art.moveId)} alt="" draggable={false} loading="lazy" decoding="async" onLoad={natural} data-testid="title-hit" />}
            <span className={styles.plate}>
              <span className={`${styles.name} display`}>{getContent().species(f.speciesId).name}</span>
              <HpBar hp={Math.round(beat.hp[side] * 100)} maxHp={100} height={6} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
