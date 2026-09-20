import { IconArrowLeft, IconBrandGithub, IconCircleCheck, IconCircleDashed, IconProgress } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { APP_VERSION, ROADMAP, type RoadmapVersion } from '@/content/roadmap';
import { Tip, Tipped } from '@/ui/tooltip';
import styles from './AboutScreen.module.css';

// What the game is, where it is, and where it is going — the page a player opens to find out what "v0.5"
// means and what "v0.6" will bring. Everything here comes from somewhere else: the version from package.json,
// the timeline from docs/roadmap.md, the credits from ATTRIBUTION.md's terms. Nothing on this screen has to
// be remembered when a version ships.

const REPO = 'https://github.com/Montuuh/Pokemon-Ascendant';

const STATUS_ICON = { done: IconCircleCheck, active: IconProgress, planned: IconCircleDashed } as const;
const STATUS_WORD = { done: 'Shipped', active: 'Building now', planned: 'Planned' } as const;

/** 2026-09-20 → 20 Sep 2026, in the reader's locale. */
function niceDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function Row({ v }: { v: RoadmapVersion }) {
  const Icon = STATUS_ICON[v.status];
  const date = niceDate(v.date);
  return (
    <li className={`${styles.row} ${styles[v.status]}`} data-testid={`roadmap-${v.version}`} data-status={v.status}>
      <span className={styles.spine} aria-hidden="true">
        <Icon size={20} stroke={2.2} />
      </span>
      {/* The active version says what it is inline — it is the one line on this page a player came for. The
          rest keep their claim behind a hover, so the timeline reads as a list and not as a wall. */}
      <Tipped as="div" tip={<Tip title={`${v.version} — ${v.name}`} meta={[STATUS_WORD[v.status], ...(date ? [date] : [])]} body={v.claim} footer={v.note && v.status === 'done' ? `Code complete · ${v.note} pending` : undefined} />} className={styles.rowBody}>
        <span className={styles.rowHead}>
          <span className={`${styles.version} display tabular`}>{v.version}</span>
          <span className={`${styles.name} display`}>{v.name}</span>
          <span className={styles.when}>{v.status === 'done' ? date : STATUS_WORD[v.status]}</span>
        </span>
        {v.status === 'active' && <span className={styles.claim}>{v.claim}</span>}
      </Tipped>
    </li>
  );
}

export function AboutScreen() {
  const goTo = useAppStore((s) => s.goTo);
  const done = ROADMAP.filter((v) => v.status === 'done').length;

  return (
    <main className={styles.root} data-testid="about-screen">
      <header className={styles.chrome}>
        <button type="button" className={styles.back} onClick={() => goTo('menu')} data-testid="btn-about-back">
          <IconArrowLeft size={18} /> Menu
        </button>
        <h1 className={`${styles.title} display`}>About</h1>
        <span className={`${styles.versionPill} tabular`} data-testid="about-version">
          v{APP_VERSION}
        </span>
      </header>

      <div className={styles.columns}>
        <section className={styles.panel}>
          <h2 className={`${styles.gameTitle} display`}>Pokémon Ascendant</h2>
          <p className={styles.pitch}>
            A roguelike deckbuilder where <b>your party is your deck</b>. Three Pokémon, four moves each, one
            shared hand — and every swap is a decision.
          </p>
          <p className={styles.disclaimer}>
            An unofficial, free, non-commercial fan project. Not affiliated with Nintendo, Creatures Inc.,
            GAME FREAK inc. or The Pokémon Company. Pokémon and all related marks are their trademarks.
          </p>
          <a className={styles.repo} href={REPO} target="_blank" rel="noreferrer" data-testid="about-repo">
            <IconBrandGithub size={18} /> Source, design docs and the full roadmap
          </a>

          <h3 className={styles.sectionTitle}>Credits</h3>
          <dl className={styles.credits}>
            <dt>Design & code</dt>
            <dd>Montuuh</dd>
            <dt>Pokémon, items, badges, backdrops</dt>
            <dd>© Nintendo / Creatures Inc. / GAME FREAK inc.</dd>
            <dt>Battle sprites & trainers</dt>
            <dd>Pokémon Showdown and the Smogon sprite project</dd>
            <dt>Artwork & icons</dt>
            <dd>PokéAPI · Serebii · Bulbagarden Archives</dd>
            <dt>Interface icons</dt>
            <dd>Tabler Icons (MIT)</dd>
            <dt>Type</dt>
            <dd>Baloo 2 · Nunito (SIL OFL)</dd>
          </dl>
        </section>

        <section className={styles.panel} aria-labelledby="roadmap-title">
          <h2 id="roadmap-title" className={styles.sectionTitle}>
            Roadmap <span className={styles.count}>{done} of {ROADMAP.length} shipped</span>
          </h2>
          <ol className={styles.timeline} data-testid="roadmap">
            {ROADMAP.map((v) => (
              <Row key={v.version} v={v} />
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
