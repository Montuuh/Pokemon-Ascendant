import { IconAlertTriangle, IconArrowBackUp, IconArrowForwardUp, IconHandGrab, IconLock, IconShieldHalf, IconSparkles, IconSword, IconTargetArrow, IconZzz } from '@tabler/icons-react';
import type { CardPlayability } from '@/sim';
import { portraitOf, typeGlyph } from '@/ui/art';
import { describeMove } from '@/ui/moveText';
import { REJECT_TEXT } from '@/ui/strings';
import { moveTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import styles from './MoveCard.module.css';

interface Props {
  play: CardPlayability;
  selected: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
  index: number;
  total: number;
}

const roleIcon = { offensive: IconSword, defensive: IconShieldHalf, utility: IconSparkles } as const;

/** §4.1.2 — the ×N chip said in words, for the label and the tooltip. */
function effectivenessPhrase(multiplier: number): string {
  if (multiplier === 0) return 'no effect on this target';
  if (multiplier >= 2) return `super effective, ×${multiplier}`;
  return `not very effective, ×${multiplier}`;
}

// Per docs/design/ui/09 — locked move-card anatomy: type-flooded body, owner avatar + range icon + name band,
// art window, effect plate, footer AP dots (left) + power (right). Unplayable cards stay visible (ui rule).
export function MoveCard({ play, selected, onClick, onHover, index, total }: Props) {
  const { move, owner } = play;
  const Role = roleIcon[move.role];
  const Range = move.range === 'melee' ? IconHandGrab : IconTargetArrow;
  const state = play.playable ? 'playable' : play.reason === 'not-enough-ap' ? 'no-ap' : 'locked';
  const classes = [styles.card, styles[state === 'no-ap' ? 'noAp' : state], selected ? styles.selected : ''].filter(Boolean).join(' ');
  // Fan: spread by hand size so 2 cards fan as clearly as 12 (Unity-era ApplyHandFan).
  const mid = (total - 1) / 2;
  const rot = total > 1 ? ((index - mid) / Math.max(1, mid)) * 6 : 0;
  const lift = Math.abs(index - mid) * 4;
  const reasonText = play.reason ? REJECT_TEXT[play.reason] : '';
  // §9.6 / 2026-09-21 — one bubble for the whole card: type, range, cost, power, what it does, what it will
  // do to this target, and why it is locked. It replaced nine native `title`s spread over the card's parts,
  // none of which anyone waited a second for.
  const tip = useTip(moveTip(play));

  return (
    <button
      type="button"
      className={`${classes} fx-card-in`}
      style={{ ['--card-type' as string]: `var(--type-${move.type})`, ['--rot' as string]: `${rot}deg`, ['--lift' as string]: `${lift}px`, animationDelay: `${index * 40}ms` }}
      onClick={onClick}
      {...tip}
      onMouseEnter={(e) => {
        tip.onMouseEnter(e);
        onHover(true);
      }}
      onMouseLeave={(e) => {
        tip.onMouseLeave(e);
        onHover(false);
      }}
      data-testid={`card-${move.id}`}
      data-card-id={play.card.id}
      data-mastery={play.card.mastery || undefined}
      data-state={state === 'no-ap' ? 'no-ap' : state === 'locked' ? (play.reason ?? 'locked') : 'playable'}
      aria-pressed={selected}
      // The card's visible content is icons, dots and a number. Spelled out, it becomes a sentence a screen
      // reader can actually use: who owns it, what it costs, what it does, and why it is greyed out (§9.6).
      aria-label={[
        `${move.name}, ${move.type}`,
        `from ${owner.name}`,
        `${play.apCost} AP`,
        play.damage ? `${play.damage.final} damage` : null,
        // Without this a Grass card into a Bug reads as "3 damage" with no reason, which is the single most
        // confusing number on the screen — for a screen reader it was the *only* thing on the card that
        // explained itself visually (the ×0.25 chip) and not in text.
        play.damage && play.damage.typeMultiplier !== 1 ? effectivenessPhrase(play.damage.typeMultiplier) : null,
        // `describeMove` ends its own sentences, so it joins without another full stop.
        describeMove(play).replace(/\.$/, ''),
        play.playable ? null : `unplayable: ${reasonText}`,
        `card ${index + 1} of ${total}`,
      ]
        .filter(Boolean)
        .join('. ')}
    >
      <span className={styles.mech}>
        <span className={styles.badge}>
          <Role size={12} stroke={2.6} />
        </span>
        {/* §5.13.2 — the Mastery star. A badge like the others, not a new layout. */}
        {play.card.mastery && (
          <span className={`${styles.badge} ${styles.mastery}`} aria-hidden="true">★</span>
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
      {play.damage && play.damage.typeMultiplier !== 1 && (
        <span
          className={`${styles.eff} ${play.damage.typeMultiplier > 1 ? styles.effUp : styles.effDown} display`}
        >
          {play.damage.typeMultiplier === 0 ? '×0' : `×${play.damage.typeMultiplier}`}
        </span>
      )}
      {/* The owner is the art. A shared hand of twelve cards is unreadable if you cannot tell at a glance
          whose card this is, and a 22 px avatar tucked beside the title was not telling anyone. */}
      <span className={styles.art}>
        <img className={styles.portrait} src={portraitOf(owner)} alt="" draggable={false} />
        <span className={styles.typeChip}>
          <img src={typeGlyph(move.type)} alt="" width={20} height={20} />
        </span>
        <span className={`${styles.owner} display`}>{owner.name}</span>
      </span>
      <span className={styles.band}>
        <Range size={13} stroke={2.4} className={styles.rangeIcon} />
        <span className={`${styles.name} display`}>{move.name}</span>
      </span>
      <span className={styles.plate}>{describeMove(play)}</span>
      <span className={styles.footer}>
        <span className={styles.dots}>
          {state === 'no-ap' && <IconAlertTriangle size={13} className={styles.warn} />}
          {Array.from({ length: play.apCost }, (_, i) => (
            <span key={i} className={styles.dot} />
          ))}
          {play.apCost === 0 && <span className={styles.free}>free</span>}
          {play.apCost !== move.apCost && (
            <span className={styles.costNote}>
              ({move.apCost})
            </span>
          )}
        </span>
        <span className={`${styles.power} display tabular`}>
          {play.damage ? play.damage.final : move.power > 0 ? move.power : '—'}
        </span>
      </span>
      {state === 'locked' && (
        <span className={styles.lock}>
          {play.reason === 'owner-asleep' || play.reason === 'owner-frozen' ? <IconZzz size={22} /> : <IconLock size={22} />}
          <span className="display">{play.reason === 'melee-needs-lead' ? 'Melee' : play.reason === 'owner-asleep' ? 'Asleep' : play.reason === 'owner-frozen' ? 'Frozen' : play.reason === 'owner-fainted' ? 'Fainted' : 'Locked'}</span>
          <small>{play.reason === 'melee-needs-lead' ? 'needs Lead' : reasonText}</small>
        </span>
      )}
    </button>
  );
}
