import { useEffect, useMemo, useState } from 'react';
import { IconArrowNarrowRight, IconPlus, IconSparkles } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { portraitUrl } from '@/content/schemas/species';
import { previewBranch, type BranchPreview } from '@/sim';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { ARCHETYPE_HINT, ARCHETYPE_LABEL } from '@/ui/strings';
import styles from './EvolutionScreen.module.css';

// Per docs/design/ui/screens.md §3.6 and §6.3.3 — the Evolution screen. This is the one place the game goes
// fully celebratory (§9.9), and it is also the run's biggest decision (Pillar 4), so the two have to share a
// screen without the confetti burying the choice: the animation plays once on the left, the branch cards sit
// on the right and stay readable the whole time.
//
// Reduced motion cuts straight to the "after" portrait. There is no white flash at any setting — the §9.9
// camera-flash is the one effect we have not built, and a missing flourish is better than an unsafe one.

const STATS = [
  ['hp', 'HP'],
  ['attack', 'Attack'],
  ['defense', 'Defense'],
  ['speed', 'Speed'],
] as const;

/** §9.6 — reduced motion gets the "after" immediately: no morph, no hold, nothing to sit through. */
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function EvolutionScreen() {
  const pending = useRunStore((s) => s.run?.pendingEvolutions[0]);
  // Keyed by uid so a queue of two evolutions is two mounts, not one component reset from inside an effect.
  return pending ? <EvolutionChoice key={pending.uid} uid={pending.uid} /> : null;
}

function EvolutionChoice({ uid }: { uid: string }) {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const pending = run.pendingEvolutions[0];
  const mon = run.box.find((m) => m.uid === uid);

  const [picked, setPicked] = useState<string | null>(null);
  // The morph is a one-shot: it starts a beat after the screen mounts so the "before" is seen first.
  const [morphed, setMorphed] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = window.setTimeout(() => setMorphed(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  const previews = useMemo<BranchPreview[]>(
    () => (mon && pending ? pending.branchIds.map((id) => previewBranch(mon, id, content)) : []),
    [mon, pending, content],
  );

  if (!pending || !mon) return null;

  const before = content.species(pending.from);
  const chosen = picked ? previews.find((p) => p.branchId === picked)! : null;
  // Before a choice, the "after" portrait is whatever the branches agree on — for every line in Region 1
  // that is one species, so the reveal is honest even while the archetype is still open.
  const afterId = chosen?.to ?? previews[0]?.to ?? before.id;
  const after = content.species(afterId);

  return (
    <main className={styles.root} data-testid="evolution-screen">
      <div className={styles.card}>
        <header className={styles.head}>
          <h1 className={`${styles.title} display`}>
            <IconSparkles size={26} /> {before.name} is evolving
          </h1>
          <p className={styles.sub}>
            Pick how. The archetype decides what this Pokémon contributes to your deck from here — and you pick
            again at its next evolution.
          </p>
        </header>

        <section className={styles.stage} aria-label={`${before.name} evolving into ${after.name}`}>
          <figure className={styles.portraits}>
            <img
              className={`${styles.portrait} ${morphed ? styles.gone : ''}`}
              src={portraitUrl(before.dex, before.id)}
              alt={before.name}
              width={190}
              height={190}
            />
            <img
              className={`${styles.portrait} ${styles.after} ${morphed ? styles.here : ''}`}
              src={portraitUrl(after.dex, after.id)}
              alt={after.name}
              width={190}
              height={190}
              data-testid="evolution-after"
            />
          </figure>
          <p className={`${styles.names} display`} aria-hidden="true">
            {before.name} <IconArrowNarrowRight size={22} /> {after.name}
          </p>
          <span className={styles.types}>
            {after.types.map((t) => (
              <TypeBadge key={t} type={t} size={15} />
            ))}
          </span>
          <dl className={styles.stats}>
            {STATS.map(([key, label]) => {
              const delta = chosen?.statDelta[key] ?? previews[0]?.statDelta[key] ?? 0;
              return (
                <div key={key} className={styles.statRow}>
                  <dt>{label}</dt>
                  <dd className={`${styles.delta} ${delta > 0 ? styles.up : delta < 0 ? styles.down : ''} tabular`}>
                    {delta > 0 ? '+' : ''}
                    {delta}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        <section className={styles.branches} aria-label="Archetypes">
          {previews.map((p) => {
            const branch = content.branch(p.branchId);
            const on = picked === p.branchId;
            return (
              <button
                key={p.branchId}
                type="button"
                className={`${styles.branch} ${on ? styles.on : ''}`}
                onClick={() => setPicked(p.branchId)}
                aria-pressed={on}
                data-testid={`branch-${p.branchId}`}
                data-archetype={branch.archetype}
                // §9.6 — the whole payload spelled out, because the visual diff is chips and arrows.
                aria-label={[
                  `${branch.label}, ${ARCHETYPE_LABEL[branch.archetype]}`,
                  branch.description,
                  ...p.upgrades.map((u) => `${content.move(u.from).name} becomes ${content.move(u.to).name}`),
                  ...p.adds.map((a) => `gains ${content.move(a).name}`),
                  p.abilityId ? `passive: ${content.ability(p.abilityId).name}` : null,
                ]
                  .filter(Boolean)
                  .join('. ')}
              >
                <span className={styles.branchHead}>
                  <span className={`${styles.archetype} ${styles[branch.archetype]}`}>{ARCHETYPE_LABEL[branch.archetype]}</span>
                  <span className={`${styles.branchName} display`}>{branch.label}</span>
                </span>
                <p className={styles.branchText}>{branch.description}</p>

                <ul className={styles.diff}>
                  {p.upgrades.map((u) => (
                    <li key={u.from} className={styles.upgrade}>
                      <span className={styles.old}>{content.move(u.from).name}</span>
                      <IconArrowNarrowRight size={15} />
                      <span className={styles.new}>
                        <TypeBadge type={content.move(u.to).type} size={12} />
                        {content.move(u.to).name}
                      </span>
                      <span className={styles.power}>
                        {content.move(u.to).power > 0 ? `${content.move(u.to).power} pw` : 'utility'} · {content.move(u.to).apCost} AP
                      </span>
                      {u.inKit && <span className={styles.inKit}>in your 4</span>}
                    </li>
                  ))}
                  {p.adds.map((a) => (
                    <li key={a} className={styles.add}>
                      <IconPlus size={14} />
                      <span className={styles.new}>
                        <TypeBadge type={content.move(a).type} size={12} />
                        {content.move(a).name}
                      </span>
                      <span className={styles.power}>
                        {content.move(a).power > 0 ? `${content.move(a).power} pw` : 'utility'} · {content.move(a).apCost} AP
                      </span>
                    </li>
                  ))}
                </ul>

                {p.abilityId && (
                  <p className={styles.ability}>
                    <b>{content.ability(p.abilityId).name}</b> — {content.ability(p.abilityId).description}
                  </p>
                )}
                <p className={styles.archetypeHint}>{ARCHETYPE_HINT[branch.archetype]}</p>
              </button>
            );
          })}
        </section>

        <footer className={styles.footer}>
          <p className={styles.warn} role="status">
            {picked ? 'This cannot be undone — but the next evolution asks again.' : 'Choose an archetype to continue.'}
          </p>
          <button
            type="button"
            className={styles.confirm}
            disabled={!picked}
            onClick={() => picked && dispatch({ type: 'choose-branch', uid: mon.uid, branchId: picked })}
            data-testid="btn-evolve"
          >
            {picked ? `Evolve into ${content.branch(picked).label}` : 'Evolve'}
          </button>
        </footer>
      </div>
    </main>
  );
}
