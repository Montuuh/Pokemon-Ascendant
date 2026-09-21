import { useState } from 'react';

// §8.4.1 — which sheet the PC Terminal has open, as a small history: a line's stage opens its species and
// Back returns to the line. Kept apart from the dialog so the grids can open a sheet without owning it.

export type SheetPage = { kind: 'species'; id: string } | { kind: 'line'; id: string };

export interface PcSheetState {
  stack: SheetPage[];
  open: (page: SheetPage) => void;
  push: (page: SheetPage) => void;
  back: () => void;
  close: () => void;
}

export function usePcSheet(): PcSheetState {
  const [stack, setStack] = useState<SheetPage[]>([]);
  return {
    stack,
    open: (page) => setStack([page]),
    push: (page) => setStack((s) => [...s, page]),
    back: () => setStack((s) => s.slice(0, -1)),
    close: () => setStack([]),
  };
}
