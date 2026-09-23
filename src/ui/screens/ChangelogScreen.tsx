import { useEffect } from 'react';
import { Accordion } from 'radix-ui';
import { IconArrowLeft, IconChevronDown, IconCircleCheck, IconCrown, IconPokeball, IconProgress, IconSparkles } from '@tabler/icons-react';
import { useAppStore } from '@/app/store';
import { markChangelogRead } from '@/app/changelogSeen';
import { CHANGELOG, sameVersion, type ChangeItem, type Release } from '@/content/changelog';
import { APP_VERSION } from '@/content/roadmap';
import { MAJOR_RELEASE_LABEL, niceDate } from '@/ui/strings';
import styles from './ChangelogScreen.module.css';

// What's new — CHANGELOG.md as a page (docs/release-doctrine.md). The size of a version is its level, read from
// its number: a major is a gold banner with the biggest number, a minor (a roadmap row) a banner with a big one,
// a patch a small card under its minor. Only the newest minor and its newest patch are open; the rest are
// their headline and one-line lede, a click away (D4). Opening the page marks it read for the menu's dot.
// The outline follows the sizes: a minor is an h2, its patches h3 under it, so heading navigation reads the tree.

function Items({ items, compact }: { items: ChangeItem[]; compact?: boolean }) {
  return (
    <ul className={compact ? styles.itemsCompact : styles.items}>
      {items.map((item) => (
        <li key={item.title} className={styles.item}>
          <span className={`${styles.itemTitle} display`}>{item.title}</span>
          <span className={styles.itemBody}>{item.body}</span>
        </li>
      ))}
    </ul>
  );
}

function Patch({ p }: { p: Release }) {
  const current = sameVersion(p.version, APP_VERSION);
  return (
    <Accordion.Item value={p.version} className={styles.patch} data-testid={`changelog-${p.version}`} data-level="patch" data-current={current}>
      <Accordion.Header asChild>
        <h3 className={styles.header}>
          <Accordion.Trigger className={styles.patchTrigger}>
            <span className={`${styles.patchNumber} display tabular`}>{p.version}</span>
            <span className={`${styles.patchName} display`}>{p.name}</span>
            {current && <span className={styles.current}>You are here</span>}
            <span className={styles.when}>{niceDate(p.date)}</span>
            <IconChevronDown size={18} className={styles.chevron} aria-hidden="true" />
          </Accordion.Trigger>
        </h3>
      </Accordion.Header>
      {p.lede && <p className={styles.patchLede}>{p.lede}</p>}
      <Accordion.Content className={styles.content}>
        <Items items={p.items} compact />
      </Accordion.Content>
    </Accordion.Item>
  );
}

/** R1 — only a major changes the banner's frame; a minor is the banner as drawn. */
const LEVEL_CLASS = { major: styles.major, minor: '', patch: '' } as const;

function ReleaseBanner({ r }: { r: Release }) {
  const building = r.date === null;
  const StatusIcon = building ? IconProgress : IconCircleCheck;
  return (
    <Accordion.Item value={r.version} className={`${styles.release} ${LEVEL_CLASS[r.level]}`} data-testid={`changelog-${r.version}`} data-level={r.level}>
      <span className={styles.watermark} aria-hidden="true"><IconPokeball size={260} stroke={1.1} /></span>
      <Accordion.Header asChild>
        <h2 className={styles.header}>
          <Accordion.Trigger className={styles.releaseTrigger}>
            <span className={`${styles.number} display tabular`}>{r.version}</span>
            <span className={styles.headText}>
              <span className={styles.kicker}>
                {r.level === 'major' && (
                  <>
                    <IconCrown size={16} aria-hidden="true" /> {MAJOR_RELEASE_LABEL}
                  </>
                )}
                <span className={styles.status} data-building={building}>
                  <StatusIcon size={14} aria-hidden="true" /> {building ? 'Building now' : niceDate(r.date)}
                </span>
              </span>
              <span className={`${styles.name} display`}>{r.name}</span>
            </span>
            <IconChevronDown size={24} className={styles.chevron} aria-hidden="true" />
          </Accordion.Trigger>
        </h2>
      </Accordion.Header>
      {r.lede && <p className={styles.lede}>{r.lede}</p>}
      <Accordion.Content className={styles.content}>
        {r.items.length > 0 && <Items items={r.items} />}
        {r.patches.length > 0 && (
          <Accordion.Root type="multiple" defaultValue={[r.patches[0]!.version]} className={styles.patches}>
            {r.patches.map((p) => <Patch key={p.version} p={p} />)}
          </Accordion.Root>
        )}
      </Accordion.Content>
    </Accordion.Item>
  );
}

export function ChangelogScreen() {
  const goTo = useAppStore((s) => s.goTo);
  // Two doors lead here (the menu's version pill, About's); the way back is the one you came in by.
  const back = useAppStore((s) => (s.previous === 'about' ? 'about' : 'menu'));
  useEffect(() => markChangelogRead(), []);
  const first = CHANGELOG.releases[0];

  return (
    <main className={styles.root} data-testid="changelog-screen">
      <header className={styles.chrome}>
        <button type="button" className={styles.back} onClick={() => goTo(back)} data-testid="btn-changelog-back">
          <IconArrowLeft size={18} /> {back === 'about' ? 'About' : 'Menu'}
        </button>
        <h1 className={`${styles.title} display`}>What's new</h1>
        <span className={`${styles.versionPill} tabular`} data-testid="changelog-version">v{APP_VERSION}</span>
      </header>

      <div className={styles.column}>
        {CHANGELOG.next && (
          <section className={styles.next} data-testid="changelog-next" aria-labelledby="changelog-next-title">
            <h2 id="changelog-next-title" className={`${styles.nextTitle} display`}>
              <IconSparkles size={20} aria-hidden="true" /> New since v{APP_VERSION}
            </h2>
            <Items items={CHANGELOG.next} compact />
          </section>
        )}
        <Accordion.Root type="multiple" defaultValue={first ? [first.version] : []} className={styles.releases}>
          {CHANGELOG.releases.map((r) => <ReleaseBanner key={r.version} r={r} />)}
        </Accordion.Root>
      </div>
    </main>
  );
}
