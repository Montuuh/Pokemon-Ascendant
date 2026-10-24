import { leagueMemberOf, type RunState } from '@/sim';
import { RUN_END_TEXT } from '@/ui/strings';

/** §9.12.3 / §2.1.6 — format the reached fight; position alone is the last cleared node. */
export function runEndLocation(run: RunState): string {
  const node = (run.pendingNodeId ? run.map.nodes[run.pendingNodeId] : undefined)
    ?? (run.position ? run.map.nodes[run.position] : undefined);
  const zone = run.zone === 'league' ? RUN_END_TEXT.league
    : run.zone === 'victory-road' ? RUN_END_TEXT.victoryRoad
      : RUN_END_TEXT.region(run.regionIndex + 1);
  if (!node) return RUN_END_TEXT.location(zone, RUN_END_TEXT.entrance);
  const member = run.zone === 'league' ? leagueMemberOf(node) : undefined;
  const marker = member
    ? member.id === 'champion' ? RUN_END_TEXT.champion(member.name) : member.name
    : RUN_END_TEXT.column(node.layer + 1, run.map.layers);
  return RUN_END_TEXT.location(zone, marker);
}
