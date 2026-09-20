import { IconCrown } from '@tabler/icons-react';
import type { Combatant } from '@/sim';
import { portraitOf } from '@/ui/art';
import { FloatingNumbers, type FloatingFx } from './FloatingNumbers';
import { HpBar } from './HpBar';
import { StatusBadge, TypeBadge } from './TypeBadge';
import { combatantTip, traumaTip } from '@/ui/tips';
import { Tipped, useTip } from '@/ui/tooltip';
import styles from './Portrait.module.css';

type Variant = 'lead' | 'bench';

interface Props {
  mon: Combatant;
  variant: Variant;
  slotLabel: string;
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
}

// Per docs/design/ui/02 §2.1 — squad-formation portrait: type top-left, status top-right, crown on the Lead,
// HP bar + text below, swap chip for benches. Intent targets highlight the slot, never the Pokémon (§5.2).
export function Portrait({ mon, variant, slotLabel, swapCost, swapAllowed, swapHint, targeted, selectable, onClick, fx, fxClass }: Props) {
  const primary = mon.types[0] ?? 'normal';
  const fainted = mon.hp <= 0;
  const classes = [
    styles.portrait,
    styles[variant],
    targeted ? styles.targeted : '',
    selectable ? styles.selectable : '',
    fainted ? styles.fainted : '',
    fxClass ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const stageChips = (['attack', 'defense'] as const).filter((s) => mon.stages[s] !== 0);
  // 2026-09-21 — the portrait's bubble is the Pokémon's summary: types, ability, held item, status, Trauma,
  // and its role right now (Lead, or what a swap costs). It replaced five native titles on the card's corners.
  const tip = useTip(combatantTip(mon, { isLead: variant === 'lead', ...(swapCost !== undefined && !fainted ? { swapCost } : {}) }));

  return (
    <button type="button" className={classes} onClick={onClick} data-testid={`portrait-${variant}-${mon.speciesId}`} data-slot={slotLabel} aria-label={fainted ? `${mon.name} fainted` : swapHint ?? `${mon.name} · ${slotLabel}`} {...tip}>
      <span className={styles.slotTag}>{slotLabel}</span>
      {variant === 'lead' && (
        <span className={styles.crown}>
          <IconCrown size={18} stroke={2.4} />
        </span>
      )}
      <span className={styles.cornerTL}>
        <TypeBadge type={primary} size={variant === 'bench' ? 22 : 26} defenderTypes={mon.types} />
        {mon.types[1] && <TypeBadge type={mon.types[1]} size={variant === 'bench' ? 22 : 26} defenderTypes={mon.types} />}
      </span>
      <span className={styles.cornerTR}>
        {mon.status && (
          <StatusBadge status={mon.status.kind} size={variant === 'bench' ? 24 : 28} />
        )}
        {mon.confusionTurns > 0 && (
          <StatusBadge status="confusion" size={variant === 'bench' ? 24 : 28} />
        )}
      </span>
      <span className={styles.art} style={{ background: `color-mix(in srgb, var(--type-${primary}) 30%, var(--surface-2))` }}>
        <img src={portraitOf(mon)} alt={mon.name} draggable={false} />
        {fainted && <span className={`${styles.faintedTag} display`}>Fainted</span>}
      </span>
      <span className={styles.name}>
        <span className="display">{mon.name}</span>
        <span className={styles.level}>Lv {mon.level}</span>
      </span>
      <HpBar hp={mon.hp} maxHp={mon.maxHp} height={variant === 'bench' ? 8 : 11} />
      <span className={`${styles.hpText} display tabular`}>
        {mon.hp} / {mon.maxHp}
      </span>
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
      {variant === 'bench' && !fainted && swapCost !== undefined && (
        <span className={swapAllowed ? styles.swapChip : styles.swapChipOff}>Swap: {swapCost} AP</span>
      )}
      <FloatingNumbers uid={mon.uid} fx={fx} />
    </button>
  );
}
