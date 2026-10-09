import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconCards, IconMenu2 } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useCombatStore } from '@/app/combatStore';
import { useRunStore } from '@/app/runStore';
import {
  FLEE_TOLL,
  SLOT_LABEL,
  cardPlayability,
  fleeTierFor,
  consumablePlayability,
  fieldsSuppressed,
  asLeadDamage,
  forecastTurn,
  indexToSlot,
  pickLeadOptions,
  swapOptions,
  type CardPlayability,
  type CombatState,
  type SlotId, benchIndices } from '@/sim';
import { portraitOf, stageBackdrop, spriteOf, trainerSprite } from '@/ui/art';
import { CombatLog } from '@/ui/components/CombatLog';
import { BagButton } from '@/ui/components/BagButton';
import { EnemyPanel, type TargetPreview } from '@/ui/components/EnemyPanel';
import { FloatingNumbers } from '@/ui/components/FloatingNumbers';
import { Modal } from '@/ui/components/Modal';
import { PauseMenu } from '@/ui/components/PauseMenu';
import { MoveCard } from '@/ui/components/MoveCard';
import { OutcomeOverlay } from '@/ui/components/OutcomeOverlay';
import { Portrait } from '@/ui/components/Portrait';
import { FieldChips } from '@/ui/components/FieldChips';
import { TypeLabel } from '@/ui/components/TypeBadge';
import { useCardDrag, type CardDrag } from '@/ui/hooks/useCardDrag';
import { fxTimings, useCombatFx, type SpriteSlot } from '@/ui/hooks/useCombatFx';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { WildTierBanner } from '@/ui/components/WildTierBanner';
import { ArenaFx } from '@/ui/components/ArenaFx';
import { ENCOUNTER_LABEL, REJECT_TEXT } from '@/ui/strings';
import { iconOf, itemIcon } from '@/ui/art';
import { apTip, fleeTip, swapTip } from '@/ui/tips';
import { Tip, Tipped } from '@/ui/tooltip';
import styles from './CombatScreen.module.css';

// Per docs/design §9.2 + ui/02 §2.1 — the combat screen bound to the live sim state.
// Interaction model (§5.6): drag a card onto its target, or click the card and then the enemy; clicking the card
// again (or Enter) plays it at the enemy Lead. Step-Backward cards and ally items ask for a bench/ally click; a
// Poké Ball in a group asks which wild Pokémon it is thrown at.
export function CombatScreen() {
  const goTo = useAppStore((s) => s.goTo);
  const { ctx, state, selection, select, clearSelection, restart, combatKey } = useCombatStore();
  const [paused, setPaused] = useState(false);
  // A run fight reports its result home; a fixture fight is its own world (§2.4).
  const inRun = useRunStore((s) => s.run?.phase === 'combat');
  const hasRun = useRunStore((s) => s.run !== null);
  const finishCombat = useRunStore((s) => s.finishCombat);
  const rawDispatch = useCombatStore((s) => s.dispatch);
  const animate = useMotionPref();
  const fx = useCombatFx(state, combatKey, animate);
  const busyRef = useRef(fx.busy);
  useEffect(() => {
    busyRef.current = fx.busy;
  }, [fx.busy]);
  const [hoverCardId, setHoverCardId] = useState<string | null>(null);
  const [hoverEnemyUid, setHoverEnemyUid] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const trayRef = useRef<HTMLElement | null>(null);

  const plays = useMemo(() => (state ? state.player.hand.map((c) => cardPlayability(state, c.id, ctx)!) : []), [state, ctx]);
  const consumablePlays = useMemo(() => (state ? state.player.consumables.hand.map((c) => consumablePlayability(state, c.id, ctx)!) : []), [state, ctx]);
  const swaps = useMemo(() => (state ? swapOptions(state) : []), [state]);
  // §9.2.5 — this turn's Resolution run dry: the numbers on the chips and on the portraits are its numbers.
  const forecast = useMemo(() => (state && state.outcome === 'in-progress' ? forecastTurn(state, ctx) : { byEnemy: {}, byAction: {}, incoming: {}, hpAfter: {} }), [state, ctx]);

  /** Dispatch and surface the sim's rejection reason as a toast (the sim never throws on illegal input). */
  const dispatch = useCallback(
    (action: Parameters<typeof rawDispatch>[0]): boolean => {
      const ok = rawDispatch(action);
      if (!ok) {
        const r = useCombatStore.getState().lastRejected;
        setToast(r ? REJECT_TEXT[r.reason] : 'Not now.');
        window.setTimeout(() => setToast(null), 1800);
      }
      return ok;
    },
    [rawDispatch],
  );

  const fail = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  /** Play a card at `targetUid` (absent: the enemy Lead); a Step-Backward card first asks for its bench. */
  const playCard = useCallback(
    (play: CardPlayability, targetUid?: string, stepBackTo?: number) => {
      if (play.needsStepBackChoice && stepBackTo === undefined) {
        select({ mode: 'step-back', cardId: play.card.id, ...(targetUid ? { targetUid } : {}) });
        fail('Step-Backward: choose which bench Pokémon takes the Lead.');
        return;
      }
      dispatch({
        type: 'play-card',
        cardId: play.card.id,
        ...(stepBackTo === undefined ? {} : { stepBackTo }),
        ...(targetUid === undefined ? {} : { targetUid }),
      });
    },
    [dispatch, fail, select],
  );

  // §5.6 — the drop: onto an enemy, the card is aimed there; anywhere above the hand, a card that takes no enemy
  // (or hits them all, or has only one to hit) is played; anywhere else, the drag is let go.
  const onDrop = useCallback(
    (d: CardDrag) => {
      const live = useCombatStore.getState().state;
      if (!live || live.outcome !== 'in-progress' || live.player.pendingLeadPick) return;
      const aboveHand = d.y < (trayRef.current?.getBoundingClientRect().top ?? Infinity);
      const play = cardPlayability(live, d.id, ctx);
      if (!play) return;
      if (!play.playable) return fail(play.reason ? REJECT_TEXT[play.reason] : 'Cannot play that.');
      if (d.overUid && play.aimsAtFoe) return playCard(play, d.overUid);
      if (aboveHand && (!play.aimsAtFoe || play.hitsAll || live.enemies.length <= 1)) return playCard(play);
    },
    [ctx, fail, playCard],
  );
  const { drag, begin, clickWasDrag } = useCardDrag(onDrop);

  // §9.6 — the whole fight is playable from the keyboard, not just tabbable. 1–9 pick a card, Enter fires the
  // selection at the enemy Lead (Tab to an enemy and Enter aims it there), E ends the turn, Esc cancels.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        clearSelection();
        return;
      }
      const live = useCombatStore.getState();
      const s = live.state;
      // §9.9 — while a beat holds the hand (the catch, a faint), the keys wait with it.
      if (!s || s.outcome !== 'in-progress' || s.phase !== 'action' || busyRef.current) return;

      if (/^[1-9]$/.test(e.key)) {
        const card = s.player.hand[Number(e.key) - 1];
        if (card) {
          e.preventDefault();
          live.select({ mode: 'card', cardId: card.id });
        }
        return;
      }
      if (e.key === 'Enter' && live.selection.mode === 'card' && live.selection.cardId && !(el instanceof HTMLButtonElement)) {
        const play = cardPlayability(s, live.selection.cardId, live.ctx);
        if (play?.playable) {
          e.preventDefault();
          playCard(play);
        }
        return;
      }
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        live.dispatch({ type: 'end-turn' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSelection, playCard]);

  // §3.1.2 — the toll this fight would cost to run from, from the node the run is standing on.
  const nodeKind = useRunStore((s) => (s.run?.pendingNodeId ? s.run.map.nodes[s.run.pendingNodeId]?.kind ?? null : null));
  const fleeTier = nodeKind ? fleeTierFor(nodeKind) : null;
  const fleeToll = fleeTier ? FLEE_TOLL[fleeTier] : null;

  if (!state) {
    return (
      <main className={`${styles.root} theme-stage`} data-testid="combat-empty">
        <div className={styles.empty}>
          <p>No combat loaded.</p>
          <button type="button" className={styles.endTurn} onClick={() => goTo(hasRun ? 'map' : 'scenarios')}>
            {hasRun ? 'Back to the map' : 'Pick a scenario'}
          </button>
        </div>
      </main>
    );
  }

  const enemies = state.enemies;
  const group = enemies.length > 1;
  const leadIdx = state.player.leadIndex;
  const lead = state.player.team[leadIdx]!;
  // §5.14 — a caught shiny wears its palette; the fight carries the flag.
  const shiny = !!lead.shiny;
  const benches = benchIndices(state);
  const selectedPlay = selection.mode === 'card' || selection.mode === 'step-back' ? plays.find((p) => p.card.id === selection.cardId) ?? null : null;
  const draggedPlay = drag ? plays.find((p) => p.card.id === drag.id) ?? null : null;
  const previewPlay = draggedPlay ?? plays.find((p) => p.card.id === hoverCardId) ?? selectedPlay;
  // The enemy the held card points at: under the drag, or under the mouse while a card is selected.
  const aimUid = drag ? drag.overUid : selectedPlay && selection.mode === 'card' ? hoverEnemyUid : null;
  const aimedTarget = previewPlay && aimUid ? previewPlay.targets.find((t) => t.uid === aimUid) ?? null : null;
  // §5.2 — every slot a visible intent is aimed at glows; a Cleave lights them all.
  const targetSlots = new Set<SlotId>();
  for (const e of enemies) {
    for (const i of [e.intent, e.second]) {
      if (!i || i.hidden) continue;
      if (i.kind === 'cleave') ['lead', 'bench1', 'bench2'].forEach((s) => targetSlots.add(s as SlotId));
      else if (i.targetSlot) targetSlots.add(i.targetSlot);
    }
  }
  const ended = state.outcome !== 'in-progress';
  /** §9.9 — where a ghost or the catch stands: the slot's own sprite box, as the live sprite uses it. */
  const slotClass = (slot: SpriteSlot): string =>
    slot === 'player' ? styles.leadSprite ?? '' : slot === 'single' ? styles.enemySprite ?? '' : `${styles.enemySprite} ${slot === 'lead' ? styles.foeLead : slot === 'support1' ? styles.foeSupport1 : styles.foeSupport2}`;
  // §9.9 — a beat the screen should not talk over (the catch, a faint) holds the hand and the outcome until it has
  // played; a Pokémon coming out never does. While a ball rocks, the log keeps its result back too.
  const interactive = !ended && !state.player.pendingLeadPick && !fx.busy;
  const shownLog = fx.logHold === null ? state.log : state.log.slice(0, fx.logHold);

  /** §9.2.5 — the hits coming at one of your Pokémon, from the enemies whose intent is not hidden. */
  function incomingFor(uid: string) {
    const hits = (forecast.incoming[uid] ?? []).filter((h) => {
      const e = enemies.find((x) => x.uid === h.enemyUid);
      const i = h.action === 1 ? e?.second : e?.intent;
      return i && !i.hidden && h.amount > 0;
    });
    const mon = state!.player.team.find((m) => m.uid === uid)!;
    const list = hits.map((h) => {
      const e = enemies.find((x) => x.uid === h.enemyUid)!;
      // §5.6.1 — each action is its own hit, so a Pokémon that acts twice puts two chips on the same portrait.
      const i = h.action === 1 ? e.second : e.intent;
      const move = i?.moveId ? ctx.content.move(i.moveId).name : 'attack';
      return { key: `${h.enemyUid}#${h.action}`, enemyUid: h.enemyUid, amount: h.amount, name: e.name, move, icon: portraitOf(e) };
    });
    return { incoming: list, incomingKo: list.length > 0 && list.reduce((a, h) => a + h.amount, 0) >= mon.hp };
  }

  /**
   * §9.2.5 / §3.3 — what this bench Pokémon would take this turn if it took the Lead now (v0.8.6): the dry run with
   * it leading, counting only the intents you can see. Null when nothing visible would land on it there.
   */
  function asLeadFor(bi: number): { amount: number; ko: boolean } | null {
    const hit = asLeadDamage(state!, ctx, bi);
    return hit && hit.amount > 0 ? hit : null;
  }

  /** §9.2.4 — the held card's number on one enemy (or that it cannot reach it). */
  function previewOn(uid: string): TargetPreview | null {
    // §9.2.4 — one grammar for one enemy or three (user, 2026-09-30): the held card's number sits on every panel.
    if (!previewPlay || !previewPlay.aimsAtFoe) return null;
    const t = previewPlay.targets.find((x) => x.uid === uid);
    if (!t) return null;
    const hp = enemies.find((e) => e.uid === uid)?.hp ?? 0;
    if (!t.reachable) return { final: 0, ko: false, reachable: false };
    if (!t.damage) return null;
    return { final: t.damage.final, ko: t.damage.final >= hp, reachable: true };
  }

  function onCardClick(play: CardPlayability) {
    if (!interactive || clickWasDrag()) return;
    if (!play.playable) return fail(play.reason ? REJECT_TEXT[play.reason] : 'Cannot play that.');
    if (selection.cardId === play.card.id && selection.mode === 'card') return playCard(play);
    select({ mode: 'card', cardId: play.card.id });
  }

  function onEnemyClick(uid: string) {
    if (!interactive) return;
    if (selection.mode === 'consumable-foe' && selection.cardId) {
      dispatch({ type: 'use-consumable', cardId: selection.cardId, targetUid: uid });
      return;
    }
    if (selectedPlay && selection.mode === 'card') playCard(selectedPlay, uid);
  }

  function onConsumableClick(cp: (typeof consumablePlays)[number]) {
    if (!interactive || clickWasDrag()) return;
    if (!cp.playable) return fail(cp.reason ? REJECT_TEXT[cp.reason] : 'Cannot use that.');
    if (cp.needsAllyTarget) {
      if (selection.mode === 'consumable-ally' && selection.cardId === cp.cardId) return clearSelection();
      select({ mode: 'consumable-ally', cardId: cp.cardId });
      return;
    }
    // §2.6.4 / §5.6 — in a pack, the ball asks which wild Pokémon it is thrown at.
    if (cp.aimsAtFoe && group) {
      if (selection.mode === 'consumable-foe' && selection.cardId === cp.cardId) return clearSelection();
      select({ mode: 'consumable-foe', cardId: cp.cardId });
      return;
    }
    dispatch({ type: 'use-consumable', cardId: cp.cardId });
  }

  function onTeamClick(index: number) {
    if (!interactive) return;
    if (selection.mode === 'consumable-ally' && selection.cardId) {
      dispatch({ type: 'use-consumable', cardId: selection.cardId, targetIndex: index });
      return;
    }
    if (index === leadIdx) return;
    if (selection.mode === 'step-back' && selectedPlay) {
      if (!selectedPlay.stepBackOptions.includes(index)) return fail('That Pokémon cannot take the Lead right now.');
      playCard(selectedPlay, selection.targetUid, index);
      return;
    }
    const opt = swaps.find((o) => o.benchIndex === index);
    if (!opt) return;
    if (!opt.allowed) return fail(opt.reason ? REJECT_TEXT[opt.reason] : 'Cannot swap.');
    dispatch({ type: 'swap', benchIndex: index });
  }

  const allySelectable = selection.mode === 'consumable-ally';
  const stepBackSelectable = selection.mode === 'step-back' && selectedPlay ? new Set(selectedPlay.stepBackOptions) : new Set<number>();
  const enemyTargetable = interactive && ((!!selectedPlay && selection.mode === 'card' && selectedPlay.aimsAtFoe) || selection.mode === 'consumable-foe' || (!!draggedPlay && draggedPlay.aimsAtFoe));
  // The full breakdown opens only for the enemy the card points at (under the drag, or the pointer once selected);
  // the numbers themselves are on the panels. The same with one enemy as with three (user, 2026-09-30).
  const boxDamage = aimedTarget?.reachable ? aimedTarget.damage : null;
  const boxEnemy = enemies.find((e) => e.uid === aimUid) ?? null;

  function benchPortrait(bi: number | undefined, cls: string | undefined) {
    if (bi === undefined) return null;
    const mon = state!.player.team[bi]!;
    const opt = swaps.find((o) => o.benchIndex === bi);
    return (
      <div className={cls}>
        <Portrait mon={mon} variant="bench" slotLabel={SLOT_LABEL[indexToSlot(state!, bi)]} swapCost={opt?.cost} swapAllowed={opt?.allowed} swapHint={swapHint(state!, bi, swaps)} asLead={asLeadFor(bi)} targeted={targetSlots.has(indexToSlot(state!, bi))} selectable={(allySelectable && mon.hp > 0) || stepBackSelectable.has(bi)} onClick={() => onTeamClick(bi)} fx={fx.floats} fxClass={fx.classes[mon.uid]} faintPending={!!fx.faintPending[mon.uid]} {...incomingFor(mon.uid)} />
      </div>
    );
  }

  return (
    <main className={`${styles.root} theme-stage`} data-testid="combat-screen" data-turn={state.turn} data-outcome={state.outcome} data-phase={state.phase} data-enemies={enemies.length}>
      {/* §9.6 — the fight narrates itself. Without this a screen-reader player gets a silent board: the log
          is the only place a hit, a status or a faint is ever stated in words. */}
      <p className="sr-only" role="status" aria-live="polite" data-testid="combat-announcer">
        {shownLog.slice(-1).map((l) => l.text).join(' ')}
      </p>
      <p className="sr-only">
        Turn {state.turn}, {state.player.ap} action points. Press 1 to 9 to pick a card, Enter to play it at the
        enemy Lead, E to end the turn, Escape to cancel.
      </p>
      <header className={styles.topbar}>
        <div className={styles.chips}>
          {/* One way out of a fight, and it is the same menu the map has. */}
          <button type="button" className={styles.iconBtn} onClick={() => setPaused(true)} aria-label="Menu" data-testid="btn-pause">
            <IconMenu2 size={18} />
          </button>
          <span className={`${styles.chip} ${styles.chipStrong}`}>{scenarioName(state)}</span>
          <span className={styles.chip}>{ENCOUNTER_LABEL[state.kind] ?? state.kind}</span>
          {state.trainer && <span className={styles.chip}>{state.trainer.name}</span>}
          {/* §9.2.2.1 — the active field, with the Home Field marker when the enemy owns it. */}
          <FieldChips fields={state.fields} suppressed={fieldsSuppressed(state, ctx.content)} />
        </div>
        <div className={styles.chips}>
          <span className={styles.chip} data-testid="turn-chip">
            Turn {state.turn}
          </span>
          <Tipped tip={<Tip title="Skill deck" meta={[`${state.player.deck.length} to draw`, `${state.player.discard.length} discarded`]} body="Your three active Pokémon's four moves each: twelve cards. You draw five a turn; when the deck runs out, the discard pile shuffles back in." />} className={styles.chip}>
            <IconCards size={14} /> {state.player.deck.length} · {state.player.discard.length}
          </Tipped>
        </div>
      </header>

      <section className={[styles.stage, group ? styles.stageGroup : ''].join(' ')} style={{ backgroundImage: `url(${stageBackdrop(state.stage)})` }}>
        <div className={styles.stageTint} aria-hidden="true" />

        <div className={styles.squad} data-testid="squad">
          {benchPortrait(benches[0], styles.benchTop)}
          {benchPortrait(benches[1], styles.benchBottom)}
          <div className={styles.leadSlot}>
            <Portrait mon={lead} variant="lead" slotLabel="Lead" targeted={targetSlots.has('lead')} selectable={allySelectable && lead.hp > 0} onClick={() => onTeamClick(leadIdx)} fx={fx.floats} fxClass={fx.classes[lead.uid]} faintPending={!!fx.faintPending[lead.uid]} {...incomingFor(lead.uid)} />
          </div>
        </div>

        <div className={styles.arena} aria-hidden="true" style={fxTimings()}>
          {lead.hp > 0 && (
            <div className={`${styles.leadSprite} ${fx.classes[lead.uid] === 'fx-lunge-right' ? 'fx-lunge-right' : ''} ${fx.sprites[lead.uid] ?? ''}`}>
              <img className="pixel" src={spriteOf(lead, 'back', shiny)} alt="" draggable={false} data-shiny={shiny || undefined} />
              <span className={styles.platform} />
            </div>
          )}
          {/* The trainer stays to the last faint: its ball comes back to it. */}
          {state.trainer && enemies.length <= 1 && (
            <img className={`${styles.trainer} pixel`} src={trainerSprite(state.trainer.sprite)} alt={state.trainer.name} draggable={false} />
          )}
          {/* §9.9.1 — the hands the Poké Balls fly from and back to: the foe's trainer, and yours off the left edge. */}
          <span className={state.trainer && enemies.length <= 1 ? styles.handTrainer : styles.handOffRight} data-fx-hand="trainer" />
          <span className={styles.handPlayer} data-fx-hand="player" />
          {/* §9.2.1 — one enemy stands large; a group uses the squad grammar mirrored: the Lead forward, the
              supports behind it. Every sprite is a drop target too. */}
          {enemies.map((enemy, i) => (
            <div
              key={enemy.uid}
              className={[styles.enemySprite, group ? (i === 0 ? styles.foeLead : i === 1 ? styles.foeSupport1 : styles.foeSupport2) : '', aimUid === enemy.uid ? styles.foeAimed : '', fx.classes[enemy.uid] ?? '', fx.sprites[enemy.uid] ?? ''].join(' ')}
              data-testid="arena-enemy"
              data-enemy-uid={enemy.uid}
            >
              <img className={`pixel ${enemy.shiny ? 'fx-shiny' : ''}`} src={spriteOf(enemy, 'front', !!enemy.shiny)} alt="" draggable={false} data-shiny={enemy.shiny || undefined} style={enemy.hp <= 0 ? { opacity: 0 } : undefined} />
              <span className={styles.platform} />
              <FloatingNumbers uid={enemy.uid} fx={fx.floats} />
            </div>
          ))}
          {boxDamage && boxEnemy && previewPlay && (
            <div className={styles.preview} data-testid="damage-preview">
              <div className={`${styles.previewValue} display tabular`}>{boxDamage.final}</div>
              <div className={styles.previewSub}>
                {previewPlay.move.name}
                {` → ${boxEnemy.name}`} · {boxDamage.hasStab ? 'STAB ×1.5 · ' : ''}
                {boxDamage.typeMultiplier !== 1 ? `type ×${boxDamage.typeMultiplier}` : 'neutral'}
                {boxDamage.fieldMultiplier ? ` · field ×${boxDamage.fieldMultiplier}` : ''}
                {boxDamage.isCrit ? ' · crit' : ''}
              </div>
              {boxEnemy.hp <= boxDamage.final && <div className={styles.previewKo}>KO</div>}
            </div>
          )}
          <ArenaFx ghosts={fx.ghosts} balls={fx.balls} catching={fx.catching} slotClass={slotClass} />
          {/* §2.6.2 — the rarity the Wild Area rolled, once, as the fight opens. */}
          {state.wildTier && <WildTierBanner key={combatKey} tier={state.wildTier} animate={animate} />}
          {fx.banner && (
            <div className={`${styles.banner} display`} key={fx.banner + state.nextSeq}>
              {fx.banner}
            </div>
          )}
        </div>

        {/* §9.2.1 — a group's panels mirror the player's squad (v0.8.6): the Lead's panel forward and centred, the
            supports stacked behind it, the way the bench stacks behind your Lead. */}
        <div className={[styles.enemyZone, group ? styles.enemyZoneGroup : ''].join(' ')}>
          {enemies.length > 0 ? (
            enemies.map((enemy, i) => (
              // §9.9.1 — a Pokémon still in its ball has no panel yet: it is named when it comes out.
              <div key={enemy.uid} className={group ? (i === 0 ? styles.foeLeadPanel : i === 1 ? styles.foePanel1 : styles.foePanel2) : styles.foeOnly} style={fx.sprites[enemy.uid] === 'fx-hidden' ? { visibility: 'hidden' } : undefined}>
                <EnemyPanel
                  state={state}
                  enemy={enemy}
                  ctx={ctx}
                  forecast={forecast}
                  targetable={enemyTargetable}
                  aimed={aimUid === enemy.uid}
                  preview={previewOn(enemy.uid)}
                  onClick={() => onEnemyClick(enemy.uid)}
                  onHover={(h) => setHoverEnemyUid((cur) => (h ? enemy.uid : cur === enemy.uid ? null : cur))}
                  fxClass={fx.classes[enemy.uid]}
                  interactive={interactive}
                  onThrow={(cardId, targetUid) => dispatch({ type: 'use-consumable', cardId, targetUid })}
                />
              </div>
            ))
          ) : (
            !fx.catching && <div className={styles.chip}>No enemies remain</div>
          )}
          {state.enemyQueue.length > 0 && (
            <Tipped as="div" tip={<Tip title="Still to come" body={group ? 'These wait behind the group and step in the moment a place falls free.' : 'This trainer sends out the next Pokémon when this one falls. You fight them one at a time.'} />} className={styles.queue} role="group" aria-label={`${state.enemyQueue.length} Pokémon still to come`} data-testid="enemy-queue">
              {/* §2.7 — who comes next is a surprise (v0.8.6): one Poké Ball per Pokémon still to come. */}
              {state.enemyQueue.map((e) => (
                <img key={e.uid} className="pixel" src={itemIcon('poke-ball')} alt="" width={22} height={22} />
              ))}
              <span>to come</span>
            </Tipped>
          )}
        </div>

        <div className={styles.logWrap}>
          <CombatLog log={shownLog} />
        </div>

        {selection.mode !== 'none' && !drag && (
          <div className={styles.hint} data-testid="selection-hint">
            {selection.mode === 'card' && 'Click an enemy to aim it — or the card again for the Lead. Esc to cancel.'}
            {selection.mode === 'step-back' && 'Choose the bench Pokémon that takes the Lead after the hit.'}
            {selection.mode === 'consumable-ally' && 'Choose the Pokémon to use it on.'}
            {selection.mode === 'consumable-foe' && 'Choose the wild Pokémon to throw it at.'}
            <button type="button" onClick={clearSelection} className={styles.hintCancel}>
              Cancel
            </button>
          </div>
        )}
        {toast && (
          <div className={styles.toast} role="status" data-testid="toast">
            {toast}
          </div>
        )}
      </section>

      <footer className={styles.tray} ref={trayRef}>
        <div className={styles.trayHeader}>
          <Tipped as="div" tip={apTip(state.player.ap, ctx.config.baseApPerTurn)} className={styles.ap} data-testid="ap-pips">
            {Array.from({ length: Math.max(ctx.config.baseApPerTurn, state.player.ap) }, (_, i) => (
              <span key={i} className={i < state.player.ap ? styles.pip : styles.pipDim} />
            ))}
            <span className="tabular">{state.player.ap} AP</span>
            {state.player.defensiveDiscount && (
              <Tipped tip={<Tip title="Defensive discount" body="You swapped this turn, so your next Defensive card costs 1 AP less. Spent the moment you play one." />} className={styles.discount}>
                −1 Def
              </Tipped>
            )}
            <Tipped tip={swapTip(Math.min(3, state.player.swapCounter + 1), state.player.swapCounter)} className={styles.swapInfo}>
              Next swap: {Math.min(3, state.player.swapCounter + 1)} AP
            </Tipped>
          </Tipped>
          {/* §3.1.2 — running is a decision with a price on it, so the price is on the button. Outside a run
              (a practice fixture) there is no toll to pay and no map to return to, so there is no button. */}
          {inRun && (
            <Tipped
              as="button"
              type="button"
              tip={fleeTip(fleeTier, fleeToll)}
              className={styles.flee}
              onClick={() => fleeTier && dispatch({ type: 'flee' })}
              disabled={!interactive || !fleeTier}
              aria-disabled={!fleeTier}
              data-testid="btn-flee"
            >
              Run
            </Tipped>
          )}
          <button type="button" className={`${styles.endTurn} display`} onClick={() => dispatch({ type: 'end-turn' })} disabled={!interactive} data-testid="btn-end-turn">
            End Turn
          </button>
        </div>
        <div className={styles.hand} data-testid="hand">
          {plays.map((p, i) => (
            <MoveCard
              key={p.card.id}
              play={p}
              selected={selection.cardId === p.card.id && selection.mode !== 'consumable-ally' && selection.mode !== 'consumable-foe'}
              onClick={() => onCardClick(p)}
              onHover={(h) => setHoverCardId(h ? p.card.id : null)}
              onPointerDown={(e) => interactive && p.playable && begin(e, p.card.id)}
              index={i}
              total={plays.length}
            />
          ))}
          {plays.length === 0 && <div className={styles.emptyHand}>No cards in hand</div>}
          <div className={styles.divider} />
          {/* §3.5 — the whole bag, one button (v0.8.6): consumables are spent, so nothing is dealt at random. */}
          <BagButton
            plays={consumablePlays}
            itemsUsed={state.player.itemsUsed}
            itemCap={state.player.itemCap}
            disabled={!interactive}
            selectedCardId={selection.mode === 'consumable-ally' || selection.mode === 'consumable-foe' ? selection.cardId ?? null : null}
            onUse={onConsumableClick}
          />
        </div>
      </footer>

      {/* The card under the pointer while it is dragged: its name in its type's colour. */}
      {drag && (
        <div className={styles.dragGhost} style={{ left: drag.x, top: drag.y, ['--card-type' as string]: draggedPlay ? `var(--type-${draggedPlay.move.type})` : 'var(--brand-red)' }} aria-hidden="true" data-testid="drag-ghost">
          {draggedPlay && <TypeLabel type={draggedPlay.move.type} size={16} />}
          <span className="display">{draggedPlay?.move.name}</span>
        </div>
      )}

      {/* §9.9.1 — the fallen Lead sinks and its ball comes home first; the pick waits for the beat, as the outcome does. */}
      {state.player.pendingLeadPick && !ended && !fx.busy && (
        <Modal title="Your Lead fainted" testId="lead-pick-modal">
          <p className={styles.modalSub}>Choose who steps up. No AP cost. Its melee cards come online.</p>
          <div className={styles.pickRow}>
            {pickLeadOptions(state).map((i) => {
              const c = state.player.team[i]!;
              return (
                <button key={c.uid} type="button" className={styles.pick} onClick={() => dispatch({ type: 'pick-lead', benchIndex: i })} data-testid={`pick-lead-${c.speciesId}`}>
                  <img className="pixel" src={iconOf(c)} alt="" width={48} height={40} />
                  <span className="display">{c.name}</span>
                  <span className={`tabular ${styles.pickHp}`}>
                    {c.hp}/{c.maxHp}
                  </span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
      {paused && <PauseMenu onResume={() => setPaused(false)} />}
      {ended && !fx.busy && (
        <OutcomeOverlay
          state={state}
          runMode={inRun}
          onRestart={restart}
          onExit={() => {
            if (inRun) {
              finishCombat();
              goTo('map');
            } else {
              goTo('scenarios');
            }
          }}
        />
      )}
    </main>
  );
}

function scenarioName(state: CombatState): string {
  const named = useCombatStore.getState().scenarioName;
  if (named) return named;
  try {
    return useCombatStore.getState().ctx.content.scenario(state.scenarioId).name;
  } catch {
    return state.scenarioId;
  }
}

function swapHint(state: CombatState, index: number, swaps: ReturnType<typeof swapOptions>): string {
  const c = state.player.team[index]!;
  const o = swaps.find((s) => s.benchIndex === index);
  if (!o) return c.name;
  return o.allowed ? `Swap ${c.name} into the Lead for ${o.cost} AP` : `${c.name}: ${o.reason ? REJECT_TEXT[o.reason] : 'cannot swap'}`;
}
