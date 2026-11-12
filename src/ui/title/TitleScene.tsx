import { useEffect, useLayoutEffect, useState, type CSSProperties, type SyntheticEvent } from 'react';
import { spriteOf, titleArt, titleForm } from '@/ui/art';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { FORM_FOOT, formSize, standParty, TITLE_BEATS as T, TITLE_EVOLUTION as EVOLUTION, TITLE_PARTIES } from './parties';
import styles from './TitleScene.module.css';

/**
 * §9.13.1 — the summit behind the title and the new-run screens: a dawn above a sea of clouds, and on the ledge a
 * party of three seen from behind, as a fight shows your own. The clouds drift a pixel at a time, a Pokémon crosses
 * the sky, and the party evolves twice — one member at a time, as the series plays it — before the next one takes its
 * place. Decoration only (aria-hidden, no pointer events). With motion off it is one still frame; while the tab is
 * hidden it is paused. `party={false}` is the place alone: the new-run steps put their panels where the party stands.
 */
export function TitleScene({ className, party: showParty = true }: { className?: string; party?: boolean }) {
  const animate = useMotionPref();
  // `evolving`: this stage was reached while watching, so it plays its beat; a scene mounted mid-way shows it settled.
  const [at, setAt] = useState(() => ({ ...resume, evolving: false }));
  const [leaving, setLeaving] = useState(false);
  const hidden = useTabHidden();
  const party = TITLE_PARTIES[at.party % TITLE_PARTIES.length]!;
  const live = animate && showParty;

  // The party's beats: hold a form, evolve, hold the next; after the last, leave and let the next party in.
  useEffect(() => {
    if (!live || hidden) return;
    const go = (next: typeof at) => {
      resume.party = next.party;
      resume.stage = next.stage;
      setLeaving(false);
      setAt(next);
    };
    const timer = leaving
      ? window.setTimeout(() => go({ party: (at.party + 1) % TITLE_PARTIES.length, stage: 0, evolving: false }), T.leave)
      : window.setTimeout(() => (at.stage < 2 ? go({ party: at.party, stage: at.stage + 1, evolving: true }) : setLeaving(true)), (at.evolving ? EVOLUTION : 0) + T.hold);
    return () => window.clearTimeout(timer);
  }, [live, hidden, at, leaving]);

  // What comes next is fetched while this stands, off the page: a mounted picture would be laid out and kept.
  useEffect(() => {
    if (!live) return;
    const upcoming = TITLE_PARTIES[(at.party + 1) % TITLE_PARTIES.length]!;
    const urls =
      at.stage < 2
        ? party.lines.flatMap((line) => [titleForm(line[at.stage]!, 'light'), titleForm(line[at.stage + 1]!, 'light'), titleForm(line[at.stage + 1]!, 'flash'), titleForm(line[at.stage + 1]!)])
        : [...upcoming.lines.map((line) => titleForm(line[0])), spriteOf({ speciesId: upcoming.flyer }, 'front')];
    for (const url of urls) new Image().src = url;
  }, [live, at.party, at.stage, party]);

  // D9 — the scene's 640×360 pixels at the smallest half step that covers the screen (2× at 720p, 3× at 1080p).
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [k, setK] = useState(2);
  // Before the first paint: a scene drawn once at the wrong scale is a scene that jumps.
  useLayoutEffect(() => {
    if (!root || typeof ResizeObserver === 'undefined') return;
    const measure = () => setK(Math.max(1, Math.ceil(Math.max(root.clientWidth / SCENE.w, root.clientHeight / SCENE.h) * 2) / 2));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [root]);

  const vars = {
    '--k': k,
    '--far': `url("${titleArt('clouds-far')}")`,
    '--near': `url("${titleArt('clouds-near')}")`,
    '--t-far': `${T.far}ms`,
    '--t-near': `${T.near}ms`,
    '--t-fly': `${T.fly}ms`,
    '--t-shift': `${T.shift}ms`,
    '--t-evolve': `${T.evolve}ms`,
    '--t-leave': `${T.leave}ms`,
  } as CSSProperties;

  const now = party.lines.map((line) => line[at.stage]!) as [string, string, string];
  const spots = standParty(now.map((id) => formSize(id).w) as [number, number, number]);

  return (
    <div
      ref={setRoot}
      className={`${styles.root} ${animate ? styles.live : ''} ${className ?? ''}`}
      style={vars}
      aria-hidden="true"
      data-testid="title-scene"
      data-party={at.party}
      data-stage={at.stage}
      data-paused={hidden || undefined}
    >
      <div className={styles.scene}>
        <img className={styles.layer} src={titleArt('summit')} alt="" draggable={false} decoding="async" data-testid="title-vista" />
        <span className={`${styles.clouds} ${styles.far}`} />
        {/* The one sprite that moves by itself: its wings are the GIF's. */}
        {live && <img key={`flyer-${at.party}`} className={`pixel ${styles.flyer}`} src={spriteOf({ speciesId: party.flyer }, 'front')} alt="" draggable={false} decoding="async" onLoad={natural} />}
        {showParty && (
          <div key={`party-${at.party}`} className={`${styles.party} ${leaving ? styles.leaving : ''}`}>
            {party.lines.map((line, slot) => {
              const spot = spots[slot]!;
              const evolving = animate && at.evolving;
              const forms: { id: string; as: 'colour' | 'light' | 'flash'; role: string }[] = evolving
                ? [
                    { id: line[at.stage - 1]!, as: 'colour', role: 'old' },
                    { id: line[at.stage - 1]!, as: 'light', role: 'old-light' },
                    { id: line[at.stage]!, as: 'colour', role: 'new' },
                    { id: line[at.stage]!, as: 'light', role: 'new-light' },
                    { id: line[at.stage]!, as: 'flash', role: 'new-flash' },
                  ]
                : [{ id: line[at.stage]!, as: 'colour', role: 'now' }];
              return (
                <span
                  key={slot}
                  className={`${styles.member} ${evolving ? styles.shifting : ''}`}
                  data-testid="title-member"
                  style={{ '--x': spot.x, '--y': spot.y, '--delay': `${T.shift + slot * (T.evolve + T.gap)}ms`, zIndex: spot.y } as CSSProperties}
                >
                  {forms.map((f) => {
                    const size = formSize(f.id);
                    return (
                      <img
                        // By what it shows, not its part in the beat: the new form of one evolution is the old one of the next.
                        key={`${f.id}-${f.as}`}
                        className={`pixel ${styles.form}`}
                        data-role={f.role}
                        data-species={f.role === 'now' || f.role === 'new' ? f.id : undefined}
                        src={titleForm(f.id, f.as)}
                        style={{ '--w': size.w, '--foot': FORM_FOOT } as CSSProperties}
                        alt=""
                        draggable={false}
                        decoding="async"
                      />
                    );
                  })}
                  {evolving && <span key={at.stage} className={styles.spark} style={{ '--h': formSize(line[at.stage]!).h } as CSSProperties} />}
                </span>
              );
            })}
          </div>
        )}
        <span className={`${styles.clouds} ${styles.near}`} />
        <img className={styles.layer} src={titleArt('dusk')} alt="" draggable={false} decoding="async" />
      </div>
    </div>
  );
}

/** The vista's own pixels. */
const SCENE = { w: 640, h: 360 } as const;

/** Where the scene is when it is mounted again: leaving the menu and coming back finds the party as it was. */
const resume = { party: 0, stage: 0 };

/** A sprite's own width, for the CSS to multiply by the scene's scale. */
const natural = (e: SyntheticEvent<HTMLImageElement>) => e.currentTarget.style.setProperty('--n-w', String(e.currentTarget.naturalWidth));

/** Is the tab in the background? Nobody is watching, so nothing should run. */
function useTabHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return hidden;
}
