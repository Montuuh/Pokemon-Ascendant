import type { CombatState } from '@/sim';
import { iconOf } from '@/ui/art';
import { Modal } from './Modal';
import styles from './OutcomeOverlay.module.css';

interface Props {
  state: CombatState;
  onRestart: () => void;
  onExit: () => void;
  /** Inside a run the fight has consequences, so there is one way out: carry the result back (§2.4). */
  runMode?: boolean;
}

// Victory / Defeat / Caught summary (docs/design/ui/03 §3.8–3.9 tone: warm, never punishing).
export function OutcomeOverlay({ state, onRestart, onExit, runMode = false }: Props) {
  const caught = state.outcome === 'caught';
  const escaped = state.outcome === 'escaped';
  const won = state.outcome === 'victory' || caught;
  const title = caught ? 'Gotcha!' : won ? 'Victory!' : escaped ? 'Got away' : 'Wiped out…';
  const swaps = state.events.filter((e) => e.t === 'swap' && e.kind === 'manual').length;
  const cardsPlayed = state.events.filter((e) => e.t === 'card-played').length;
  const dmgDealt = state.events.filter((e) => e.t === 'damage' && e.sourceUid?.startsWith('p')).reduce((a, e) => a + (e.t === 'damage' ? e.amount : 0), 0);
  const dmgTaken = state.events.filter((e) => e.t === 'damage' && (e.targetUid.startsWith('p'))).reduce((a, e) => a + (e.t === 'damage' ? e.amount : 0), 0);
  const faints = state.player.team.filter((c) => c.hp <= 0).length;

  return (
    <Modal title={title} tone={won ? 'victory' : 'defeat'} testId="outcome-overlay">
      <p className={styles.sub}>
        {caught
          ? `${state.defeatedEnemies.at(-1)?.name} joins the Box. A catch counts as a full Victory.`
          : won
            ? `${state.trainer ? state.trainer.name : 'The wild Pokémon'} ${state.trainer ? 'is out of usable Pokémon' : 'fainted'}.`
            : escaped
              ? 'No XP, no drop. The toll comes off on the map: money, Trauma, and for the bigger fights something from the bag.'
              : 'Every faint leaves a Trauma stack. Rest, rethink the Lead, try again.'}
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
        {runMode ? (
          <button type="button" className={styles.primary} onClick={onExit} data-testid="btn-continue-run">
            {won || escaped ? 'Continue' : 'See how far you got'}
          </button>
        ) : (
          <>
            <button type="button" className={styles.primary} onClick={onRestart} data-testid="btn-restart">
              Play again
            </button>
            <button type="button" className={styles.secondary} onClick={onExit} data-testid="btn-exit">
              Scenarios
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
