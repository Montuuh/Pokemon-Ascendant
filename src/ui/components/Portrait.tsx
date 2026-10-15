import { IconCrown } from '@tabler/icons-react';
import type { Combatant, SlotId } from '@/sim';
import { spriteOf } from '@/ui/art';
import type { SpriteSlot } from '@/ui/hooks/useCombatFx';
import { ArenaSprite } from './ArenaSprite';
import { FloatingNumbers, type FloatingFx } from './FloatingNumbers';
import { HpBar } from './HpBar';
import { StatusBadge, TypeBadge } from './TypeBadge';
import { ShinyMark } from './ShinyMark';
import { combatantTip, traumaTip } from '@/ui/tips';
import { Tipped, useTip } from '@/ui/tooltip';
import styles from './Portrait.module.css';

type Variant = 'lead' | 'bench';

interface Props {
  /** §9.9.1 — its faint has not played yet (`useCombatFx`): drawn standing until the beat. */
  faintPending?: boolean;
  mon: Combatant;
  variant: Variant;
  slotLabel: string;
  /** §5.2 — the slot it stands in: where an enemy's intent arrow lands. */
  slotId: SlotId;
  /** §9.9 — the FX anchor this sprite is (the Lead's is `player`: balls, ghosts and hits land on it). */
  fxSlot?: SpriteSlot;
  /** §9.9.1 — the sprite's own beat: hidden in its ball, being sent out. */
  spriteClass?: string;
  swapCost?: number;
  swapAllowed?: boolean;
  swapHint?: string;
  /** The intent is aimed at this slot. */
  targeted?: boolean;
  /** Selection mode wants a click here (step-back destination / consumable target). */
  selectable?: boolean;
  onClick?: () => void;
  fx: FloatingFx[];
  fxClass?: string;
  /**
   * §9.2.5 — every hit coming at this Pokémon this turn, as the dry-run Resolution prints it: one number per
   * enemy, never one figure for an area hit. `icon` names the source when a group is on the field.
   */
  incoming?: { key: string; enemyUid: string; amount: number; icon?: string; name: string; move: string }[];
  /** The hits above add up to a knockout. */
  incomingKo?: boolean;
  /** §9.2.5 — a bench Pokémon: what it would take this turn as the Lead (v0.8.6). */
  asLead?: { amount: number; ko: boolean } | null;
}

// §9.2.1 / §9.2.2.2 — one of your Pokémon on the field: its animated battle sprite where it stands in the formation,
// and its plate attached under it — the slot tag (and the Lead's crown), types, name, level, status, HP, the swap price
// on a bench, and the hits coming at it. The whole unit is one button: a swap, an ally target, a step-back choice.
// Intent targets light the slot, never the Pokémon (§5.2).
export function Portrait({ mon, variant, slotLabel, slotId, fxSlot, spriteClass, swapCost, swapAllowed, swapHint, targeted, selectable, onClick, fx, fxClass, incoming, incomingKo, asLead, faintPending }: Props) {
  // §9.9.1 — at 0 HP but its faint still to play: it stands through the hits on screen first.
  const fainted = mon.hp <= 0 && !faintPending;
  const classes = [styles.unit, styles[variant], targeted ? styles.targeted : '', selectable ? styles.selectable : '', fainted ? styles.fainted : ''].filter(Boolean).join(' ');
  const stageChips = (['attack', 'defense'] as const).filter((s) => mon.stages[s] !== 0);
  // 2026-09-21 — the unit's bubble is the Pokémon's summary: types, ability, held item, status, Trauma, and its role
  // right now (Lead, or what a swap costs).
  const hits = !fainted && incoming?.length ? incoming : null;
  const tip = useTip(combatantTip(mon, { isLead: variant === 'lead', ...(swapCost !== undefined && !fainted ? { swapCost } : {}), ...(hits ? { incoming: hits, incomingKo: !!incomingKo } : {}), ...(asLead && !fainted ? { asLead } : {}) }));
  const incomingText = hits ? `; incoming: ${hits.map((h) => `${h.amount} from ${h.name}'s ${h.move}`).join(', ')}${incomingKo ? ', a knockout' : ''}` : '';
  const badge = variant === 'bench' ? 12 : 14;

  return (
    <button type="button" className={classes} onClick={onClick} data-testid={`portrait-${variant}-${mon.speciesId}`} aria-label={fainted ? `${mon.name} fainted` : `${swapHint ?? `${mon.name}${mon.shiny ? ', shiny' : ''} · ${slotLabel}`}${incomingText}${asLead ? `; as Lead it would take ${asLead.amount}${asLead.ko ? ', a knockout' : ''}` : ''}`} {...tip}>
      <span className={styles.stand} data-fx-slot={fxSlot} data-arrow-to={slotId}>
        {/* §9.2.5 — what lands on it this turn, beside it, towards the enemy: one chip per hit, KO when they add up. */}
        {hits && (
          <span className={styles.incoming} data-testid="incoming" aria-hidden="true">
            {hits.map((h) => (
              <span key={h.key} className={styles.incomingHit}>
                {/* Who hits: its box icon at 1×, cropped to the Pokémon (D9). */}
                {h.icon && (
                  <span className={styles.incomingFace}>
                    <img className="pixel" src={h.icon} alt="" />
                  </span>
                )}
                <span className="display tabular">−{h.amount}</span>
              </span>
            ))}
            {incomingKo && <b className={styles.incomingKo}>KO</b>}
          </span>
        )}
        <span className={`${styles.sprite} ${fxClass ?? ''} ${spriteClass ?? ''}`}>
          <span className={styles.shadow} aria-hidden="true" />
          <ArenaSprite src={spriteOf(mon, 'back', !!mon.shiny)} shiny={!!mon.shiny} concealed={fainted} imgClassName={styles.breathe} />
          <FloatingNumbers uid={mon.uid} fx={fx} />
        </span>
      </span>

      <span className={styles.plate}>
        <span className={styles.slotTag}>
          {variant === 'lead' && <IconCrown size={12} stroke={2.6} />}
          {slotLabel}
        </span>
        <span className={styles.head}>
          <span className={styles.types}>
            {mon.types.map((t) => (
              <TypeBadge key={t} type={t} size={badge} defenderTypes={mon.types} />
            ))}
          </span>
          <span className={`${styles.name} display`}>{mon.name}</span>
          {mon.shiny && <ShinyMark name={mon.name} size={12} plain />}
          <span className={styles.level}>Lv {mon.level}</span>
        </span>
        {/* Its condition on the plate's corner, as the slot tag is on its top: the name keeps the row. */}
        {(mon.status || mon.confusionTurns > 0) && (
          <span className={styles.status}>
            {mon.status && <StatusBadge status={mon.status.kind} size={22} />}
            {mon.confusionTurns > 0 && <StatusBadge status="confusion" size={22} />}
          </span>
        )}
        <HpBar hp={mon.hp} maxHp={mon.maxHp} height={variant === 'bench' ? 7 : 9} />
        <span className={styles.hpRow}>
          <span className={`${styles.hpText} display tabular`}>{fainted ? 'Fainted' : `${mon.hp} / ${mon.maxHp}`}</span>
          {/* §9.2.5 — the swap, priced in HP: what this turn's intents would do to it at the Lead (v0.8.6). */}
          {variant === 'bench' && !fainted && asLead && (
            <span className={asLead.ko ? styles.asLeadKo : styles.asLead} data-testid={`as-lead-${mon.speciesId}`}>
              −{asLead.amount}
              {asLead.ko ? ' KO' : ''}
            </span>
          )}
          {variant === 'bench' && !fainted && swapCost !== undefined && <span className={swapAllowed ? styles.swapChip : styles.swapChipOff}>Swap {swapCost} AP</span>}
        </span>
        {/* Its stages and Trauma on a row of their own, only when it has any: the HP row is full on a bench plate. */}
        {(stageChips.length > 0 || mon.traumaStacks > 0) && (
          <span className={styles.chips}>
            {stageChips.map((s) => (
              <span key={s} className={mon.stages[s] > 0 ? styles.chipUp : styles.chipDown}>
                {s === 'attack' ? 'Atk' : 'Def'} {mon.stages[s] > 0 ? '+' : ''}
                {mon.stages[s]}
              </span>
            ))}
            {mon.traumaStacks > 0 && (
              <Tipped tip={traumaTip(mon.traumaStacks, mon.maxHp)} className={styles.chipTrauma}>
                Trauma ×{mon.traumaStacks}
              </Tipped>
            )}
          </span>
        )}
      </span>
    </button>
  );
}
