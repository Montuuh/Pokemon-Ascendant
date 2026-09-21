import { useEffect, useMemo, useState } from 'react';
import { IconCards, IconMenu2 } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useCombatStore } from '@/app/combatStore';
import { useRunStore } from '@/app/runStore';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import {
  SLOT_LABEL,
  bondRank,
  cardPlayability,
  consumablePlayability,
  indexToSlot,
  pickLeadOptions,
  swapOptions,
  type CardPlayability,
  type CombatState,
} from '@/sim';
import { stageBackdrop, spriteOf, trainerSprite } from '@/ui/art';
import { CombatLog } from '@/ui/components/CombatLog';
import { ConsumableCard } from '@/ui/components/ConsumableCard';
import { EnemyPanel } from '@/ui/components/EnemyPanel';
import { FloatingNumbers } from '@/ui/components/FloatingNumbers';
import { Modal } from '@/ui/components/Modal';
import { PauseMenu } from '@/ui/components/PauseMenu';
import { MoveCard } from '@/ui/components/MoveCard';
import { OutcomeOverlay } from '@/ui/components/OutcomeOverlay';
import { Portrait } from '@/ui/components/Portrait';
import { useCombatFx } from '@/ui/hooks/useCombatFx';
import { ENCOUNTER_LABEL, REJECT_TEXT } from '@/ui/strings';
import { iconOf } from '@/ui/art';
import { apTip, swapTip } from '@/ui/tips';
import { Tip, Tipped } from '@/ui/tooltip';
import styles from './CombatScreen.module.css';

// Per docs/design/10 §9.2 + ui/02 §2.1 — the combat screen bound to the live sim state.
// Interaction model (single enemy, v0.1): click a card to select it (preview), click the enemy or the card
// again to play. Step-Backward cards and ally-targeted consumables ask for a bench/ally click first.
export function CombatScreen() {
  const goTo = useAppStore((s) => s.goTo);
  const { ctx, state, selection, select, clearSelection, restart, combatKey } = useCombatStore();
  const [paused, setPaused] = useState(false);
  // A run fight reports its result home; a fixture fight is its own world (§2.4).
  const inRun = useRunStore((s) => s.run?.phase === 'combat');
  const hasRun = useRunStore((s) => s.run !== null);
  const finishCombat = useRunStore((s) => s.finishCombat);
  const rawDispatch = useCombatStore((s) => s.dispatch);
  const fx = useCombatFx(state, combatKey);
  const [hoverCardId, setHoverCardId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // §9.6 — the whole fight is playable from the keyboard, not just tabbable. 1–9 pick a card, Enter or Space
  // fires the selection at the enemy, E ends the turn, Esc cancels. Tab still works; this is the fast path.
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
      if (!s || s.outcome !== 'in-progress' || s.phase !== 'action') return;

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

  /** Dispatch and surface the sim's rejection reason as a toast (the sim never throws on illegal input). */
  function dispatch(action: Parameters<typeof rawDispatch>[0]): boolean {
    const ok = rawDispatch(action);
    if (!ok) {
      const r = useCombatStore.getState().lastRejected;
      fail(r ? REJECT_TEXT[r.reason] : 'Not now.');
    }
    return ok;
  }

  const plays = useMemo(() => (state ? state.player.hand.map((c) => cardPlayability(state, c.id, ctx)!) : []), [state, ctx]);
  const consumablePlays = useMemo(() => (state ? state.player.consumables.hand.map((c) => consumablePlayability(state, c.id, ctx)!) : []), [state, ctx]);
  const swaps = useMemo(() => (state ? swapOptions(state) : []), [state]);

  const bond = useAccountStore((s) => s.account.bond);

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

  const enemy = state.enemies[0] ?? null;
  const leadIdx = state.player.leadIndex;
  const lead = state.player.team[leadIdx]!;
  // §6.8.2 Trusted — a line at Bond rank 2 or more wears the shiny palette. Read from the account, not the
  // fight: it is a fact about the player, and the sim never sees it.
  const shiny = bondRank(bond[getContent().lineBase(lead.speciesId)] ?? 0) >= 2;
  const benches = state.player.team.map((_, i) => i).filter((i) => i !== leadIdx);
  const selectedPlay = selection.mode === 'card' || selection.mode === 'step-back' ? plays.find((p) => p.card.id === selection.cardId) ?? null : null;
  const previewPlay = plays.find((p) => p.card.id === hoverCardId) ?? selectedPlay;
  const intentSlot = enemy?.intent?.targetSlot ?? null;
  const targetSlots = enemy?.intent?.kind === 'cleave' ? new Set(['lead', 'bench1', 'bench2']) : new Set(intentSlot ? [intentSlot] : []);
  const ended = state.outcome !== 'in-progress';
  const interactive = !ended && !state.player.pendingLeadPick;

  function fail(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1800);
  }

  function playSelected(play: CardPlayability, stepBackTo?: number) {
    if (play.needsStepBackChoice && stepBackTo === undefined) {
      select({ mode: 'step-back', cardId: play.card.id });
      fail('Step-Backward: choose which bench Pokémon takes the Lead.');
      return;
    }
    dispatch(stepBackTo === undefined ? { type: 'play-card', cardId: play.card.id } : { type: 'play-card', cardId: play.card.id, stepBackTo });
  }

  function onCardClick(play: CardPlayability) {
    if (!interactive) return;
    if (!play.playable) return fail(play.reason ? REJECT_TEXT[play.reason] : 'Cannot play that.');
    if (selection.cardId === play.card.id && selection.mode === 'card') return playSelected(play);
    select({ mode: 'card', cardId: play.card.id });
  }

  function onEnemyClick() {
    if (!interactive) return;
    if (selectedPlay && selection.mode === 'card') playSelected(selectedPlay);
  }

  function onConsumableClick(cp: (typeof consumablePlays)[number]) {
    if (!interactive) return;
    if (!cp.playable) return fail(cp.reason ? REJECT_TEXT[cp.reason] : 'Cannot use that.');
    if (cp.needsAllyTarget) {
      if (selection.mode === 'consumable-ally' && selection.cardId === cp.cardId) return clearSelection();
      select({ mode: 'consumable-ally', cardId: cp.cardId });
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
      playSelected(selectedPlay, index);
      return;
    }
    const opt = swaps.find((o) => o.benchIndex === index);
    if (!opt) return;
    if (!opt.allowed) return fail(opt.reason ? REJECT_TEXT[opt.reason] : 'Cannot swap.');
    dispatch({ type: 'swap', benchIndex: index });
  }

  const allySelectable = selection.mode === 'consumable-ally';
  const stepBackSelectable = selection.mode === 'step-back' && selectedPlay ? new Set(selectedPlay.stepBackOptions) : new Set<number>();

  return (
    <main className={`${styles.root} theme-stage`} data-testid="combat-screen" data-turn={state.turn} data-outcome={state.outcome} data-phase={state.phase}>
      {/* §9.6 — the fight narrates itself. Without this a screen-reader player gets a silent board: the log
          is the only place a hit, a status or a faint is ever stated in words. */}
      <p className="sr-only" role="status" aria-live="polite" data-testid="combat-announcer">
        {state.log.slice(-1).map((l) => l.text).join(' ')}
      </p>
      <p className="sr-only">
        Turn {state.turn}, {state.player.ap} action points. Press 1 to 9 to pick a card, E to end the turn,
        Escape to cancel.
      </p>
      <header className={styles.topbar}>
        <div className={styles.chips}>
          {/* One way out of a fight, and it is the same menu the map has. The back arrow this replaced went to
              the practice-fight picker — from inside a run — and the restart beside it rebuilt a fixture that
              a run fight does not have. Neither belonged on a player's screen. */}
          <button type="button" className={styles.iconBtn} onClick={() => setPaused(true)} aria-label="Menu" data-testid="btn-pause">
            <IconMenu2 size={18} />
          </button>
          <span className={`${styles.chip} ${styles.chipStrong}`}>{scenarioName(state)}</span>
          <span className={styles.chip}>{ENCOUNTER_LABEL[state.kind] ?? state.kind}</span>
          {state.trainer && <span className={styles.chip}>{state.trainer.name}</span>}
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

      <section className={styles.stage} style={{ backgroundImage: `url(${stageBackdrop(state.stage)})` }}>
        <div className={styles.stageTint} aria-hidden="true" />

        <div className={styles.squad} data-testid="squad">
          {benches[0] !== undefined && (
            <div className={styles.benchTop}>
              <Portrait mon={state.player.team[benches[0]]!} variant="bench" slotLabel={SLOT_LABEL[indexToSlot(state, benches[0])]} swapCost={swaps.find((o) => o.benchIndex === benches[0])?.cost} swapAllowed={swaps.find((o) => o.benchIndex === benches[0])?.allowed} swapHint={swapHint(state, benches[0], swaps)} targeted={targetSlots.has(indexToSlot(state, benches[0]))} selectable={(allySelectable && state.player.team[benches[0]]!.hp > 0) || stepBackSelectable.has(benches[0])} onClick={() => onTeamClick(benches[0]!)} fx={fx.floats} fxClass={fx.classes[state.player.team[benches[0]]!.uid]} />
            </div>
          )}
          {benches[1] !== undefined && (
            <div className={styles.benchBottom}>
              <Portrait mon={state.player.team[benches[1]]!} variant="bench" slotLabel={SLOT_LABEL[indexToSlot(state, benches[1])]} swapCost={swaps.find((o) => o.benchIndex === benches[1])?.cost} swapAllowed={swaps.find((o) => o.benchIndex === benches[1])?.allowed} swapHint={swapHint(state, benches[1], swaps)} targeted={targetSlots.has(indexToSlot(state, benches[1]))} selectable={(allySelectable && state.player.team[benches[1]]!.hp > 0) || stepBackSelectable.has(benches[1])} onClick={() => onTeamClick(benches[1]!)} fx={fx.floats} fxClass={fx.classes[state.player.team[benches[1]]!.uid]} />
            </div>
          )}
          <div className={styles.leadSlot}>
            <Portrait mon={lead} variant="lead" slotLabel="Lead" targeted={targetSlots.has('lead')} selectable={allySelectable && lead.hp > 0} onClick={() => onTeamClick(leadIdx)} fx={fx.floats} fxClass={fx.classes[lead.uid]} />
          </div>
        </div>

        <div className={styles.arena} aria-hidden="true">
          {lead.hp > 0 && (
            <div className={`${styles.leadSprite} ${fx.classes[lead.uid] === 'fx-lunge-right' ? 'fx-lunge-right' : ''}`}>
              <img className="pixel" src={spriteOf(lead, 'back', shiny)} alt="" draggable={false} data-shiny={shiny || undefined} />
              <span className={styles.platform} />
            </div>
          )}
          {state.trainer && enemy && (
            <img className={`${styles.trainer} pixel`} src={trainerSprite(state.trainer.sprite)} alt={state.trainer.name} draggable={false} />
          )}
          {enemy && (
            <div className={`${styles.enemySprite} ${fx.classes[enemy.uid] ?? ''}`} data-testid="arena-enemy">
              <img className="pixel" src={spriteOf(enemy, 'front')} alt="" draggable={false} style={enemy.hp <= 0 ? { opacity: 0 } : undefined} />
              <span className={styles.platform} />
              <FloatingNumbers uid={enemy.uid} fx={fx.floats} />
            </div>
          )}
          {previewPlay?.damage && enemy && (
            <div className={styles.preview} data-testid="damage-preview">
              <div className={`${styles.previewValue} display tabular`}>{previewPlay.damage.final}</div>
              <div className={styles.previewSub}>
                {previewPlay.move.name} · {previewPlay.damage.hasStab ? 'STAB ×1.5 · ' : ''}
                {previewPlay.damage.typeMultiplier !== 1 ? `type ×${previewPlay.damage.typeMultiplier}` : 'neutral'}
                {previewPlay.damage.isCrit ? ' · crit' : ''}
              </div>
              {enemy.hp <= previewPlay.damage.final && <div className={styles.previewKo}>KO</div>}
            </div>
          )}
          {fx.banner && (
            <div className={`${styles.banner} display`} key={fx.banner + state.nextSeq}>
              {fx.banner}
            </div>
          )}
        </div>

        <div className={styles.enemyZone}>
          {enemy ? (
            <EnemyPanel state={state} enemy={enemy} ctx={ctx} targetable={!!selectedPlay && selection.mode === 'card' && interactive} onClick={onEnemyClick} fxClass={fx.classes[enemy.uid]} />
          ) : (
            <div className={styles.chip}>No enemies remain</div>
          )}
          {state.enemyQueue.length > 0 && (
            <Tipped as="div" tip={<Tip title="Still to come" body="This trainer sends out the next Pokémon when this one falls. You fight them one at a time." />} className={styles.queue}>
              {state.enemyQueue.map((e) => (
                <img key={e.uid} className="pixel" src={iconOf(e)} alt={e.name} width={34} height={28} />
              ))}
              <span>next</span>
            </Tipped>
          )}
        </div>

        <div className={styles.logWrap}>
          <CombatLog log={state.log} />
        </div>

        {selection.mode !== 'none' && (
          <div className={styles.hint} data-testid="selection-hint">
            {selection.mode === 'card' && 'Click the enemy (or the card again) to play it. Esc to cancel.'}
            {selection.mode === 'step-back' && 'Choose the bench Pokémon that takes the Lead after the hit.'}
            {selection.mode === 'consumable-ally' && 'Choose the Pokémon to use it on.'}
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

      <footer className={styles.tray}>
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
          <button type="button" className={`${styles.endTurn} display`} onClick={() => dispatch({ type: 'end-turn' })} disabled={!interactive} data-testid="btn-end-turn">
            End Turn
          </button>
        </div>
        <div className={styles.hand} data-testid="hand">
          {plays.map((p, i) => (
            <MoveCard key={p.card.id} play={p} selected={selection.cardId === p.card.id && selection.mode !== 'consumable-ally'} onClick={() => onCardClick(p)} onHover={(h) => setHoverCardId(h ? p.card.id : null)} index={i} total={plays.length} />
          ))}
          {plays.length === 0 && <div className={styles.emptyHand}>No cards in hand</div>}
          <div className={styles.divider} />
          {consumablePlays.map((cp) => (
            <ConsumableCard key={cp.cardId} play={cp} selected={selection.mode === 'consumable-ally' && selection.cardId === cp.cardId} onClick={() => onConsumableClick(cp)} />
          ))}
        </div>
      </footer>

      {state.player.pendingLeadPick && !ended && (
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
      {ended && (
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
