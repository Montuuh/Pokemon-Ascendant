import type { ReactNode } from 'react';
import { getContent } from '@/content/registry';
import type { PartyMon } from '@/sim';
import { shinyLine, shinyTip } from '@/ui/tips';

/** §5.14 / D2 — a plain sparkle inside a control is explained by that control's own focus/hover door. */
export function ownedMonTip(mon: Pick<PartyMon, 'speciesId' | 'shiny'>, tip: ReactNode = null): ReactNode {
  if (!mon.shiny) return tip;
  return tip ? <>{tip}{shinyLine(true)}</> : shinyTip(getContent().species(mon.speciesId).name, true);
}
