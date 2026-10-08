import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { IconArrowNarrowRight, IconPlus, IconSparkles } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { boxIconUrl, portraitUrl } from '@/content/schemas/species';
import { previewBranch, type BranchPreview } from '@/sim';
import { EvolutionCutscene } from '@/ui/components/EvolutionCutscene';
import { TypeBadge, TypeLabel } from '@/ui/components/TypeBadge';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { ARCHETYPE_LABEL, EVOLUTION_TEXT, RUN_REJECT_TEXT } from '@/ui/strings';
import { abilityTip, archetypeTip, branchTip, evoKitTip, evoStatTip, evolveTip, moveDefTip } from '@/ui/tips';
import { InfoDot, Tipped, useTip } from '@/ui/tooltip';
import styles from './EvolutionScreen.module.css';

// Per docs/design/ui/screens.md §3.6 and §6.3.3 — the Evolution screen (reworked in v0.9.5). The series' evolution
// plays first (`EvolutionCutscene`); then the run's biggest decision, said in pictures rather than paragraphs: on the
// left the Pokémon this path makes — its stats as bars, the kit it leaves — and on the right one compact card per
// path, its changes as move chips. Pointing at a path previews it on the left; every chip, bar and pill explains itself
// on hover. When the paths lead to different species (Eevee by level) the cutscene waits for the choice instead.

// An archetype → its colour stripe and pill.
const ARCH_CLASS: Record<string, string | undefined> = { vanguard: styles.vanguard, specialist: styles.specialist, support: styles.support };

const STATS = [
  ['hp', 'HP'],
  ['attack', 'Attack'],
  ['defense', 'Defense'],
  ['speed', 'Speed'],
] as const;

export function EvolutionScreen() {
  const pending = useRunStore((s) => s.run?.pendingEvolutions[0]);
  // Keyed by uid so a queue of two evolutions is two mounts, not one component reset from inside an effect.
  return pending ? <EvolutionChoice key={pending.uid} uid={pending.uid} /> : null;
}

/** A move as a chip, with its card on hover. Inside a path card it takes no tab stop: the card's label reads it out. */
function MoveChip({ id, active, fresh, struck, inCard }: { id: string; active?: boolean; fresh?: boolean; struck?: boolean; inCard?: boolean }) {
  const m = getContent().move(id);
  return (
    <Tipped as="span" tip={moveDefTip(m)} tabIndex={inCard ? -1 : 0} className={[styles.chip, active ? styles.active : '', struck ? styles.struck : ''].join(' ')} data-move={id}>
      <TypeLabel type={m.type} size={12} />
      <span className={styles.chipName}>{m.name}</span>
      {fresh && <span className={styles.fresh} role="img" aria-label="new" />}
    </Tipped>
  );
}

function EvolutionChoice({ uid }: { uid: string }) {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const animate = useMotionPref();
  const pending = run.pendingEvolutions[0];
  const mon = run.box.find((m) => m.uid === uid);

  // §6.3.2 — a stone that makes one branch (Eevee) leaves nothing to pick, so that one is picked already.
  const [picked, setPicked] = useState<string | null>(pending && pending.branchIds.length === 1 ? pending.branchIds[0]! : null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const evolveTipProps = useTip(picked ? evolveTip(content.branch(picked).label) : null);

  const previews = useMemo<BranchPreview[]>(
    () => (mon && pending ? pending.branchIds.map((id) => previewBranch(mon, id, content)) : []),
    [mon, pending, content],
  );
  const oneSpecies = new Set(previews.map((p) => p.to)).size <= 1;
  // The cutscene: before the choice when every path makes the same Pokémon, after it when they do not.
  const [cut, setCut] = useState<'intro' | 'choose' | 'outro'>(animate && oneSpecies ? 'intro' : 'choose');

  if (!pending || !mon) return null;

  const before = content.species(pending.from);
  const focusId = hovered ?? picked ?? previews[0]?.branchId ?? null;
  const focus = previews.find((p) => p.branchId === focusId) ?? previews[0];
  const after = content.species(focus?.to ?? before.id);
  const top = Math.max(1, ...previews.flatMap((p) => STATS.map(([k]) => Math.max(p.statsAfter[k], p.statsBefore[k])))) * 1.1;

  const evolve = () => {
    if (!picked) return;
    if (!dispatch({ type: 'choose-branch', uid: mon.uid, branchId: picked })) {
      setRefused(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? RUN_REJECT_TEXT['internal-error']!);
    }
  };
  const confirm = () => {
    if (!picked) return;
    if (animate && !oneSpecies) setCut('outro');
    else evolve();
  };

  if (cut === 'intro') return <EvolutionCutscene fromId={before.id} toId={after.id} shiny={!!mon.shiny} onDone={() => setCut('choose')} />;
  if (cut === 'outro' && picked) return <EvolutionCutscene fromId={before.id} toId={previews.find((p) => p.branchId === picked)!.to} shiny={!!mon.shiny} onDone={evolve} />;

  const choose = (id: string) => {
    setPicked(id);
    setRefused(null);
  };
  // A radiogroup: one tab stop, the arrows move between paths and pick (WAI-ARIA), Enter and Space pick.
  const onCardKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (step) {
      e.preventDefault();
      const j = (i + step + previews.length) % previews.length;
      choose(previews[j]!.branchId);
      cards.current[j]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(previews[i]!.branchId);
    }
  };
  const tabStop = picked ?? previews[0]?.branchId;

  return (
    <main className={styles.root} data-testid="evolution-screen">
      <div className={styles.card}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>
            {before.name} · Lv {mon.level}
          </p>
          <h1 className={`${styles.title} display`}>
            <IconSparkles size={24} /> {EVOLUTION_TEXT.choose(oneSpecies ? after.name : before.name)}
          </h1>
        </header>

        <aside className={styles.hero} aria-label={`${after.name} on this path`}>
          <div className={styles.portraitWrap}>
            <img key={after.id} className={styles.portrait} src={portraitUrl(after.dex, after.id)} alt={after.name} width={200} height={200} data-testid="evolution-after" />
          </div>
          <p className={`${styles.heroName} display`}>{after.name}</p>
          <span className={styles.types}>
            {after.types.map((t) => (
              <TypeBadge key={t} type={t} size={18} />
            ))}
          </span>

          <ul className={styles.stats} aria-label="Stats">
            {focus &&
              STATS.map(([key, label]) => {
                const a = focus.statsAfter[key];
                const b = focus.statsBefore[key];
                const d = a - b;
                return (
                  <Tipped as="li" key={key} tabIndex={0} className={styles.statRow} tip={evoStatTip(key, label, { name: before.name, value: b }, { name: after.name, value: a }, mon.level)} data-testid={`stat-${key}`}>
                    <span className={styles.statLabel}>{label}</span>
                    <span className={styles.bar} aria-hidden="true">
                      <span className={styles.barBefore} style={{ width: `${(b / top) * 100}%` }} />
                      <span className={styles.barAfter} style={{ width: `${(a / top) * 100}%` }} />
                    </span>
                    <span className={`${styles.statValue} tabular`}>{a}</span>
                    <span className={`${styles.delta} ${d > 0 ? styles.up : d < 0 ? styles.down : ''} tabular`}>
                      {d > 0 ? '+' : ''}
                      {d}
                    </span>
                  </Tipped>
                );
              })}
          </ul>

          {focus && (
            <section className={styles.kit} aria-label="The kit after">
              <h2 className={styles.kitHead}>
                Kit <InfoDot tip={evoKitTip()} label="About the kit after" />
              </h2>
              <div className={styles.kitChips} data-testid="evolution-kit">
                {focus.pool.map((m) => (
                  <MoveChip key={m} id={m} active={focus.kit.includes(m)} fresh={!mon.pool.includes(m)} />
                ))}
              </div>
            </section>
          )}
        </aside>

        <section className={styles.branches} role="radiogroup" aria-label="Paths">
          {previews.map((p, i) => {
            const branch = content.branch(p.branchId);
            const on = picked === p.branchId;
            const to = content.species(p.to);
            return (
              <div
                key={p.branchId}
                ref={(el) => {
                  cards.current[i] = el;
                }}
                role="radio"
                tabIndex={p.branchId === tabStop ? 0 : -1}
                aria-checked={on}
                className={`${styles.branch} ${ARCH_CLASS[branch.archetype] ?? ''} ${on ? styles.on : ''} ${hovered === p.branchId && !on ? styles.previewing : ''}`}
                onClick={() => choose(p.branchId)}
                onKeyDown={(e) => onCardKey(e, i)}
                onMouseEnter={() => setHovered(p.branchId)}
                onMouseLeave={() => setHovered((h) => (h === p.branchId ? null : h))}
                onFocus={() => setHovered(p.branchId)}
                onBlur={() => setHovered((h) => (h === p.branchId ? null : h))}
                data-testid={`branch-${p.branchId}`}
                data-archetype={branch.archetype}
                aria-label={[
                  `${branch.label}, ${ARCHETYPE_LABEL[branch.archetype]}`,
                  ...p.upgrades.map((u) => `${content.move(u.from).name} becomes ${content.move(u.to).name}`),
                  ...p.adds.map((a) => `gains ${content.move(a).name}`),
                  p.abilityId ? `passive: ${content.ability(p.abilityId).name}` : null,
                ]
                  .filter(Boolean)
                  .join('. ')}
              >
                <span className={styles.branchHead}>
                  <Tipped as="span" tabIndex={-1} tip={archetypeTip(branch.archetype)} className={styles.pill}>
                    {ARCHETYPE_LABEL[branch.archetype]}
                  </Tipped>
                  <Tipped as="span" tabIndex={-1} tip={branchTip(branch.label, branch.description, branch.archetype)} className={`${styles.branchName} display`}>
                    {branch.label}
                  </Tipped>
                  {!oneSpecies && <img className={`pixel ${styles.branchIcon}`} src={boxIconUrl(to.dex, to.id)} alt={to.name} width={40} height={40} />}
                </span>

                <ul className={styles.diff}>
                  {p.upgrades.map((u) => (
                    <li key={u.from} className={styles.change}>
                      <MoveChip id={u.from} struck inCard />
                      <IconArrowNarrowRight size={16} className={styles.arrow} />
                      <MoveChip id={u.to} active={p.kit.includes(u.to)} fresh={!mon.pool.includes(u.to)} inCard />
                    </li>
                  ))}
                  {p.adds.map((a) => (
                    <li key={a} className={styles.change}>
                      <IconPlus size={16} className={styles.arrow} />
                      <MoveChip id={a} active={p.kit.includes(a)} fresh inCard />
                    </li>
                  ))}
                </ul>

                {p.abilityId && (
                  <Tipped as="span" tabIndex={-1} tip={abilityTip(p.abilityId)} className={styles.ability}>
                    <IconSparkles size={14} /> {content.ability(p.abilityId).name}
                  </Tipped>
                )}
              </div>
            );
          })}
        </section>

        <footer className={styles.footer}>
          <p className={styles.status} role="status">
            {picked ? '' : EVOLUTION_TEXT.pick}
          </p>
          <button type="button" className={styles.confirm} disabled={!picked} onClick={confirm} data-testid="btn-evolve" {...evolveTipProps}>
            {EVOLUTION_TEXT.evolve(picked ? content.branch(picked).label : null)}
          </button>
          {refused && (
            <p className={styles.refused} role="status">
              {refused}
            </p>
          )}
        </footer>
      </div>
    </main>
  );
}
