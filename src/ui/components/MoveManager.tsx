import { useMemo, useState } from 'react';
import { IconArrowsShuffle, IconLock, IconMinus, IconPlus, IconX } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { autoPickMoves, type PartyMon } from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { tmIcon } from '@/ui/art';
import { ARCHETYPE_LABEL, RUN_REJECT_TEXT } from '@/ui/strings';
import { moveDefTip } from '@/ui/tips';
import { Tip, Tipped } from '@/ui/tooltip';
import styles from './MoveManager.module.css';

// Per docs/design/ui/screens.md §4.4 and §6.7.2 — the Move Manager. Free, unlimited, out of combat.
//
// The pool grows all run; the active 4 never does. That gap is the whole progression system, so this screen
// puts both lists side by side and makes moving a card between them one click, with the budget always on
// screen. Teaching a held TM (§6.4.1) lives here too, because it is the same decision: the pool gets wider
// and the four slots do not.

interface Props {
  uid: string;
  onClose: () => void;
  /** Rendered inside the Dojo, which has its own chrome and its own way out. */
  embedded?: boolean;
}

export function MoveManager({ uid, onClose, embedded = false }: Props) {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [toast, setToast] = useState<string | null>(null);

  const mon = run.box.find((m) => m.uid === uid);

  const tms = useMemo(
    () => run.tms.map((id) => content.tm(id)).filter((tm, i, all) => all.findIndex((t) => t.id === tm.id) === i),
    [run.tms, content],
  );

  if (!mon) return null;
  const species = content.species(mon.speciesId);
  const active = mon.moveIds;
  const benched = mon.pool.filter((m) => !active.includes(m));

  function say(reason: string | undefined) {
    setToast(RUN_REJECT_TEXT[reason ?? ''] ?? 'Not now.');
    window.setTimeout(() => setToast(null), 2400);
  }
  function setMoves(next: string[]) {
    if (!dispatch({ type: 'set-moves', uid, moveIds: next })) say(useRunStore.getState().lastRejected?.reason);
  }

  const row = (moveId: string, inKit: boolean, mon_: PartyMon) => {
    const move = content.move(moveId);
    const full = mon_.moveIds.length >= 4;
    const last = inKit && mon_.moveIds.length === 1;
    const blocked = (!inKit && full) || last;
    return (
      <li key={moveId}>
        <Tipped
          as="button"
          type="button"
          tip={moveDefTip(move)}
          className={`${styles.move} ${inKit ? styles.inKit : ''} ${blocked ? styles.blocked : ''}`}
          onClick={() => setMoves(inKit ? active.filter((m) => m !== moveId) : [...active, moveId])}
          disabled={blocked}
          data-testid={`move-${moveId}`}
          data-in-kit={inKit}
          aria-label={[
            move.name,
            move.type,
            move.role,
            move.range,
            `${move.apCost} AP`,
            move.power > 0 ? `${move.power} power` : 'no damage',
            move.modifier !== 'none' ? move.modifier.replace('-', ' ') : null,
            inKit ? 'in the active 4' : 'in the pool',
            blocked ? (last ? 'cannot remove the last card' : 'the active 4 is full') : inKit ? 'press to bench' : 'press to equip',
          ]
            .filter(Boolean)
            .join(', ')}
        >
          <TypeBadge type={move.type} size={20} />
          <span className={styles.moveBody}>
            <span className={`${styles.moveName} display`}>{move.name}</span>
            <span className={styles.moveMeta}>
              {move.range} · {move.role}
              {move.modifier !== 'none' && ` · ${move.modifier.replace('-', ' ')}`}
              {move.targeting && move.targeting !== 'single' && ` · ${move.targeting}`}
            </span>
          </span>
          <span className={`${styles.stat} tabular`}>{move.power > 0 ? move.power : '—'}</span>
          <span className={`${styles.ap} tabular`}>{move.apCost} AP</span>
          <span className={styles.grab} aria-hidden="true">
            {blocked ? <IconLock size={15} /> : inKit ? <IconMinus size={16} /> : <IconPlus size={16} />}
          </span>
        </Tipped>
      </li>
    );
  };

  const body = (
    <div className={styles.body} data-testid="move-manager">
      <header className={styles.who}>
        <MonIcon speciesId={species.id} size={56} />
        <div>
          <h3 className={`${styles.name} display`}>
            {species.name} <span className="tabular">Lv {mon.level}</span>
          </h3>
          <p className={styles.sub}>
            {mon.archetype ? `${ARCHETYPE_LABEL[mon.archetype]} · ` : ''}
            {mon.abilityId ? content.ability(mon.abilityId).name : 'no passive yet'}
            {mon.abilityId && content.ability(mon.abilityId).hook === 'none' && ' (inert in this build)'}
          </p>
        </div>
        <Tipped
          as="button"
          type="button"
          tip={<Tip title="Auto-pick" body="Keeps the two strongest attacks, always one Ranged card, and fills the rest with the newest moves. The same rule the game uses when you do not choose." />}
          className={styles.auto}
          onClick={() => setMoves(autoPickMoves(mon.pool, content))}
          data-testid="btn-auto-pick"
        >
          <IconArrowsShuffle size={16} /> Auto
        </Tipped>
      </header>

      <section className={styles.column} aria-label="Active 4">
        <h4 className={styles.colTitle}>
          Active 4 <span className={`${styles.count} tabular`}>{active.length}/4</span>
        </h4>
        <ul className={styles.list}>{active.map((m) => row(m, true, mon))}</ul>
        {active.length < 4 && <p className={styles.slotHint}>{4 - active.length} slot{active.length === 3 ? '' : 's'} free.</p>}
      </section>

      <section className={styles.column} aria-label="Learned move pool">
        <h4 className={styles.colTitle}>
          Move pool <span className={`${styles.count} tabular`}>{benched.length}</span>
        </h4>
        {benched.length ? (
          <ul className={styles.list}>{benched.map((m) => row(m, false, mon))}</ul>
        ) : (
          <p className={styles.empty}>Everything it knows is in the deck. Level up, evolve, teach a TM or visit the Dojo.</p>
        )}
      </section>

      {tms.length > 0 && (
        <section className={styles.column} aria-label="TMs">
          <h4 className={styles.colTitle}>TMs in the bag</h4>
          <ul className={styles.list}>
            {tms.map((tm) => {
              const compatible = tm.compatibleSpecies.includes(mon.speciesId);
              const known = mon.pool.includes(tm.move);
              const move = content.move(tm.move);
              return (
                <li key={tm.id}>
                  {/* §6.4.1 — an incompatible target is greyed, never hidden. */}
                  <Tipped
                    as="button"
                    type="button"
                    tip={<Tip icon={<img src={tmIcon(tm.id)} alt="" width={22} height={22} />} title={tm.name} meta={[move.name, move.type.charAt(0).toUpperCase() + move.type.slice(1), `${move.apCost} AP`]} body={tm.description} footer={known ? `${species.name} already knows ${move.name}.` : compatible ? 'Single use. Teaches the move into the pool; put it in the four from there.' : `${tm.name} does not work on ${species.name}.`} />}
                    className={`${styles.move} ${styles.tm} ${!compatible || known ? styles.blocked : ''}`}
                    disabled={!compatible || known}
                    onClick={() => {
                      if (!dispatch({ type: 'use-tm', uid, tmId: tm.id })) say(useRunStore.getState().lastRejected?.reason);
                    }}
                    data-testid={`tm-${tm.id}`}
                  >
                    <img src={tmIcon(tm.id)} alt="" width={22} height={22} />
                    <span className={styles.moveBody}>
                      <span className={`${styles.moveName} display`}>{tm.name}</span>
                      <span className={styles.moveMeta}>
                        {move.name} · {move.type} · {move.apCost} AP
                        {known ? ' · already known' : compatible ? '' : ` · not for ${species.name}`}
                      </span>
                    </span>
                    <span className={styles.grab} aria-hidden="true">
                      {compatible && !known ? <IconPlus size={16} /> : <IconLock size={15} />}
                    </span>
                  </Tipped>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {toast && (
        <p className={styles.toast} role="status" data-testid="move-toast">
          {toast}
        </p>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-label={`${species.name}'s moves`} data-testid="move-manager-overlay">
      <div className={`${styles.panel} fx-pop`}>
        <button type="button" className={styles.close} onClick={onClose} data-testid="btn-close-moves" aria-label="Close the Move Manager">
          <IconX size={20} />
        </button>
        {body}
      </div>
    </div>
  );
}
