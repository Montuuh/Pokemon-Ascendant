import type { ContentRegistry } from '../content/defs';
import { RUN_SAVE_VERSION, mintUid, uidIndex } from './run';
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

/**
 * §2.11.6 / §2.9.4.1 — version 12 → 13: the City carries Team Rocket's Black Market. A Celadon visit already under
 * way rolled none on arrival, so its poster hides nothing this time; the Ring's state is unchanged — only its door
 * moved out of the Dojo — so a save standing on the ladder carries on as it was.
 */
function migrateMarketTo13(run: RunState): void {
  if (run.city) run.city.blackMarket ??= null;
}

/**
 * §2.11.5 — version 13 → 14: the Roulette became the classic 37-pocket wheel. A last result from the old
 * fifty-segment wheel names a segment the new rim does not have, so it is dropped; the next spin shows the new one.
 */
function migrateRouletteTo14(run: RunState): void {
  if (run.city?.casino.wheel && !run.city.casino.wheel.bet) run.city.casino.wheel = null;
}

/**
 * §2.11.1 — version 14 → 15: the Center's Daycare. Nobody was resting in an older save, and a City visit already
 * under way has not used its Daycare yet.
 */
function migrateDaycareTo15(run: RunState): void {
  run.resting ??= null;
  if (run.city) run.city.daycareUsed ??= false;
}

/**
 * §3.5 / §2.11.2.3 — version 15 → 16: consumables are spent and relics carry a premium (v0.8.6). An older run has
 * bought nothing under the premium, and its No Refunds modifier is the row that became Lean Pack (§8.8).
 */
function migrateSuppliesTo16(run: RunState): void {
  run.relicsBought ??= 0;
  run.modifiers = run.modifiers.map((id) => (id === 'no-refunds' ? 'lean-pack' : id));
  if (run.pendingReward) {
    run.pendingReward.relicPick ??= null;
    run.pendingReward.consumables ??= [];
    run.pendingReward.balls ??= 0;
  }
}

/**
 * §7.2.5 — version 16 → 17: Poké Balls are bag entries (v0.8.6's second pass). The old counter becomes that many
 * Poké Balls in the consumables.
 */
function migrateBallsTo17(run: RunState): void {
  const legacy = run as RunState & { balls?: number };
  const n = legacy.balls ?? 0;
  for (let i = 0; i < n; i++) run.consumables.push('poke-ball');
  delete legacy.balls;
}

/**
 * §2.5 — version 17 → 18: the route is drawn left to right on a row grid (v0.8.7). A run saved on the old
 * twelve-layer map keeps its map; its nodes take rows from their columns — the trunk spread across the middle,
 * each lane in its own half — so the new screen can draw it.
 */
function migrateRowsTo18(run: RunState): void {
  const map = run.map as RunState['map'] & { rows?: number };
  map.rows ??= 11;
  const byLayer = new Map<number, typeof run.map.nodes[string][]>();
  for (const n of Object.values(map.nodes)) byLayer.set(n.layer, [...(byLayer.get(n.layer) ?? []), n]);
  for (const row of byLayer.values()) {
    for (const n of row) {
      if (typeof n.row === 'number') continue;
      if (n.kind === 'gym') n.row = n.lane === 1 ? 8 : 2;
      else if (n.lane !== undefined) {
        const mine = row.filter((x) => x.lane === n.lane).sort((a, b) => a.col - b.col);
        n.row = (n.lane === 1 ? 6 : 0) + Math.round((mine.indexOf(n) / Math.max(1, mine.length - 1)) * 4);
      } else {
        const sorted = [...row].sort((a, b) => a.col - b.col);
        n.row = 1 + Math.round((sorted.indexOf(n) / Math.max(1, sorted.length - 1)) * 8);
      }
    }
  }
}

/**
 * §10.7.4 — version 18 → 19: the run carries its uid counter (`uidSeq`). Until now it was module state that a page
 * reload reset, so a run continued after a reload could mint a recruit with a uid already in the Box (v0.9.8's bug).
 * The counter starts past every uid the save holds, and a Pokémon that shares a uid with an earlier one is given a new
 * one — the pending evolution that named its species follows it; the Active Team keeps the first.
 */
function migrateUidsTo19(run: RunState): void {
  run.uidSeq = Math.max(0, ...run.box.map((m) => uidIndex(m.uid)));
  const seen = new Set<string>();
  for (const mon of run.box) {
    if (!seen.has(mon.uid)) {
      seen.add(mon.uid);
      continue;
    }
    const old = mon.uid;
    mon.uid = mintUid(run);
    seen.add(mon.uid);
    for (const p of run.pendingEvolutions) if (p.uid === old && p.from === mon.speciesId) p.uid = mon.uid;
  }
}

/**
 * §2.6.4.2 — version 19 → 20: the Master Ball Charm is gone (v0.9.9, the user's call); the Master Ball is an item. A run
 * that held the charm unspent gets the ball it would have thrown; a spent one is simply dropped.
 */
function migrateMasterBallTo20(run: RunState): void {
  const id = 'master-ball-charm';
  if (run.relics.includes(id) && !run.spentRelics.includes(id)) run.consumables.push('master-ball');
  run.relics = run.relics.filter((r) => r !== id);
  run.spentRelics = run.spentRelics.filter((r) => r !== id);
  if (run.bag) run.bag = run.bag.filter((r) => r !== id);
}

/** §10.8.3 — the known steps: the migration that takes a save *from* each version to the next. */
const MIGRATIONS: Readonly<Record<number, (run: RunState) => void>> = { 9: migrateBadgesTo10, 10: migrateStonesTo11, 11: migrateSafariTo12, 12: migrateMarketTo13, 13: migrateRouletteTo14, 14: migrateDaycareTo15, 15: migrateSuppliesTo16, 16: migrateBallsTo17, 17: migrateRowsTo18, 18: migrateUidsTo19, 19: migrateMasterBallTo20 };

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
  // Standing at the start is column 1, not column 0 — the map header counts the same way, and "column 0/20" on
  // the Continue button read like a save that had gone wrong.
  const layer = run.position ? (run.map.nodes[run.position]?.layer ?? 0) + 2 : 1;
  const name = lead ? content.species(lead.speciesId).name : 'a new team';
  return `Region ${run.regionIndex + 1} · column ${Math.min(layer, run.map.layers)}/${run.map.layers} · ${name} L${lead?.level ?? '?'} · ${run.box.length} in the Box`;
}
