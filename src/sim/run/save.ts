import type { ContentRegistry } from '../content/defs';
import { RUN_SAVE_VERSION } from './run';
import type { RunState } from './types';

// §10.8 — the save model. The simulation only knows how to turn a run into text and back; *where* that text
// lives is the app's business, behind a provider interface, so local storage now and a server-backed profile
// later is a swap rather than a rewrite (§10.8.2).

export interface SaveEnvelope {
  version: number;
  savedAt: number;
  /** Cheap integrity check: a corrupt save must degrade to "start a new run", never to a crash (§10.8.4). */
  checksum: number;
  run: RunState;
}

/** A save provider is anything that can hold one string. */
export interface SaveProvider {
  read(): string | null;
  write(data: string): void;
  clear(): void;
}

function checksum(text: string): number {
  // FNV-1a, 32-bit. Not cryptography — it exists to catch a truncated or half-written file.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function serialiseRun(run: RunState, savedAt = 0): string {
  const body = JSON.stringify(run);
  const envelope: SaveEnvelope = { version: RUN_SAVE_VERSION, savedAt, checksum: checksum(body), run };
  return JSON.stringify(envelope);
}

/**
 * §5.10.4 — version 9 → 10: the Badges took the games' names. Koga's Poison Badge was `marsh-badge` and is
 * `soul-badge`; Sabrina's Psychic Badge the other way round; `normal-badge` is `plain-badge` and `fist-badge`
 * `knuckle-badge`. A run in progress keeps what it won — the same effect under its new name.
 */
const BADGE_IDS_V10: Readonly<Record<string, string>> = {
  'marsh-badge': 'soul-badge',
  'soul-badge': 'marsh-badge',
  'normal-badge': 'plain-badge',
  'fist-badge': 'knuckle-badge',
};

function migrateBadgesTo10(run: RunState): void {
  const rename = (ids: string[]) => ids.map((id) => BADGE_IDS_V10[id] ?? id);
  run.badges = rename(run.badges);
  if (run.pendingScenario?.player.badges) run.pendingScenario.player.badges = rename(run.pendingScenario.player.badges);
}

/**
 * §6.3.2 / §8.5.3 — version 10 → 11: the bag gains its Evolution Items (none yet) and the run remembers its
 * starter. A version-10 save never recorded one, so the first Pokémon in the Box stands in for it.
 */
function migrateStonesTo11(run: RunState): void {
  run.stones ??= [];
  run.starter ??= run.box[0]?.speciesId ?? '';
}

/**
 * §2.11.6 — version 11 → 12: the City carries its Safari Zone. A visit already under way rolled none on arrival,
 * so its park stays shut for that visit (the door says so); the next City rolls one.
 */
function migrateSafariTo12(run: RunState): void {
  if (run.city) run.city.safari ??= null;
}

/** §10.8.3 — the known steps: the migration that takes a save *from* each version to the next. */
const MIGRATIONS: Readonly<Record<number, (run: RunState) => void>> = { 9: migrateBadgesTo10, 10: migrateStonesTo11, 11: migrateSafariTo12 };

export type LoadResult =
  | { ok: true; run: RunState }
  | { ok: false; reason: 'empty' | 'unreadable' | 'corrupt' | 'version' };

export function deserialiseRun(text: string | null, content: ContentRegistry): LoadResult {
  if (!text) return { ok: false, reason: 'empty' };

  let envelope: SaveEnvelope;
  try {
    envelope = JSON.parse(text) as SaveEnvelope;
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  if (!envelope || typeof envelope !== 'object' || !envelope.run) return { ok: false, reason: 'unreadable' };

  // §10.8.3 — an older save is migrated step by step when every step is known; a NEWER one, or an older one with
  // a missing step, is refused rather than half-read.
  if (envelope.version > RUN_SAVE_VERSION) return { ok: false, reason: 'version' };
  for (let v = envelope.version; v < RUN_SAVE_VERSION; v++) if (!MIGRATIONS[v]) return { ok: false, reason: 'version' };

  // The checksum is of the run as it was written, so it is checked before any migration touches it.
  if (checksum(JSON.stringify(envelope.run)) !== envelope.checksum) return { ok: false, reason: 'corrupt' };
  for (let v = envelope.version; v < RUN_SAVE_VERSION; v++) MIGRATIONS[v]!(envelope.run);

  // Content ids are part of the contract: a save that names a species we no longer ship is not loadable.
  try {
    for (const mon of envelope.run.box) {
      content.species(mon.speciesId);
      mon.moveIds.forEach((m) => content.move(m));
      mon.pool.forEach((m) => content.move(m));
      if (mon.abilityId) content.ability(mon.abilityId);
    }
    for (const c of envelope.run.consumables) content.consumable(c);
    for (const t of envelope.run.tms) content.tm(t);
    for (const st of envelope.run.stones) content.evolutionItem(st);
    for (const p of envelope.run.pendingEvolutions) p.branchIds.forEach((b) => content.branch(b));
  } catch {
    return { ok: false, reason: 'corrupt' };
  }

  return { ok: true, run: envelope.run };
}

/** A short line for the Continue button on the main menu. */
export function describeSave(run: RunState, content: ContentRegistry): string {
  const lead = run.box.find((m) => m.uid === run.activeUids[0]);
  // Standing at the start is layer 1, not layer 0 — the map header counts the same way, and "layer 0/8" on
  // the Continue button read like a save that had gone wrong.
  const layer = run.position ? (run.map.nodes[run.position]?.layer ?? 0) + 2 : 1;
  const name = lead ? content.species(lead.speciesId).name : 'a new team';
  return `Region ${run.regionIndex + 1} · layer ${Math.min(layer, run.map.layers)}/${run.map.layers} · ${name} L${lead?.level ?? '?'} · ${run.box.length} in the Box`;
}
