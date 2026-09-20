import { IconCrown, IconAlertTriangle, IconCards } from '@tabler/icons-react';
import { getContent } from '@/content/registry';
import { maxHpOf, xpToNext, type PartyMon } from '@/sim';
import { HpBar } from './HpBar';
import { MonIcon } from './MonIcon';
import { TypeBadge } from './TypeBadge';
import styles from './BoxPanel.module.css';

// Per docs/design/ui/screens.md §2.2 (left column) + §4.1 — the Active Team and the Box in one list.
// Clicking a Box row toggles it in or out of the Active Team; clicking an Active row makes it the Lead.
// The rule lives in the run reducer: this component only asks.

interface Props {
  box: PartyMon[];
  activeUids: string[];
  /** Null while a node is entered — §2.3 locks the loadout on node entry. */
  onToggleActive: ((uid: string) => void) | null;
  onSetLead: ((uid: string) => void) | null;
  /** §6.7.2 — open the Move Manager for this Pokémon. Null hides the affordance entirely. */
  onOpenMoves: ((uid: string) => void) | null;
  capacity: number;
}

export function BoxPanel({ box, activeUids, onToggleActive, onSetLead, onOpenMoves, capacity }: Props) {
  const content = getContent();
  const locked = !onToggleActive;

  const row = (mon: PartyMon, active: boolean, index: number) => {
    const species = content.species(mon.speciesId);
    const max = maxHpOf(mon, content);
    const fainted = mon.hp <= 0;
    const isLead = active && index === 0;
    // §6.7.2 — a move sitting in the pool with no slot is the one thing on this row the player can act on,
    // so it gets a count rather than being invisible until they go looking.
    const waiting = mon.pool.length - mon.moveIds.length;
    return (
      <li key={mon.uid} className={styles.item}>
        <button
          type="button"
          className={`${styles.row} ${active ? styles.active : ''} ${fainted ? styles.fainted : ''} ${isLead ? styles.lead : ''}`}
          onClick={() => (active && index > 0 && onSetLead ? onSetLead(mon.uid) : onToggleActive?.(mon.uid))}
          disabled={locked}
          data-testid={`box-row-${mon.speciesId}`}
          data-active={active}
          aria-label={[
            species.name,
            `level ${mon.level}`,
            fainted ? 'fainted' : `${mon.hp} of ${max} HP`,
            mon.traumaStacks ? `Trauma ${mon.traumaStacks}` : null,
            isLead ? 'Lead' : active ? 'Active' : 'in the Box',
            locked ? 'team locked' : active ? (index > 0 ? 'press to make Lead' : 'press to bench') : 'press to field',
          ]
            .filter(Boolean)
            .join(', ')}
          title={
            locked
              ? 'The team is locked once you enter a node.'
              : active
                ? index > 0
                  ? `Make ${species.name} the Lead`
                  : `${species.name} is the Lead — click a Box row to swap it out`
                : `Put ${species.name} on the Active Team`
          }
        >
          {isLead && (
            <span className={styles.crown} title="Lead">
              <IconCrown size={15} stroke={2.6} />
            </span>
          )}
          <MonIcon speciesId={species.id} size={46} />
          <span className={styles.body}>
            <span className={styles.nameRow}>
              <span className={`${styles.name} display`}>{species.name}</span>
              <span className={`${styles.level} display tabular`}>Lv {mon.level}</span>
            </span>
            <HpBar hp={mon.hp} maxHp={max} height={7} />
            <span className={styles.meta}>
              <span className="tabular">
                {mon.hp}/{max}
              </span>
              <span className={styles.xp} title={`${mon.xp} / ${xpToNext(mon.level)} XP to the next level`}>
                <span className={styles.xpFill} style={{ width: `${Math.min(100, (mon.xp / xpToNext(mon.level)) * 100)}%` }} />
              </span>
            </span>
          </span>
          <span className={styles.badges}>
            {species.types.map((t) => (
              <TypeBadge key={t} type={t} size={18} />
            ))}
            {mon.traumaStacks > 0 && (
              <span className={styles.trauma} title={`Trauma ×${mon.traumaStacks} — lowers Max HP until the run ends`}>
                <IconAlertTriangle size={12} stroke={2.6} />
                {mon.traumaStacks}
              </span>
            )}
          </span>
        </button>
        {onOpenMoves && (
          <button
            type="button"
            className={`${styles.moves} ${waiting > 0 ? styles.movesWaiting : ''}`}
            onClick={() => onOpenMoves(mon.uid)}
            data-testid={`box-moves-${mon.speciesId}`}
            title={
              waiting > 0
                ? `${species.name} knows ${waiting} move${waiting === 1 ? '' : 's'} that are not in its active 4`
                : `Manage ${species.name}'s four cards`
            }
            aria-label={`Manage ${species.name}'s moves${waiting > 0 ? `, ${waiting} waiting in the pool` : ''}`}
          >
            <IconCards size={15} stroke={2.4} />
            {waiting > 0 && <span className={`${styles.movesCount} tabular`}>{waiting}</span>}
          </button>
        )}
      </li>
    );
  };

  const activeMons = activeUids.map((uid) => box.find((m) => m.uid === uid)).filter((m): m is PartyMon => !!m);
  const benched = box.filter((m) => !activeUids.includes(m.uid));

  return (
    <div className={styles.root} data-testid="box-panel">
      <h2 className={styles.heading}>
        Active Team <span className={styles.count}>{activeMons.length}/3</span>
      </h2>
      <ul className={styles.list}>{activeMons.map((m, i) => row(m, true, i))}</ul>
      {activeMons.length === 0 && <p className={styles.empty}>Pick up to three from the Box.</p>}

      <h2 className={styles.heading}>
        Box{' '}
        <span className={styles.count}>
          {box.length}/{capacity}
        </span>
      </h2>
      <ul className={styles.list}>{benched.map((m) => row(m, false, -1))}</ul>
      {benched.length === 0 && <p className={styles.empty}>Everyone you have is out front.</p>}

      {locked && <p className={styles.lockNote}>Locked for this node.</p>}
    </div>
  );
}
