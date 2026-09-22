import { useState } from 'react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { portraitUrl } from '@/content/schemas/species';
import { maxHpOf } from '@/sim';
import { Modal } from './Modal';
import { MonIcon } from './MonIcon';
import { TypeBadge } from './TypeBadge';
import styles from './SwapOrSkip.module.css';

// Per §2.3.1 — the Box is full and a recruit is waiting. Swapping releases permanently, so the choice is
// spelled out and needs a second click. Skipping is always available: no dead end.

export function SwapOrSkip() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [pick, setPick] = useState<string | null>(null);

  const recruit = run.pendingRecruit;
  if (!recruit) return null;
  const species = content.species(recruit.speciesId);

  return (
    <Modal title="The Box is full" testId="swap-or-skip">
      <div className={styles.recruit}>
        <img src={portraitUrl(species.dex, species.id)} alt="" width={96} height={96} />
        <div>
          <h3 className={`${styles.name} display`}>
            {species.name} <span className="tabular">Lv {recruit.level}</span>
          </h3>
          <span className={styles.types}>
            {species.types.map((t) => (
              <TypeBadge key={t} type={t} size={18} />
            ))}
          </span>
          <p className={styles.note}>Release someone to make room, or let this one go.</p>
        </div>
      </div>

      <ul className={styles.box}>
        {run.box.map((mon) => {
          const s = content.species(mon.speciesId);
          const chosen = pick === mon.uid;
          return (
            <li key={mon.uid}>
              <button
                type="button"
                className={`${styles.row} ${chosen ? styles.chosen : ''}`}
                onClick={() => setPick(chosen ? null : mon.uid)}
                data-testid={`release-${s.id}`}
                aria-pressed={chosen}
              >
                <MonIcon speciesId={s.id} size={46} />
                <span className={styles.rowName}>
                  {s.name} <b className="tabular">Lv {mon.level}</b>
                </span>
                <span className={`${styles.rowHp} tabular`}>
                  {mon.hp}/{maxHpOf(mon, content)}
                </span>
                {mon.traumaStacks > 0 && <span className={styles.trauma}>Trauma ×{mon.traumaStacks}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.skip}
          onClick={() => dispatch({ type: 'resolve-recruit', releaseUid: null })}
          data-testid="btn-skip-recruit"
        >
          Let {species.name} go
        </button>
        <button
          type="button"
          className={styles.swap}
          disabled={!pick}
          onClick={() => dispatch({ type: 'resolve-recruit', releaseUid: pick })}
          data-testid="btn-swap-recruit"
        >
          {pick ? `Release ${content.species(run.box.find((m) => m.uid === pick)!.speciesId).name}` : 'Pick who leaves'}
        </button>
      </div>
    </Modal>
  );
}
