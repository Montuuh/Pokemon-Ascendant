import { useState } from 'react';

// §8.4.1 — which Pokédex sheet is open, as a small history: an evolution or a stage on the Line tab opens
// that species and Back returns. Kept apart from the dialog so the grid can open a sheet without owning it.

export type SheetTab = 'record' | 'kit' | 'line';

export interface SheetPage {
  id: string;
  /** The tab to open on; the Record by default. */
  tab?: SheetTab;
}

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
