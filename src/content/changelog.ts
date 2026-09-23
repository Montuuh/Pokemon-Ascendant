// The changelog the What's new screen shows, read from the one file that owns it.
//
// `CHANGELOG.md` is written for players and is where a version's notes live; copying them into TSX would make
// a second place for "what v0.7.3 added" to be true, which is the drift docs/release-doctrine.md exists to
// prevent. So the game imports the markdown and reads its headings, like `roadmap.ts` reads the roadmap table.
//
// The parser is narrow on purpose: `## vX.Y — Name · date|in progress`, `### vX.Y.Z — Name · date`, `## Next`,
// a one-line lede, and `- **Headline.** body` bullets. `changelog.test.ts` runs it against the real file, so a
// reformat it cannot read fails a test rather than shipping an empty page.

import changelogMd from '../../CHANGELOG.md?raw';

/**
 * How loud a version is on the page, from its number alone: a major (v1.0, v2.0) is the loudest, a minor —
 * a roadmap row, v0.7 — is a banner, a patch — v0.7.3 — is a card under its minor. Never styled by hand.
 */
export type ReleaseLevel = 'major' | 'minor' | 'patch';

export interface ChangeItem {
  /** "All 151 Pokémon" — the bold headline, without its closing full stop. */
  title: string;
  body: string;
}

export interface Release {
  /** `v0.7.3` */
  version: string;
  name: string;
  /** ISO date; null while the version is still being built. */
  date: string | null;
  level: ReleaseLevel;
  lede: string;
  items: ChangeItem[];
  /** A minor or major's point versions, newest first. Always empty on a patch. */
  patches: Release[];
}

export interface Changelog {
  /** What reached the game since the last version (`## Next`), or null when nothing has. */
  next: ChangeItem[] | null;
  /** Minors and majors, newest first; their patches hang off them. */
  releases: Release[];
}

const HEADING = /^(#{2,3}) (v\d+\.\d+(?:\.\d+)?) — (.+?) · (\d{4}-\d{2}-\d{2}|in progress)\s*$/;
const BULLET = /^- \*\*(.+?)\*\*\s*(.*)$/;

export function levelOf(version: string): ReleaseLevel {
  const [major, minor, patch] = version.replace(/^v/, '').split('.').map(Number);
  if (patch !== undefined) return 'patch';
  return (major ?? 0) >= 1 && minor === 0 ? 'major' : 'minor';
}

/** `v0.6` and `0.6.0` are the same version; `v0.7.3` and `0.7.3` too. */
export function sameVersion(a: string, b: string): boolean {
  const norm = (v: string) => {
    const p = v.replace(/^v/, '').split('.').map(Number);
    return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0].join('.');
  };
  return norm(a) === norm(b);
}

export function parseChangelog(markdown: string = changelogMd): Changelog {
  const releases: Release[] = [];
  let next: ChangeItem[] | null = null;
  // Where bullets and the lede are going: a release, the Next block, or nowhere (the file's preamble).
  let into: { items: ChangeItem[]; release: Release | null } | null = null;

  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();
    if (line === '## Next') {
      next = [];
      into = { items: next, release: null };
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      const [, hashes, version, name, when] = h as unknown as [string, string, string, string, string];
      const release: Release = {
        version,
        name,
        date: when === 'in progress' ? null : when,
        level: levelOf(version),
        lede: '',
        items: [],
        patches: [],
      };
      const parent = releases[releases.length - 1];
      if (hashes === '###' && parent) parent.patches.push(release);
      else releases.push(release);
      into = { items: release.items, release };
      continue;
    }
    if (line.startsWith('#')) {
      into = null;
      continue;
    }
    if (!into || line.trim() === '' || line.startsWith('>')) continue;
    const b = BULLET.exec(line);
    if (b) {
      into.items.push({ title: b[1]!.replace(/\.$/, ''), body: b[2]!.trim() });
    } else if (/^\s+\S/.test(line) && into.items.length) {
      // A wrapped bullet: the indented line continues the last one.
      const last = into.items[into.items.length - 1]!;
      last.body = `${last.body} ${line.trim()}`.trim();
    } else if (into.release && into.items.length === 0) {
      into.release.lede = `${into.release.lede} ${line.trim()}`.trim();
    }
  }
  return { next: next && next.length ? next : null, releases };
}

/** The parsed changelog, once. */
export const CHANGELOG: Changelog = parseChangelog();

/** The newest version that has shipped (carries a date) — a patch if its minor is still being built. */
export function latestShipped(log: Changelog = CHANGELOG): Release | null {
  const all = log.releases.flatMap((r) => [...r.patches, r]).filter((r) => r.date !== null);
  const key = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  all.sort((a, b) => {
    const [x, y] = [key(a.version), key(b.version)];
    for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
    return 0;
  });
  return all[0] ?? null;
}
