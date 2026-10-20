import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { getContent } from '@/content/registry';
import { IconRepeat, IconUserPlus, IconUsers, IconUsersGroup } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { fieldsFor, doubleActorFor, gymById, groupPlanFor, isServiceNode, perfectClearBadge, wildChancesFor, type MapNode, type PartyMon, LEGENDARY_ARENAS, type LegendaryId, leagueMemberOf } from '@/sim';
import { FieldChips } from './FieldChips';
import { RuleChip } from './RuleChip';
import { MetronomeChip } from './MetronomeChip';
import { ObjectiveChip } from './ObjectiveChip';
import { doubleActorTip, groupTip, perfectClearTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import { itemIcon, mysterySign, nodeBadge } from '@/ui/art';
import { kindName, nodeArt, titleSays } from './nodeArt';
import { DOUBLE_ACTOR_LABEL, groupLabel, nodeHint, PREVIEW_TEXT, VICTORY_TEXT, WILD_TEXT, LEAGUE_TEXT, FIND_TEXT } from '@/ui/strings';
import { MonIcon } from './MonIcon';
import { WildPool } from './WildPool';
import { ReelPool } from './FindPrize';
import { Money } from './Money';
import { SupplyStrip } from './SupplyStrip';
import { TypeBadge } from './TypeBadge';
import styles from './NodePreviewCard.module.css';

// Per docs/design/ui/screens.md §3.4 — the popover that says what is inside before you commit (Pillar 1).
// Esc cancels, Enter enters. It names the species because a preview that hides the fight is not a preview.

/** The disc's picture at its own scale: a trainer sprite at 80 px, a Pokémon at a whole multiple of its own size. */
/** The height a Pokémon may stand to in the 72-px disc. */
const DISC_FIT = 64;
const ART_CLASS = { trainer: styles.artTrainer, pokemon: styles.artPokemon, habitat: styles.artHabitat, item: styles.artItem, sign: styles.artSign } as const;

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
  // §5.6.1 — who acts twice is fixed with the node too. A Rare is said on the pool's Rare row: it is true of every
  // wild node from Region 2, so a chip would never tell one node from another.
  const actor = run ? doubleActorFor(node, run) : null;
  const doubled = actor === 'lead' || actor === 'ace' ? actor : null;
  const fields = run ? fieldsFor(node, run, content) : {};
  const GroupIcon =
    plan.kind === 'acts-twice'
      ? IconRepeat
      : plan.kind === 'caller'
        ? IconUserPlus
        : plan.kind === 'pack' || plan.kind === 'trio'
          ? IconUsersGroup
          : IconUsers;
  const art = run ? nodeArt(node, run.map) : { kind: 'sign' as const, src: mysterySign() };
  const [artScale, setArtScale] = useState(1);
  // §5.9.5 — the Gym's own rule, promised on its preview like its field and its team.
  const gymId = node.kind === 'gym' && run && node.lane !== undefined ? run.map.gyms[node.lane] : undefined;
  const gym = gymId ? gymById(gymId) : undefined;
  // §2.12.6 — a Gauntlet won with nobody fainting pays a passed-by Gym's Badge, while the run has one to give.
  const clearBadge = node.kind === 'gauntlet' && run ? perfectClearBadge(run) : null;
  // §2.12.2.1 — the Apex's arena: its rule, and Mew's Metronome, promised as a Gym's rule is.
  const arena = node.kind === 'apex' && node.preview.legendary ? LEGENDARY_ARENAS[node.preview.legendary as LegendaryId] : null;
  const hint = nodeHint(node);

  useEffect(() => {
    enterRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const hiddenTeam = node.kind === 'trainer' || node.kind === 'elite' || node.kind === 'gym' || node.kind === 'gauntlet' || node.kind === 'league';
  // §2.1.6 — a League door names its member's seat, and the Champion's preview promises his signature (§5.12.1).
  const member = node.kind === 'league' ? leagueMemberOf(node) : undefined;
  const kindLabel = member?.title ?? kindName(node);
  // §5.6.5 — a runner or a guarded find: the race it is, named on the card.
  const objective = node.preview.objective;
  // A find is a fight only when it is guarded.
  const fight = !isServiceNode(node.kind) || objective?.kind === 'hold';
  // The Poké Balls below say how many; the line keeps only what they do not (a Gym's telegraph, the Elite's prize).
  const detail = hiddenTeam
    ? node.preview.detail.replace(/^A team of \d+ Pokémon( · )?/, '')
    : node.preview.detail;
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
          {/* §9.3 — the node's own picture, the one the map draws: who or what waits there. */}
          <span className={`${styles.art} ${ART_CLASS[art.kind]}`} aria-hidden="true">
            <img
              className={art.kind === 'item' ? undefined : 'pixel'}
              src={art.src}
              alt=""
              draggable={false}
              style={{ '--scale': artScale } as CSSProperties}
              // D9 — a Pokémon at the largest whole multiple of its own size that fits the disc.
              // A landmark at its own size, or at half (a half multiple) when it is wider or taller than the disc holds.
              onLoad={(e) => {
                const side = Math.max(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
                if (art.kind === 'pokemon') setArtScale(Math.max(1, Math.floor(DISC_FIT / side)));
                if (art.kind === 'habitat') setArtScale(side > DISC_FIT ? 0.5 : 1);
              }}
            />
          </span>
          <div>
            {!titleSays(node.preview.title, kindLabel) && (
              <p className={styles.kind}>{kindLabel}</p>
            )}
            <h2 className={`${styles.title} display`}>{node.preview.title}</h2>
          </div>
        </header>

        {detail && (!node.preview.find || objective) && !node.preview.wild && <p className={styles.detail}>{detail}</p>}
        {hint && <p className={styles.hint}>{hint}</p>}
        {/* §2.6.1 / §4.3 — the ground it is fought on, promised like the rest. */}
        <div className={styles.chipRow}>
          <FieldChips fields={fields} compact />
          {gym && <RuleChip rule={gym.rule} compact />}
          {arena && <RuleChip rule={arena.rule} compact />}
          {member?.title === 'Champion' && <RuleChip rule="synergy" compact />}
          {arena?.metronome && <MetronomeChip compact />}
          {/* §5.6.5 — the map promises the fight's other objective before you commit (Pillar 1). */}
          {objective && <ObjectiveChip kind={objective.kind} turns={objective.turns} objective={objective} compact />}
          {clearBadge && (
            <Tipped tip={perfectClearTip(content.badge(clearBadge).name)} className={styles.clearChip} data-testid="preview-perfect-clear">
              <img src={nodeBadge(`gym-${content.badge(clearBadge).type}`)} alt="" width={16} height={16} />
              {VICTORY_TEXT.perfectClear}
            </Tipped>
          )}
        </div>
        {plan.kind !== 'single' && (
          <Tipped tip={groupTip(plan)} className={styles.group} data-testid="preview-group">
            <GroupIcon size={16} aria-hidden="true" />
            {groupLabel(plan)}
          </Tipped>
        )}
        {doubled && (
          <Tipped tip={doubleActorTip(doubled)} className={styles.group}>
            <IconRepeat size={16} aria-hidden="true" />
            {DOUBLE_ACTOR_LABEL[doubled]}
          </Tipped>
        )}

        {/* §2.7 — a trainer's, an Elite's or a Gym's team is a surprise (v0.8.6): one Poké Ball per Pokémon, the way
            the games show a trainer's party. A wild node shows who lives there instead — that is the choice. */}
        {hiddenTeam && (
          <>
            <h3 className={styles.sectionTitle}>Their team</h3>
            <ul
              className={styles.balls}
              data-testid="preview-team-size"
              aria-label={`${node.preview.enemies?.length ?? 0} Pokémon`}
            >
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
        {/* §2.6.2 — a Wild Area shows everyone who lives there, by rarity, with each rarity's odds (v0.9.7). */}
        {node.preview.wild && (
          <>
            <h3 className={styles.sectionTitle}>
              {WILD_TEXT.pool}
              <span className={styles.band}>
                Lv {node.preview.levelBand[0]}–{node.preview.levelBand[1]}
              </span>
            </h3>
            <WildPool wild={node.preview.wild} odds={(run && wildChancesFor(node, run, content)) || { chances: node.preview.wild.odds, rolls: 1 }} />
          </>
        )}
        {/* A save from before v0.9.7: its Wild Area names the species it offered. */}
        {!hiddenTeam && !node.preview.wild && node.preview.speciesIds.length > 0 && (
          <>
            <h3 className={styles.sectionTitle}>
              {node.kind === 'wild' ? (objective ? 'Waiting there' : 'Could be waiting') : objective?.kind === 'hold' ? 'On guard' : 'Their team'}
              <span className={styles.band}>
                {node.preview.levelBand[0] === node.preview.levelBand[1] ? `Lv ${node.preview.levelBand[0]}` : `Lv ${node.preview.levelBand[0]}–${node.preview.levelBand[1]}`}
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

        {/* §2.9.5 — an item ball: its reel's seven prizes by row, each with its chance, before you choose it. */}
        {node.preview.reel && !objective && (
          <>
            <h3 className={styles.sectionTitle}>{FIND_TEXT.pool}</h3>
            <ReelPool tiles={node.preview.reel} />
          </>
        )}
        {/* §2.9.5 — a find from before the reel, or what a guard stands over: named before you choose it. */}
        {node.preview.find && (!node.preview.reel || objective) && (
          <div className={styles.find} data-testid="preview-find">
            {node.preview.find.items.length > 0 && (
              <SupplyStrip ids={node.preview.find.items} testId="preview-find-items" />
            )}
            {node.preview.find.money > 0 && <Money amount={node.preview.find.money} size={20} />}
          </div>
        )}

        {fight && (
          <>
            <h3 className={styles.sectionTitle}>
              {node.kind === 'aid' || node.kind === 'merchant' ? 'Bringing along' : 'Going in with'}
            </h3>
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
            <p className={styles.lockNote}>{node.kind === 'league' ? LEAGUE_TEXT.lockNote : PREVIEW_TEXT.teamLock}</p>
          </>
        )}

        {blockedReason && <p className={styles.blocked}>{blockedReason}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel} data-testid="btn-cancel-node">
            Not yet
          </button>
          <button
            ref={enterRef}
            type="button"
            className={styles.enter}
            onClick={onEnter}
            disabled={!canEnter}
            data-testid="btn-enter-node"
          >
            {node.kind === 'aid'
              ? 'Rest here'
              : node.kind === 'merchant'
                ? 'Browse'
                : node.kind === 'cache' && !fight
                  ? 'Pick it up'
                  : node.kind === 'trader' || node.kind === 'training'
                    ? 'Stop'
                    : node.kind === 'summit'
                      ? 'Climb'
                  : 'Enter'}
          </button>
        </div>
      </div>
    </div>
  );
}
