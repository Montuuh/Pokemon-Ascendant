import { useEffect, useRef } from 'react';
import { getContent } from '@/content/registry';
import { IconRepeat, IconUserPlus, IconUsers, IconUsersGroup } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { ALL_TRAINERS, fieldsFor, groupPlanFor, type MapNode, type PartyMon } from '@/sim';
import { FieldChips } from './FieldChips';
import { groupTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import { fallbackBadge, nodeBadge, trainerSprite, itemIcon } from '@/ui/art';
import { groupLabel, NODE_HINT, NODE_LABEL } from '@/ui/strings';
import { MonIcon } from './MonIcon';
import { TypeBadge } from './TypeBadge';
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
  // §5.6.3 — the fight's shape is fixed with the node, so the card can promise it (Pillar 1).
  const run = useRunStore((s) => s.run);
  const plan = run ? groupPlanFor(node, run) : { kind: 'single' as const };
  const fields = run ? fieldsFor(node, run, content) : {};
  const GroupIcon = plan.kind === 'acts-twice' ? IconRepeat : plan.kind === 'caller' ? IconUserPlus : plan.kind === 'pack' || plan.kind === 'trio' ? IconUsersGroup : IconUsers;
  const roster = node.kind === 'trainer' ? (ALL_TRAINERS.find((t) => t.id === node.preview.rosterId) ?? ALL_TRAINERS.find((t) => t.name === node.preview.title)) : undefined;

  useEffect(() => {
    enterRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const hiddenTeam = node.kind === 'trainer' || node.kind === 'elite' || node.kind === 'gym';
  // The Poké Balls below say how many; the line keeps only what they do not (a Gym's telegraph, the Elite's prize).
  const detail = hiddenTeam ? node.preview.detail.replace(/^A team of \d+ Pokémon( · )?/, '') : node.preview.detail;
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
          <img
            className={styles.kindIcon}
            src={nodeBadge(node.preview.icon ?? node.kind)}
            // A biome with no emblem of its own yet (roadmap v1.2) falls back the way the map marker does.
            onError={(e) => {
              const fb = fallbackBadge(node.kind);
              if (!e.currentTarget.src.endsWith(fb)) e.currentTarget.src = fb;
            }}
            alt=""
            width={44}
            height={44}
          />
          <div>
            {NODE_LABEL[node.kind] !== node.preview.title && <p className={styles.kind}>{NODE_LABEL[node.kind]}</p>}
            <h2 className={`${styles.title} display`}>{node.preview.title}</h2>
          </div>
          {roster && <img className={styles.trainer} src={trainerSprite(roster.sprite)} alt="" />}
        </header>

        {detail && <p className={styles.detail}>{detail}</p>}
        <p className={styles.hint}>{NODE_HINT[node.kind]}</p>
        {/* §2.6.1 / §4.3 — the ground it is fought on, promised like the rest. */}
        <FieldChips fields={fields} compact />
        {plan.kind !== 'single' && (
          <Tipped tip={groupTip(plan)} className={styles.group} data-testid="preview-group">
            <GroupIcon size={16} aria-hidden="true" />
            {groupLabel(plan)}
          </Tipped>
        )}

        {/* §2.7 — a trainer's, an Elite's or a Gym's team is a surprise (v0.8.6): one Poké Ball per Pokémon, the way
            the games show a trainer's party. A wild node still shows who could be waiting — that is the choice. */}
        {hiddenTeam && (
          <>
            <h3 className={styles.sectionTitle}>Their team</h3>
            <ul className={styles.balls} data-testid="preview-team-size" aria-label={`${node.preview.enemies?.length ?? 0} Pokémon`}>
              {(node.preview.enemies ?? []).map((_, i) => (
                <li key={i}>
                  <img src={itemIcon('poke-ball')} alt="" width={28} height={28} className={styles.ball} />
                </li>
              ))}
            </ul>
            {/* §2.7.3 — the hint the hidden team leaves: what this kind of trainer usually brings. */}
            {node.preview.usualTypes && node.preview.usualTypes.length > 0 && (
              <p className={styles.usual} data-testid="preview-usual-types">
                Usually brings
                {node.preview.usualTypes.map((t) => (
                  <TypeBadge key={t} type={t} size={16} />
                ))}
              </p>
            )}
          </>
        )}
        {!hiddenTeam && node.preview.speciesIds.length > 0 && (
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
