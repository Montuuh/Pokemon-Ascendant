import { describe, expect, it } from 'vitest';
import { dispatch, handCard, startFixture, tweak, withHand } from '../testing/harness';

// §9.2.2.1 — the log reads a fight back: every hit says what it took and what is left (the user's note, 2026-10-19).

const linesSince = (before: { log: { text: string }[] }, after: { log: { text: string }[] }) => after.log.slice(before.log.length).map((l) => l.text);

describe('The combat log — §9.2.2.1', () => {
  it('YourHit_SaysWhatItTookAndWhatIsLeft', () => {
    const s = tweak(withHand(startFixture('wild-basic'), ['ember']), (d) => {
      d.player.ap = 3;
    });
    const foe = s.enemies[0]!;
    const after = dispatch(s, { type: 'play-card', cardId: handCard(s, 'ember').id, targetUid: foe.uid });
    const hit = after.enemies.find((e) => e.uid === foe.uid);
    const took = foe.hp - (hit?.hp ?? 0);
    const lines = linesSince(s, after);
    expect(lines.some((l) => l.includes(' used Ember'))).toBe(true);
    expect(lines).toContain(hit && hit.hp > 0 ? `${foe.name} took ${took} (${hit.hp}/${hit.maxHp} HP left).` : `${foe.name} took ${took}.`);
  });

  it('AFoesHit_SaysWhatItTookAndHowItLanded', () => {
    const s = tweak(startFixture('wild-basic'), (d) => {
      d.enemies[0]!.intent = { kind: 'attack', moveId: 'tackle', targetSlot: 'lead', hidden: false };
    });
    const after = dispatch(s, { type: 'end-turn' });
    const lead = s.player.team[s.player.leadIndex]!;
    const lines = linesSince(s, after);
    expect(lines.some((l) => l.startsWith(`${lead.name} took `) && l.endsWith('HP left).'))).toBe(true);
  });
});
