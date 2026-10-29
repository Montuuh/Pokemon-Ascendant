import { rhythmActs, rhythmModifier, rhythmSpeed, type BattleConfig, type Combatant } from '@/sim';
import { RHYTHM_TEXT } from '@/ui/strings';
import styles from './RhythmPace.module.css';

/**
 * §4.1.3.1 — the dial tooltip's body: the species' Speed the pace reads (the card's own number has its level in it), what is
 * moving that Speed right now (a stage, Paralysis), and how many acts a full ring takes at that pace. The sim does every sum;
 * this only prints them.
 */
export function RhythmPace({ c, config, side }: { c: Combatant; config: BattleConfig; side: 'ally' | 'foe' }) {
  const stage = c.stages.speed;
  const paralysed = c.status?.kind === 'paralysis';
  return (
    <div className={styles.root} data-testid="rhythm-pace">
      <p className={styles.lead}>{RHYTHM_TEXT.reads(Math.round(rhythmSpeed(c)), c.level)}</p>
      {(stage !== 0 || paralysed) && (
        <ul className={styles.mods}>
          {stage !== 0 && <li data-mod="stage">{RHYTHM_TEXT.stage(stage, rhythmModifier({ ...c, status: null }, config))}</li>}
          {paralysed && <li data-mod="paralysis">{RHYTHM_TEXT.paralysed(config.paralysisSpeedMultiplier)}</li>}
        </ul>
      )}
      <p className={styles.now} data-testid="rhythm-acts">{RHYTHM_TEXT.pace(rhythmActs(c, config), side)}</p>
    </div>
  );
}
