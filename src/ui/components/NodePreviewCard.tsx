import { useEffect, useRef } from 'react';
import { getContent } from '@/content/registry';
import { ALL_TRAINERS, type MapNode, type PartyMon } from '@/sim';
import { nodeBadge, trainerSprite } from '@/ui/art';
import { NODE_HINT, NODE_LABEL } from '@/ui/strings';
import { MonIcon } from './MonIcon';
import styles from './NodePreviewCard.module.css';

// Per docs/design/ui/screens.md §3.4 — the popover that says what is inside before you commit (Pillar 1).
// Esc cancels, Enter enters. It names the species because a preview that hides the fight is not a preview.

interface Props {
  node: MapNode;
  active: PartyMon[];
  canEnter: boolean;
  blockedReason: string | null;
  onEnter: () => void;
  onCancel: () => void;
}

export function NodePreviewCard({ node, active, canEnter, blockedReason, onEnter, onCancel }: Props) {
  const content = getContent();
  const enterRef = useRef<HTMLButtonElement>(null);
  const roster = node.kind === 'trainer' ? (ALL_TRAINERS.find((t) => t.id === node.preview.rosterId) ?? ALL_TRAINERS.find((t) => t.name === node.preview.title)) : undefined;

  useEffect(() => {
    enterRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className={styles.scrim} onClick={onCancel} role="presentation">
      <div
        className={`${styles.card} fx-pop`}
        role="dialog"
        aria-modal="true"
        aria-label={node.preview.title}
        onClick={(e) => e.stopPropagation()}
        data-testid="node-preview"
      >
        <header className={styles.head}>
          <img className={styles.kindIcon} src={nodeBadge(node.preview.icon ?? node.kind)} alt="" width={44} height={44} />
          <div>
            {NODE_LABEL[node.kind] !== node.preview.title && <p className={styles.kind}>{NODE_LABEL[node.kind]}</p>}
            <h2 className={`${styles.title} display`}>{node.preview.title}</h2>
          </div>
          {roster && <img className={styles.trainer} src={trainerSprite(roster.sprite)} alt="" />}
        </header>

        <p className={styles.detail}>{node.preview.detail}</p>
        <p className={styles.hint}>{NODE_HINT[node.kind]}</p>

        {node.preview.speciesIds.length > 0 && (
          <>
            <h3 className={styles.sectionTitle}>
              {node.kind === 'wild' ? 'Could be waiting' : 'Their team'}
              <span className={styles.band}>
                Lv {node.preview.levelBand[0]}–{node.preview.levelBand[1]}
              </span>
            </h3>
            <ul className={styles.species}>
              {node.preview.speciesIds.map((id, i) => {
                const s = content.species(id);
                return (
                  <li key={`${id}-${i}`}>
                    <MonIcon speciesId={s.id} size={34} />
                    <span>{s.name}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <h3 className={styles.sectionTitle}>{node.kind === 'aid' || node.kind === 'merchant' ? 'Bringing along' : 'Going in with'}</h3>
        <ul className={styles.team} data-testid="preview-team">
          {active.map((m, i) => {
            const s = content.species(m.speciesId);
            return (
              <li key={m.uid} className={i === 0 ? styles.leadSlot : ''}>
                <MonIcon speciesId={s.id} size={30} />
                <span>
                  {s.name} <b className="tabular">Lv {m.level}</b>
                </span>
                {i === 0 && <span className={styles.leadTag}>Lead</span>}
              </li>
            );
          })}
        </ul>
        <p className={styles.lockNote}>The team locks when you enter. Change it on the map first.</p>

        {blockedReason && <p className={styles.blocked}>{blockedReason}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel} data-testid="btn-cancel-node">
            Not yet
          </button>
          <button ref={enterRef} type="button" className={styles.enter} onClick={onEnter} disabled={!canEnter} data-testid="btn-enter-node">
            {node.kind === 'aid' ? 'Rest here' : node.kind === 'merchant' ? 'Browse' : 'Enter'}
          </button>
        </div>
      </div>
    </div>
  );
}
