import type { Intent } from '@/sim';

/**
 * §5.2 / §9.2.5 (v0.9.16) — what kind of thing an intent is, as one colour on its chip and on its arrow: a **hit** (red),
 * a **stat** change — a drop on you or a rise on itself — (blue, the user's call: "cuando es un ataque pero que es de
 * stat, ponlo azul"), a **status** condition (violet), **help** for an ally — a heal, a Cover — (green), or something else
 * (a call for help). Null for an intent with no kind to show (hidden, or it cannot act).
 */
export type IntentTone = 'hit' | 'stat' | 'status' | 'ally' | 'other';

export function intentTone(intent: Intent | null | undefined): IntentTone | null {
  if (!intent || intent.hidden) return null;
  switch (intent.kind) {
    case 'attack':
    case 'backstrike':
    case 'cleave':
      return 'hit';
    case 'debuff':
    case 'buff':
      return 'stat';
    case 'status':
      return 'status';
    case 'stall':
    case 'guard':
      return 'ally';
    case 'summon':
      return 'other';
    default:
      return null;
  }
}
