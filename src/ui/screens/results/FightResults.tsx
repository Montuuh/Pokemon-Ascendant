import { IconPlayerTrackNext } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { boxCapacity, xpToNext, type FightRecord } from '@/sim';
import { iconOf, nodeBadge, stageBackdrop, trainerSprite } from '@/ui/art';
import { ArenaSprite } from '@/ui/components/ArenaSprite';
import { ItemCard } from '@/ui/components/ItemCard';
import type { SfxId } from '@/ui/audio/sfx';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { badgeTip, elitePrizeTip, gauntletPrizeTip, gymRelicTip, levelGainTip, partyMonTip, xpGainTip } from '@/ui/tips';
import { OBJECTIVE_TEXT, RESULT_TEXT, VICTORY_TEXT } from '@/ui/strings';
import { InfoDot, Tipped } from '@/ui/tooltip';
import combat from '../CombatScreen.module.css';
import { LevelUpPanel } from './LevelUpPanel';
import { ProgressDoor } from './ProgressDoor';
import { ResultUnit } from './ResultUnit';
import { SpoilCard } from './SpoilCard';
import { monAt, progress, RESULT_MS, resultMons, revealPlan, ribbonTone, spoilsOf, type Beat, type ResultMon } from './results';
import { useReveal, useRevealSounds } from './useReveal';
import styles from './FightResults.module.css';

// §9.4.5 (v0.9.30) — the fight's end, on the fight's own stage (the user's pick of 2026-10-21, direction A): no overlay
// and no second page. The hand clears and the field becomes the result — your formation where the fight left it, each
// card's HP filling with any heal and its XP bar with what the fight paid (a level gained stops on the series' fanfare
// and a stat panel beside the card); the other side shows who you beat (a trainer forward with their beaten team, a
// Gym's Badge in its case, a catch where it was caught); the spoils come as cards into the tray where the hand was, and
// the way on where End Turn stood. An evolution is the series' surprise: nothing here says one is coming.
//
// The frame (top bar, stage, formation, tray) is the combat screen's own classes, so every card stands where it stood.

const PLACE_TAG = { lead: 'Lead', b1: 'Bench 1', b2: 'Bench 2' } as const;
const PLACE_SLOT = { lead: combat.slotLead, b1: combat.slotB1, b2: combat.slotB2 } as const;

/** Which sound a beat makes (§9.5.3): the bars' whistles, the fanfares, a coin for the prize money. */
function soundFor(beat: Beat, moneyFirst: boolean): SfxId | null {
  switch (beat.kind) {
    case 'xp':
      return beat.short ? 'exp-fill-short' : 'exp-fill';
    case 'level':
      return 'level-up';
    case 'heal':
      return 'hp-fill';
    case 'badge':
      return 'badge';
    case 'spoil':
      return beat.index === 0 && moneyFirst ? 'coin' : null;
    default:
      return null;
  }
}

export function FightResults() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const goTo = useAppStore((s) => s.goTo);
  const content = getContent();
  const motion = useMotionPref();

  const rec: FightRecord | null = run.lastFight ?? null;
  const reward = run.pendingReward;
  // §7.3.7 — a Gym's 1-of-3 comes after its result (and any evolution): the same stage, the tray turned to the pick.
  const gymPick = run.phase === 'legendary';
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const offer = gymPick ? (run.pendingLegendary ?? []) : picking ? (reward?.relicPick ?? []) : [];

  const mons = useMemo(() => resultMons(run, content), [run, content]);
  const spoils = useMemo(() => (gymPick ? [] : spoilsOf(run)), [run, gymPick]);
  const badgeId = rec?.badge ?? (gymPick ? run.badges[run.badges.length - 1] : undefined) ?? null;
  const plan = useMemo(() => revealPlan(mons, spoils.length, { badge: !!badgeId && !gymPick }), [mons, spoils.length, badgeId, gymPick]);
  const { t, done, advance, skip } = useReveal(plan, motion && !gymPick);
  const moneyFirst = spoils[0]?.kind === 'money';
  const sound = useCallback((b: Beat) => soundFor(b, moneyFirst), [moneyFirst]);
  useRevealSounds(plan, t, sound);

  const outcome: FightRecord['outcome'] = rec?.outcome ?? (reward?.caught ? 'caught' : 'victory');
  const ended = run.phase === 'ended';
  const held = reward?.objective?.kind === 'hold';
  const foe = rec?.foes[0] ? content.species(rec.foes[0].speciesId) : null;
  const trainer = rec?.trainer ?? null;
  const badge = badgeId ? content.badge(badgeId) : null;
  const caught = reward?.caught ? content.species(reward.caught.speciesId) : null;

  const ribbon =
    outcome === 'caught' ? RESULT_TEXT.ribbon.caught
    : outcome === 'defeat' ? (ended ? RESULT_TEXT.ribbon.defeat : RESULT_TEXT.ribbon.beaten)
    : outcome === 'escaped' ? RESULT_TEXT.ribbon.escaped
    : outcome === 'fled' ? RESULT_TEXT.fled(foe?.name ?? 'It')
    : held ? RESULT_TEXT.ribbon.held : RESULT_TEXT.ribbon.victory;
  const voice =
    outcome === 'caught' && caught ? `${RESULT_TEXT.voice.caught(caught.name)}${run.pendingRecruit ? ` ${RESULT_TEXT.voice.boxFull}` : ''}`
    : outcome === 'defeat' ? (ended ? RESULT_TEXT.voice.defeat : RESULT_TEXT.voice.ringLost)
    : outcome === 'escaped' ? RESULT_TEXT.voice.escaped(trainer ? trainer.name : RESULT_TEXT.wildFoe(foe?.name ?? 'Pokémon'))
    : outcome === 'fled' ? RESULT_TEXT.voice.fled(foe?.name ?? 'It')
    : held ? OBJECTIVE_TEXT.heldBody
    : trainer ? `${RESULT_TEXT.voice.trainer(trainer.name)}${badge ? ` ${RESULT_TEXT.voice.badge(badge.name)}` : ''}`
    : (rec?.foes.length ?? 1) > 1 ? RESULT_TEXT.voice.wilds : RESULT_TEXT.voice.wild(foe?.name ?? 'Pokémon');
  const title = trainer ? trainer.name : foe ? `Wild ${foe.name}` : ribbon;

  // ── The way on ────────────────────────────────────────────────────────────────────────────────────────────
  const leave = useCallback(() => goTo(ended ? 'defeat' : 'map'), [goTo, ended]);
  const onContinue = () => {
    if (run.phase === 'reward') {
      if (reward?.relicPick && !picking) {
        setPicking(true);
        return;
      }
      dispatch({ type: 'claim-reward' });
    }
    leave();
  };
  const onTake = (relicId: string | null) => {
    if (gymPick) dispatch({ type: 'pick-legendary', relicId });
    else dispatch({ type: 'claim-reward', ...(relicId ? { relicId } : {}) });
    leave();
  };

  // A click on the field goes to the next stop (a bar's end, a panel's); Escape, or Skip, goes to the end.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, skip]);
  // The way on takes the focus, whichever it is: Skip while the reveal plays, then Continue (D8).
  const main = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
  }, [done, picking, gymPick]);
  // Continue arrives under the pointer (and the focus) that pressed Skip: it takes no press for a moment after, so a
  // double click or a second Enter on Skip never claims the reward unseen (D8). A screen that opens finished is armed.
  const openedDone = useRef(done);
  const armedAt = useRef(0);
  useEffect(() => {
    if (done && !openedDone.current) armedAt.current = performance.now() + RESULT_MS.arm;
  }, [done]);
  const armed = (e: { detail: number }) => e.detail <= 1 && performance.now() >= armedAt.current;

  const beat = (kind: Beat['kind']) => plan.beats.find((b) => b.kind === kind);
  const ribbonP = progress(beat('ribbon')!, t);
  const foeP = progress(beat('foe')!, t);
  const badgeBeat = beat('badge');
  const badgeP = badgeBeat ? progress(badgeBeat, t) : 1;
  const spoilP = (i: number) => {
    const b = plan.beats.find((x) => x.kind === 'spoil' && x.index === i);
    return b ? progress(b, t) : 1;
  };
  const tone = ribbonTone(outcome);
  const field = mons.filter((m): m is ResultMon & { place: NonNullable<ResultMon['place']> } => !!m.place);
  const box = mons.filter((m) => !m.place && m.xp);
  // §9.4.5 — the one level-up panel standing now, if any. A bench Pokémon's stands in the open ground right of the Lead's
  // card (top for Bench 1, bottom for Bench 2) rather than over it, and its own card glows while it does.
  const levelling = field.map((m) => ({ m, p: monAt(m, plan, t).panel })).find((x) => x.p !== null && x.m.up) ?? null;
  const stage = rec?.stage ?? run.pendingScenario?.stage ?? 'gym';
  const pickTip = gymPick ? gymRelicTip(offer.some((id) => content.relic(id).rarity === 'legendary'), false) : rec?.kind === 'gauntlet' ? gauntletPrizeTip() : elitePrizeTip();
  const pickHead = gymPick ? RESULT_TEXT.gymPrize : rec?.kind === 'gauntlet' ? VICTORY_TEXT.gauntletPrize : RESULT_TEXT.elitePrize;

  return (
    <main className={`${combat.root} ${styles.root} theme-stage`} data-testid="fight-results" data-outcome={outcome} data-done={done || undefined}>
      <header className={combat.topbar}>
        <div className={combat.chips}>
          <span className={`${combat.chip} ${combat.chipStrong}`}>{title}</span>
        </div>
        <div />
        {/* The account's news waits for the reveal to land (D8), then its door. */}
        <div className={`${combat.chips} ${styles.door}`}>{!gymPick && done && <ProgressDoor />}</div>
      </header>

      {/* The live fight's own frame round its stage (§9.2.1), so every card stands where it stood. */}
      <div className={combat.stageFrame}>
      <section className={`${combat.stage} ${styles.stage}`} onClick={() => !done && advance()}>
        <div className={`${styles.backdrop} ${tone === 'amber' ? styles.grey : ''}`} style={{ backgroundImage: `url(${stageBackdrop(stage)})` }} aria-hidden="true" />
        <div className={combat.stageTint} aria-hidden="true" />
        {tone === 'gold' || tone === 'red' ? <div className={styles.lights} aria-hidden="true" /> : null}

        {/* The series' word on its ribbon, and one line in its voice. */}
        <div className={styles.headline} aria-live="polite">
          <span className={`${styles.ribbon} display`} data-tone={tone} style={{ opacity: Math.min(1, ribbonP * 2), transform: `translateY(${(1 - ease(ribbonP)) * -40}px)` }} data-testid="results-ribbon">
            {ribbon}
          </span>
          <span className={styles.voice} style={{ opacity: ease(Math.max(0, ribbonP * 1.6 - 0.6)) }} data-testid="results-voice">
            {voice}
          </span>
        </div>

        {/* Your side: the formation where the fight left it. */}
        <div className={`${combat.formation} ${combat.squadSide}`}>
          {field.map((m) => {
            const at = monAt(m, plan, t);
            const species = content.species(m.mon.speciesId);
            const up = m.up;
            const learned = up ? up.learned.map((id) => ({ name: content.move(id).name, pooled: !up.activated.includes(id) })) : [];
            return (
              <div key={m.mon.uid} className={`${PLACE_SLOT[m.place]} ${styles.slot}`}>
                <ResultUnit
                  side="ours"
                  speciesId={species.id}
                  name={species.name}
                  types={species.types}
                  shiny={!!m.mon.shiny}
                  level={at.level}
                  grew={!!up && at.level > (up.from ?? at.level)}
                  levelTip={up && done ? levelGainTip(species.name, up.from, up.to, up.gains ?? {}, up.statsAt, learned) : undefined}
                  tag={PLACE_TAG[m.place]}
                  lead={m.place === 'lead'}
                  hp={{ now: at.hp, max: m.hp.max }}
                  xp={m.xp ? { was: at.was, fill: at.fill, gain: m.xp.gain, tip: xpGainTip(m.xp.gain, false, Math.max(0, xpToNext(m.mon.level) - m.mon.xp)) } : null}
                  trauma={m.mon.traumaStacks}
                  fainted={at.hp <= 0}
                  levelling={levelling?.m === m}
                  testId={`result-${species.id}`}
                />
                {m.place === 'lead' && levelling && (
                  <LevelUpPanel name={content.species(levelling.m.mon.speciesId).name} up={levelling.m.up!} p={levelling.p!} place={levelling.m.place} />
                )}
              </div>
            );
          })}
        </div>

        {/* The open ground: a Gym's Badge in its case. */}
        <div className={combat.middle}>
          {badge && (
            <Tipped
              tip={badgeTip(badge.name, badge.description)}
              className={styles.case}
              style={{ opacity: Math.min(1, badgeP * 2), transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * spring(badgeP)})` } as CSSProperties}
              data-testid="badge-award"
            >
              <span className={styles.caseLabel}>{RESULT_TEXT.received}</span>
              <img className={styles.badgeArt} src={nodeBadge(`gym-${badge.type}`)} alt="" draggable={false} />
              <span className={`${styles.badgeName} display`}>{badge.name}</span>
              <Sparkles n={5} />
            </Tipped>
          )}
        </div>

        {/* Their side: who you beat, what you caught, where it went. */}
        <div className={`${combat.formation} ${combat.foeSolo} ${styles.foeSide}`} style={{ opacity: foeP, transform: `translateX(${(1 - ease(foeP)) * 60}px)` }}>
          {caught && reward?.caught ? (
            <div className={`${combat.slotSolo} ${styles.slot}`}>
              <ResultUnit side="foe" speciesId={caught.id} name={caught.name} types={caught.types} shiny={!!reward.caught.shiny} level={reward.caught.level} tag={run.pendingRecruit ? RESULT_TEXT.boxFull : RESULT_TEXT.newCatch} look="new" testId="reward-catch" />
              <Sparkles n={4} around />
            </div>
          ) : outcome === 'fled' ? (
            <div className={`${combat.slotSolo} ${styles.slot} ${styles.poof}`}>
              <Sparkles n={7} />
            </div>
          ) : trainer ? (
            <div className={`${combat.slotSolo} ${styles.trainer}`}>
              <ArenaSprite src={trainerSprite(trainer.sprite)} className={styles.trainerBox} />
              {rec && rec.foes.length > 0 && (
                <span className={styles.party}>
                  {/* The team as the series' party icons: a Leader's six fit one row at the trainer's feet; each names itself. */}
                  {rec.foes.map((f, i) => (
                    <Tipped key={`${f.speciesId}-${i}`} tip={partyMonTip(content.species(f.speciesId).name, f.level, outcome === 'victory')} className={`${styles.partyMon} ${outcome === 'victory' ? styles.beaten : ''}`}>
                      <img className="pixel" src={iconOf({ speciesId: f.speciesId })} alt={content.species(f.speciesId).name} draggable={false} />
                    </Tipped>
                  ))}
                </span>
              )}
            </div>
          ) : foe && rec ? (
            <div className={`${combat.slotSolo} ${styles.slot}`}>
              <ResultUnit
                side="foe"
                speciesId={foe.id}
                name={foe.name}
                types={foe.types}
                shiny={!!rec.foes[0]!.shiny}
                level={rec.foes[0]!.level}
                tag={outcome === 'victory' ? RESULT_TEXT.fainted : outcome === 'escaped' ? RESULT_TEXT.stillThere : PLACE_TAG.lead}
                lead={outcome !== 'victory'}
                look={outcome === 'victory' ? 'ghost' : outcome === 'escaped' ? 'faded' : undefined}
              />
            </div>
          ) : null}
        </div>

        {/* §7.3.7 / §2.8.1 — a pick's heading, over the tray it fills. */}
        {offer.length > 0 && (
          <span className={styles.pickHead}>
            <span className="display">{pickHead}</span>
            <InfoDot tip={pickTip} />
          </span>
        )}
      </section>
      </div>

      <footer className={`${combat.tray} ${styles.tray}`}>
        {/* §6.2.1 — the Box took its share too: a face each, its XP, and a lit level when it grew. Nothing there, no column. */}
        <div className={styles.box}>
          {box.length > 0 && <span className={styles.boxLabel}>{RESULT_TEXT.box}</span>}
          {box.map((m) => {
            const species = content.species(m.mon.speciesId);
            const up = m.up;
            return (
              <Tipped
                key={m.mon.uid}
                tip={up ? levelGainTip(species.name, up.from, up.to, up.gains ?? {}, up.statsAt, up.learned.map((id) => ({ name: content.move(id).name, pooled: !up.activated.includes(id) }))) : xpGainTip(m.xp!.gain, true, Math.max(0, xpToNext(m.mon.level) - m.mon.xp))}
                className={styles.boxMon}
                data-testid={`xp-${species.id}`}
              >
                <img className="pixel" src={iconOf(m.mon)} alt={species.name} />
                <span className="tabular">+{m.xp!.gain}</span>
                {up && <span className={`${styles.boxLevel} tabular`}>Lv {up.to}</span>}
              </Tipped>
            );
          })}
        </div>

        <div className={styles.spoils}>
          <div className={styles.cards} data-testid={offer.length ? (gymPick ? 'gym-relic-pick' : 'elite-relic-pick') : 'reward-spoils'}>
          {offer.length > 0
            ? offer.map((id) => {
                const r = content.relic(id);
                return (
                  <div key={id} className={styles.relic}>
                    <ItemCard
                      id={id}
                      kind="relic"
                      name={r.name}
                      description={r.description}
                      rarity={r.rarity}
                      {...(r.pending ? { pending: r.pending } : {})}
                      selected={chosen === id}
                      onClick={() => setChosen(chosen === id ? null : id)}
                      testId={`${gymPick ? 'legendary-offer-' : 'elite-offer-'}${id}`}
                    />
                  </div>
                );
              })
            : spoils.map((s, i) => {
                const p = spoilP(i);
                return (
                  <SpoilCard
                    key={i}
                    spoil={s}
                    style={{ opacity: Math.min(1, p * 2), transform: `translateY(${(1 - ease(p)) * 70}px) rotate(${(1 - ease(p)) * -6}deg)` }}
                    {...(s.kind === 'money' ? { testId: 'reward-money' } : s.kind === 'toll-money' ? { testId: 'results-toll' } : {})}
                  />
                );
              })}
          </div>
          {!offer.length && !spoils.length && (
            <span className={styles.note} style={{ opacity: done ? 1 : 0 }}>
              {outcome === 'fled' && (
                <>
                  <span className={styles.pill}>{RESULT_TEXT.noXp}</span>
                  <span className={styles.pill}>{RESULT_TEXT.noToll}</span>
                </>
              )}
              {outcome === 'caught' && <span className={styles.pill}>{RESULT_TEXT.box} {Math.min(run.box.length, boxCapacity(run))} / {boxCapacity(run)}</span>}
            </span>
          )}
          {/* §5.6.5 — what the fight's other objective paid, a line each. */}
          {reward?.objective && !offer.length && (
            <span className={styles.objective}>
              {reward.objective.lines.map((line) => (
                <span key={line} className={styles.pill}>
                  {line}
                </span>
              ))}
            </span>
          )}
        </div>

        <div className={`${combat.turnPanel} ${styles.way}`}>
          {!done ? (
            <button type="button" ref={main} className={styles.skip} onClick={skip} data-testid="btn-skip-results">
              {RESULT_TEXT.skip} <IconPlayerTrackNext size={16} />
            </button>
          ) : offer.length > 0 ? (
            <>
              {/* The chosen card's gold frame names the relic; the button says what it does, and its name says which. */}
              <button
                type="button"
                ref={main}
                className={`${combat.endTurn} ${styles.go} display`}
                disabled={!chosen}
                onClick={(e) => chosen && armed(e) && onTake(chosen)}
                aria-label={chosen ? RESULT_TEXT.take(content.relic(chosen).name) : RESULT_TEXT.pickOne}
                data-testid={gymPick ? 'btn-take-legendary' : 'btn-take-elite-relic'}
              >
                {chosen ? RESULT_TEXT.takeIt : RESULT_TEXT.pickOne}
              </button>
              <button type="button" className={styles.skip} onClick={(e) => armed(e) && onTake(null)} data-testid={gymPick ? 'btn-decline-legendary' : 'btn-decline-elite-relic'}>
                {RESULT_TEXT.leave}
              </button>
            </>
          ) : (
            <button type="button" ref={main} className={`${combat.endTurn} ${styles.go} display`} onClick={(e) => armed(e) && onContinue()} data-testid="btn-claim">
              {/* §7.3.7 — a Gym's pick follows its result (after any evolution), so its Continue says what comes. */}
              {reward?.relicPick || (badge && run.phase === 'reward') ? RESULT_TEXT.chooseRelic : ended ? RESULT_TEXT.runEnd : RESULT_TEXT.continue}
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}

/** Where sparkles stand: over an open patch of ground, or just outside a card's edges so they never cover its words. */
const SPARKLE_SPOTS = {
  inside: [[8, 10], [88, 18], [16, 82], [82, 74], [50, -6], [30, 46], [70, 40]],
  around: [[-5, 10], [105, 22], [-4, 86], [104, 80]],
} as const;

/** A few four-point sparkles around what they decorate; still under reduced motion (the CSS gates the twinkle). */
function Sparkles({ n, around = false }: { n: number; around?: boolean }) {
  const spots = around ? SPARKLE_SPOTS.around : SPARKLE_SPOTS.inside;
  return (
    <span className={styles.sparkles} aria-hidden="true">
      {spots.slice(0, n).map(([x, y], i) => (
        <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 140}ms` }} />
      ))}
    </span>
  );
}

const ease = (x: number) => 1 - Math.pow(1 - x, 3);
const spring = (x: number) => {
  const c = 1.70158 * 1.5;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};
