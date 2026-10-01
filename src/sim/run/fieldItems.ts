import type { ContentRegistry } from '../content/defs';
import type { PartyMon, RunState } from './types';

// §7.2.1 — consumables used from the bag between nodes (v0.8.6, the user's call: "now that consumables live in a bag,
// let the potions and antidotes be used outside a fight too"). What makes sense on a Pokémon resting on the map:
// the heals, the cures and Revive. Ether, the X items, Defog and the balls act on a fight and have nothing to act on
// here. Out of a fight an item costs no AP and no turn — only the item.

/** The consumable kinds that work out of a fight. */
const FIELD_KINDS = new Set(['heal-flat', 'heal-percent', 'revive', 'cure']);

/** §7.2.1 — can this consumable be used out of a fight at all? */
export function usableInField(consumableId: string, content: ContentRegistry): boolean {
  return FIELD_KINDS.has(content.consumable(consumableId).effect.kind);
}

export type FieldUseRefusal = 'not-a-field-item' | 'fainted' | 'not-fainted' | 'full-hp' | 'nothing-to-cure';

/**
 * §7.2.1 — would the item do something to this Pokémon right now? Null when it would; otherwise why not. The bag's
 * target list and the reducer read this one function, so the screen never offers a use the run would refuse.
 */
export function fieldUseRefusal(consumableId: string, mon: PartyMon, max: number, content: ContentRegistry): FieldUseRefusal | null {
  const fx = content.consumable(consumableId).effect;
  switch (fx.kind) {
    case 'heal-flat':
    case 'heal-percent':
      if (mon.hp <= 0) return 'fainted';
      return mon.hp >= max ? 'full-hp' : null;
    case 'revive':
      return mon.hp > 0 ? 'not-fainted' : null;
    case 'cure': {
      if (mon.hp <= 0) return 'fainted';
      const status = mon.status?.kind ?? null;
      const confused = (mon.confusionTurns ?? 0) > 0;
      if (fx.status === 'all') return status || confused ? null : 'nothing-to-cure';
      if (fx.status === 'confusion') return confused ? null : 'nothing-to-cure';
      return status === fx.status ? null : 'nothing-to-cure';
    }
    default:
      return 'not-a-field-item';
  }
}

/** §7.2.1 — apply it. The caller has checked `fieldUseRefusal`; returns a line for the log. */
export function applyFieldItem(run: RunState, consumableId: string, mon: PartyMon, max: number, content: ContentRegistry): string {
  const def = content.consumable(consumableId);
  const name = content.species(mon.speciesId).name;
  const fx = def.effect;
  switch (fx.kind) {
    case 'heal-flat': {
      const before = mon.hp;
      mon.hp = Math.min(max, mon.hp + fx.amount);
      return `${name} recovered ${mon.hp - before} HP (${def.name}).`;
    }
    case 'heal-percent': {
      const before = mon.hp;
      mon.hp = Math.min(max, mon.hp + Math.max(1, Math.floor((max * fx.percent) / 100)));
      return `${name} recovered ${mon.hp - before} HP (${def.name}).`;
    }
    case 'revive':
      mon.hp = Math.max(1, Math.floor((max * fx.percent) / 100));
      return `${name} is back on its feet at ${mon.hp} HP (${def.name}).`;
    case 'cure':
      if (fx.status === 'all' || fx.status === 'confusion') mon.confusionTurns = 0;
      if (fx.status !== 'confusion') mon.status = null;
      return `${name} is cured (${def.name}).`;
    default:
      return `${def.name} did nothing.`;
  }
}
