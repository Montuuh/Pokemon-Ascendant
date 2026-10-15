/**
 * §9.13.1 — the battles behind the title (v0.9.17, the user's note 8: "un fondo animado, que sea de lucha pokemon,
 * usando un arte parecido al del juego"). Real battle sprites trading their own moves on one of the game's battle
 * backdrops: the side nearer the camera (its back to you) is "yours", the far one the foe. Each pair is a matchup the
 * series is known for, each move one the Pokémon learns there, never a move its target is immune to; the winner is
 * the one its types favour, so a Pokémon fan reading the fight finds nothing off. Presentation only: no rule reads this table.
 */
export interface TitleFighter {
  /** A species id with battle sprites (front, and back for the near side). */
  readonly speciesId: string;
  /** Two moves, used in turn: each has its illustration (art/moves/), which lands on the target as it hits. */
  readonly moves: readonly [string, string];
}

export interface TitleMatchup {
  readonly near: TitleFighter;
  readonly far: TitleFighter;
  /** A battle backdrop (art/stages/). */
  readonly stage: string;
  /** Who is left standing. */
  readonly winner: 'near' | 'far';
}

export const TITLE_MATCHUPS: readonly TitleMatchup[] = [
  { near: { speciesId: 'charizard', moves: ['flamethrower', 'wing-attack'] }, far: { speciesId: 'venusaur', moves: ['razor-leaf', 'solar-beam'] }, stage: 'meadow', winner: 'near' },
  { near: { speciesId: 'pikachu', moves: ['thunderbolt', 'quick-attack'] }, far: { speciesId: 'gyarados', moves: ['hydro-pump', 'bite'] }, stage: 'sea', winner: 'near' },
  { near: { speciesId: 'gengar', moves: ['night-shade', 'lick'] }, far: { speciesId: 'golduck', moves: ['confusion', 'hydro-pump'] }, stage: 'night-meadow', winner: 'far' },
  { near: { speciesId: 'blastoise', moves: ['hydro-pump', 'bite'] }, far: { speciesId: 'arcanine', moves: ['flamethrower', 'take-down'] }, stage: 'river', winner: 'near' },
  { near: { speciesId: 'machamp', moves: ['submission', 'karate-chop'] }, far: { speciesId: 'snorlax', moves: ['body-slam', 'headbutt'] }, stage: 'city', winner: 'near' },
  { near: { speciesId: 'rhydon', moves: ['earthquake', 'horn-attack'] }, far: { speciesId: 'primeape', moves: ['karate-chop', 'fury-swipes'] }, stage: 'cave', winner: 'far' },
  { near: { speciesId: 'lapras', moves: ['ice-beam', 'surf'] }, far: { speciesId: 'dragonite', moves: ['hyper-beam', 'dragon-rage'] }, stage: 'ice-cave', winner: 'near' },
  { near: { speciesId: 'scyther', moves: ['slash', 'wing-attack'] }, far: { speciesId: 'exeggutor', moves: ['stomp', 'psychic'] }, stage: 'forest', winner: 'near' },
  { near: { speciesId: 'nidoking', moves: ['horn-attack', 'earthquake'] }, far: { speciesId: 'magmar', moves: ['fire-punch', 'ember'] }, stage: 'volcano', winner: 'near' },
  { near: { speciesId: 'jolteon', moves: ['thunder', 'double-kick'] }, far: { speciesId: 'starmie', moves: ['surf', 'psychic'] }, stage: 'power-plant', winner: 'near' },
];

/** One hit of a fight: who strikes, with which move, and the share of the target's HP it takes. */
export interface TitleHit {
  readonly by: 'near' | 'far';
  readonly moveId: string;
  readonly damage: number;
}

/**
 * The fight as hits, the winner first: it lands three (the third the knock-out), the other two between them — five
 * exchanges, about ten seconds with the entrance and the faint, long enough to read as a battle and short enough that the next one comes.
 */
export function titleHits(m: TitleMatchup): TitleHit[] {
  const loser = m.winner === 'near' ? 'far' : 'near';
  const w = m[m.winner].moves;
  const l = m[loser].moves;
  return [
    { by: m.winner, moveId: w[0], damage: 0.36 },
    { by: loser, moveId: l[0], damage: 0.31 },
    { by: m.winner, moveId: w[1], damage: 0.34 },
    { by: loser, moveId: l[1], damage: 0.28 },
    { by: m.winner, moveId: w[0], damage: 0.3 },
  ];
}
