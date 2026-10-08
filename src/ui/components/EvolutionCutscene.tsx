import { useCallback, useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react';
import { IconPlayerTrackNext } from '@tabler/icons-react';
import { getContent } from '@/content/registry';
import { spriteOf } from '@/ui/art';
import { EVOLUTION_TEXT } from '@/ui/strings';
import styles from './EvolutionCutscene.module.css';

// §9.9.1 — the evolution, as the series plays it (v0.9.5): "What? Bulbasaur is evolving!", the sprite turns to a
// silhouette of light, the old and the new shapes trade places faster and faster, a bloom, and the new Pokémon in its
// colours — "Congratulations! Your Bulbasaur evolved into Ivysaur!". A click or a key skips it; under reduced motion it
// never plays (the caller does not mount it).
//
// No full-screen white flash: the bloom is a light behind the sprite, and the trade between the two shapes never runs
// faster than ten a second — both silhouettes are the same light on the same dark, so what changes is a shape, not a
// screen's brightness.

/** The beats' lengths. The trade's intervals shrink to the 100 ms floor and stay there. */
const EVO_MS = {
  intro: 1100,
  whiten: 650,
  trades: [440, 380, 320, 270, 230, 200, 175, 155, 140, 125, 115, 105, 100, 100, 100],
  /** The last shape held a beat before the bloom. */
  settle: 120,
  bloom: 700,
  reveal: 700,
  hold: 1600,
  /** The ambient loops: the light's breath, a spark's climb, the sparks fading in. */
  pulse: 1600,
  rise: 2400,
  fade: 400,
} as const;

/** The sprites are drawn at one whole-number scale, so the pixels stay square and the evolved form is visibly bigger. */
const STAGE_PX = 360;
const scaleFor = (largest: number) => Math.max(2, Math.min(8, Math.floor(STAGE_PX / Math.max(1, largest))));

type Phase = 'intro' | 'whiten' | 'trade' | 'bloom' | 'reveal';

export function EvolutionCutscene({ fromId, toId, shiny = false, onDone }: { fromId: string; toId: string; shiny?: boolean; onDone: () => void }) {
  const content = getContent();
  const from = content.species(fromId);
  const to = content.species(toId);
  const [phase, setPhase] = useState<Phase>('intro');
  const [showNew, setShowNew] = useState(false);
  const [sizes, setSizes] = useState<{ from?: [number, number]; to?: [number, number] }>({});
  const done = useRef(false);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    let t = EVO_MS.intro;
    at(t, () => setPhase('whiten'));
    t += EVO_MS.whiten;
    at(t, () => setPhase('trade'));
    EVO_MS.trades.forEach((gap, i) => {
      t += gap;
      at(t, () => setShowNew(i % 2 === 0));
    });
    // The trade ends on the new shape, whatever the count.
    at(t, () => setShowNew(true));
    t += EVO_MS.settle;
    at(t, () => setPhase('bloom'));
    t += EVO_MS.bloom;
    at(t, () => setPhase('reveal'));
    t += EVO_MS.reveal + EVO_MS.hold;
    at(t, finish);
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [finish]);

  // Any key or click: skip to the end, as the series lets you (but never cancels — the evolution happens).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'Escape'].includes(e.key)) {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  const revealed = phase === 'reveal';
  const lit = phase !== 'intro' && !revealed;
  const line = revealed ? EVOLUTION_TEXT.evolved(from.name, to.name) : EVOLUTION_TEXT.evolving(from.name);
  const vars = {
    '--evo-whiten': `${EVO_MS.whiten}ms`,
    '--evo-bloom': `${EVO_MS.bloom}ms`,
    '--evo-reveal': `${EVO_MS.reveal}ms`,
    '--evo-pulse': `${EVO_MS.pulse}ms`,
    '--evo-rise': `${EVO_MS.rise}ms`,
    '--evo-fade': `${EVO_MS.fade}ms`,
  } as CSSProperties;
  const ready = !!sizes.from && !!sizes.to;
  const scale = scaleFor(Math.max(...(sizes.from ?? [0]), ...(sizes.to ?? [0])));
  const box = (wh?: [number, number]): CSSProperties | undefined => (wh ? { width: wh[0] * scale, height: wh[1] * scale } : undefined);
  const measure = (key: 'from' | 'to') => (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setSizes((v) => ({ ...v, [key]: [img.naturalWidth, img.naturalHeight] }));
  };

  return (
    <div className={`${styles.root} theme-stage`} style={vars} role="dialog" aria-label={`${from.name} is evolving`} data-testid="evolution-cutscene" data-phase={phase} onClick={finish}>
      <button type="button" className={styles.skip} onClick={finish} data-testid="evo-skip">
        Skip <IconPlayerTrackNext size={16} />
      </button>
      <div className={`${styles.glow} ${phase === 'bloom' ? styles.bloom : ''} ${revealed ? styles.settled : ''}`} aria-hidden="true" />
      <div className={`${styles.sparks} ${lit ? styles.sparksOn : ''}`} aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className={`${styles.stage} ${ready ? '' : styles.loading}`} aria-hidden="true">
        <img className={`pixel ${styles.sprite} ${lit ? styles.silhouette : ''} ${showNew || revealed ? styles.hidden : ''}`} style={box(sizes.from)} onLoad={measure('from')} src={spriteOf({ speciesId: from.id }, 'front', shiny)} alt="" draggable={false} />
        <img className={`pixel ${styles.sprite} ${!revealed ? styles.silhouette : ''} ${revealed ? styles.popIn : ''} ${showNew || revealed ? '' : styles.hidden}`} style={box(sizes.to)} onLoad={measure('to')} src={spriteOf({ speciesId: to.id }, 'front', shiny)} alt="" draggable={false} />
      </div>
      <p className={`${styles.box} display`} aria-live="polite" data-testid="evolution-line">
        {line}
      </p>
    </div>
  );
}
