import type { CombatState } from '@/sim';
import { iconOf, itemIcon } from '@/ui/art';
import { trainerPartyTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './TrainerParty.module.css';

/**
 * §2.7.3 / §9.2.1 — the rival trainer's whole team, in one row under the trainer (v0.9.16): the ones you have beaten
 * greyed and struck, the ones on the field by their icon, and the ones still to come as closed Poké Balls — who they
 * are stays a surprise until they come out (§2.7.3). The count is the series' own: the balls by the trainer's side.
 */
export function TrainerParty({ state }: { state: CombatState }) {
  if (!state.trainer) return null;
  const fainted = state.defeatedEnemies;
  const field = state.enemies;
  const toCome = state.enemyQueue;
  return (
    <Tipped
      as="div"
      tip={trainerPartyTip(state.trainer.name, field.length, fainted.length, toCome.length)}
      className={styles.party}
      role="group"
      aria-label={`${state.trainer.name}'s team: ${field.length} on the field, ${fainted.length} beaten, ${toCome.length} still to come`}
      data-testid="trainer-party"
    >
      {fainted.map((e) => (
        <span key={e.uid} className={`${styles.slot} ${styles.beaten}`} data-state="beaten">
          <img className="pixel" src={iconOf(e)} alt="" draggable={false} />
        </span>
      ))}
      {field.map((e) => (
        <span key={e.uid} className={`${styles.slot} ${styles.field}`} data-state="field">
          <img className="pixel" src={iconOf(e)} alt="" draggable={false} />
        </span>
      ))}
      {toCome.map((e) => (
        <span key={e.uid} className={`${styles.slot} ${styles.ball}`} data-state="ball">
          <img src={itemIcon('poke-ball')} alt="" draggable={false} />
        </span>
      ))}
    </Tipped>
  );
}
