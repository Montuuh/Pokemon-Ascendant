import { IconCrown } from '@tabler/icons-react';
import type { CSSProperties, ReactNode } from 'react';
import type { PokemonType } from '@/sim';
import { spriteOf } from '@/ui/art';
import { ArenaSprite } from '@/ui/components/ArenaSprite';
import { HpBar } from '@/ui/components/HpBar';
import { ShinyMark } from '@/ui/components/ShinyMark';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { UnitChips } from '@/ui/components/UnitChips';
import card from '@/ui/components/UnitCard.module.css';
import { UNIT_BADGE, UNIT_HP_BAR } from '@/ui/components/unitCard';
import { traumaTip } from '@/ui/tips';
import { RESULT_TEXT, UNIT_CHIPS_TEXT } from '@/ui/strings';
import { Tipped } from '@/ui/tooltip';
import styles from './ResultUnit.module.css';

interface Props {
  side: 'ours' | 'foe';
  speciesId: string;
  name: string;
  types: readonly PokemonType[];
  shiny?: boolean;
  level: number;
  /** The level tag lit: it grew in this fight. Its door (`levelTip`) says by how much. */
  grew?: boolean;
  levelTip?: ReactNode;
  tag: string;
  lead?: boolean;
  hp?: { now: number; max: number } | null;
  /** The XP bar: what it had (`was`), where it stands now (`fill`), both as shares of the level's bar. */
  xp?: { was: number; fill: number; gain: number; tip: ReactNode } | null;
  /** Trauma stacks, as the fight's card shows them. */
  trauma?: number;
  /** Down: greyed, as on the field. */
  fainted?: boolean;
  /** A beaten foe left standing as a ghost of itself; one that is still there, faded; a catch, new. */
  look?: 'ghost' | 'faded' | 'new';
  /** Its level-up panel is standing (beside the Lead's card): this card glows, so the panel reads as its news. */
  levelling?: boolean;
  testId?: string;
}

/**
 * §9.4.5 — a Pokémon on the result screen, in the fight card's anatomy (UnitCard.module.css): the place on its top edge,
 * types, name and level on the head, the sprite in its type-lit window — yours turned to face you — its HP, and under it
 * the XP bar. What the levels gave is not on the card: it is the panel beside it, then the level tag's door.
 */
export function ResultUnit({ side, speciesId, name, types, shiny, level, grew, levelTip, tag, lead, hp, xp, trauma = 0, fainted, look, levelling, testId }: Props) {
  const classes = [card.card, styles.unit, lead ? (side === 'ours' ? styles.lead : styles.foeLead) : styles.bench, fainted ? styles.fainted : '', look ? styles[look] : '', levelling ? styles.levelling : ''].filter(Boolean).join(' ');
  const levelTag = <span className={`${card.level} ${grew ? styles.grew : ''}`}>Lv {level}</span>;
  return (
    <div className={classes} style={{ '--unit-type': `var(--type-${types[0] ?? 'normal'})` } as CSSProperties} data-testid={testId} data-level={level}>
      <span className={`${card.tag} ${lead ? (side === 'ours' ? styles.leadTag : styles.foeTag) : ''} ${look === 'new' ? styles.newTag : ''}`}>
        {lead && side === 'ours' && <IconCrown size={12} stroke={2.6} />}
        {tag}
      </span>
      <span className={card.head}>
        <span className={card.types}>
          {types.map((t) => (
            <TypeBadge key={t} type={t} size={UNIT_BADGE} defenderTypes={types} />
          ))}
        </span>
        <span className={`${card.name} display`}>{name}</span>
        {shiny && <ShinyMark name={name} size={12} plain />}
        {levelTip ? (
          <Tipped tip={levelTip} tabIndex={0} data-testid={`levelup-${speciesId}`}>
            {levelTag}
          </Tipped>
        ) : (
          levelTag
        )}
      </span>
      <span className={card.window}>
        <span className={card.stand}>
          <span className={`${card.sprite} ${side === 'ours' ? styles.facing : ''}`}>
            <ArenaSprite src={spriteOf({ speciesId }, 'front', !!shiny)} shiny={!!shiny} imgClassName={look === 'ghost' ? undefined : card.breathe} />
          </span>
        </span>
        <UnitChips
          chips={trauma > 0 ? [{ key: 'trauma', label: `Trauma ×${trauma}`, explain: UNIT_CHIPS_TEXT.traumaBody, node: <Tipped tip={traumaTip(trauma, hp?.max ?? 0)} className={`${card.chip} ${card.warn}`}>Trauma ×{trauma}</Tipped> }] : []}
        />
      </span>
      {hp && (
        <>
          <HpBar hp={hp.now} maxHp={hp.max} height={UNIT_HP_BAR} />
          <span className={card.hpRow}>
            <span className={`${card.hpText} display tabular`} data-testid={testId ? `${testId}-hp` : undefined}>
              {hp.now <= 0 ? RESULT_TEXT.fainted : `${hp.now} / ${hp.max}`}
            </span>
          </span>
        </>
      )}
      {xp && (
        <Tipped as="span" tip={xp.tip} className={styles.xpRow} data-testid={testId ? `${testId}-xp` : undefined}>
          <span className={styles.xpLabel}>XP</span>
          <span className={styles.xpTrack} aria-hidden="true">
            <span className={styles.xpWas} style={{ width: `${Math.min(xp.was, xp.fill) * 100}%` }} />
            <span className={styles.xpGain} style={{ left: `${Math.min(xp.was, xp.fill) * 100}%`, width: `${Math.max(0, xp.fill - xp.was) * 100}%` }} />
          </span>
          <span className={`${styles.xpPlus} tabular`}>+{xp.gain}</span>
        </Tipped>
      )}
    </div>
  );
}
