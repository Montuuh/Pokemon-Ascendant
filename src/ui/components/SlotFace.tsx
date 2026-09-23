import styles from './SlotFace.module.css';

// §2.11.5 — the Slots' reel faces, drawn as pixel sprites so they sit with the item and type icons (D9). Each face
// is a grid of palette letters; the colours are tokens, so a theme change reaches the reels too. The set nods to
// the Gen I Game Corner machines: the cherry, the bell, BAR and the 7.

const PALETTE: Record<string, string | undefined> = {
  k: styles.ink,
  r: styles.red,
  g: styles.leaf,
  y: styles.gold,
  h: styles.shine,
};

const FACES: Record<string, string[]> = {
  cherry: [
    '.....gggg...',
    '....g..g....',
    '...g....g...',
    '...g....g...',
    '...g....g...',
    '.kkkk..kkkk.',
    'krrhrkkrrhrk',
    'krrrrkkrrrrk',
    'krrrrkkrrrrk',
    'krrrrkkrrrrk',
    '.kkkk..kkkk.',
    '............',
  ],
  bell: [
    '.....kk.....',
    '....kyyk....',
    '...kyhyyk...',
    '...kyhyyk...',
    '..kyhyyyyk..',
    '..kyyyyyyk..',
    '.kyyyyyyyyk.',
    '.kyyyyyyyyk.',
    'kyyyyyyyyyyk',
    'kkkkkkkkkkkk',
    '.....kk.....',
    '............',
  ],
  seven: [
    'kkkkkkkkkkk.',
    'krrrrrrrrrk.',
    'kkkkkkkrrrk.',
    '......krrk..',
    '.....krrk...',
    '.....krrk...',
    '....krrk....',
    '....krrk....',
    '...krrk.....',
    '...krrk.....',
    '...kkkk.....',
    '............',
  ],
  // A dark plate with the letters knocked out of it.
  bar: [
    '.............',
    '.............',
    'kkkkkkkkkkkkk',
    'kkkkkkkkkkkkk',
    'khhkkkhkkhhkk',
    'khkhkhkhkhkhk',
    'khhkkhhhkhhkk',
    'khkhkhkhkhkhk',
    'khhkkhkhkhkhk',
    'kkkkkkkkkkkkk',
    'kkkkkkkkkkkkk',
    '.............',
  ],
};

export function SlotFace({ face, size }: { face: string; size: number }) {
  const rows = FACES[face];
  if (!rows) return null;
  const width = rows[0]!.length;
  return (
    <svg className={styles.face} width={size} height={size} viewBox={`0 0 ${width} ${rows.length}`} shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (PALETTE[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} className={PALETTE[c]} /> : null)),
      )}
    </svg>
  );
}
