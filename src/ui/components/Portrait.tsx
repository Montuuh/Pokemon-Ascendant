import { IconCrown, IconLock } from '@tabler/icons-react';
import type { CSSProperties } from 'react';
import type { Combatant, SlotId } from '@/sim';
import { spriteOf } from '@/ui/art';
import type { SpriteSlot } from '@/ui/hooks/useCombatFx';
import { ArenaSprite } from './ArenaSprite';
import { HpBar } from './HpBar';
import { StatusBadge, TypeBadge } from './TypeBadge';
import { ShinyMark } from './ShinyMark';
import { UnitChips } from './UnitChips';
import { combatantTip, shieldTip, traumaTip } from '@/ui/tips';
import { SHIELD_LABEL, UNIT_CHIPS_TEXT } from '@/ui/strings';
import { Tipped, useTip } from '@/ui/tooltip';
import card from './UnitCard.module.css';
import { UNIT_BADGE, UNIT_HP_BAR } from './unitCard';
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
  /** Its index in your team: where a card for your own side is dropped (`data-ally-index`). */
  allyIndex: number;
  /** §9.9 — the FX anchor this sprite is (`player` for the Lead, `bench1`, `bench2`): balls, ghosts and hits land on it. */
  fxSlot?: SpriteSlot;
  /** §9.9.1 — the sprite's own beat: hidden in its ball, being sent out. */
  spriteClass?: string;
  swapCost?: number;
  swapAllowed?: boolean;
  swapHint?: string;
  /** The intent is aimed at this slot. */
  targeted?: boolean;
  /** Selection mode wants a click here (step-back destination, an item for an ally, a card for your own side). */
  selectable?: boolean;
  /** §5.2 — this card is under the pointer: the arrows aimed at its slot come forward. */
  onHover?: (hovering: boolean) => void;
  onClick?: () => void;
  fxClass?: string;
  /**
   * §9.2.5 — every hit coming at this Pokémon this turn, as the dry-run Resolution prints it: one number per
   * enemy, never one figure for an area hit. `icon` names the source when a group is on the field.
   */
  incoming?: { key: string; enemyUid: string; amount: number; icon?: string; name: string; move: string; moot?: boolean }[];
  /** The hits above add up to a knockout. */
  incomingKo?: boolean;
  /** §9.2.5 — a bench Pokémon: what it would take this turn as the Lead (v0.8.6). */
  asLead?: { amount: number; ko: boolean } | null;
  /** §9.9.1 — its Pokémon is still in its ball (`waiting`: the whole card unseen) or coming out of it (`entering`). */
  arrival?: 'waiting' | 'entering' | null;
}

// §9.2.1 / §9.2.2.2 — one of your Pokémon on the field, as a card (v0.9.16, the user's "la animación encapsulada dentro
// de la carta"): the slot tag (and the Lead's crown) on its top edge, its condition on the corner, types, name and level
// on a dark head, the animated back sprite in a window lit in its first type, its HP — with the part this turn's visible
// intents will take striped — and on a bench the swap price and what it would take as the Lead. The hits coming at it
// hang off the card's edge, towards the enemy. The whole card is one button: a swap, an ally target, a step-back choice.
export function Portrait({ mon, variant, slotLabel, slotId, allyIndex, fxSlot, spriteClass, swapCost, swapAllowed, swapHint, targeted, selectable, onHover, onClick, fxClass, incoming, incomingKo, asLead, faintPending, arrival }: Props) {
  // §9.9.1 — at 0 HP but its faint still to play: it stands through the hits on screen first.
  const fainted = mon.hp <= 0 && !faintPending;
  const classes = [card.card, styles.unit, styles[variant], targeted ? styles.targeted : '', selectable ? styles.selectable : '', fainted ? styles.fainted : '', arrival ? styles[arrival] : ''].filter(Boolean).join(' ');
  const stageChips = (['attack', 'defense'] as const).filter((s) => mon.stages[s] !== 0);
  // 2026-09-21 — the card's bubble is the Pokémon's summary: types, ability, held item, status, Trauma, and its role
  // right now (Lead, or what a swap costs).
  const hits = !fainted && incoming?.length ? incoming : null;
  const tip = useTip(combatantTip(mon, { isLead: variant === 'lead', ...(swapCost !== undefined && !fainted ? { swapCost } : {}), ...(hits ? { incoming: hits, incomingKo: !!incomingKo } : {}), ...(asLead && !fainted ? { asLead } : {}) }));
  const incomingText = hits ? `; incoming: ${hits.map((h) => (h.moot ? `${h.name}'s ${h.move}, wasted on it being down` : `${h.amount} from ${h.name}'s ${h.move}`)).join(', ')}${incomingKo ? ', a knockout' : ''}` : '';
  // §9.2.5 — the HP left after the visible hits: what the striped end of the bar shows (a wasted hit takes nothing).
  const future = hits ? Math.max(0, mon.hp - hits.reduce((a, h) => a + (h.moot ? 0 : h.amount), 0)) : null;

  return (
    <button
      type="button"
      className={classes}
      style={{ '--unit-type': `var(--type-${mon.types[0] ?? 'normal'})` } as CSSProperties}
      onClick={onClick}
      onMouseEnter={(e) => {
        tip.onMouseEnter(e);
        onHover?.(true);
      }}
      onMouseLeave={(e) => {
        tip.onMouseLeave(e);
        onHover?.(false);
      }}
      onFocus={(e) => {
        // A chip inside the card (its "+N", Shield, Trauma) opens its own bubble, not the card's.
        if (e.target === e.currentTarget) tip.onFocus(e);
        onHover?.(true);
      }}
      onBlur={(e) => {
        tip.onBlur(e);
        onHover?.(false);
      }}
      aria-describedby={tip['aria-describedby']}
      data-testid={`portrait-${variant}-${mon.speciesId}`}
      data-ally-index={allyIndex}
      data-arrow-card={slotId}
      data-unit-uid={mon.uid}
      data-selectable={selectable || undefined}
      aria-label={fainted ? `${mon.name} fainted` : `${swapHint ?? `${mon.name}${mon.shiny ? ', shiny' : ''} · ${slotLabel}`}${incomingText}${asLead ? `; as Lead it would take ${asLead.amount}${asLead.ko ? ', a knockout' : ''}` : ''}`}
    >
      <span className={`${card.tag} ${variant === 'lead' ? styles.leadTag : ''}`}>
        {variant === 'lead' && <IconCrown size={12} stroke={2.6} />}
        {slotLabel}
      </span>
      {/* Its condition on the card's corner, as the slot tag is on its top: the name keeps the row. */}
      {(mon.status || mon.confusionTurns > 0) && (
        <span className={card.corner}>
          {mon.status && <StatusBadge status={mon.status.kind} size={22} />}
          {mon.confusionTurns > 0 && <StatusBadge status="confusion" size={22} />}
        </span>
      )}
      <span className={card.head}>
        <span className={card.types}>
          {mon.types.map((t) => (
            <TypeBadge key={t} type={t} size={UNIT_BADGE} defenderTypes={mon.types} />
          ))}
        </span>
        <span className={`${card.name} display`}>{mon.name}</span>
        {mon.shiny && <ShinyMark name={mon.name} size={12} plain />}
        <span className={card.level}>Lv {mon.level}</span>
      </span>

      <span className={card.window}>
        <span className={card.stand} data-fx-slot={fxSlot} data-arrow-to={slotId}>
          <span className={`${card.sprite} ${fxClass ?? ''} ${spriteClass ?? ''}`}>
            <ArenaSprite src={spriteOf(mon, 'back', !!mon.shiny)} shiny={!!mon.shiny} concealed={fainted} imgClassName={card.breathe} />
          </span>
        </span>
        {/* Its stages, Shield and Trauma on the window's corner, only when it has any: the card keeps one size. */}
        <UnitChips
          chips={[
            // §7.3.7 Battle Hardened — the shield it opened the fight behind, drawn on the bar too.
            ...(mon.shield > 0
              ? [{ key: 'shield', label: `${SHIELD_LABEL} ${mon.shield}`, explain: UNIT_CHIPS_TEXT.shieldBody(mon.shield), node: <Tipped tip={shieldTip(mon.shield)} className={`${card.chip} ${card.info}`} data-testid="unit-shield">{SHIELD_LABEL} {mon.shield}</Tipped> }]
              : []),
            ...stageChips.map((s) => {
              const label = `${s === 'attack' ? 'Atk' : 'Def'} ${mon.stages[s] > 0 ? '+' : ''}${mon.stages[s]}`;
              return { key: s, label, node: <span className={`${card.chip} ${mon.stages[s] > 0 ? card.up : card.down}`}>{label}</span> };
            }),
            // Trauma last: its cost is already in the max HP on the card.
            ...(mon.traumaStacks > 0
              ? [{ key: 'trauma', label: `Trauma ×${mon.traumaStacks}`, explain: UNIT_CHIPS_TEXT.traumaBody, node: <Tipped tip={traumaTip(mon.traumaStacks, mon.maxHp)} className={`${card.chip} ${card.warn}`}>Trauma ×{mon.traumaStacks}</Tipped> }]
              : []),
          ]}
        />
      </span>

      {/* §9.2.5 — what lands on it this turn, hung off the card's edge towards the enemy: one chip per hit, KO when
          they add up. */}
      {hits && (
        <span className={styles.incoming} data-testid="incoming" aria-hidden="true">
          {/* The hits that land, the knockout they add up to, then any wasted on it being down already. */}
          {[...hits.filter((h) => !h.moot), null, ...hits.filter((h) => h.moot)].map((h) =>
            h === null ? (
              incomingKo && (
                <b key="ko" className={styles.incomingKo}>
                  KO
                </b>
              )
            ) : (
              <span key={h.key} className={h.moot ? `${styles.incomingHit} ${styles.incomingMoot}` : styles.incomingHit} data-moot={h.moot || undefined}>
                {/* Who hits: its box icon at 1×, cropped to the Pokémon (D9). */}
                {h.icon && (
                  <span className={styles.incomingFace}>
                    <img className="pixel" src={h.icon} alt="" />
                  </span>
                )}
                <span className="display tabular">−{h.amount}</span>
              </span>
            ),
          )}
        </span>
      )}

      <HpBar hp={mon.hp} maxHp={mon.maxHp} shield={mon.shield} height={UNIT_HP_BAR} future={future} />
      <span className={card.hpRow}>
        <span className={`${card.hpText} display tabular`}>
          {fainted ? 'Fainted' : `${mon.hp} / ${mon.maxHp}`}
        </span>
        {/* §9.2.5 — the swap, priced in HP: what this turn's intents would do to it at the Lead (v0.8.6). */}
        {variant === 'bench' && !fainted && asLead && (
          <span className={asLead.ko ? styles.asLeadKo : styles.asLead} data-testid={`as-lead-${mon.speciesId}`}>
            −{asLead.amount}
            {asLead.ko ? ' KO' : ''}
          </span>
        )}
        {variant === 'bench' && !fainted && swapCost !== undefined && (
          // A price you cannot pay now keeps its ink (D5): a dashed edge and a lock say "not now".
          <span className={swapAllowed ? styles.swapChip : styles.swapChipOff}>
            {!swapAllowed && <IconLock size={10} stroke={2.6} />}
            Swap {swapCost} AP
          </span>
        )}
      </span>
    </button>
  );
}
