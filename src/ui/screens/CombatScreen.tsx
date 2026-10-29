import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { IconCards, IconMenu2, IconPaw, IconStar, IconTrophy, IconUser } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useCombatStore } from '@/app/combatStore';
import { useRunStore } from '@/app/runStore';
import { DEFAULT_BATTLE_CONFIG, rhythmFillOf, FLEE_TOLL, SLOT_LABEL, cardPlayability, fleeTierFor, consumablePlayability, fieldsSuppressed, asLeadDamage, forecastTurn, indexToSlot, pickLeadOptions, swapOptions, type CardPlayability, type CombatState, type SlotId, type EnemyCombatant, benchIndices, metronomeNext, visibleMoot } from '@/sim';
import { stageBackdrop, trainerSprite } from '@/ui/art';
import { CombatLog } from '@/ui/components/CombatLog';
import { BagButton } from '@/ui/components/BagButton';
import { EnemyPanel, type TargetPreview } from '@/ui/components/EnemyPanel';
import { Modal } from '@/ui/components/Modal';
import { PauseMenu } from '@/ui/components/PauseMenu';
import { MoveCard } from '@/ui/components/MoveCard';
import { OutcomeOverlay } from '@/ui/components/OutcomeOverlay';
import { Portrait } from '@/ui/components/Portrait';
import { FieldChips } from '@/ui/components/FieldChips';
import { IntentArrows } from '@/ui/components/IntentArrows';
import { TrainerParty } from '@/ui/components/TrainerParty';
import { ApMeter } from '@/ui/components/ApMeter';
import { RuleChip } from '@/ui/components/RuleChip';
import { useCatchSfx, useCombatSfx } from '@/ui/audio/useAudio';
import { MetronomeChip } from '@/ui/components/MetronomeChip';
import { ObjectiveChip } from '@/ui/components/ObjectiveChip';
import { useCardDrag, type CardDrag } from '@/ui/hooks/useCardDrag';
import { FX_MS, fxTimings, useCombatFx, type SlotBox, type SpriteSlot } from '@/ui/hooks/useCombatFx';
import { MoveFxLayer } from '@/ui/components/MoveFx';
import { FloatingNumbers } from '@/ui/components/FloatingNumbers';
import { motionTimings } from '@/ui/moveMotion';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { WildTierBanner } from '@/ui/components/WildTierBanner';
import { ArenaFx } from '@/ui/components/ArenaFx';
import { DROP_ON_FOE, ENCOUNTER_LABEL, HINT_ALLY_CARD, HINT_FOE_CARD, REJECT_TEXT, dropOnAlly } from '@/ui/strings';
import { iconOf } from '@/ui/art';
import { fightKindTip, fleeTip } from '@/ui/tips';
import { Tip, Tipped } from '@/ui/tooltip';
import { RESULT_MS } from './results/results';
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
  // §9.5.3 — and what they sound like: a throw on the ball's own clock.
  useCombatSfx(state, animate);
  useCatchSfx(fx.catching);
  const busyRef = useRef(fx.busy);
  useEffect(() => {
    busyRef.current = fx.busy;
  }, [fx.busy]);
  const [hoverCardId, setHoverCardId] = useState<string | null>(null);
  const [hoverEnemyUid, setHoverEnemyUid] = useState<string | null>(null);
  // §5.2 — one of yours under the pointer: the arrows aimed at its slot come forward.
  const [hoverAllySlot, setHoverAllySlot] = useState<SlotId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // §9.9 — the card just played, leaving the hand toward its target: where it stood and how far its target lies.
  const [leaving, setLeaving] = useState<{ id: number; play: CardPlayability; left: number; top: number; scale: number; dx: number; dy: number } | null>(null);
  const leavingId = useRef(0);
  const trayRef = useRef<HTMLElement | null>(null);
  // §9.2.1 — the stage, and where each slot's Pokémon stands on it: measured from the formation after every layout, so
  // the arena's beats (balls, ghosts, the catch, a move's picture) land on the sprite wherever the formation put it. A
  // slot that empties keeps its last box, so a beat that outlives its Pokémon still plays where it stood.
  const [stageEl, setStageEl] = useState<HTMLElement | null>(null);
  // §9.2.2.4 — the width the hand's cards have, once the Bag has its place: what decides whether they tuck.
  const [handEl, setHandEl] = useState<HTMLDivElement | null>(null);
  const [handRoom, setHandRoom] = useState(0);
  useEffect(() => {
    if (!handEl || typeof ResizeObserver === 'undefined') return;
    // The row's width less its padding and what is not a card — the divider and the Bag, measured with their margins
    // and the row's gap, so a change to their CSS is read rather than copied here.
    const measure = () => {
      const row = getComputedStyle(handEl);
      const gap = parseFloat(row.columnGap) || 0;
      let fixed = parseFloat(row.paddingLeft) + parseFloat(row.paddingRight);
      for (const el of handEl.querySelectorAll<HTMLElement>(':scope > [data-hand-fixed], :scope > [data-testid="btn-bag"]')) {
        const s = getComputedStyle(el);
        fixed += el.offsetWidth + parseFloat(s.marginLeft) + parseFloat(s.marginRight) + gap;
      }
      setHandRoom(Math.max(0, handEl.clientWidth - fixed));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(handEl);
    return () => ro.disconnect();
  }, [handEl]);
  const [slotBoxes, setSlotBoxes] = useState<Partial<Record<SpriteSlot, SlotBox>>>({});
  useLayoutEffect(() => {
    if (!stageEl) return;
    const measure = () => {
      const base = stageEl.getBoundingClientRect();
      const found: Partial<Record<SpriteSlot, SlotBox>> = {};
      stageEl.querySelectorAll<HTMLElement>('[data-fx-slot]').forEach((el) => {
        const r = el.getBoundingClientRect();
        found[el.dataset.fxSlot as SpriteSlot] = { left: Math.round(r.left - base.left), top: Math.round(r.top - base.top), width: Math.round(r.width), height: Math.round(r.height) };
      });
      setSlotBoxes((cur) => {
        const next = { ...cur, ...found };
        return JSON.stringify(next) === JSON.stringify(cur) ? cur : next;
      });
    };
    measure();
    // The formation settles a moment after the state (a Pokémon sent out, a font): measure once more then.
    const late = window.setTimeout(measure, 300);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(stageEl);
    return () => {
      window.clearTimeout(late);
      ro?.disconnect();
    };
  }, [stageEl, state]);

  // §3.3.1 — a swap, drawn as the cards trading places (the user's note, 2026-10-19): each of your cards that changed
  // place since the last layout glides from where it stood to where it stands now, the Pokémon in it — a FLIP on the
  // card itself (`translate` and `scale`, apart from its own `transform`). Only a change of place moves a card.
  const units = useRef<{ key: number; at: Map<string, { rect: DOMRect; slot: string }> } | null>(null);
  useLayoutEffect(() => {
    const squad = stageEl?.querySelector('[data-testid="squad"]');
    if (!squad) return;
    const els = [...squad.querySelectorAll<HTMLElement>('[data-unit-uid]')];
    const now = new Map<string, { rect: DOMRect; slot: string }>();
    for (const el of els) {
      for (const a of el.getAnimations()) if (a.id === 'unit-swap') a.finish();
      now.set(el.dataset.unitUid!, { rect: el.getBoundingClientRect(), slot: el.dataset.arrowCard ?? '' });
    }
    const prev = units.current;
    units.current = { key: combatKey, at: now };
    if (!animate || !prev || prev.key !== combatKey) return;
    for (const el of els) {
      const was = prev.at.get(el.dataset.unitUid!);
      const is = now.get(el.dataset.unitUid!)!;
      if (!was || was.slot === is.slot || !is.rect.width) continue;
      const dx = was.rect.left + was.rect.width / 2 - (is.rect.left + is.rect.width / 2);
      const dy = was.rect.top + was.rect.height / 2 - (is.rect.top + is.rect.height / 2);
      el.animate([{ translate: `${dx}px ${dy}px`, scale: `${was.rect.width / is.rect.width}`, zIndex: 5 }, { translate: '0 0', scale: '1', zIndex: 5 }], { duration: FX_MS.swap, easing: getComputedStyle(el).getPropertyValue('--ease-step').trim() || 'ease-out', id: 'unit-swap' });
    }
  }, [state, stageEl, combatKey, animate]);

  const plays = useMemo(() => (state ? state.player.hand.map((c) => cardPlayability(state, c.id, ctx)!) : []), [state, ctx]);
  const consumablePlays = useMemo(() => (state ? state.player.consumables.hand.map((c) => consumablePlayability(state, c.id, ctx)!) : []), [state, ctx]);
  const swaps = useMemo(() => (state ? swapOptions(state, ctx.config) : []), [state, ctx]);
  // §9.2.5 — this turn's Resolution run dry: the numbers on the chips and on the portraits are its numbers.
  const forecast = useMemo(() => (state && state.outcome === 'in-progress' ? forecastTurn(state, ctx) : { byEnemy: {}, byAction: {}, incoming: {}, hpAfter: {}, moot: {} }), [state, ctx]);

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
    (play: CardPlayability, targetUid?: string, stepBackTo?: number, dropped?: { from: HTMLElement; to: DOMRect | null }) => {
      if (play.needsStepBackChoice && stepBackTo === undefined) {
        select({ mode: 'step-back', cardId: play.card.id, ...(targetUid ? { targetUid } : {}) });
        fail('Step-Backward: choose which bench Pokémon takes the Lead.');
        return;
      }
      // §9.9 — the card does not vanish at the click: a copy leaves from its place in the hand toward its target (the
      // stage's middle for a card with none named). Decoration only: the hand is never held for it.
      // It starts at the size it was seen at — a lifted hand card, or the drag's shrunken ghost — not its own.
      const source = dropped?.from ?? document.querySelector<HTMLElement>(`[data-testid="hand"] [data-card-id="${play.card.id}"]`);
      const from = source?.getBoundingClientRect();
      const to = dropped?.to ?? (targetUid ? document.querySelector<HTMLElement>(`[data-arrow-card="${targetUid}"]`) : null)?.getBoundingClientRect() ?? stageEl?.getBoundingClientRect();
      if (animate && from && to) {
        const id = ++leavingId.current;
        setLeaving({ id, play, left: from.left, top: from.top, scale: from.width / (source!.offsetWidth || from.width), dx: to.left + to.width / 2 - (from.left + from.width / 2), dy: to.top + to.height / 2 - (from.top + from.height / 2) });
        window.setTimeout(() => setLeaving((l) => (l?.id === id ? null : l)), FX_MS.cardLeave);
      }
      dispatch({
        type: 'play-card',
        cardId: play.card.id,
        ...(stepBackTo === undefined ? {} : { stepBackTo }),
        ...(targetUid === undefined ? {} : { targetUid }),
      });
    },
    [animate, dispatch, fail, select, stageEl],
  );

  // §5.6 (v0.9.16) — a card is played onto its target, never cast at nothing: a card that lands on the foe only onto
  // an enemy, a card for your own side only onto one of the Pokémon it acts on. Let go anywhere else, it goes back.
  const onDrop = useCallback(
    (d: CardDrag) => {
      const live = useCombatStore.getState().state;
      if (!live || live.outcome !== 'in-progress' || live.player.pendingLeadPick) return;
      const play = cardPlayability(live, d.id, ctx);
      if (!play || !d.out) return;
      if (!play.playable) return fail(play.reason ? REJECT_TEXT[play.reason] : 'Cannot play that.');
      // The card leaves from where it was let go — the ghost under the pointer — toward what it was dropped on.
      const from = document.querySelector<HTMLElement>('[data-testid="drag-ghost-card"]') ?? undefined;
      const onto = (sel: string) => document.querySelector<HTMLElement>(sel)?.getBoundingClientRect() ?? null;
      if (play.aimsAtFoe) return d.overUid ? playCard(play, d.overUid, undefined, from && { from, to: onto(`[data-arrow-card="${d.overUid}"]`) }) : fail(DROP_ON_FOE);
      if (d.overAlly !== null && play.allyTargets.includes(d.overAlly)) return playCard(play, undefined, undefined, from && { from, to: onto(`[data-ally-index="${d.overAlly}"]`) });
      fail(dropOnAllyText(live, play.allyTargets));
    },
    [ctx, fail, playCard],
  );
  const { drag, begin, clickWasDrag } = useCardDrag(onDrop, () => trayRef.current?.getBoundingClientRect().top ?? Infinity);

  // §9.6 — the whole fight is playable from the keyboard, not just tabbable. 1–9 pick a card, Tab to its target (an
  // enemy, or one of yours) and Enter plays it there, E ends the turn, Esc cancels.
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
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        live.dispatch({ type: 'end-turn' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSelection]);

  // §3.1.2 — the toll this fight would cost to run from, from the node the run is standing on.
  const nodeKind = useRunStore((s) => (s.run?.pendingNodeId ? s.run.map.nodes[s.run.pendingNodeId]?.kind ?? null : null));
  const fleeTier = nodeKind ? fleeTierFor(nodeKind) : null;
  const fleeToll = fleeTier ? FLEE_TOLL[fleeTier] : null;

  // §9.4.5 — a run fight's end is its result, on this same stage: once the last beat has played (a faint, the catch) and
  // held a moment, the result goes home and the screen becomes the result — no overlay between (v0.9.30).
  const outcome = state?.outcome ?? 'in-progress';
  useEffect(() => {
    if (!inRun || outcome === 'in-progress' || fx.busy) return;
    const t = window.setTimeout(() => {
      if (finishCombat()) goTo('results');
    }, animate ? RESULT_MS.hold : 0);
    return () => window.clearTimeout(t);
  }, [inRun, outcome, fx.busy, animate, finishCombat, goTo]);

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
  // §9.9.1 — the line as drawn: while a foe that has just fainted plays its beat — its sprite a ghost, its card
  // fading — the field keeps the line as it stood before the faint: the others hold their places and their places'
  // names, the layout keeps its shape, and a Pokémon still to come waits in its ball. The promotion the sim already
  // made plays out when the beat ends (v0.9.11).
  const fallen = fx.ghosts.filter((g) => g.kind === 'faint' && g.foe && !enemies.some((e) => e.uid === g.foe!.enemy.uid));
  const heldLine = fallen[0]?.foe?.line ?? null;
  // §9.9.1 (v0.9.16) — while a ball rocks, the field stays as it stood when the ball left the hand: a catch that has
  // already succeeded in the sim does not scatter the pack before the click tells it.
  const catchLine = fx.catching?.line ?? null;
  const field: { enemy: EnemyCombatant; fallenAt?: number }[] = catchLine
    ? catchLine.map((enemy) => ({ enemy }))
    : heldLine
    ? heldLine.flatMap((uid) => {
        const live = enemies.find((e) => e.uid === uid);
        if (live) return [{ enemy: live }];
        const g = fallen.find((x) => x.foe!.enemy.uid === uid);
        return g ? [{ enemy: { ...g.foe!.enemy, hp: 0 }, fallenAt: g.at }] : [];
      })
    : enemies.map((enemy) => ({ enemy }));
  const groupShown = (catchLine ?? heldLine ?? enemies).length > 1;
  const title = scenarioName(state);
  const kindLabel = ENCOUNTER_LABEL[state.kind] ?? state.kind;
  const KindIcon = KIND_ICON[state.kind] ?? IconPaw;
  // §9.2.2.4 — the hand's cards side by side while they fit the room the Bag leaves them; a bigger hand (a relic's
  // sixth or seventh card), or a narrower screen, tucks each card under its neighbour by just enough to fit.
  const handNeed = plays.length * CARD_WIDTH + Math.max(0, plays.length - 1) * CARD_GAP;
  const handOverlap = plays.length > 1 && handRoom > 0 && handNeed > handRoom ? Math.ceil((handNeed - handRoom) / (plays.length - 1)) : 0;
  // A held line (a faint playing, a ball rocking) keeps its places' names as they stood.
  const heldPlace = (i: number) => (catchLine || heldLine ? { place: groupShown && i > 0 ? `Bench ${i}` : 'Lead', group: groupShown } : undefined);
  /** §9.9 — the FX anchor of the i-th Pokémon on the enemy's side, as `useCombatFx` names it. */
  const fieldSlot = (i: number): SpriteSlot => (!groupShown ? 'single' : i === 0 ? 'lead' : i === 1 ? 'support1' : 'support2');
  const leadIdx = state.player.leadIndex;
  const lead = state.player.team[leadIdx]!;
  const benches = benchIndices(state);
  const selectedPlay = selection.mode === 'card' || selection.mode === 'step-back' ? plays.find((p) => p.card.id === selection.cardId) ?? null : null;
  const draggedPlay = drag ? plays.find((p) => p.card.id === drag.id) ?? null : null;
  const previewPlay = draggedPlay ?? plays.find((p) => p.card.id === hoverCardId) ?? selectedPlay;
  // §9.2.2.4 — what the card under the pointer (dragged, hovered, or held) would spend: shown on the AP capsule.
  const costPreview = previewPlay && previewPlay.apCost > 0 ? previewPlay.apCost : null;
  // §4.1.3.1 — the same card's other cost: what it would feed its owner's rhythm ring, drawn on that dial as a ghost.
  const ghostFill = previewPlay ? rhythmFillOf(previewPlay.owner, previewPlay.move, DEFAULT_BATTLE_CONFIG) : null;
  const ghostFor = (uid: string): number | null => (previewPlay?.owner.uid === uid && ghostFill?.kind === 'fills' ? ghostFill.after : null);
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
  /** §9.9 — where a ghost, a ball or the catch stands: the slot's own sprite box, as the formation drew it. */
  const slotStyle = (slot: SpriteSlot): CSSProperties => {
    const b = slotBoxes[slot];
    return b ? { left: b.left, top: b.top, width: b.width, height: b.height } : { visibility: 'hidden' };
  };
  // §9.9 — a beat the screen should not talk over (the catch, a faint) holds the hand and the outcome until it has
  // played; a Pokémon coming out never does. While a ball rocks, the log keeps its result back too.
  const interactive = !ended && !state.player.pendingLeadPick && !fx.busy;
  const shownLog = fx.logHold === null ? state.log : state.log.slice(0, fx.logHold);
  /** §9.9.2 — a Pokémon as the screen shows it: with the HP it had until the move on its way lands. */
  const shownHp = <T extends { uid: string; hp: number }>(m: T): T => (m.uid in fx.hp ? { ...m, hp: fx.hp[m.uid]! } : m);
  // §9.9.2 — where each Pokémon's numbers rise: over its sprite, above everything a move draws.
  const floatSlots: [string, SpriteSlot][] = [
    [lead.uid, 'player'],
    ...benches.map((bi): [string, SpriteSlot] => [state.player.team[bi]!.uid, indexToSlot(state, bi) === 'bench1' ? 'bench1' : 'bench2']),
    ...field.map(({ enemy }, i): [string, SpriteSlot] => [enemy.uid, fieldSlot(i)]),
  ];

  /** §9.9.1 — one of yours still in its ball, or coming out of it: its card waits for it. */
  const arrivalOf = (uid: string) => (fx.sprites[uid] === 'fx-hidden' ? 'waiting' : fx.sprites[uid] === 'fx-sendout' ? 'entering' : null);
  /** §9.2.5 / §9.9.2 — what is aimed at your side waits while the fight opens and while the foes' moves play. */
  const aimsWait = fx.opening || fx.acting;

  /** §9.2.5 — the hits coming at one of your Pokémon, from the enemies whose intent is not hidden. */
  function incomingFor(uid: string) {
    if (aimsWait) return { incoming: [], incomingKo: false };
    const hits = (forecast.incoming[uid] ?? []).filter((h) => {
      const e = enemies.find((x) => x.uid === h.enemyUid);
      const i = h.action === 1 ? e?.second : e?.intent;
      return i && !i.hidden && h.amount > 0;
    });
    const mon = state!.player.team.find((m) => m.uid === uid)!;
    const chip = (enemyUid: string, action: number, amount: number, moot: boolean) => {
      const e = enemies.find((x) => x.uid === enemyUid)!;
      // §5.6.1 — each action is its own hit, so a Pokémon that acts twice puts two chips on the same portrait.
      const i = action === 1 ? e.second : e.intent;
      const move = i?.moveId ? ctx.content.move(i.moveId).name : 'attack';
      return { key: `${enemyUid}#${action}`, enemyUid, amount, name: e.name, move, icon: iconOf(e), ...(moot ? { moot: true } : {}) };
    };
    const list = hits.map((h) => chip(h.enemyUid, h.action, h.amount, false));
    // §9.2.5 — what would also have come at it, wasted on it being down already: struck through after the knockout.
    const wasted = Object.keys(forecast.moot).flatMap((key) => {
      const m = visibleMoot(state!, forecast, key);
      if (!m || m.targetUid !== uid) return [];
      const [enemyUid, action] = key.split('#') as [string, string];
      return [chip(enemyUid, Number(action), m.amount, true)];
    });
    return { incoming: [...list, ...wasted], incomingKo: list.length > 0 && list.reduce((a, h) => a + h.amount, 0) >= mon.hp };
  }

  /**
   * §9.2.5 / §3.3 — what this bench Pokémon would take this turn if it took the Lead now (v0.8.6): the dry run with
   * it leading, counting only the intents you can see. Null when nothing visible would land on it there.
   */
  function asLeadFor(bi: number): { amount: number; ko: boolean } | null {
    if (aimsWait) return null;
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
    return { final: t.damage.final, ko: t.damage.final >= hp, reachable: true, area: previewPlay.hitsAll };
  }

  function onCardClick(play: CardPlayability) {
    if (!interactive || clickWasDrag()) return;
    if (!play.playable) return fail(play.reason ? REJECT_TEXT[play.reason] : 'Cannot play that.');
    // §5.6 — a second click puts it back: a card is played onto its target, never by clicking it twice.
    if (selection.cardId === play.card.id && selection.mode === 'card') return clearSelection();
    select({ mode: 'card', cardId: play.card.id });
  }

  function onEnemyClick(uid: string) {
    if (!interactive) return;
    if (selection.mode === 'consumable-foe' && selection.cardId) {
      dispatch({ type: 'use-consumable', cardId: selection.cardId, targetUid: uid });
      return;
    }
    if (selectedPlay && selection.mode === 'card') {
      if (!selectedPlay.aimsAtFoe) return fail(dropOnAllyText(state!, selectedPlay.allyTargets));
      playCard(selectedPlay, uid);
    }
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
    // §5.6 — a card for your own side, played onto one of the Pokémon it acts on.
    if (selection.mode === 'card' && selectedPlay && !selectedPlay.aimsAtFoe) {
      if (!selectedPlay.allyTargets.includes(index)) return fail(dropOnAllyText(state!, selectedPlay.allyTargets));
      playCard(selectedPlay);
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
  // §5.6 — a card for your own side, held or dragged: the Pokémon it acts on light up, and only they take it.
  const allyCard = draggedPlay ?? (selection.mode === 'card' ? selectedPlay : null);
  const allyCardTargets = allyCard && !allyCard.aimsAtFoe && allyCard.playable ? new Set(allyCard.allyTargets) : new Set<number>();
  const stepBackSelectable = selection.mode === 'step-back' && selectedPlay ? new Set(selectedPlay.stepBackOptions) : new Set<number>();
  const enemyTargetable = interactive && ((!!selectedPlay && selection.mode === 'card' && selectedPlay.aimsAtFoe) || selection.mode === 'consumable-foe' || (!!draggedPlay && draggedPlay.aimsAtFoe));
  // The full breakdown opens only for the enemy the card points at (under the drag, or the pointer once selected);
  // the numbers themselves are on the panels. The same with one enemy as with three (user, 2026-09-30).
  const boxDamage = aimedTarget?.reachable ? aimedTarget.damage : null;
  const boxEnemy = enemies.find((e) => e.uid === aimUid) ?? null;

  function benchUnit(bi: number | undefined, cls: string | undefined) {
    if (bi === undefined) return null;
    const mon = state!.player.team[bi]!;
    const opt = swaps.find((o) => o.benchIndex === bi);
    const slot = indexToSlot(state!, bi);
    return (
      <div className={cls}>
        <Portrait turn={state!.turn} mon={shownHp(mon)} variant="bench" slotLabel={SLOT_LABEL[slot]} slotId={slot} allyIndex={bi} fxSlot={slot === 'bench1' ? 'bench1' : 'bench2'} spriteClass={fx.sprites[mon.uid]} swapCost={opt?.cost} swapQuick={opt?.quick} swapAllowed={opt?.allowed} swapHint={swapHint(state!, bi, swaps)} asLead={asLeadFor(bi)} targeted={targetSlots.has(slot)} selectable={(allySelectable && mon.hp > 0) || stepBackSelectable.has(bi) || allyCardTargets.has(bi)} rhythmGhost={ghostFor(mon.uid)} onHover={(h) => setHoverAllySlot((cur) => (h ? slot : cur === slot ? null : cur))} onClick={() => onTeamClick(bi)} fxClass={fx.classes[mon.uid]} faintPending={!!fx.faintPending[mon.uid]} arrival={arrivalOf(mon.uid)} {...incomingFor(mon.uid)} />
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
        Turn {state.turn}, {state.player.ap} action points. Press 1 to 9 to pick a card, Tab to its target and Enter to
        play it there, E to end the turn, Escape to cancel.
      </p>
      <header className={styles.topbar}>
        <div className={styles.chips}>
          {/* One way out of a fight, and it is the same menu the map has. */}
          <button type="button" className={styles.iconBtn} onClick={() => setPaused(true)} aria-label="Menu" data-testid="btn-pause">
            <IconMenu2 size={18} />
          </button>
          {/* §9.2.2.1 — one chip says what this fight is: its kind as an icon, then its name. A trainer fight is
              already named after the trainer, so the trainer is named once. */}
          <Tipped tip={fightKindTip(state.kind, kindLabel)} className={`${styles.chip} ${styles.chipStrong}`} data-testid="fight-title">
            <KindIcon size={15} stroke={2.2} aria-label={kindLabel} />
            {title}
            {state.trainer && !title.includes(state.trainer.name) && <span className={styles.chipSub}>{state.trainer.name}</span>}
          </Tipped>
          {/* §5.9.5 — the Leader's rule, with its count; the whole rule is one hover away. */}
          {state.gymRule && <RuleChip rule={state.gymRule} live={{ state, config: ctx.config }} />}
          {/* §2.12.2.1 — a Legendary's arena rule, and Mew's Metronome with the field it draws next. */}
          {state.arenaRule && <RuleChip rule={state.arenaRule} live={{ state, config: ctx.config }} />}
          {metronomeNext(state) && <MetronomeChip next={metronomeNext(state)} />}
          {/* §5.6.5 — a hold-out counts its turns on the top line; a runner counts on its own card. */}
          {state.objective?.kind === 'hold' && <ObjectiveChip kind="hold" turns={state.objective.turns} live={state} />}
          {/* §9.2.2.1 — the active field, with the Home Field marker when the enemy owns it. */}
          <FieldChips fields={state.fields} suppressed={fieldsSuppressed(state, ctx.content)} />
        </div>
        {/* §9.2.2.1 — the bar's middle says what to do now while a card or an item waits for its target, and what just
            happened otherwise: on the field the hint lay across the very Pokémon you were aiming at. */}
        <div className={styles.logSlot}>
          {selection.mode !== 'none' && !drag ? (
            <div className={styles.hint} data-testid="selection-hint" data-target={(selection.mode === 'card' && selectedPlay && !selectedPlay.aimsAtFoe) || selection.mode === 'consumable-ally' || selection.mode === 'step-back' ? 'ally' : 'foe'}>
              <span className={styles.hintText}>
                {selection.mode === 'card' && selectedPlay && !selectedPlay.aimsAtFoe && HINT_ALLY_CARD}
                {selection.mode === 'card' && (!selectedPlay || selectedPlay.aimsAtFoe) && HINT_FOE_CARD}
                {selection.mode === 'step-back' && 'Choose the bench Pokémon that takes the Lead after the hit.'}
                {selection.mode === 'consumable-ally' && 'Choose the Pokémon to use it on.'}
                {selection.mode === 'consumable-foe' && 'Choose the wild Pokémon to throw it at.'}
              </span>
              <button type="button" onClick={clearSelection} className={styles.hintCancel}>
                Cancel
              </button>
            </div>
          ) : (
            <CombatLog log={shownLog} />
          )}
        </div>
        <div className={styles.chips}>
          {/* A new turn is said here, once the foes' turn has played out: the chip pops. */}
          <span className={`${styles.chip} ${styles.turnChip}`} key={fx.turn} data-testid="turn-chip">
            Turn {fx.turn}
          </span>
          <Tipped tip={<Tip title="Skill deck" meta={[`${state.player.deck.length} to draw`, `${state.player.discard.length} discarded`]} body="Your three active Pokémon's four moves each: twelve cards. You draw five a turn; when the deck runs out, the discard pile shuffles back in." />} className={styles.chip}>
            <IconCards size={14} /> {state.player.deck.length} · {state.player.discard.length}
          </Tipped>
        </div>
      </header>

      <div className={styles.stageFrame}>
        <section
          ref={setStageEl}
          className={`${styles.stage} ${fx.stageClass ?? ''}`}
          data-fx-stage
          data-hit-stop={fx.hitStop || undefined}
          style={{ backgroundImage: `url(${stageBackdrop(state.stage)})`, ...fxTimings(), ...motionTimings() }}
        >
        <div className={styles.stageTint} aria-hidden="true" />
        {/* §9.9.2 — what a move does in the ground itself (Earthquake), under the cards. */}
        <div className={styles.floor} aria-hidden="true">
          <MoveFxLayer moves={fx.moves} boxes={slotBoxes} floor />
        </div>
        {/* §5.2 — who each enemy is about to hit: arrows under the Pokémon, over the ground; gone while a ball rocks. */}
        <IntentArrows state={state} stage={stageEl} focusUid={hoverEnemyUid} focusSlot={hoverAllySlot} hidden={!!fx.catching || fx.acting || fx.opening} />

        {/* §9.2.1 — your three on the field, each a card: the Lead forward, towards the enemy, centred between its
            bench — Bench 1 above, Bench 2 below. */}
        <div className={`${styles.formation} ${styles.squadSide}`} data-testid="squad">
          {benchUnit(benches[0], styles.slotB1)}
          {benchUnit(benches[1], styles.slotB2)}
          <div className={styles.slotLead}>
            <Portrait turn={state!.turn} mon={shownHp(lead)} variant="lead" slotLabel="Lead" slotId="lead" allyIndex={leadIdx} fxSlot="player" spriteClass={fx.sprites[lead.uid]} targeted={targetSlots.has('lead')} selectable={(allySelectable && lead.hp > 0) || allyCardTargets.has(leadIdx)} rhythmGhost={ghostFor(lead.uid)} onHover={(h) => setHoverAllySlot((cur) => (h ? 'lead' : cur === 'lead' ? null : cur))} onClick={() => onTeamClick(leadIdx)} fxClass={fx.classes[lead.uid]} faintPending={!!fx.faintPending[lead.uid]} arrival={arrivalOf(lead.uid)} {...incomingFor(lead.uid)} />
          </div>
        </div>

        {/* The open ground between the two sides. */}
        <div className={styles.middle} />

        {/* §9.2.1 — the enemy, mirrored: one stands alone and large; a group's Lead forward, its bench behind it. */}
        <div className={[styles.formation, styles.foeSide, groupShown ? styles.foeGroup : styles.foeSolo].join(' ')}>
          {field.length > 0
            ? field.map(({ enemy, fallenAt }, i) => (
                // §9.9.1 — a Pokémon still in its ball keeps its place unseen: it is named when it comes out.
                <div key={enemy.uid} className={groupShown ? (i === 0 ? styles.slotLead : i === 1 ? styles.slotB1 : styles.slotB2) : styles.slotSolo} style={fallenAt !== undefined ? ({ '--ghost-at': `${fallenAt}ms` } as CSSProperties) : undefined}>
                  <EnemyPanel
                    fallen={fallenAt !== undefined}
                    held={heldPlace(i)}
                    state={state}
                    enemy={shownHp(enemy)}
                    ctx={ctx}
                    forecast={forecast}
                    targetable={enemyTargetable}
                    aimed={aimUid === enemy.uid}
                    preview={previewOn(enemy.uid)}
                    onClick={() => onEnemyClick(enemy.uid)}
                    onHover={(h) => setHoverEnemyUid((cur) => (h ? enemy.uid : cur === enemy.uid ? null : cur))}
                    fxClass={fx.classes[enemy.uid]}
                    fxSlot={fieldSlot(i)}
                    spriteClass={fx.catching?.targetUid === enemy.uid && fx.catching.success ? 'fx-hidden' : state.outcome === 'fled' ? 'fx-fled' : fx.sprites[enemy.uid]}
                    waiting={fx.sprites[enemy.uid] === 'fx-hidden' && fx.catching?.targetUid !== enemy.uid}
                    quiet={!!fx.catching || fx.acting}
                    interactive={interactive}
                    onThrow={(cardId, targetUid) => dispatch({ type: 'use-consumable', cardId, targetUid })}
                  />
                </div>
              ))
            : !fx.catching && <div className={styles.chip}>No enemies remain</div>}
          {/* §9.2.1 — the rival trainer at the back of its side, behind its bench, with its whole team at its feet. It
              stays to the last faint (its ball comes back to it) and walks in as the fight opens. */}
          {state.trainer && (
            <div className={styles.trainerBlock}>
              <img key={combatKey} className={[styles.trainer, animate ? styles.trainerIn : '', 'pixel'].join(' ')} src={trainerSprite(state.trainer.sprite)} alt={state.trainer.name} draggable={false} data-testid="arena-trainer" />
              <span className={styles.handTrainer} data-fx-hand="trainer" />
              <TrainerParty state={state} />
            </div>
          )}
        </div>

        {/* §9.9.1 — the hands the Poké Balls fly from and back to: a wild Pokémon's, off the right edge; yours, off the left. */}
        {!state.trainer && <span className={styles.handOffRight} data-fx-hand="trainer" />}
        <span className={styles.handPlayer} data-fx-hand="player" />

        {/* §9.2.2.4 — the AP, in the middle of the screen: docked at the bottom centre of the field, right over the hand
            it is spent from, with what the card under the pointer would spend shown before it is paid. */}
        <div className={styles.apDock}>
          <ApMeter ap={state.player.ap} base={ctx.config.baseApPerTurn} cost={costPreview} />
          {state.player.defensiveDiscount && (
            <Tipped tip={<Tip title="Defensive discount" body="You swapped this turn, so your next Defensive card costs 1 AP less. Spent the moment you play one." />} className={styles.discount}>
              −1 Def
            </Tipped>
          )}
        </div>

        <div className={styles.overlay} aria-hidden="true">
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
          {/* §9.9.2 — the moves: a dash, a throw, a beam, a bolt, the whole stage. Under the beats that outlive the state. */}
          <MoveFxLayer moves={fx.moves} boxes={slotBoxes} />
          <ArenaFx ghosts={fx.ghosts} balls={fx.balls} hits={fx.hits} catching={fx.catching} slotStyle={slotStyle} />
          {floatSlots.map(([uid, slot]) =>
            fx.floats.some((f) => f.uid === uid) ? (
              <div key={uid} className={styles.floatAnchor} style={slotStyle(slot)}>
                <FloatingNumbers uid={uid} fx={fx.floats} />
              </div>
            ) : null,
          )}
          {/* §2.6.2 — the rarity the Wild Area rolled, once, as the fight opens. */}
          {state.wildTier && <WildTierBanner key={combatKey} tier={state.wildTier} animate={animate} />}
          {fx.banner && (
            <div
              className={`${styles.banner} display`}
              key={fx.banner.id}
              style={{ '--banner-ms': `${fx.banner.ms}ms` } as CSSProperties}
            >
              {fx.banner.text}
            </div>
          )}
        </div>

        {toast && (
          <div className={styles.toast} role="status" data-testid="toast">
            {toast}
          </div>
        )}
      </section>
      </div>

      {/* §9.2.2.4 — the tray as one row: the hand and the bag in the middle, the turn's end on the right. */}
      <footer className={styles.tray} ref={trayRef}>
        <div className={styles.hand} data-testid="hand" ref={setHandEl}>
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
              overlap={handOverlap}
              lifted={drag?.id === p.card.id}
            />
          ))}
          {plays.length === 0 && <div className={styles.emptyHand}>No cards in hand</div>}
          <div className={styles.divider} data-hand-fixed />
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
        <div className={styles.turnPanel}>
          <button type="button" className={`${styles.endTurn} display`} onClick={() => dispatch({ type: 'end-turn' })} disabled={!interactive} data-testid="btn-end-turn">
            End Turn
          </button>
          {/* §3.1.2 — running is a decision with a price on it, and the price is in its bubble. Outside a run (a
              practice fixture) there is no toll to pay and no map to return to, so there is no button. */}
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
        </div>
      </footer>

      {/* §5.6 (v0.9.16) — the card itself travels with the pointer, hanging under it so what it points at stays in sight;
          over a target it can take, it shrinks and lights; over anything else it is only being carried. */}
      {drag && draggedPlay && (
        <div className={styles.dragGhost} data-over={dropOk(draggedPlay, drag) || undefined} style={{ left: drag.x, top: drag.y }} aria-hidden="true" data-testid="drag-ghost">
          <MoveCard play={draggedPlay} selected={false} onClick={() => undefined} onHover={() => undefined} index={0} total={1} ghost />
        </div>
      )}

      {leaving && (
        <div
          key={leaving.id}
          className={styles.leaving}
          style={{ left: leaving.left, top: leaving.top, '--s0': leaving.scale, '--fx-card-leave': `${FX_MS.cardLeave}ms`, '--dx': `${leaving.dx}px`, '--dy': `${leaving.dy}px` } as CSSProperties}
          aria-hidden="true"
          data-testid="leaving-card"
        >
          <MoveCard play={leaving.play} selected={false} onClick={() => undefined} onHover={() => undefined} index={0} total={1} ghost="leaving-card-face" />
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
      {/* A practice fixture is its own world (§2.4): its summary, and Play again. A run fight goes to its result above. */}
      {ended && !fx.busy && !inRun && <OutcomeOverlay state={state} onRestart={restart} onExit={() => goTo('scenarios')} />}
    </main>
  );
}

/** §5.6 — the drag is over a target this card can be played onto (an enemy for a foe card, one it acts on for yours). */
function dropOk(play: CardPlayability, d: CardDrag): boolean {
  if (!play.playable) return false;
  return play.aimsAtFoe ? d.overUid !== null : d.overAlly !== null && play.allyTargets.includes(d.overAlly);
}

/** §5.6 — what a card let go of in the wrong place says: the one it acts on, by name, when there is one. */
function dropOnAllyText(state: CombatState, targets: number[]): string {
  return dropOnAlly(targets.map((i) => state.player.team[i]?.name).filter((n): n is string => !!n));
}

/** Layout: a move card's width and the hand's gap (MoveCard.module.css, `.hand`). */
const CARD_WIDTH = 152;
const CARD_GAP = 8;

/** §5.8 — the header chip's icon for each kind of fight. */
const KIND_ICON: Record<string, typeof IconPaw> = { wild: IconPaw, trainer: IconUser, elite: IconStar, boss: IconTrophy };

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
  return o.allowed ? `Swap ${c.name} into the Lead for ${o.cost} AP${o.quick ? ' (quick swap: faster than the enemy Lead)' : ''}` : `${c.name}: ${o.reason ? REJECT_TEXT[o.reason] : 'cannot swap'}`;
}
