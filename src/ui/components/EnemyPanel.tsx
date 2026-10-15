import { IconLock, IconQuestionMark } from '@tabler/icons-react';
import { IntentChip } from './IntentChip';
import type { CombatCtx, CombatState, EnemyCombatant, TurnForecast } from '@/sim';
import { SLOT_LABEL, currentPhase, describeIntent, enemySlotLabel, phaseMarkers } from '@/sim';
import { CatchPicker } from './CatchPicker';
import { intentGlyph, spriteOf } from '@/ui/art';
import type { SpriteSlot } from '@/ui/hooks/useCombatFx';
import { ArenaSprite } from './ArenaSprite';
import { FloatingNumbers, type FloatingFx } from './FloatingNumbers';
import { ARMOUR_LABEL, INTENT_LABEL } from '@/ui/strings';
import { HpBar } from './HpBar';
import { StatusBadge, TypeBadge } from './TypeBadge';
import { ShinyMark } from './ShinyMark';
import { armourTip, nextIntentTip, placeTip } from '@/ui/tips';
import { Tip, Tipped, useTip } from '@/ui/tooltip';
import styles from './EnemyPanel.module.css';

/** §9.2.4 — what the card in hand would do to this enemy: its own number, or that it cannot reach it. */
export interface TargetPreview {
  final: number;
  ko: boolean;
  reachable: boolean;
}

interface Props {
  state: CombatState;
  enemy: EnemyCombatant;
  ctx: CombatCtx;
  forecast: TurnForecast;
  targetable: boolean;
  /** The card being dragged or pointed is over this enemy. */
  aimed: boolean;
  preview: TargetPreview | null;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
  fxClass?: string;
  /** §2.6.4 — throw a ball from the catch picker (v0.8.6). */
  interactive: boolean;
  onThrow: (cardId: string, targetUid: string) => void;
  /** §9.9.1 — a foe that has just fainted: its card, fading where it stood while its sprite sinks (v0.9.11). */
  fallen?: boolean;
  /** §9.9.1 — while a faint plays, the place and the layout as the line stood before it (v0.9.11). */
  held?: { place: string; group: boolean };
  /** §9.9 — the sprite's FX anchor (`single`, `lead`, `support1`, `support2`): balls, ghosts and hits land on it. */
  fxSlot: SpriteSlot;
  /** §9.9.1 — the sprite's own beat: in its ball, being sent out, entering from the grass. */
  spriteClass?: string;
  floats: FloatingFx[];
  /** Still in its ball: the place is kept, the Pokémon and its plate are not shown yet. */
  waiting?: boolean;
}

// Per §9.2.1 / §9.2.2.3 / §9.2.5 — one enemy on the field, as one unit: its intent chip above it (kind glyph, the move,
// its target, and for a single hit the number it lands), its animated sprite, and its plate under it — the place tag
// (Lead, Bench 1, Bench 2, as yours), types, name, level, status, HP with phase markers, stages — with the catch pill in
// a wild fight and, while a card is held, the number that card would deal here (§9.2.4).
export function EnemyPanel({ state, enemy, ctx, forecast, targetable, aimed, preview, onClick, onHover, fxClass, interactive, onThrow, fallen, held, fxSlot, spriteClass, floats, waiting }: Props) {
  const phase = currentPhase(enemy, ctx.config);
  // §5.6 — every enemy names its place, one or three, so the fight reads the same either way.
  const place = held ? held.place : enemySlotLabel(state, enemy);
  const inGroup = held ? held.group : state.enemies.length > 1;
  // §5.5.1 — under Trainer's Instinct the enemy's committed plan for next turn sits under this turn's.
  const next = enemy.next?.intent ?? null;
  const nextMove = next?.moveId ? ctx.content.move(next.moveId) : null;
  const nextTipProps = useTip(next ? nextIntentTip(`${enemy.name} ${describeIntent(state, enemy, ctx, next)}`) : null);
  const stageChips = (['attack', 'defense'] as const).filter((s) => enemy.stages[s] !== 0);
  // §2.8.2 — an Elite Wild is boss-*tier* and is not a Gym Leader, so the label reads the scenario's kind
  // first. Tier is how hard it hits; kind is what it is, and the chip is telling the player what it is.
  const tierLabel =
    enemy.tier === 'boss' && state.kind === 'wild' ? 'Boss Wild'
    : enemy.tier === 'boss' ? 'Gym Leader'
    : enemy.tier === 'elite' ? 'Elite'
    : enemy.tier === 'trainer' ? 'Trainer'
    : 'Wild';
  // §5.6 — the plate is the door to its place, and to what the plate does not print: its tier and its phase. While a
  // card is aimed the bubble stays shut — the plate's number and the breakdown are what is read then.
  const placeMeta = [tierLabel, ...(enemy.phaseCount > 1 ? [`Phase ${phase} of ${enemy.phaseCount}`] : [])];
  const cardTipProps = useTip(targetable ? null : placeTip(place, state.enemies.length + state.enemyQueue.length <= 1, !!enemy.shiny, placeMeta));

  return (
    <div className={[styles.unit, !inGroup ? styles.solo : place === 'Lead' ? styles.leadUnit : styles.benchUnit, fallen ? styles.fallen : '', waiting ? styles.waiting : ''].join(' ')} data-testid={fallen ? 'foe-panel-fallen' : 'foe-panel'} data-enemy-uid={enemy.uid} onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)} aria-hidden={fallen ? true : undefined} inert={fallen ? true : undefined}>
      <div className={styles.intents}>
        {/* A fallen foe's chip keeps its room, unseen, so the unit fades where it stood rather than dropping. */}
        <div className={fallen ? styles.chipRoom : undefined}>
          <IntentChip state={state} enemy={enemy} ctx={ctx} forecast={forecast} action={0} />
        </div>
        {enemy.second && enemy.hp > 0 && <IntentChip state={state} enemy={enemy} ctx={ctx} forecast={forecast} action={1} />}

      {next && enemy.hp > 0 && (
        <div className={styles.next} data-testid="intent-next" tabIndex={0} {...nextTipProps}>
          <span className={styles.nextLabel}>Then</span>
          {next.hidden ? (
            <IconQuestionMark size={14} />
          ) : (
            <img src={intentGlyph(next.kind === 'debuff' ? 'status' : next.kind === 'incapacitated' ? 'stall' : next.kind)} alt="" width={16} height={16} className={styles.intentIcon} />
          )}
          <span>
            {next.hidden ? 'Unknown' : nextMove ? nextMove.name : INTENT_LABEL[next.kind]}
            {!next.hidden && next.targetSlot && <> → <b>{SLOT_LABEL[next.targetSlot]}</b></>}
            {!next.hidden && next.kind === 'cleave' && <> → <b>All</b></>}
          </span>
        </div>
      )}
      </div>

      {/* §9.2.1 — the Pokémon itself, standing on its plate. Every sprite is a drop target too (`data-enemy-uid`). */}
      {/* The sprite is as much the target as its plate: a click on either aims the card here. */}
      <span className={`${styles.stand} ${targetable ? styles.standTarget : ''}`} data-fx-slot={fxSlot} data-arrow-from={enemy.uid} onClick={onClick}>
        <span className={[styles.sprite, fxClass ?? '', spriteClass ?? '', aimed ? styles.spriteAimed : ''].join(' ')} data-testid="arena-enemy" data-enemy-uid={enemy.uid}>
          <span className={styles.shadow} aria-hidden="true" />
          <ArenaSprite src={spriteOf(enemy, 'front', !!enemy.shiny)} shiny={!!enemy.shiny} concealed={enemy.hp <= 0} imgClassName={`${styles.breathe} ${enemy.shiny ? 'fx-shiny' : ''}`} />
          <FloatingNumbers uid={enemy.uid} fx={floats} />
        </span>
      </span>

      <button
        type="button"
        className={[styles.card, targetable ? styles.targetable : '', aimed ? styles.aimed : '', preview && !preview.reachable ? styles.outOfReach : '', enemy.hp <= 0 ? styles.fainted : ''].join(' ')}
        onClick={onClick}
        {...cardTipProps}
        onFocus={(e) => {
          cardTipProps.onFocus?.(e);
          onHover(true);
        }}
        onBlur={(e) => {
          cardTipProps.onBlur?.(e);
          onHover(false);
        }}
        data-testid={`enemy-${enemy.speciesId}`}
        data-enemy-uid={enemy.uid}
        aria-label={`${enemy.name}${enemy.shiny ? ', shiny' : ''}${place ? `, ${place}` : ''}, ${enemy.hp} of ${enemy.maxHp} HP${preview ? (preview.reachable ? `; the card deals ${preview.final}${preview.ko ? ', a knockout' : ''}` : '; out of reach of this card') : ''}`}
      >
        {/* §9.2.1 — its place, tagged as yours are: Lead, Bench 1, Bench 2. */}
        <span className={styles.slotTag} data-testid="foe-place">
          {place}
        </span>
        {/* §9.2.4 / §5.6 — the held card's number on this enemy; blue is position: a Melee card cannot reach it. */}
        {preview && (
          preview.reachable ? (
            <span className={[styles.hitPreview, preview.ko ? styles.hitKo : ''].join(' ')} data-testid="target-preview">
              <span className="display tabular">{preview.final}</span>
              {preview.ko && <b>KO</b>}
            </span>
          ) : (
            <span className={styles.reachLock} data-testid="target-out-of-reach">
              <IconLock size={12} /> Out of reach
            </span>
          )
        )}
        <span className={styles.header}>
          <span className={styles.types}>
            {enemy.types.map((t) => (
              <TypeBadge key={t} type={t} size={14} defenderTypes={enemy.types} />
            ))}
          </span>
          <span className={styles.nameBlock}>
            <span className={styles.nameRow}>
              <span className={`${styles.name} display`}>{enemy.name}</span>
              {enemy.shiny && <ShinyMark name={enemy.name} size={12} plain />}
              <span className={styles.level}>Lv {enemy.level}</span>
            </span>
          </span>
        </span>
        {(enemy.status || enemy.confusionTurns > 0) && (
          <span className={styles.badges}>
            {enemy.status && <StatusBadge status={enemy.status.kind} size={22} />}
            {enemy.confusionTurns > 0 && <StatusBadge status="confusion" size={22} />}
          </span>
        )}
        <HpBar hp={enemy.hp} maxHp={enemy.maxHp} shield={enemy.shield} phaseMarkers={phaseMarkers(enemy, ctx.config)} height={10} />
        <span className={styles.hpRow}>
          <span className={`display tabular ${styles.hpText}`}>
            {enemy.hp} / {enemy.maxHp}
          </span>
          <span className={styles.chips}>
            {/* §5.9 — a boss's phase, on the plate at every size: the notches on its bar are its thresholds. */}
            {enemy.phaseCount > 1 && (
              <span className={styles.chipPhase}>
                Phase {phase}/{enemy.phaseCount}
              </span>
            )}
            {stageChips.map((s) => (
              <span key={s} className={enemy.stages[s] > 0 ? styles.chipUp : styles.chipDown}>
                {s === 'attack' ? 'Atk' : 'Def'} {enemy.stages[s] > 0 ? '+' : ''}
                {enemy.stages[s]}
              </span>
            ))}
            {/* §5.9.5 Ice Armour — what it takes before HP, and the rule behind it a hover away. */}
            {enemy.shield > 0 && (
              <Tipped tip={armourTip(enemy.shield)} className={styles.chipInfo} data-testid="foe-armour">
                {ARMOUR_LABEL} {enemy.shield}
              </Tipped>
            )}
            {enemy.sturdyAvailable && (
              <Tipped tip={<Tip title="Sturdy" body="Survives one hit that would have knocked it out, at 1 HP. Once per fight." />} className={styles.chipInfo}>
                Sturdy
              </Tipped>
            )}
          </span>
        </span>
      </button>

      {state.kind === 'wild' && !fallen && (
        <div className={styles.catchInline}>
          <CatchPicker state={state} enemy={enemy} ctx={ctx} interactive={interactive} onThrow={onThrow} />
        </div>
      )}
    </div>
  );
}
