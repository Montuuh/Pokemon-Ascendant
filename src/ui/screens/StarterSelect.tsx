import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { IconAlertTriangle, IconArrowLeft, IconArrowRight, IconHandGrab, IconHeartFilled, IconLock, IconTargetArrow, IconX } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { BOND_RANK_NAME, MODIFIERS, POKEMON_TYPES, RUN_START, activeMoves, bondRank, runPerksFor, inPool, isOfferable, levelFor, modifierSlots, modifierUnlocked, modifierXpMultiplier, relicPoolFor, regionModifierOffer, startingRelicOffers, twinRun, typeMultiplier, unlockedStarters, type AccountState, type PokemonType } from '@/sim';
import { portraitUrl } from '@/content/schemas/species';
import { moveArt, spriteOf } from '@/ui/art';
import { ArenaSprite } from '@/ui/components/ArenaSprite';
import card from '@/ui/components/UnitCard.module.css';
import { TitleBattle } from '@/ui/title/TitleBattle';
import { ItemCard } from '@/ui/components/ItemCard';
import { TypeBadge, TypeLabel } from '@/ui/components/TypeBadge';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { bondStatusTip, clearPartnerTip, moveDefTip, twinRunTip } from '@/ui/tips';
import { describeMoveDef } from '@/ui/moveText';
import { DIFFICULTY_TEXT, STAT_LONG, STARTER_TEXT } from '@/ui/strings';
import styles from './StarterSelect.module.css';

// Per docs/design/ui/screens.md §3.3 — the new-run stepper: difficulty (§8.8), the Starter (§3.3b), the Starting Relic
// (§8.6.3) and the Region Modifier (§2.11.3) — the last only while Region Modifiers are on (off since v0.9.9).
//
// §2.11.3 puts the Reflection in a City, after Gyms 1 and 2, applying to the *next* Region. v0.5 has one
// Region and no Cities, so it is offered here instead — which is where §3.3's own stepper always had it.
// The rule it has to keep is the one in §2.11.3.2: one at a time, and it expires with its Region.
//
// §8.8.2 gives one modifier slot by default and two with the Level-13 Hub upgrade; each modifier opens at a
// Trainer Level. §8.6.3 offers three Starting Relics, four with the Level-3 upgrade, from the account's pool.
// §8.4.2 Twin Run adds a second starter. All of it is read off the account here and frozen into the run.

type Step = 0 | 1 | 2 | 3;

const STAT_MAX = { hp: 120, attack: 120, defense: 120, speed: 120 };

/**
 * §8.5.3 Magikarp — its Starting Relic offer is biased toward Water and toward survivability, "because the
 * first two Regions are a defensive problem". Implemented as a guarantee: at least one of these is in the
 * offer when Magikarp is the pick, drawn from the same seed so a shared seed still reproduces the pre-run.
 */
const MAGIKARP_LEAN = ['water-gem', 'barrier-charm', 'berry-pouch', 'hikers-coat', 'vital-pendant', 'brave-charm'];

/** §8.6.3 — the offer is Common and Uncommon only, from the account's pool, seeded off the run seed. */
function relicOffer(seed: number, count: number, account: AccountState, lean: readonly string[] = []): string[] {
  const content = getContent();
  const accountPool = relicPoolFor(account, content);
  const pool = content
    .allRelics()
    // §7.7 — same rule as every other offer: a relic whose system does not exist is not on the menu.
    // §8.6.2 — and a Tier-2 or Tier-3 relic the account has not opened is not in the pool at all.
    .filter((r) => isOfferable(r) && inPool(r, accountPool) && (r.rarity === 'common' || r.rarity === 'uncommon'));
  // A tiny deterministic shuffle: the offer has to be stable across re-renders, and seeding it off the run
  // seed means a shared seed reproduces the whole pre-run, not just the map.
  const out: string[] = [];
  let x = (seed || 1) >>> 0;
  const rest = [...pool];
  for (let i = 0; i < count && rest.length; i++) {
    x = (x * 1664525 + 1013904223) >>> 0;
    out.push(rest.splice(x % rest.length, 1)[0]!.id);
  }
  const leanPool = pool.map((r) => r.id).filter((id) => lean.includes(id) && !out.includes(id));
  if (lean.length && leanPool.length && !out.some((id) => lean.includes(id))) {
    x = (x * 1664525 + 1013904223) >>> 0;
    out[out.length - 1] = leanPool[x % leanPool.length]!;
  }
  return out;
}

/**
 * §8.8 — a modifier's effect as it reads for this account: Box Squeeze's numbers are the Box you have bought (the user's
 * note, 2026-10-19) — the base ones struck through beside yours when an Expanded Box or a Twin Run's partner has grown it.
 */
function modifierEffect(id: string, effect: string, boxBonus: number): ReactNode {
  const squeeze = MODIFIERS.find((m) => m.id === 'box-squeeze');
  if (id !== 'box-squeeze' || boxBonus <= 0 || !squeeze?.params) return effect;
  const base = RUN_START.boxCapacity;
  const cut = squeeze.params.boxCut!;
  const t = DIFFICULTY_TEXT.boxSqueeze;
  const yours = (from: number, to: number) => (
    <>
      <s className={styles.was} aria-hidden="true">{from}</s> <b>{to}</b>
    </>
  );
  return (
    <span aria-label={t.plain(base + boxBonus - cut, base + boxBonus)}>
      {t.holds} {yours(base - cut, base + boxBonus - cut)} {t.instead} {yours(base, base + boxBonus)}
      {t.tail}
    </span>
  );
}

export function StarterSelect() {
  const goTo = useAppStore((s) => s.goTo);
  const newRun = useRunStore((s) => s.newRun);
  const account = useAccountStore((s) => s.account);
  const [step, setStep] = useState<Step>(0);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const content = getContent();
  const starterIds = useMemo(() => unlockedStarters(account, content), [account, content]);
  const [pick, setPick] = useState(starterIds[0]!);
  // §8.4.2 Twin Run — the second starter, when the upgrade is held. Null is "just the one".
  const twin = twinRun(account);
  const [second, setSecond] = useState<string | null>(null);
  // §8.4.2 — which of the two places a click on a tile fills: the Lead first, then the partner (v0.9.9).
  const [slot, setSlot] = useState<'lead' | 'partner'>('lead');
  const MODIFIER_SLOTS = modifierSlots(account);
  const trainerLevel = levelFor(account.xp);
  // The seed is drawn once, when the screen opens, so the relic offer does not reshuffle under the cursor.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [relic, setRelic] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  const offer = useMemo(() => relicOffer(seed, startingRelicOffers(account), account, pick === 'magikarp' ? MAGIKARP_LEAN : []), [seed, account, pick]);
  // §2.11.3 — three of the seventeen, weighted. At run start there is no team to weight against yet, which
  // is the honest shape of the choice here: it is a direction, not a response.
  const regionOffer = useMemo(() => regionModifierOffer(seed ^ 0x5f3a, content, [], RUN_START.money), [seed, content]);
  // Region Modifiers off (v0.9.9): the stepper ends at the relic.
  const LAST_STEP: Step = regionOffer.length ? 3 : 2;
  const starters = useMemo(() => starterIds.map((id) => content.species(id)), [starterIds, content]);
  // The detail panel shows the place being filled: the partner, once there is one and it is the place in focus.
  const chosen = content.species(twin && slot === 'partner' && second ? second : pick);
  // §8.5 — the roster narrowed by type (a long one: every Soulbound line joins it). Null is every type.
  const [typeFilter, setTypeFilter] = useState<PokemonType | null>(null);
  const rosterTypes = useMemo(() => POKEMON_TYPES.filter((t) => starters.some((s) => s.types.includes(t))), [starters]);
  const shown = typeFilter ? starters.filter((s) => s.types.includes(typeFilter)) : starters;
  // The cards of the starter on show — the partner's when the partner is in focus (the user's report, 2026-10-19: they
  // were always the Lead's).
  const kit = activeMoves(content, chosen.id, RUN_START.starterLevel);
  const chosenRank = bondRank(account.bond[chosen.id] ?? 0);
  const bestStat = (['hp', 'attack', 'defense', 'speed'] as const).reduce((a, k) => (chosen.baseStats[k] > chosen.baseStats[a] ? k : a), 'hp' as 'hp' | 'attack' | 'defense' | 'speed');
  /** The line from this form: each stage its forms (a fork shows every branch) and the level it is reached at. */
  const line = (() => {
    const stages: { ids: string[]; at?: number }[] = [{ ids: [chosen.id] }];
    let cur = chosen;
    while (cur.evolvesTo.length) {
      // §8.5.2 Eevee — a line that forks into species, not archetypes, is shown as the fork it is.
      stages.push({ ids: [...cur.evolvesTo], ...(cur.evolveLevel ? { at: cur.evolveLevel } : {}) });
      if (cur.evolvesTo.length > 1) break;
      cur = content.species(cur.evolvesTo[0]!);
    }
    return stages;
  })();
  /** §4.1.2 — what this starter's types take ×2 or more from, what they resist, and what does nothing to them. */
  const matchups = (() => {
    const by = (pred: (m: number) => boolean) => POKEMON_TYPES.filter((atk) => pred(typeMultiplier(atk, chosen.types)));
    return [
      { label: STARTER_TEXT.weakTo, types: by((m) => m > 1), weak: true },
      { label: STARTER_TEXT.resists, types: by((m) => m > 0 && m < 1), weak: false },
      { label: STARTER_TEXT.immune, types: by((m) => m === 0), weak: false },
    ];
  })();

  function begin() {
    newRun(pick, seed, modifiers, relic ?? undefined, region ?? undefined, second && second !== pick ? second : undefined);
    goTo('map');
  }

  /**
   * §8.4.2 Twin Run — a tile fills the place in focus. The Lead first; once it is chosen the focus moves to the
   * partner. A tile already in the other place trades places with it, so the two are never the same Pokémon.
   */
  function choose(id: string) {
    if (!twin) return setPick(id);
    if (slot === 'lead') {
      if (id === second) setSecond(pick);
      setPick(id);
      // The partner is next only when there is none yet; a swap keeps the focus on the place just filled.
      if (!second) setSlot('partner');
      return;
    }
    if (id === pick) {
      // The Lead's own tile, with no partner to trade with: the click moves the focus back to the Lead.
      if (!second) return setSlot('lead');
      setPick(second);
      setSecond(id);
      return;
    }
    setSecond(id);
  }

  function toggleModifier(id: string) {
    setModifiers((on) => {
      if (on.includes(id)) return on.filter((m) => m !== id);
      // §8.8.2 — one slot. Picking a second replaces the first rather than refusing the click: the player
      // said what they wanted, and a button that does nothing when pressed is a worse answer than a swap.
      return [...on, id].slice(-MODIFIER_SLOTS);
    });
  }

  const xpBonus = modifierXpMultiplier(modifiers);
  // §8.8 — the Box the account has bought (an Expanded Box, a Twin Run's partner): what Box Squeeze takes two from.
  const boxBonus = runPerksFor(account, content, !!second && second !== pick).boxBonus;
  const STEPS = ['Difficulty', 'Starter', 'Relic', 'Region'].slice(0, LAST_STEP + 1);

  return (
    <main className={`${styles.root} theme-stage`} data-testid="starter-select">
      {/* §9.13 — the title's battle carries on behind the new-run steps, under a dusk the panels read on. */}
      <TitleBattle className={styles.battle} />
      <div className={styles.veil} aria-hidden="true" />
      <header className={styles.chrome}>
        <h1 className={`${styles.title} display`}>New run</h1>
        <ol className={styles.dots} aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? styles.dotOn : styles.dot}>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </header>

      {step === 0 ? (
        <section className={styles.body} data-testid="step-difficulty">
          <div className={styles.diffIntro}>
            <h2 className={`${styles.stepTitle} display`}>
              Make it harder, if you want to
              <InfoDot tip={<Tip title="Difficulty modifiers" body={`There is no easier setting — the baseline is the floor. Each modifier makes the run harder and pays for it in Trainer XP. You may take ${MODIFIER_SLOTS === 1 ? 'one' : MODIFIER_SLOTS}.`} footer={`Each opens at a Trainer Level; you are ${trainerLevel}.`} />} />
            </h2>
            <p className={styles.stepLede}>Optional. The baseline is the floor.</p>
            <p className={styles.xpTally} data-testid="difficulty-xp">
              Trainer XP this run: <b className="tabular">×{xpBonus.toFixed(2)}</b>
              {modifiers.length === 0 && <span className={styles.xpNote}> — baseline. Nothing selected.</span>}
            </p>
          </div>

          <div className={styles.difficulties}>
            {[...MODIFIERS].sort((a, b) => a.unlockLevel - b.unlockLevel).map((d) => {
              const on = modifiers.includes(d.id);
              // §8.8.2 — a row below your Trainer Level is shown, named and locked, not hidden.
              const open = d.available && modifierUnlocked(account, d);
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`${styles.diffCard} ${on ? styles.picked : ''} ${open ? '' : styles.locked}`}
                  onClick={() => open && toggleModifier(d.id)}
                  disabled={!open}
                  aria-pressed={on}
                  data-testid={`difficulty-${d.id}`}
                >
                  <span className={`${styles.diffName} display`}>{d.name}</span>
                  <span className={styles.diffXp}>×{d.xpMultiplier.toFixed(2)} XP</span>
                  <span className={styles.diffEffect}>{modifierEffect(d.id, d.effect, boxBonus)}</span>
                  {/* §7.7's rule applied to modifiers: a row whose system does not exist says so and cannot
                      be taken, rather than charging its XP premium for nothing. */}
                  {!d.available ? (
                    <span className={styles.lockTag}>
                      <IconLock size={13} /> {d.pending}
                    </span>
                  ) : !open ? (
                    <span className={styles.lockTag} data-testid={`difficulty-lock-${d.id}`}>
                      <IconLock size={13} /> {d.unlock}
                    </span>
                  ) : null}
                  {d.available && d.partial && (
                    <span className={styles.partialTag}>
                      <IconAlertTriangle size={13} /> {d.partial}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ) : step === 2 ? (
        <section className={styles.body} data-testid="step-relic">
          <div className={styles.diffIntro}>
            <h2 className={`${styles.stepTitle} display`}>
              One relic to start with
              <InfoDot tip={<Tip title="Starting Relic" body="Common and Uncommon only, drawn from your account's pool: it sets a direction, it does not decide the build. Works from the first fight and never comes off." footer={offer.length === 4 ? 'Four offers — the Curated Starting Relic +1 upgrade. You can take none.' : 'You can take none.'} />} />
            </h2>
            <p className={styles.stepLede}>Works from the first fight. Never comes off.</p>
          </div>

          <div className={styles.relics}>
            {offer.map((id) => {
              const r = content.relic(id);
              return (
                <ItemCard
                  key={id}
                  id={id}
                  kind="relic"
                  name={r.name}
                  description={r.description}
                  rarity={r.rarity}
                  {...(r.pending ? { pending: r.pending } : {})}
                  selected={relic === id}
                  onClick={() => setRelic(relic === id ? null : id)}
                  testId={`relic-offer-${id}`}
                  footer={<span className={styles.relicTake}>{relic === id ? 'Taking this one' : 'Take it'}</span>}
                />
              );
            })}
          </div>

        </section>
      ) : step === 3 ? (
        <section className={styles.body} data-testid="step-region">
          <div className={styles.diffIntro}>
            <h2 className={`${styles.stepTitle} display`}>
              One rule for the whole Region
              <InfoDot tip={<Tip title="Region Modifier" body="In force from the first node to the Gym, then gone. You hold exactly one; they never stack, and this is the only offer." footer="You can take none." />} />
            </h2>
            <p className={styles.stepLede}>From the first node to the Gym, then gone.</p>
          </div>

          <div className={styles.relics}>
            {regionOffer.map((id) => {
              const m = content.regionModifier(id);
              return (
                <ItemCard
                  key={id}
                  id={id}
                  kind="relic"
                  name={m.name}
                  description={m.description}
                  tag={m.tier}
                  selected={region === id}
                  onClick={() => setRegion(region === id ? null : id)}
                  testId={`region-offer-${id}`}
                  footer={<span className={styles.relicTake}>{region === id ? 'This one' : 'Take it'}</span>}
                />
              );
            })}
          </div>

        </section>
      ) : (
        <section className={`${styles.body} ${styles.starterBody}`} data-testid="step-starter">
          <div className={styles.rosterPane}>
            {/* §8.4.2 Twin Run — the two places, Lead and partner: a click on a place puts it in focus. */}
            {twin && (
              <div className={styles.slots} role="group" aria-label="Your two starters" data-testid="twin-slots">
                {(['lead', 'partner'] as const).map((place) => {
                  const id = place === 'lead' ? pick : second;
                  const s = id ? content.species(id) : null;
                  return (
                    <div key={place} className={`${styles.slot} ${slot === place ? styles.slotOn : ''}`} data-place={place}>
                      <button type="button" className={styles.slotPick} aria-pressed={slot === place} onClick={() => setSlot(place)} data-testid={`twin-slot-${place}`}>
                        {s ? <img src={portraitUrl(s.dex, s.id)} alt="" width={40} height={40} /> : <span className={styles.slotEmpty} aria-hidden="true" />}
                        <span className={styles.slotText}>
                          <span className={styles.slotLabel}>{place === 'lead' ? STARTER_TEXT.lead : STARTER_TEXT.partner}</span>
                          <span className={`${styles.slotName} display`}>{s ? s.name : STARTER_TEXT.pickPartner}</span>
                        </span>
                      </button>
                      {place === 'partner' && second && (
                        <Tipped as="button" type="button" tip={clearPartnerTip()} className={styles.slotClear} aria-label={STARTER_TEXT.clearPartner} onClick={() => { setSecond(null); setSlot('partner'); }} data-testid="twin-slot-clear">
                          <IconX size={16} />
                        </Tipped>
                      )}
                    </div>
                  );
                })}
                <InfoDot tip={twinRunTip()} />
              </div>
            )}
            {/* A long roster (the Mart's three, every Soulbound line, §6.8.2): narrowed by type, a click on a chip; the count says
                how many. Three starters need no filter. */}
            {starters.length > 4 && rosterTypes.length > 1 && (
              <div className={styles.filters} role="group" aria-label={STARTER_TEXT.filter} data-testid="starter-filters">
                <button type="button" className={`${styles.filter} ${typeFilter === null ? styles.filterOn : ''}`} aria-pressed={typeFilter === null} onClick={() => setTypeFilter(null)} data-testid="starter-filter-all">
                  {STARTER_TEXT.all} <span className="tabular">{starters.length}</span>
                </button>
                {rosterTypes.map((t) => (
                  <button key={t} type="button" className={`${styles.filter} ${typeFilter === t ? styles.filterOn : ''}`} aria-pressed={typeFilter === t} aria-label={STARTER_TEXT.onlyType(t, starters.filter((x) => x.types.includes(t)).length)} onClick={() => setTypeFilter(typeFilter === t ? null : t)} data-testid={`starter-filter-${t}`}>
                    <TypeLabel type={t} size={16} />
                  </button>
                ))}
              </div>
            )}
            <div className={styles.roster} data-testid="starter-roster">
              {shown.map((s) => {
                const place = pick === s.id ? STARTER_TEXT.lead : second === s.id ? STARTER_TEXT.partner : null;
                const rank = bondRank(account.bond[s.id] ?? 0);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`${styles.tile} ${pick === s.id ? styles.picked : ''} ${second === s.id ? styles.pickedSecond : ''} ${chosen.id === s.id ? styles.inFocus : ''}`}
                    onClick={() => choose(s.id)}
                    data-testid={`starter-${s.id}`}
                    aria-pressed={pick === s.id || second === s.id}
                  >
                    {/* §9.13.3 — each starter as the fights draw it: its battle sprite in the window a combat card gives a
                        Pokémon (§9.2.1), lit in its type; the one chosen breathes. */}
                    <span className={`${card.window} ${styles.tileWindow}`} style={{ '--unit-type': `var(--type-${s.types[0] ?? 'normal'})` } as CSSProperties} aria-hidden="true">
                      <span className={card.stand}>
                        <ArenaSprite src={spriteOf({ speciesId: s.id }, 'front')} className={card.sprite} {...(pick === s.id || second === s.id ? { imgClassName: card.breathe } : {})} />
                      </span>
                    </span>
                    {place && <span className={`${styles.tilePlace} ${second === s.id ? styles.tilePlacePartner : ''}`}>{place}</span>}
                    <span className={`${styles.tileName} display`}>{s.name}</span>
                    <span className={styles.tileTypes}>
                      {s.types.map((t) => (
                        <TypeBadge key={t} type={t} size={14} defenderTypes={s.types} />
                      ))}
                      {rank > 0 && (
                        <Tipped as="span" tip={bondStatusTip(rank, s.name)} className={styles.tileBond} aria-label={`Bond: ${BOND_RANK_NAME[rank]}`}>
                          <IconHeartFilled size={11} /> {rank}
                        </Tipped>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className={styles.detail} data-testid="starter-detail">
            <div className={styles.hero}>
              <span className={`${card.window} ${styles.heroWindow}`} style={{ '--unit-type': `var(--type-${chosen.types[0] ?? 'normal'})` } as CSSProperties} aria-hidden="true">
                <span className={card.stand}>
                  <ArenaSprite src={spriteOf({ speciesId: chosen.id }, 'front')} className={card.sprite} imgClassName={card.breathe} />
                </span>
              </span>
              <div className={styles.heroText}>
                <span className={styles.dex}>#{String(chosen.dex).padStart(3, '0')}</span>
                <h2 className={`${styles.detailName} display`}>{chosen.name}</h2>
                <span className={styles.chips}>
                  {chosen.types.map((t) => (
                    <TypeBadge key={t} type={t} size={18} defenderTypes={chosen.types} />
                  ))}
                </span>
                {chosenRank > 0 && (
                  <Tipped as="span" tip={bondStatusTip(chosenRank, chosen.name)} className={styles.bond} data-testid="starter-bond">
                    <IconHeartFilled size={12} /> {BOND_RANK_NAME[chosenRank]}
                  </Tipped>
                )}
              </div>
            </div>

            <h3 className={styles.sectionTitle}>{STARTER_TEXT.startingCards}</h3>
            <ul className={styles.moves}>
              {kit.map((m) => {
                const move = content.move(m);
                const Range = move.range === 'melee' ? IconHandGrab : IconTargetArrow;
                return (
                  <Tipped as="li" key={m} tip={moveDefTip(move)} className={styles.moveRow} style={{ '--card-type': `var(--type-${move.type})` } as CSSProperties}>
                    <span className={`${styles.moveCost} display tabular`}>{move.apCost}</span>
                    <img className={`${styles.moveArt} pixel`} src={moveArt(move.id)} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                    <span className={styles.moveText}>
                      <b>{move.name}</b>
                      <small>{describeMoveDef(move) || STARTER_TEXT.noEffect}</small>
                    </span>
                    <span className={styles.moveMeta}>
                      <Range size={14} stroke={2.4} aria-label={move.range} />
                      <span className="display tabular">{move.power > 0 ? move.power : '—'}</span>
                      <TypeBadge type={move.type} size={14} mode="attack" />
                    </span>
                  </Tipped>
                );
              })}
            </ul>

            <h3 className={styles.sectionTitle}>{STARTER_TEXT.baseStats}</h3>
            <dl className={styles.stats}>
              {(['hp', 'attack', 'defense', 'speed'] as const).map((k) => (
                <div key={k} className={styles.statRow}>
                  <dt>{STAT_LONG[k]}</dt>
                  <dd>
                    <span className={styles.statTrack}>
                      <span className={`${styles.statFill} ${k === bestStat ? styles.statBest : ''}`} style={{ width: `${Math.min(100, (chosen.baseStats[k] / STAT_MAX[k]) * 100)}%` }} />
                    </span>
                    <span className="display tabular">{chosen.baseStats[k]}</span>
                  </dd>
                </div>
              ))}
            </dl>

            <h3 className={styles.sectionTitle}>{STARTER_TEXT.evolution}</h3>
            <ol className={styles.evoLine} data-testid="starter-evo-line">
              {line.map((stage, i) => (
                <li key={stage.ids.join('/')} className={styles.evoStage}>
                  {i > 0 && <span className={styles.evoArrow}>{stage.at ? `Lv ${stage.at}` : '→'}</span>}
                  <span className={styles.evoForms}>
                    {stage.ids.map((id) => {
                      const sp = content.species(id);
                      return (
                        <span key={id} className={styles.evoForm}>
                          <img src={portraitUrl(sp.dex, sp.id)} alt="" width={40} height={40} />
                          <span>{sp.name}</span>
                        </span>
                      );
                    })}
                  </span>
                </li>
              ))}
            </ol>

            <h3 className={styles.sectionTitle}>{STARTER_TEXT.matchups}</h3>
            <div className={styles.matchups}>
              {matchups.map((row) =>
                row.types.length ? (
                  <div key={row.label} className={styles.matchRow}>
                    <span className={`${styles.matchLabel} ${row.weak ? styles.matchWeak : styles.matchStrong}`}>{row.label}</span>
                    <span className={styles.matchTypes}>
                      {row.types.map((t) => (
                        <TypeBadge key={t} type={t} size={14} />
                      ))}
                    </span>
                  </div>
                ) : null,
              )}
            </div>
          </aside>
        </section>
      )}

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.back}
          onClick={() => (step === 0 ? goTo('menu') : setStep((s) => (s - 1) as Step))}
          data-testid="btn-back"
        >
          <IconArrowLeft size={18} /> Back
        </button>
        <button
          type="button"
          className={styles.next}
          onClick={() => (step === LAST_STEP ? begin() : setStep((s) => (s + 1) as Step))}
          data-testid="btn-continue"
        >
          {step === LAST_STEP
            ? `Set out with ${content.species(pick).name}${second ? ` and ${content.species(second).name}` : ''}`
            : step === 1
              ? `Continue as ${content.species(pick).name}${second ? ` and ${content.species(second).name}` : ''}`
              : 'Continue'}{' '}
          <IconArrowRight size={18} />
        </button>
      </footer>
    </main>
  );
}
