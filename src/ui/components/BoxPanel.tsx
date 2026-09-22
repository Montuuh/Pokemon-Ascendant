import { IconCrown, IconAlertTriangle, IconCards } from '@tabler/icons-react';
import { getContent } from '@/content/registry';
import { maxHpOf, xpToNext, type PartyMon } from '@/sim';
import { HpBar } from './HpBar';
import { MonIcon } from './MonIcon';
import { TypeBadge } from './TypeBadge';
import { traumaTip } from '@/ui/tips';
import { Tip, Tipped, useTip } from '@/ui/tooltip';
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

function BoxRow({ mon, active, index, locked, onToggleActive, onSetLead, onOpenMoves }: { mon: PartyMon; active: boolean; index: number; locked: boolean; onToggleActive: Props['onToggleActive']; onSetLead: Props['onSetLead']; onOpenMoves: Props['onOpenMoves'] }) {
  const content = getContent();
  const species = content.species(mon.speciesId);
  const max = maxHpOf(mon, content);
  const fainted = mon.hp <= 0;
  const isLead = active && index === 0;
  // §6.7.2 — a move sitting in the pool with no slot is the one thing on this row the player can act on,
  // so it gets a count rather than being invisible until they go looking.
  const waiting = mon.pool.length - mon.moveIds.length;
  const ability = mon.abilityId ? content.ability(mon.abilityId) : null;
  const held = mon.heldItem ? content.heldItem(mon.heldItem) : null;
  // The row's bubble is the Pokémon: ability, item, what clicking does. It replaced three native titles.
  const movesTip = useTip(<Tip title="Move Manager" meta={[`${mon.pool.length} known`, `${mon.moveIds.length} active`]} body={waiting > 0 ? `${species.name} knows ${waiting} move${waiting === 1 ? '' : 's'} that ${waiting === 1 ? 'is' : 'are'} not in its four cards.` : `Choose which four of ${species.name}'s moves go in the deck.`} footer="A Pokémon's four active moves are its four cards. The pool never shrinks." />);
  const rowTip = useTip(
    <Tip
      title={species.name}
      meta={[`Lv ${mon.level}`, ...species.types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)), isLead ? 'Lead' : active ? 'Active' : 'In the Box']}
      body={
        <>
          {ability && <div><b>{ability.name}</b> — {ability.description}</div>}
          {held && <div><b>{held.name}</b> — {held.description}</div>}
          {mon.archetype && <div>Evolved as a <b>{mon.archetype}</b>.</div>}
        </>
      }
      footer={locked ? 'The team is locked once you enter a node.' : active ? (index > 0 ? 'Click to make it the Lead.' : 'Click a Box row to swap it out.') : 'Click to put it on the Active Team.'}
    />,
  );
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
        {...rowTip}
      >
        {isLead && (
          <span className={styles.crown}>
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
            <Tipped tip={<Tip title={`${mon.xp} / ${xpToNext(mon.level)} XP`} body="To the next level. Every Pokémon on the Active Team earns XP from a fight; the bench earns a share too." />} className={styles.xp}>
              <span className={styles.xpFill} style={{ width: `${Math.min(100, (mon.xp / xpToNext(mon.level)) * 100)}%` }} />
            </Tipped>
          </span>
        </span>
        <span className={styles.badges}>
          {species.types.map((t) => (
            <TypeBadge key={t} type={t} size={12} />
          ))}
          {mon.traumaStacks > 0 && (
            <Tipped tip={traumaTip(mon.traumaStacks, max)} className={styles.trauma}>
              <IconAlertTriangle size={12} stroke={2.6} />
              {mon.traumaStacks}
            </Tipped>
          )}
        </span>
      </button>
      {onOpenMoves && (
        <button
          type="button"
          className={`${styles.moves} ${waiting > 0 ? styles.movesWaiting : ''}`}
          onClick={() => onOpenMoves(mon.uid)}
          data-testid={`box-moves-${mon.speciesId}`}
          {...movesTip}
          aria-label={`Manage ${species.name}'s moves${waiting > 0 ? `, ${waiting} waiting in the pool` : ''}`}
        >
          <IconCards size={15} stroke={2.4} />
          {waiting > 0 && <span className={`${styles.movesCount} tabular`}>{waiting}</span>}
        </button>
      )}
    </li>
  );
}

export function BoxPanel({ box, activeUids, onToggleActive, onSetLead, onOpenMoves, capacity }: Props) {
  const locked = !onToggleActive;

  const activeMons = activeUids.map((uid) => box.find((m) => m.uid === uid)).filter((m): m is PartyMon => !!m);
  const benched = box.filter((m) => !activeUids.includes(m.uid));

  return (
    <div className={styles.root} data-testid="box-panel">
      <h2 className={styles.heading}>
        Active Team <span className={styles.count}>{activeMons.length}/3</span>
      </h2>
      <ul className={styles.list}>
        {activeMons.map((m, i) => (
          <BoxRow key={m.uid} mon={m} active index={i} locked={locked} onToggleActive={onToggleActive} onSetLead={onSetLead} onOpenMoves={onOpenMoves} />
        ))}
      </ul>
      {activeMons.length === 0 && <p className={styles.empty}>Pick up to three from the Box.</p>}

      <h2 className={styles.heading}>
        Box{' '}
        <span className={styles.count}>
          {box.length}/{capacity}
        </span>
      </h2>
      <ul className={styles.list}>
        {benched.map((m) => (
          <BoxRow key={m.uid} mon={m} active={false} index={-1} locked={locked} onToggleActive={onToggleActive} onSetLead={onSetLead} onOpenMoves={onOpenMoves} />
        ))}
      </ul>
      {benched.length === 0 && <p className={styles.empty}>Everyone you have is out front.</p>}

      {locked && <p className={styles.lockNote}>Locked for this node.</p>}
    </div>
  );
}
