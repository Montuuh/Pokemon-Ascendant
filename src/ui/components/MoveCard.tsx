import { IconAlertTriangle, IconArrowBackUp, IconArrowForwardUp, IconHandGrab, IconLock, IconShield, IconSparkles, IconSwords, IconTargetArrow, IconZzz } from '@tabler/icons-react';
import type { CardPlayability } from '@/sim';
import { iconOf, moveArt } from '@/ui/art';
import { TypeLabel } from './TypeBadge';
import { describeMove } from '@/ui/moveText';
import { LOCK_LABEL, REJECT_TEXT, NO_AP_LABEL } from '@/ui/strings';
import { moveTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import styles from './MoveCard.module.css';

interface Props {
  play: CardPlayability;
  selected: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
  /** §5.6 — the press that may become a drag onto a target. */
  onPointerDown?: (e: React.PointerEvent) => void;
  index: number;
  total: number;
  /** Layout only: how far each card after the first tucks under its neighbour, so a big hand fits its row. */
  overlap?: number;
  /** §5.6 — this card is the one being dragged: it waits in the hand, faded, while its copy travels. */
  lifted?: boolean;
  /** §5.6 — the copy that travels under the pointer: not a control, not in the hand's fan. */
  ghost?: boolean;
}

/** §4.1.2 — the ×N chip said in words, for the label. */
function effectivenessPhrase(multiplier: number): string {
  if (multiplier === 0) return 'no effect';
  if (multiplier >= 2) return `super effective, ×${multiplier}`;
  return `not very effective, ×${multiplier}`;
}

// The role's glyphs are the card's own: the TypeChart's sword and half-shield mean "when it hits / is hit".
const roleIcon = { offensive: IconSwords, defensive: IconShield, utility: IconSparkles } as const;

// §9.2.3 — the move card. The head says what it costs and what it is; the window shows the move itself — its pixel
// illustration on its type's ground — with its owner's sprite in the corner, so a hand of five from three Pokémon
// reads as five moves and three owners; the plate says what it does; the foot its range, role, power and type.
// Unplayable cards stay visible and keep their words at full ink: the lock is a band on the window (ui rule, D5).
export function MoveCard({ play, selected, onClick, onHover, onPointerDown, index, total, overlap = 0, lifted, ghost }: Props) {
  const { move, owner } = play;
  const Role = roleIcon[move.role];
  const Range = move.range === 'melee' ? IconHandGrab : IconTargetArrow;
  const state = play.playable ? 'playable' : play.reason === 'not-enough-ap' ? 'no-ap' : 'locked';
  const classes = [styles.card, styles[state === 'no-ap' ? 'noAp' : state], selected ? styles.selected : '', lifted ? styles.lifted : '', ghost ? styles.ghost : ''].filter(Boolean).join(' ');
  // Fan: spread by hand size so 2 cards fan as clearly as 12 (Unity-era ApplyHandFan).
  const mid = (total - 1) / 2;
  const rot = total > 1 ? ((index - mid) / Math.max(1, mid)) * 6 : 0;
  const lift = Math.abs(index - mid) * 3;
  const reasonText = play.reason ? REJECT_TEXT[play.reason] : '';
  // §9.6 / 2026-09-21 — one bubble for the whole card: type, range, role, cost, power, what it does, what it will
  // do to this target, and why it is locked.
  const tip = useTip(moveTip(play));
  // §9.2.3 / §5.6 — the foot prints the move's power, never one enemy's number: each enemy's number is on its
  // panel while the card is held. The ×N chip keeps the hand comparable at a glance, against the enemy Lead.
  const lead = play.damage;
  const costChanged = play.apCost !== move.apCost;
  const lockLabel = play.reason ? LOCK_LABEL[play.reason] : undefined;

  return (
    <button
      type="button"
      className={ghost ? classes : `${classes} fx-card-in`}
      tabIndex={ghost ? -1 : undefined}
      aria-hidden={ghost || undefined}
      style={{ ['--card-type' as string]: `var(--type-${move.type})`, ['--rot' as string]: `${rot}deg`, ['--lift' as string]: `${lift}px`, marginLeft: index > 0 && overlap ? -overlap : undefined, animationDelay: `${index * 40}ms` }}
      onClick={onClick}
      onPointerDown={(e) => {
        // A press may become a drag: the card's bubble closes, or it would stay open over the field.
        tip.onMouseLeave(e);
        onPointerDown?.(e);
      }}
      {...tip}
      onMouseEnter={(e) => {
        tip.onMouseEnter(e);
        onHover(true);
      }}
      onMouseLeave={(e) => {
        tip.onMouseLeave(e);
        onHover(false);
      }}
      data-testid={ghost ? 'drag-ghost-card' : `card-${move.id}`}
      data-card-id={play.card.id}
      data-mastery={play.card.mastery || undefined}
      data-state={state === 'no-ap' ? 'no-ap' : state === 'locked' ? (play.reason ?? 'locked') : 'playable'}
      aria-pressed={selected}
      // The card's visible content is icons, a picture and numbers. Spelled out, it becomes a sentence a screen
      // reader can actually use: who owns it, what it costs, what it does, and why it is greyed out (§9.6).
      aria-label={[
        `${move.name}, ${move.type}`,
        `from ${owner.name}`,
        `${play.apCost} AP`,
        move.power > 0 ? `${move.power} power${play.hitsAll ? ', hits every enemy' : ''}` : null,
        lead && lead.typeMultiplier !== 1 ? `${effectivenessPhrase(lead.typeMultiplier)} on the enemy Lead` : null,
        describeMove(play).replace(/\.$/, ''),
        play.playable ? null : `unplayable: ${reasonText.replace(/\.$/, '')}`,
        `card ${index + 1} of ${total}`,
      ]
        .filter(Boolean)
        .join('. ')}
    >
      {/* Not enough AP: said on the card's top edge, over the hand, where the eye is when it reaches for it. */}
      {state === 'no-ap' && (
        <span className={styles.apShort} data-testid="card-no-ap">
          <IconAlertTriangle size={12} stroke={2.6} />
          {NO_AP_LABEL}
        </span>
      )}
      <span className={styles.head}>
        {/* The cost as a gem: what this card costs now. A cost changed today (Paralysis, a rule) wears a warning ring. */}
        <span className={`${styles.cost} display tabular`} data-changed={costChanged || undefined}>
          {play.apCost}
        </span>
        <span className={`${styles.name} display`}>{move.name}</span>
      </span>

      <span className={styles.art}>
        <img className={`${styles.moveArt} pixel`} src={moveArt(move.id)} alt="" draggable={false} onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
        {/* The owner's box icon at 1× (D9), its empty margin cropped away: the Pokémon is the middle of a 68×56 tile. */}
        <span className={styles.owner}>
          <img className="pixel" src={iconOf(owner)} alt="" draggable={false} />
        </span>
        {/* §4.1.2 — how the move's type lands on the enemy Lead: ×2 up, ×0.5 down. */}
        {lead && lead.typeMultiplier !== 1 && (
          <span className={`${styles.eff} ${lead.typeMultiplier > 1 ? styles.effUp : styles.effDown} display`}>
            {lead.typeMultiplier === 0 ? '×0' : `×${lead.typeMultiplier}`}
          </span>
        )}
        {/* §5.13.2 — the Mastery star, and a Step-Forward or Step-Backward card's arrow, on the window's corner. */}
        <span className={styles.mech}>
          {play.card.mastery && (
            <span className={`${styles.badge} ${styles.mastery}`} aria-hidden="true">
              ★
            </span>
          )}
          {move.modifier === 'step-forward' && (
            <span className={`${styles.badge} ${styles.mod}`}>
              <IconArrowForwardUp size={12} stroke={2.6} />
            </span>
          )}
          {move.modifier === 'step-backward' && (
            <span className={`${styles.badge} ${styles.mod}`}>
              <IconArrowBackUp size={12} stroke={2.6} />
            </span>
          )}
        </span>
        {state === 'locked' && (
          <span className={styles.lock}>
            {play.reason === 'owner-asleep' || play.reason === 'owner-frozen' ? <IconZzz size={16} /> : <IconLock size={16} />}
            <span className={styles.lockText}>
              <b className="display">{lockLabel?.title ?? 'Locked'}</b>
              <small>{lockLabel?.sub ?? reasonText}</small>
            </span>
          </span>
        )}
      </span>

      <span className={styles.plate}>{describeMove(play)}</span>

      <span className={styles.foot}>
        <Range size={14} stroke={2.4} className={styles.footIcon} />
        <Role size={14} stroke={2.4} className={styles.footIcon} />
        {state === 'no-ap' && <IconAlertTriangle size={14} className={styles.warn} />}
        {costChanged && <span className={styles.costNote}>was {move.apCost}</span>}
        <span className={`${move.power > 0 ? styles.power : styles.noPower} display tabular`}>{move.power > 0 ? move.power : '—'}</span>
        <TypeLabel type={move.type} size={12} className={styles.typeLabel} />
      </span>
    </button>
  );
}
