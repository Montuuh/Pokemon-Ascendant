import { useMemo, useState } from 'react';
import { IconAlertTriangle, IconArrowLeft, IconArrowRight, IconLock } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { GYM, MODIFIERS, RUN_START, activeMoves, inPool, isOfferable, levelFor, modifierSlots, modifierUnlocked, modifierXpMultiplier, relicPoolFor, rollRegionModifierOffer, startingRelicOffers, twinRun, typeMultiplier, unlockedStarters, type AccountState } from '@/sim';
import { portraitUrl } from '@/content/schemas/species';
import { ItemCard } from '@/ui/components/ItemCard';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { InfoDot, Tip } from '@/ui/tooltip';
import styles from './StarterSelect.module.css';

// Per docs/design/ui/screens.md §3.3 — the new-run stepper, all four steps as of v0.5: difficulty (§8.8),
// the Starter (§3.3b), the Starting Relic (§8.6.3) and the Region Modifier (§2.11.3).
//
// §2.11.3 puts the Reflection in a City, after Gyms 1 and 2, applying to the *next* Region. v0.5 has one
// Region and no Cities, so it is offered here instead — which is where §3.3's own stepper always had it.
// The rule it has to keep is the one in §2.11.3.2: one at a time, and it expires with its Region.
//
// §8.8.2 gives one modifier slot by default and two with the Level-13 Hub upgrade; each modifier opens at a
// Trainer Level. §8.6.3 offers three Starting Relics, four with the Level-3 upgrade, from the account's pool.
// §8.4.2 Twin Run adds a second starter. All of it is read off the account here and frozen into the run.

type Step = 0 | 1 | 2 | 3;
const LAST_STEP: Step = 3;

const STAT_MAX = { hp: 120, attack: 120, defense: 120, speed: 120 };

/**
 * §8.5.3 Magikarp — its Starting Relic offer is biased toward Water and toward survivability, "because the
 * first two Regions are a defensive problem". Implemented as a guarantee: at least one of these is in the
 * offer when Magikarp is the pick, drawn from the same seed so a shared seed still reproduces the pre-run.
 */
const MAGIKARP_LEAN = ['mystic-water-charm', 'barrier-charm', 'berry-pouch', 'hikers-coat', 'vital-pendant', 'brave-charm'];

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
  const MODIFIER_SLOTS = modifierSlots(account);
  const trainerLevel = levelFor(account.xp);
  // The seed is drawn once, when the screen opens, so the relic offer does not reshuffle under the cursor.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [relic, setRelic] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  const offer = useMemo(() => relicOffer(seed, startingRelicOffers(account), account, pick === 'magikarp' ? MAGIKARP_LEAN : []), [seed, account, pick]);
  // §2.11.3 — three of the seventeen, weighted. At run start there is no team to weight against yet, which
  // is the honest shape of the choice here: it is a direction, not a response.
  const regionOffer = useMemo(() => rollRegionModifierOffer(seed ^ 0x5f3a, content, [], RUN_START.money), [seed, content]);
  const starters = useMemo(() => starterIds.map((id) => content.species(id)), [starterIds, content]);
  const chosen = content.species(pick);

  /** How this starter's own type fares against the Gym ace it will have to get through. */
  const gymMatch = useMemo(() => {
    const ace = content.species(GYM.team[GYM.team.length - 1]!.species);
    const best = Math.max(...chosen.types.map((t) => typeMultiplier(t, ace.types)));
    const against = Math.max(...ace.types.map((t) => typeMultiplier(t, chosen.types)));
    if (best >= 2) return { tone: styles.gymGood, text: `Your ${chosen.types[0]} hits ${ace.name} for ×${best}. A kind start.` };
    if (best < 1) return { tone: styles.gymHard, text: `Your ${chosen.types[0]} only does ×${best} to ${ace.name}, and it hits back for ×${against}. The hard start — plan on recruiting an answer.` };
    return { tone: styles.gymFair, text: `Neutral into ${ace.name}. It comes down to levels and your bench.` };
  }, [chosen, content]);
  const kit = activeMoves(content, pick, RUN_START.starterLevel);
  const line = useMemo(() => {
    const names = [chosen.name];
    let cur = chosen;
    while (cur.evolvesTo.length) {
      // §8.5.2 Eevee — a line that forks into species, not archetypes, is shown as the fork it is.
      if (cur.evolvesTo.length > 1) {
        names.push(cur.evolvesTo.map((id) => content.species(id).name).join(' / '));
        break;
      }
      const next = content.species(cur.evolvesTo[0]!);
      names.push(next.name);
      cur = next;
    }
    return names;
  }, [chosen, content]);

  function begin() {
    newRun(pick, seed, modifiers, relic ?? undefined, region ?? undefined, second && second !== pick ? second : undefined);
    goTo('map');
  }

  /** Clicking a tile picks the starter; with Twin Run, a second click on another tile picks the partner. */
  function choose(id: string) {
    if (!twin) return setPick(id);
    if (id === pick) return setSecond(null);
    if (id === second) return setSecond(null);
    if (second === null && pick !== id) return setSecond(id);
    setPick(id);
    setSecond(null);
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
  const STEPS = ['Difficulty', 'Starter', 'Relic', 'Region'];

  return (
    <main className={styles.root} data-testid="starter-select">
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
              <InfoDot tip={<Tip title="Difficulty modifiers" body={`There is no easier setting — the baseline is the floor. Each modifier makes the run harder and pays for it in Trainer XP. You may take ${MODIFIER_SLOTS === 1 ? 'one' : MODIFIER_SLOTS}.`} footer={`Each opens at a Trainer Level; you are ${trainerLevel}. The Daycare Lady in the Hub lists them.`} />} />
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
                  <span className={styles.diffEffect}>{d.effect}</span>
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
        <section className={styles.body} data-testid="step-starter">
          <div className={styles.roster}>
            {starters.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`${styles.tile} ${pick === s.id ? styles.picked : ''} ${second === s.id ? styles.pickedSecond : ''}`}
                onClick={() => choose(s.id)}
                data-testid={`starter-${s.id}`}
                aria-pressed={pick === s.id || second === s.id}
              >
                <span className={styles.tileType}>
                  <TypeBadge type={s.types[0]!} size={18} />
                </span>
                <img src={portraitUrl(s.dex, s.id)} alt={s.name} width={132} height={132} />
                <span className={`${styles.tileName} display`}>{s.name}</span>
                {second === s.id && <span className={styles.twinTag}>Partner</span>}
              </button>
            ))}
            {twin && (
              <p className={styles.twinNote} data-testid="twin-note">
                Twin Run: pick a second tile for a partner{second ? ` — ${content.species(second).name} joins ${chosen.name}.` : '.'}
                <InfoDot tip={<Tip title="Twin Run" body="The Second Starter Slot from the reward track. Two starters, both at the starting level, and the Box starts one larger. The Active Team is still three." footer="Optional — one starter is still a run." />} />
              </p>
            )}
          </div>

          <aside className={styles.detail} data-testid="starter-detail">
            <div className={styles.detailHead}>
              <h2 className={`${styles.detailName} display`}>{chosen.name}</h2>
              <span className={styles.chips}>
                {chosen.types.map((t) => (
                  <span key={t} className={styles.typeChip}>
                    <TypeBadge type={t} size={18} />
                    {t}
                  </span>
                ))}
              </span>
            </div>
            <p className={styles.flavour}>
              Joins at Lv {RUN_START.starterLevel} with {kit.length} cards, and evolves at Lv {chosen.evolveLevel ?? '—'}.
            </p>

            <h3 className={styles.sectionTitle}>Base stats</h3>
            <dl className={styles.stats}>
              {(['hp', 'attack', 'defense', 'speed'] as const).map((k) => (
                <div key={k} className={styles.statRow}>
                  <dt>{k === 'hp' ? 'HP' : k === 'attack' ? 'Attack' : k === 'defense' ? 'Defense' : 'Speed'}</dt>
                  <dd>
                    <span className={styles.statTrack}>
                      <span className={styles.statFill} style={{ width: `${Math.min(100, (chosen.baseStats[k] / STAT_MAX[k]) * 100)}%` }} />
                    </span>
                    <span className="display tabular">{chosen.baseStats[k]}</span>
                  </dd>
                </div>
              ))}
            </dl>

            <h3 className={styles.sectionTitle}>Starting cards</h3>
            <ul className={styles.moves}>
              {kit.map((m) => {
                const move = content.move(m);
                return (
                  <li key={m} className={styles.moveChip}>
                    <TypeBadge type={move.type} size={18} />
                    <span>{move.name}</span>
                    <span className={styles.moveCost}>{move.apCost} AP</span>
                  </li>
                );
              })}
            </ul>

            <h3 className={styles.sectionTitle}>Evolution line</h3>
            <p className={styles.line}>{line.join(' → ')}</p>

            {/* Pillar 1 says the game telegraphs. It telegraphs every intent inside a fight and then said
                nothing about the run's climax, which in v0.3 was the single biggest thing separating these
                three: against a Rock/Ground Gym, Grass and Water hit for ×4 and Fire for ×½, and the win
                rates were 61 / 28 / 90 %.
                v0.4's economy narrowed that to 47 / 47 / 57 without touching the Gym — a Fire start now has
                four places to buy an answer. The line stays anyway: the matchup is still real, it is still
                the thing that decides the last fight, and a player choosing a starter deserves to know it
                before they spend twenty minutes finding out. */}
            <h3 className={styles.sectionTitle}>Region 1 Gym</h3>
            <p className={`${styles.gym} ${gymMatch.tone}`}>
              <b>
                {GYM.name} · {GYM.type}-type
              </b>
              <span>{gymMatch.text}</span>
            </p>
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
            ? `Set out with ${chosen.name}${second ? ` and ${content.species(second).name}` : ''}`
            : step === 1
              ? `Continue as ${chosen.name}${second ? ` and ${content.species(second).name}` : ''}`
              : 'Continue'}{' '}
          <IconArrowRight size={18} />
        </button>
      </footer>
    </main>
  );
}
