import { useEffect, useState, type ReactNode } from 'react';
import { IconArrowLeft, IconArrowRight, IconCheck, IconClock } from '@tabler/icons-react';
import { getContent } from '@/content/registry';
import {
  afterTurn, planOf, playerCanStand, SAFARI, throwOdds, tileAt, traitsOf, walkDistance,
  type Facing, type SafariHunt, type SafariSpot, type SafariTier,
} from '@/sim';
import { itemIcon, spriteOf } from '@/ui/art';
import { Modal } from '@/ui/components/Modal';
import { SAFARI_GUIDE, SAFARI_TIER_LABEL } from '@/ui/strings';
import { CellArt } from './CellArt';
import { boardStyle, cellClass, frameClass, sightClass, targetClass, tileClass } from './tiles';
import styles from './SafariGuide.module.css';

// §2.11.6 — the Safari's How to play: six short pages, one idea each, in the order a first stalk meets them. Each
// board page is a real little stalk — a SafariHunt — drawn with the board's own pieces and read with the sim's own
// functions (planOf, afterTurn, throwOdds), so the red, the pale red, the dots and the odds are exactly what the
// stalk would show; nothing on a page is painted by hand. It opens by itself on a browser's first walk into the park,
// and from the How to play button after that.

type Pt = [number, number];

interface Scene {
  rows: string[];
  species: string;
  tier: SafariTier;
  mon: Pt;
  facing: Facing;
  player: Pt;
  /** Its beat. Absent: it stands where it is this turn (a still Pokémon, drawn as the rock holds one). */
  patrol?: Pt[];
  bait?: Pt;
  /** The rock's badge on it: stopped this turn, turned to the noise. */
  rock?: boolean;
  /** Draw the yellow outline on the tiles a step can reach. */
  targets?: boolean;
  /** Put the throw's chip on the board. */
  odds?: boolean;
}

/** The scene as the sim's own stalk. */
function huntOf(sc: Scene): { hunt: SafariHunt; spot: SafariSpot } {
  const patrol = sc.patrol ?? [sc.mon];
  const hunt: SafariHunt = {
    spot: 0,
    width: sc.rows[0]!.length,
    height: sc.rows.length,
    tiles: sc.rows.join(''),
    player: sc.player,
    mon: sc.mon,
    facing: sc.facing,
    patrol,
    patrolIndex: patrol.findIndex((p) => p[0] === sc.mon[0] && p[1] === sc.mon[1]),
    alarms: 0,
    seen: false,
    ap: SAFARI.ap,
    bait: sc.bait ?? null,
    eating: 0,
    held: !sc.patrol || !!sc.rock,
    heldLast: false,
    lastThrow: null,
    turn: 1,
  };
  return { hunt, spot: { species: sc.species, tier: sc.tier, level: 1, result: null } };
}

const PAGES: (Scene[] | 'lineup' | 'ticket')[] = [
  'lineup',
  // The grass hides you inside its look; the open tile beside you, and the one in front of it, do not.
  [{ rows: ['ggggg', 'ggggg', 'gggog', 'ggggg'], species: 'paras', tier: 'common', mon: [2, 0], facing: 's', player: [2, 2] }],
  // A quick walker's two steps this turn, and the look it will have at the end of them; your moves in yellow.
  [{
    rows: ['gggggg', 'gggggg', 'gggggg', 'gggggg'],
    species: 'tauros', tier: 'rare', mon: [0, 1], facing: 'e', player: [2, 3], targets: true,
    patrol: [[0, 1], [1, 1], [2, 1], [3, 1], [3, 2], [2, 2], [1, 2], [0, 2]],
  }],
  // Bait draws it; a rock holds it facing away, so you can walk in behind.
  [
    { rows: ['gggg', 'gggg', 'gggg', 'gggg'], species: 'exeggcute', tier: 'uncommon', mon: [2, 0], facing: 's', player: [0, 3], bait: [2, 2], patrol: [[2, 0], [3, 0]] },
    { rows: ['gggg', 'gggg', 'gggg', 'gggg'], species: 'kangaskhan', tier: 'rare', mon: [1, 1], facing: 'n', player: [1, 3], rock: true },
  ],
  // Close, from behind, never seen: the throw's own number.
  [{ rows: ['ggggg', 'ggggg', 'ggggg', 'goggg'], species: 'chansey', tier: 'rare', mon: [2, 2], facing: 's', player: [2, 1], odds: true }],
  'ticket',
];

const key = (x: number, y: number) => `${x},${y}`;

function MiniBoard({ scene, tile }: { scene: Scene; tile: number }) {
  const content = getContent();
  const { hunt, spot } = huntOf(scene);
  const plan = planOf(hunt, spot);
  const end = afterTurn(hunt, spot, plan);
  const watched = new Set(end.cone.map((p) => key(p[0], p[1])));
  const path = new Set(plan.steps.map((p) => key(p[0], p[1])));
  const odds = scene.odds ? throwOdds(hunt, spot, content) : null;
  const species = content.species(spot.species);
  const cells: ReactNode[] = [];
  for (let y = 0; y < hunt.height; y++) {
    for (let x = 0; x < hunt.width; x++) {
      const k = key(x, y);
      const seen = playerCanStand(hunt, x, y) && afterTurn({ ...hunt, player: [x, y] }, spot).spots;
      const step = scene.targets && walkDistance(hunt.player, [x, y]) === 1 && playerCanStand(hunt, x, y);
      const isMon = hunt.mon[0] === x && hunt.mon[1] === y;
      cells.push(
        <span key={k} className={[tileClass(tileAt(hunt, x, y)!, x, y, (a, b) => tileAt(hunt, a, b)), cellClass, sightClass(seen, watched.has(k)), step ? targetClass : ''].join(' ')}>
          <CellArt
            step={path.has(k)}
            bait={hunt.bait?.[0] === x && hunt.bait?.[1] === y}
            seen={seen}
            mon={isMon ? { species: species.id, name: species.name, facing: hunt.facing, state: scene.rock ? 'held' : null } : undefined}
            player={hunt.player[0] === x && hunt.player[1] === y ? { exposed: false } : undefined}
          />
        </span>,
      );
    }
  }
  return (
    <div className={styles.boardSlot}>
      <div className={frameClass} style={boardStyle(hunt.width, hunt.height, tile)} aria-hidden="true">
        {cells}
      </div>
      {odds && (
        <span className={styles.odds}>
          <img src={itemIcon('safari-ball')} alt="" /> {Math.round(odds.chance * 100)} %
        </span>
      )}
    </div>
  );
}

function Picture({ page, balls, clock }: { page: (typeof PAGES)[number]; balls: number; clock: number }) {
  if (page === 'lineup') {
    return (
      <div className={styles.lineup} aria-hidden="true">
        {([['paras', 'common'], ['exeggcute', 'uncommon'], ['kangaskhan', 'rare']] as const).map(([s, tier]) => (
          <span key={s} className={styles.pick}>
            <img src={spriteOf({ speciesId: s }, 'front')} alt="" />
            <span className={`${styles.tier} ${tier === 'rare' ? styles.tierRare : ''}`}>{SAFARI_TIER_LABEL[tier]}</span>
            <span className={styles.pips}>
              {Array.from({ length: traitsOf({ species: s, tier }).temper }, (_, i) => <span key={i} className={styles.pip} />)}
            </span>
          </span>
        ))}
      </div>
    );
  }
  if (page === 'ticket') {
    return (
      <div className={styles.chips} aria-hidden="true">
        <span className={styles.chip}><img src={itemIcon('safari-ball')} alt="" /> {balls}</span>
        <span className={styles.chip}><IconClock size={28} /> {clock}</span>
      </div>
    );
  }
  // Two boards share the width, so each takes the smaller whole-pixel tile.
  const tile = page.length > 1 ? 32 : 48;
  return (
    <div className={styles.boards}>
      {page.map((sc) => <MiniBoard key={sc.species} scene={sc} tile={tile} />)}
    </div>
  );
}

/** The ticket this visit sells — or, before a City has one, the town's. */
export function SafariGuide({ onClose, balls, clock }: { onClose: () => void; balls: number | null; clock: number | null }) {
  const [page, setPage] = useState(0);
  const last = PAGES.length - 1;
  const numbers = { balls: balls ?? SAFARI.cities['pallet-town'].balls, clock: clock ?? SAFARI.cities['pallet-town'].clock, ap: SAFARI.ap };
  const words = SAFARI_GUIDE.pages[page]!;

  // Escape closes it from any page, the way the Skip does.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Modal title={SAFARI_GUIDE.title} testId="safari-guide" size="reading">
      <div className={styles.page} data-testid={`safari-guide-page-${page}`}>
        <div className={styles.picture}>
          <Picture page={PAGES[page]!} balls={numbers.balls} clock={numbers.clock} />
        </div>
        <div className={styles.words}>
          <span className={styles.count}>{page + 1} / {last + 1}</span>
          <h3 className={`${styles.heading} display`}>{words.title}</h3>
          <p className={styles.body}>{words.body(numbers)}</p>
        </div>
      </div>
      {/* Next comes first in the DOM, so it is what the dialog focuses: Enter walks through the guide. */}
      <div className={styles.nav}>
        <button type="button" className={styles.primary} onClick={() => (page === last ? onClose() : setPage(page + 1))} data-testid="btn-guide-next">
          {page === last ? <><IconCheck size={16} aria-hidden="true" /> {SAFARI_GUIDE.done}</> : <>Next <IconArrowRight size={16} aria-hidden="true" /></>}
        </button>
        {page > 0 && (
          <button type="button" className={styles.secondary} onClick={() => setPage(page - 1)} data-testid="btn-guide-prev">
            <IconArrowLeft size={16} aria-hidden="true" /> Back
          </button>
        )}
        {page < last && (
          <button type="button" className={styles.skip} onClick={onClose} data-testid="btn-guide-back">
            {SAFARI_GUIDE.skip}
          </button>
        )}
        <ol className={styles.dots} aria-label="Pages">
          {SAFARI_GUIDE.pages.map((q, i) => (
            <li key={q.title}>
              <button type="button" className={`${styles.dot} ${i === page ? styles.dotOn : ''}`} aria-label={q.title} aria-current={i === page ? 'step' : undefined} onClick={() => setPage(i)} />
            </li>
          ))}
        </ol>
      </div>
    </Modal>
  );
}
