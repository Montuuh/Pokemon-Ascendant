import type { CombatState } from '@/sim';
import { itemIcon } from '@/ui/art';
import { trainerPartyTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './TrainerParty.module.css';

/**
 * §2.7.3 / §9.2.1 — the rival trainer's whole team, at the trainer's feet: one small Poké Ball per Pokémon — the game's own ball — the series'
 * own count by the trainer's side (v0.9.16) — beaten ones grey and struck, the ones on the field lit and ringed, the ones
 * still to come plain. Who they are stays a surprise until they come out (§2.7.3); the bubble gives the counts.
 */
export function TrainerParty({ state }: { state: CombatState }) {
  if (!state.trainer) return null;
  const beaten = state.defeatedEnemies.length;
  const field = state.enemies.length;
  const toCome = state.enemyQueue.length;
  const balls = [...Array<'beaten'>(beaten).fill('beaten'), ...Array<'field'>(field).fill('field'), ...Array<'ball'>(toCome).fill('ball')];
  return (
    <Tipped
      as="div"
      tip={trainerPartyTip(state.trainer.name, field, beaten, toCome)}
      className={styles.party}
      role="group"
      aria-label={`${state.trainer.name}'s team: ${field} on the field, ${beaten} beaten, ${toCome} still to come`}
      data-testid="trainer-party"
    >
      {balls.map((b, i) => (
        <img key={i} className={`${styles.ball} ${b === 'ball' ? '' : styles[b]}`} src={itemIcon('poke-ball')} alt="" draggable={false} data-state={b} />
      ))}
    </Tipped>
  );
}
