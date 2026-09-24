import { describe, expect, it } from 'vitest';
import { emptyDexEntry, isMet, UNMET_NAME } from './pokedex';
import { emptyAccount, speciesMet } from './account';

// §8.9.2 — the Pokédex keeps an unmet species to itself: a silhouette, "???", no types, no kit.

describe('Meeting a species — §8.9.2', () => {
  it('IsMet_NoTrace_IsASilhouette', () => {
    expect(isMet(undefined)).toBe(false);
    expect(isMet(emptyDexEntry())).toBe(false);
    expect(UNMET_NAME).toBe('???');
  });

  it('IsMet_AnyTraceOfTheSpecies_OpensIt', () => {
    for (const field of ['encounters', 'defeats', 'caught', 'recruits', 'winsWith', 'runsFinishedWith'] as const) {
      expect(isMet({ ...emptyDexEntry(), [field]: 1 }), field).toBe(true);
    }
    // A starter is met the moment it takes the field — before it has won anything.
    expect(isMet(emptyDexEntry(), 1)).toBe(true);
  });

  it('IsMet_ReadsAnOldSaveWhole', () => {
    // A v0.6 entry knew only `recruited`; it still counts.
    expect(isMet({ recruited: true } as never)).toBe(true);
  });
});

describe('Met on the account — §8.9.2 (v0.7.5)', () => {
  it('SpeciesMet_AnOwnedStarterIsMet_EvenBeforeItTakesTheField', () => {
    const account = emptyAccount();
    expect(speciesMet(account, 'magikarp')).toBe(false);
    expect(speciesMet({ ...account, starters: ['magikarp'] }, 'magikarp')).toBe(true);
    expect(speciesMet({ ...account, dex: { pikachu: { ...emptyDexEntry(), encounters: 1 } } }, 'pikachu')).toBe(true);
  });
});
