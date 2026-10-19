import type { ReactNode } from 'react';
import { Tip, Tipped } from '@/ui/tooltip';
import { UNIT_CHIPS_TEXT } from '@/ui/strings';
import card from './UnitCard.module.css';

// §9.2.2.2 / §9.2.2.3 — what a fight hands a Pokémon (its stages, a shield, Armour, Sturdy, Trauma, a runner's count),
// as chips on its window's top-left corner: the card keeps one size. Where the stage is tall every chip shows; on a short
// stage (720 p) two rows at most — the first chip, then "+N" whose bubble names the rest — so they never cover the sprite.

export interface UnitChip {
  key: string;
  /** The chip in words, for the "+N" bubble. */
  label: string;
  /** What it does, for the "+N" bubble — the chip's own bubble, which a folded chip cannot open. */
  explain?: string;
  node: ReactNode;
}

export function UnitChips({ chips }: { chips: readonly UnitChip[] }) {
  if (!chips.length) return null;
  const folds = chips.length > 2;
  const rest = chips.slice(1);
  return (
    <span className={card.chips}>
      {chips.map((c, i) => (
        <span key={c.key} className={folds && i > 0 ? card.chipFolds : undefined}>
          {c.node}
        </span>
      ))}
      {folds && (
        <Tipped tip={<Tip title={UNIT_CHIPS_TEXT.more(rest.length)} body={rest.map((c) => (
            <div key={c.key}>
              <b>{c.label}</b>
              {c.explain ? ` — ${c.explain}` : ''}
            </div>
          ))} />} className={`${card.chip} ${card.info} ${card.chipMore}`} data-testid="unit-chips-more">
          +{rest.length}
        </Tipped>
      )}
    </span>
  );
}
