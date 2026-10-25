import type { getContent } from '@/content/registry';
import { FLEE_TOLL, fleeTierFor, maxHpOf, xpToNext, type FightRecord, type LevelUp, type PartyMon, type RunState } from '@/sim';

// §9.4.5 — what the result screen shows, as plain data: each Pokémon's HP and XP from where the fight left it to where
// the reward put it, the spoils, and the reveal's beats in order. Pure, so the order and the timings are tested without
// a screen (results.test.ts); the screen only plays it.

type Content = ReturnType<typeof getContent>;

/** A place on the field, as the fight ended. */
export type Place = 'lead' | 'b1' | 'b2';

/** One level's stretch of an XP bar, as fractions of that level's bar; one ending at 1 is a level gained. */
export interface XpSegment {
  level: number;
  from: number;
  to: number;
}

export interface ResultMon {
  mon: PartyMon;
  /** Where it stood on the field; null for a Pokémon that stayed in the Box (it still took its share of XP). */
  place: Place | null;
  hp: { from: number; to: number; max: number };
  xp: { gain: number; segments: XpSegment[] } | null;
  /** What its levels gave, when it gained any. */
  up: LevelUp | null;
}

const PLACES: Place[] = ['lead', 'b1', 'b2'];

/** §9.4.5 — the team that fought, in its final places, then the Box, each with its bars' start and end. */
export function resultMons(run: RunState, content: Content): ResultMon[] {
  const rec = run.lastFight ?? null;
  const reward = run.pendingReward;
  const formation = rec?.formation.length ? rec.formation : run.activeUids;
  const order = [...formation, ...run.box.map((m) => m.uid).filter((uid) => !formation.includes(uid))];
  const out: ResultMon[] = [];
  for (const uid of order) {
    const mon = run.box.find((m) => m.uid === uid);
    // A Pokémon caught in this fight has no line: it was not there when it started.
    const before = rec?.before.find((b) => b.uid === uid);
    if (!mon || (rec && !before)) continue;
    const at = formation.indexOf(uid);
    const max = maxHpOf(mon, content);
    const gain = reward?.xpAwarded.find((a) => a.uid === uid)?.amount ?? 0;
    out.push({
      mon,
      place: at >= 0 && at < PLACES.length ? PLACES[at]! : null,
      hp: { from: Math.min(max, before?.hp ?? mon.hp), to: Math.min(max, mon.hp), max },
      xp: reward && gain > 0 ? { gain, segments: xpSegments(before ?? { level: mon.level, xp: mon.xp }, mon) } : null,
      up: reward?.levelUps.find((l) => l.uid === uid) ?? null,
    });
  }
  return out;
}

/** The XP bar from `before` to `after`, one segment per level crossed. */
export function xpSegments(before: { level: number; xp: number }, after: { level: number; xp: number }): XpSegment[] {
  const frac = (xp: number, level: number) => Math.max(0, Math.min(1, xp / Math.max(1, xpToNext(level))));
  const out: XpSegment[] = [];
  for (let level = before.level; level <= after.level; level++) {
    const from = level === before.level ? frac(before.xp, level) : 0;
    const to = level === after.level ? frac(after.xp, level) : 1;
    out.push({ level, from, to });
  }
  return out;
}

export type Spoil =
  | { kind: 'money'; amount: number; wallet: number }
  | { kind: 'item'; item: 'consumable' | 'ball' | 'relic' | 'held-item' | 'tm'; id: string; count: number }
  | { kind: 'toll-money'; amount: number; pct: number }
  | { kind: 'toll-item'; item: 'relic' | 'consumable'; id: string };

/** §2.14 / §7.3 / §7.4.6 / §3.1.2 — what the fight paid, or what running cost, one card each (like items counted). */
export function spoilsOf(run: RunState): Spoil[] {
  const reward = run.pendingReward;
  const toll = run.lastFight?.toll;
  if (toll) {
    const tier = run.lastFight?.kind ? fleeTierFor(run.lastFight.kind) : null;
    const pct = tier ? FLEE_TOLL[tier].moneyPct : 0;
    return [
      ...(toll.money > 0 ? [{ kind: 'toll-money', amount: toll.money, pct } as const] : []),
      ...(toll.lost ? [{ kind: 'toll-item', item: toll.lost.kind, id: toll.lost.id } as const] : []),
    ];
  }
  if (!reward) return [];
  const out: Spoil[] = [];
  if (reward.money > 0) out.push({ kind: 'money', amount: reward.money, wallet: run.money });
  const counted = new Map<string, number>();
  for (const id of reward.consumables ?? []) counted.set(id, (counted.get(id) ?? 0) + 1);
  for (const [id, count] of counted) out.push({ kind: 'item', item: 'consumable', id, count });
  if ((reward.balls ?? 0) > 0) out.push({ kind: 'item', item: 'ball', id: 'poke-ball', count: reward.balls });
  if (reward.relic) out.push({ kind: 'item', item: 'relic', id: reward.relic, count: 1 });
  if (reward.heldItem) out.push({ kind: 'item', item: 'held-item', id: reward.heldItem, count: 1 });
  if (reward.tm) out.push({ kind: 'item', item: 'tm', id: reward.tm, count: 1 });
  return out;
}

/** §9.4.5 — the reveal's lengths, one table the clock and the CSS both read. */
export const RESULT_MS = {
  /** The fight's last beat held a moment on the field before it becomes the result. */
  hold: 450,
  /** The ribbon drops, the line under it fades in. */
  ribbon: 320,
  /** The other side: the trainer steps forward, the Badge's case opens. */
  foe: 420,
  /** The victory heal fills every bar together. */
  heal: 600,
  /** An XP bar's fill: a long stretch and a short one, matching their whistles. */
  xpLong: 700,
  xpShort: 400,
  /** A level gained: the fanfare and the stat panel beside the card — its gains, then the totals counting up. */
  level: 1700,
  /** Between one Pokémon's bar and the next. */
  gap: 120,
  /** A spoil dealt into the tray, and the next one after it. */
  deal: 320,
  stagger: 120,
  /** The last beat's settle before Continue. */
  settle: 200,
  /** Continue takes no press this long after a skip lands it under the pointer (D8: a double click claims nothing unseen). */
  arm: 350,
} as const;

/** A fill shorter than this share of a bar takes the short whistle. */
const SHORT_FILL = 0.35;

export type Beat =
  | { kind: 'ribbon' | 'foe' | 'badge' | 'heal'; at: number; dur: number }
  | { kind: 'xp'; at: number; dur: number; uid: string; seg: number; short: boolean }
  | { kind: 'level'; at: number; dur: number; uid: string }
  | { kind: 'spoil'; at: number; dur: number; index: number };

export interface RevealPlan {
  beats: Beat[];
  total: number;
  /** Where a click or a key jumps to: the end of each beat a player waits on (a bar, a panel), then the end. */
  stops: number[];
}

/**
 * §9.4.5 — the reveal in order: the ribbon, the other side (and a Badge), the heal, then each Pokémon on the field in
 * turn — Lead, Bench 1, Bench 2 — its bar filling a level at a time, a level gained stopping on its fanfare and stat
 * panel before the bar goes on; then the spoils dealt. A Pokémon in the Box takes its XP without a beat of its own.
 */
export function revealPlan(mons: readonly ResultMon[], spoils: number, opts: { badge?: boolean } = {}): RevealPlan {
  const beats: Beat[] = [{ kind: 'ribbon', at: 0, dur: RESULT_MS.ribbon }, { kind: 'foe', at: 120, dur: RESULT_MS.foe }];
  if (opts.badge) beats.push({ kind: 'badge', at: 260, dur: RESULT_MS.foe });
  let t = 520;
  if (mons.some((m) => m.place && m.hp.to > m.hp.from)) {
    beats.push({ kind: 'heal', at: 420, dur: RESULT_MS.heal });
    t = 420 + RESULT_MS.heal + 100;
  }
  for (const m of mons) {
    if (!m.place || !m.xp) continue;
    const segs = m.xp.segments;
    // The panel stops after the last level crossed, before the bar's stretch into the new level.
    const lastCrossed = segs.length > 1 ? segs.length - 2 : -1;
    segs.forEach((s, i) => {
      if (s.to <= s.from && i !== 0) return;
      // A whole level crossed in the middle of a fill runs at the short whistle: several levels in one fight cost the
      // reveal a breath each, not a full bar each.
      const short = s.to - s.from < SHORT_FILL || (i > 0 && i < segs.length - 1);
      const dur = short ? RESULT_MS.xpShort : RESULT_MS.xpLong;
      beats.push({ kind: 'xp', at: t, dur, uid: m.mon.uid, seg: i, short });
      t += dur;
      if (i === lastCrossed && m.up) {
        beats.push({ kind: 'level', at: t, dur: RESULT_MS.level, uid: m.mon.uid });
        t += RESULT_MS.level;
      }
    });
    t += RESULT_MS.gap;
  }
  for (let i = 0; i < spoils; i++) beats.push({ kind: 'spoil', at: t + i * RESULT_MS.stagger, dur: RESULT_MS.deal, index: i });
  const end = Math.max(t + (spoils ? (spoils - 1) * RESULT_MS.stagger + RESULT_MS.deal : 0), ...beats.map((b) => b.at + b.dur)) + RESULT_MS.settle;
  const stops = [...new Set(beats.filter((b) => b.kind === 'xp' || b.kind === 'level').map((b) => b.at + b.dur)), end].sort((a, b) => a - b);
  return { beats, total: end, stops };
}

/** A beat's progress at `t`: 0 before it, 1 after it. */
export function progress(beat: { at: number; dur: number }, t: number): number {
  return beat.dur <= 0 ? (t >= beat.at ? 1 : 0) : Math.max(0, Math.min(1, (t - beat.at) / beat.dur));
}

/** What the screen draws for one Pokémon at `t`: its HP, the bar's level and fill, and whether its panel is up. */
export function monAt(m: ResultMon, plan: RevealPlan, t: number): { hp: number; level: number; fill: number; was: number; panel: number | null } {
  const heal = plan.beats.find((b) => b.kind === 'heal');
  const hp = !m.place || !heal ? m.hp.to : Math.round(m.hp.from + (m.hp.to - m.hp.from) * progress(heal, t));
  const segs = m.xp?.segments ?? [];
  const mine = plan.beats.filter((b): b is Extract<Beat, { kind: 'xp' }> => b.kind === 'xp' && b.uid === m.mon.uid);
  const level = plan.beats.find((b): b is Extract<Beat, { kind: 'level' }> => b.kind === 'level' && b.uid === m.mon.uid);
  // Before its first beat the bar stands where the fight left it; a Box member's, or one without beats, at the end.
  let seg = mine.length ? 0 : Math.max(0, segs.length - 1);
  let p = mine.length ? 0 : 1;
  for (const b of mine) {
    if (t >= b.at) {
      seg = b.seg;
      p = progress(b, t);
    }
  }
  // Every beat played (a bar that stopped exactly on a level has no stretch of its own after it): where it ends.
  const last = Math.max(0, ...mine.map((b) => b.at + b.dur), level ? level.at + level.dur : 0);
  if (mine.length && t >= last) {
    seg = segs.length - 1;
    p = 1;
  }
  const s = segs[seg];
  const fill = s ? s.from + (s.to - s.from) * p : 0;
  // The level tag ticks over as the bar tops out; a segment's level is the one its bar belongs to.
  const shownLevel = s ? (p >= 1 && s.to >= 1 && seg < segs.length - 1 ? s.level + 1 : s.level) : m.mon.level;
  const panel = level && t >= level.at && t < level.at + level.dur ? progress(level, t) : null;
  return { hp, level: Math.min(shownLevel, m.mon.level), fill, was: s && seg === 0 ? s.from : 0, panel };
}

/** §9.4.5 — the outcome's word and its ribbon's tone. */
export type Tone = 'gold' | 'red' | 'amber' | 'slate';
export function ribbonTone(outcome: FightRecord['outcome']): Tone {
  return outcome === 'caught' ? 'red' : outcome === 'defeat' ? 'amber' : outcome === 'escaped' || outcome === 'fled' ? 'slate' : 'gold';
}
