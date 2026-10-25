import type { CombatState } from '@/sim';
import { iconOf } from '@/ui/art';
import { OBJECTIVE_TEXT } from '@/ui/strings';
import { Modal } from './Modal';
import styles from './OutcomeOverlay.module.css';

interface Props {
  state: CombatState;
  onRestart: () => void;
  onExit: () => void;
}

// A practice fixture's summary (the scenario picker's fights): Victory / Defeat / Caught, the fight in numbers, Play again.
// A run fight never shows it — its end is its result screen, on the fight's own stage (§9.4.5, `FightResults`).
export function OutcomeOverlay({ state, onRestart, onExit }: Props) {
  const caught = state.outcome === 'caught';
  const escaped = state.outcome === 'escaped';
  // §5.6.5 — a runner that got away; a hold-out won with the guard still standing.
  const fled = state.outcome === 'fled';
  const won = state.outcome === 'victory' || caught;
  const held = won && state.objective?.kind === 'hold' && state.enemies.some((e) => e.hp > 0);
  const title = caught ? 'Gotcha!' : won ? 'Victory!' : escaped ? 'Got away' : fled ? OBJECTIVE_TEXT.fled(state.enemies[0]?.name ?? 'It') : 'Wiped out…';
  const swaps = state.events.filter((e) => e.t === 'swap' && e.kind === 'manual').length;
  const cardsPlayed = state.events.filter((e) => e.t === 'card-played').length;
  const dmgDealt = state.events.filter((e) => e.t === 'damage' && e.sourceUid?.startsWith('p')).reduce((a, e) => a + (e.t === 'damage' ? e.amount : 0), 0);
  const dmgTaken = state.events.filter((e) => e.t === 'damage' && (e.targetUid.startsWith('p'))).reduce((a, e) => a + (e.t === 'damage' ? e.amount : 0), 0);
  const faints = state.player.team.filter((c) => c.hp <= 0).length;

  return (
    <Modal title={title} tone={won ? 'victory' : 'defeat'} testId="outcome-overlay">
      <p className={styles.sub}>
        {caught
          ? `${state.defeatedEnemies.at(-1)?.name} is caught. A catch counts as a full Victory.`
          : held
            ? OBJECTIVE_TEXT.heldBody
          : fled
            ? OBJECTIVE_TEXT.fledBody
          : won
            ? `${state.trainer ? state.trainer.name : 'The wild Pokémon'} ${state.trainer ? 'is out of usable Pokémon' : 'fainted'}.`
            : escaped
              ? 'No XP, no drop.'
              : 'Every faint leaves a Trauma stack. Rethink the Lead, try again.'}
      </p>
      <div className={styles.team}>
        {state.player.team.map((c) => (
          <div key={c.uid} className={`${styles.member} ${c.hp <= 0 ? styles.fainted : ''}`}>
            <img className="pixel" src={iconOf(c)} alt="" width={40} height={32} />
            <span className={`display tabular ${styles.hp}`}>
              {c.hp}/{c.maxHp}
            </span>
          </div>
        ))}
      </div>
      <dl className={styles.stats}>
        <div>
          <dt>Turns</dt>
          <dd className="display tabular">{state.turn}</dd>
        </div>
        <div>
          <dt>Cards played</dt>
          <dd className="display tabular">{cardsPlayed}</dd>
        </div>
        <div>
          <dt>Manual swaps</dt>
          <dd className="display tabular">{swaps}</dd>
        </div>
        <div>
          <dt>Damage dealt</dt>
          <dd className="display tabular">{dmgDealt}</dd>
        </div>
        <div>
          <dt>Damage taken</dt>
          <dd className="display tabular">{dmgTaken}</dd>
        </div>
        <div>
          <dt>Faints</dt>
          <dd className="display tabular">{faints}</dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onRestart} data-testid="btn-restart">
          Play again
        </button>
        <button type="button" className={styles.secondary} onClick={onExit} data-testid="btn-exit">
          Scenarios
        </button>
      </div>
    </Modal>
  );
}
