import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { getContent } from '@/content/registry';
import { runHelpers, type HealLine, type PartyMon } from '@/sim';
import { hubArt, trainerSprite } from '@/ui/art';
import { music } from '@/ui/audio/music';
import { playSfx } from '@/ui/audio/sfx';
import { HpBar } from '@/ui/components/HpBar';
import { MonIcon } from '@/ui/components/MonIcon';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { HEAL_TEXT } from '@/ui/strings';
import { healTip, partyTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import styles from './HealPanel.module.css';

// §9.9.3 — the heal, seen (the user, 2026-10-20: "an animation for the Pokémon Center and the nurse, saying how much HP
// comes back, with the machine's sound"). The Center's machine — FireRed's own, cut from the Hub's lobby — takes a ball
// for each Pokémon, one by one, then lights up to its jingle; the nurse plays the same jingle as she works. Only then do
// the bars fill, each with what it got back: the result lands with the machine, never before it — not on the bars, not in
// a bubble (D8). A click or a key skips. With motion off the bars stand filled from the start; the jingle still plays.
// Nothing to heal: the machine stays dark and says so, and no row repeats the Box. Once done, a bar reads the Pokémon as
// it is now (a Daycare level or Therapy after the heal moves it); only its "+N" is the heal's.

type Beat = 'tray' | 'run' | 'fill' | 'done';

/** The beats' lengths, in ms: a ball every `ball`, the jingle's run, the bars' fill. */
const MS = { ball: 260, run: 2000, fill: 900 } as const;
/** The machine's six lights, where its tray balls sit (the art's own pixels, `scripts/cut-heal-machine.mjs`). */
const SOCKETS: readonly [number, number][] = [
  [12, 10],
  [18, 10],
  [12, 14],
  [18, 14],
  [12, 18],
  [18, 18],
];
/**
 * The heals already shown this session, by the run's stamp (`RunState.heals`): a screen that remounts on the same heal
 * (back from an Evolution the Daycare's level made ready) shows it done rather than running the machine again.
 */
const SHOWN = new Set<number>();

interface Props {
  lines: readonly HealLine[];
  box: readonly PartyMon[];
  /** The run's count of heals: which heal this is. */
  stamp: number;
  /** The Center's machine, or the field nurse at her table. */
  variant: 'center' | 'nurse';
  /** Told once the bars have filled (or at once, when there is nothing to show). */
  onDone?: () => void;
  /** Place the existing animated machine over its matching furniture in an interior scene. */
  machineStyle?: CSSProperties;
  /** Once the heal has landed, keep its per-Pokémon history behind a disclosure in the lobby. */
  compactAfterDone?: boolean;
  /** Route-stop scenes already contain their grounded overworld nurse. */
  showNurseArt?: boolean;
  testId?: string;
}

export function HealPanel({
  lines,
  box,
  stamp,
  variant,
  onDone,
  machineStyle,
  compactAfterDone = false,
  showNurseArt = true,
  testId = 'heal',
}: Props) {
  const animate = useMotionPref();
  const healed = lines.reduce((a, l) => a + Math.max(0, l.to - l.from), 0);
  const cured = lines.filter((l) => l.cured).length;
  const idle = healed === 0 && cured === 0;
  const [seen] = useState(() => SHOWN.has(stamp));
  const start: Beat = idle || !animate || seen ? 'done' : variant === 'center' ? 'tray' : 'run';
  const [beat, setBeat] = useState<Beat>(start);
  // Dark with nothing to heal: no ball in its tray.
  const [balls, setBalls] = useState(start === 'tray' || idle ? 0 : SOCKETS.length);
  const timers = useRef<number[]>([]);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  const shown = beat === 'fill' || beat === 'done';
  const tip = useTip(healTip(variant, shown ? healed : null, shown ? cured : null, !shown));

  // The machine's beats, on this component's own timers, so a skip or a remount cancels what has not happened yet.
  useEffect(() => {
    const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));
    if (idle || seen) {
      done.current?.();
      return;
    }
    SHOWN.add(stamp);
    const trayBalls = variant === 'center' ? Math.min(SOCKETS.length, lines.length) : 0;
    const trayMs = start === 'tray' ? trayBalls * MS.ball + MS.ball : 0;
    if (start === 'tray')
      for (let i = 0; i < trayBalls; i++)
        later(MS.ball * (i + 1), () => {
          setBalls(i + 1);
          playSfx('ball-set');
        });
    // The jingle, with the music hushed under it as the games do.
    later(trayMs, () => {
      music.setScene('hush');
      playSfx('heal-machine');
      if (start !== 'done') setBeat('run');
    });
    later(trayMs + MS.run + 400, () => music.setScene(null));
    if (start === 'done') {
      done.current?.();
      return clear;
    }
    later(trayMs + MS.run, () => setBeat('fill'));
    later(trayMs + MS.run + MS.fill, () => {
      setBeat('done');
      done.current?.();
    });
    return clear;
    function clear() {
      for (const t of timers.current) window.clearTimeout(t);
      timers.current = [];
      music.setScene(null);
    }
    // Once per heal: the lines are the run's record of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function skip() {
    if (beat === 'done') return;
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    music.setScene(null);
    setBalls(SOCKETS.length);
    setBeat('done');
    done.current?.();
  }

  const content = getContent();
  const total = idle ? HEAL_TEXT.nothing : shown ? HEAL_TEXT.total(healed, cured) : HEAL_TEXT.working;
  const patients = !idle && (
    <ul className={styles.patients} aria-label={HEAL_TEXT.patients}>
      {lines.map((l) => {
        const mon = box.find((m) => m.uid === l.uid);
        if (!mon) return null;
        return (
          <Patient
            key={l.uid}
            mon={mon}
            line={l}
            beat={beat}
            max={runHelpers.maxHpOf(mon, content)}
            testId={testId}
          />
        );
      })}
    </ul>
  );

  return (
    <section
      className={`${styles.root} ${styles[variant] ?? ''}`}
      data-testid={testId}
      data-beat={beat}
      aria-label={HEAL_TEXT.label}
      onClick={skip}
    >
      <button
        type="button"
        className={styles.stand}
        aria-label={shown ? total : HEAL_TEXT.skip}
        // Done, it has nothing left to skip: it stays focusable for its bubble.
        aria-disabled={beat === 'done' || undefined}
        onClick={(e) => {
          e.stopPropagation();
          skip();
        }}
        data-testid={`${testId}-stand`}
        {...tip}
      >
        {variant === 'center' ? (
          <span className={`${styles.machine} ${beat === 'run' ? styles.running : ''}`} style={machineStyle}>
            <img className="pixel" src={hubArt('heal-machine')} alt="" draggable={false} />
            {SOCKETS.slice(0, Math.min(balls, lines.length)).map(([x, y], i) => (
              <img
                key={i}
                className={`pixel ${styles.ball}`}
                src={hubArt('heal-ball')}
                alt=""
                style={{ '--x': x, '--y': y, animationDelay: `${(i % 2) * 120}ms` } as React.CSSProperties}
                draggable={false}
              />
            ))}
          </span>
        ) : showNurseArt ? (
          <img
            className={`pixel ${styles.nurseSprite} ${beat === 'run' ? styles.working : ''}`}
            src={trainerSprite('nurse')}
            alt=""
            width={120}
            height={120}
            draggable={false}
          />
        ) : null}
        <span
          className={`${styles.total} display tabular`}
          data-testid={`${testId}-total`}
          aria-live="polite"
        >
          {total}
        </span>
      </button>

      {patients && compactAfterDone && beat === 'done' ? (
        <details className={styles.report} onClick={(event) => event.stopPropagation()}>
          <summary data-testid={`${testId}-report`}>{HEAL_TEXT.report}</summary>
          {patients}
        </details>
      ) : (
        patients
      )}
    </section>
  );
}

function Patient({
  mon,
  line,
  beat,
  max,
  testId,
}: {
  mon: PartyMon;
  line: HealLine;
  beat: Beat;
  max: number;
  testId: string;
}) {
  const s = getContent().species(mon.speciesId);
  const shown = beat === 'fill' || beat === 'done';
  // Before the machine has run, the HP it had; as the bars fill, what the heal gave; once done, the Pokémon as it is now.
  const hp = beat === 'done' ? mon.hp : shown ? line.to : line.from;
  const gain = line.to - line.from;
  const tip = useTip(
    partyTip(
      s.name,
      mon.level,
      hp,
      max,
      beat === 'done' ? (mon.status?.kind ?? null) : null,
      mon.traumaStacks,
    ),
  );
  return (
    <li
      className={styles.patient}
      tabIndex={0}
      aria-label={HEAL_TEXT.patient(s.name, hp, max, shown ? gain : 0)}
      data-testid={`${testId}-${mon.uid}`}
      {...tip}
    >
      <MonIcon speciesId={s.id} size={40} />
      <span className={`${styles.name} display`}>{s.name}</span>
      <span className={styles.bar}>
        <HpBar hp={hp} maxHp={max} height={8} />
      </span>
      <span className={`${styles.gain} tabular`} aria-hidden={!shown || gain <= 0} data-shown={shown && gain > 0 ? 'true' : undefined}>
        {gain > 0 ? `+${gain}` : ''}
      </span>
      {/* A fainted one back on its feet says so; otherwise a status that came off. */}
      {shown && (line.from <= 0 || line.cured) && (
        <span className={styles.cured}>{line.from <= 0 ? HEAL_TEXT.revived : HEAL_TEXT.cured}</span>
      )}
    </li>
  );
}
