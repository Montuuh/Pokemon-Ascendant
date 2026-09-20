// The roadmap the About screen shows, read from the one file that owns it.
//
// `docs/roadmap.md` is where a version's scope, status and date are decided, and it was already the file the
// README and the session notes pointed at. Copying its table into TSX would have created a second place for
// "v0.6 is done" to be true — which is exactly the drift the user asked to be rid of. So the game imports the
// markdown itself and reads the summary table; marking a row there is the whole release ritual.
//
// The parser is deliberately narrow: four pipe-separated columns, a version cell that starts with `v`, and a
// status cell whose first glyph is one of the three the file's own legend defines. `roadmap.test.ts` runs it
// against the real file, so a reformat that this cannot read fails a test rather than shipping a blank screen.

import roadmapMd from '../../docs/roadmap.md?raw';

export type VersionStatus = 'done' | 'active' | 'planned';

export interface RoadmapVersion {
  /** `v0.5` */
  version: string;
  name: string;
  /** The playable claim: what a tester can do once it ships. */
  claim: string;
  status: VersionStatus;
  /** ISO date, present when the row says it shipped. */
  date: string | null;
  /** Whatever follows the status glyph — "playtest", "in progress" — as the file wrote it. */
  note: string;
}

const STATUS_GLYPH: Record<string, VersionStatus> = { '✅': 'done', '◐': 'active', '☐': 'planned' };

/** Split one markdown table row into its cells, tolerant of leading/trailing pipes and padding. */
function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

export function parseRoadmap(markdown: string = roadmapMd): RoadmapVersion[] {
  const out: RoadmapVersion[] = [];
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) continue;
    const c = cells(line);
    if (c.length !== 4 || !/^v\d+\.\d+$/.test(c[0]!)) continue;
    const [version, name, claim, statusCell] = c as [string, string, string, string];
    const glyph = [...statusCell][0] ?? '';
    const status = STATUS_GLYPH[glyph];
    if (!status) continue;
    const date = /(\d{4}-\d{2}-\d{2})/.exec(statusCell)?.[1] ?? null;
    // The note is the status cell minus its glyph, date and separators — "playtest", "in progress", or nothing.
    const note = statusCell
      .replace(glyph, '')
      .replace(date ?? '', '')
      .replace(/[·◐☐✅]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    out.push({ version, name, claim, status, date, note });
  }
  return out;
}

/** The parsed roadmap, once. */
export const ROADMAP: readonly RoadmapVersion[] = parseRoadmap();

/** The version the build says it is, for the pill beside the title. Injected by Vite from package.json. */
export const APP_VERSION: string = __APP_VERSION__;
