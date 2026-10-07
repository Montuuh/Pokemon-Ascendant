import type { ReactNode } from 'react';
import type { CatchOdds } from '@/sim/combat/catch';
import { AID_HEAL_PCT, RELIC_PREMIUM, BLACK_MARKET, CASINO, LEGENDARY_CAP, SHOWCASE_CAP, SLOT_LABEL, intentRecipient, summonedBy, DEFAULT_BATTLE_CONFIG, regionContent, regionName, slotOccupant, STATUS_ACCENT_FROM, statTierFor, BOND, BOND_TIER, BOND_RANK_NAME, SHINY, bondProgress, POKEMON_TYPES, PRICES, SHELVES, describeToll, sellPrice, typeMultiplier, type FleeTier, type FleeToll, type CardPlayability, type Combatant, type CombatState, type ConsumableDef, type EnemyCombatant, type MoveDef, type PokemonType, type RelicDef, type TurnForecast, type GroupPlan, type FieldId, MONEY_TO_TOKENS, TRACK_TOKENS, SHELF_ORDER, XP, MART_PRICE } from '@/sim';
import { getContent } from '@/content/registry';
import { itemIcon, statusGlyph, typeGlyph } from '@/ui/art';
import { describeMoveDef } from '@/ui/moveText';
import { CITY_DOOR_HINT, FIELD_LABEL, GROUP_HINT, groupLabel, homeFieldLabel, INTENT_LABEL, MARKET_TEXT, ROLE_HINT, ROLE_LABEL, SHELF_HINT, SHELF_LABEL, SLOT_FACE_LABEL, REJECT_TEXT, STATUS_HINT, STATUS_LABEL, type CityDoor } from '@/ui/strings';
import { Tip } from '@/ui/tooltip';

// Every explanation the game offers on hover, in one file.
//
// The rule the user set on 2026-09-21: short text on the screen, the explanation in a bubble when you rest on
// it. That only works if the bubbles say the same kind of thing in the same voice everywhere, so they are all
// built here from the content rows and the string tables — a component never writes tooltip prose of its own.
// Nothing in this file is a rule: every sentence restates something the sim already does, in the player's
// words, and the § it comes from is named in a comment rather than in the text (players do not read §).

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const typeName = (t: string) => cap(t);

// ── Types and statuses ───────────────────────────────────────────────────────────────────────────────────

/** §4.1.2 — a type badge: its own type's weaknesses, resistances and immunities; on a dual type, also the pair's combined line. */
export function typeTip(type: PokemonType, defenderTypes?: readonly PokemonType[]): ReactNode {
  // §4.1.2 — what one typing takes from each attacking type: weak, resists, immune.
  const relations = (def: readonly PokemonType[]) => {
    const m = (atk: PokemonType) => typeMultiplier(atk, def);
    const parts: string[] = [];
    const weak = POKEMON_TYPES.filter((atk) => m(atk) > 1).map(typeName);
    const resists = POKEMON_TYPES.filter((atk) => m(atk) > 0 && m(atk) < 1).map(typeName);
    const immune = POKEMON_TYPES.filter((atk) => m(atk) === 0).map(typeName);
    if (weak.length) parts.push(`Weak to ${weak.join(', ')}`);
    if (resists.length) parts.push(`Resists ${resists.join(', ')}`);
    if (immune.length) parts.push(`Immune to ${immune.join(', ')}`);
    return parts;
  };
  // The badge's own type, alone — a Ground badge never claims Rock's resistances. On a dual-typed Pokémon the pair's
  // combined answer is a line of its own, named as the pair (it is what the hit will actually do).
  const pair = defenderTypes && defenderTypes.length > 1 ? defenderTypes : null;
  const body = pair ? <div><b>As {pair.map(typeName).join(' · ')}:</b> {relations(pair).join('. ')}.</div> : undefined;
  return <Tip icon={<img src={typeGlyph(type)} alt="" height={18} style={{ imageRendering: 'pixelated' }} />} title={`${typeName(type)} type`} meta={relations([type])} body={body} />;
}

/** §4.2 — a status condition, what it does, and how long it lasts. */
export function statusTip(status: string): ReactNode {
  return <Tip icon={<img src={statusGlyph(status)} alt="" width={20} height={20} />} title={STATUS_LABEL[status] ?? cap(status)} body={STATUS_HINT[status]} />;
}

// ── Moves ────────────────────────────────────────────────────────────────────────────────────────────────

// §3.6 / §5.6 — range answers two questions: who can play the card, and which enemy it can reach.
const RANGE_BODY = {
  melee: 'Melee: only your Lead can play it, and it reaches only the enemy Lead.',
  ranged: 'Ranged: anyone on your team can play it, from the bench too, and it reaches any enemy.',
} as const;

const MODIFIER_BODY = {
  'step-forward': 'Step-Forward: the Pokémon that owns this card steps up to Lead first, then the move resolves. That swap is free and does not count towards the swap ladder.',
  'step-backward': 'Step-Backward: the move resolves, then the Pokémon retreats to a bench of your choice. Free, and off the ladder.',
  none: null,
} as const;

/** §3.3.4, §4.1 — a move card in full: what it is, what it does, what it will do to this target. */
export function moveTip(play: CardPlayability): ReactNode {
  const { move, owner } = play;
  const meta: ReactNode[] = [typeName(move.type), move.range === 'melee' ? 'Melee' : 'Ranged', `${play.apCost} AP${play.apCost !== move.apCost ? ` (base ${move.apCost})` : ''}`];
  if (move.power > 0) meta.push(`${move.power} power`);
  if (move.targeting === 'cleave') meta.push('Hits every enemy');
  // §5.13.2 — the fifth card says so: it is the one card in the hand no Move Manager can reach.
  if (play.card.mastery) meta.push('★ Mastery');
  const lines: ReactNode[] = [describeMoveDef(move)];
  lines.push(RANGE_BODY[move.range]);
  const mod = MODIFIER_BODY[move.modifier];
  if (mod) lines.push(mod);
  let footer: ReactNode = play.card.mastery ? `${owner.name}'s Mastery Move — a fifth card its line has earned.` : `${owner.name}'s card.`;
  if (play.damage && play.targets.length > 1) {
    // §5.6 — against a group every enemy has its own number; one "each" figure would be wrong for all but one.
    footer = play.hitsAll ? 'Lands on every enemy — each one\'s number is on its panel.' : 'Pick the enemy — each one\'s number is on its panel.';
  } else if (play.damage) {
    const eff = play.damage.typeMultiplier;
    const field = play.damage.fieldMultiplier ? `, field ×${play.damage.fieldMultiplier}` : '';
    footer = `Against this target: ${play.damage.final} damage${eff === 0 ? ' — no effect' : eff > 1 ? ` (super effective ×${eff}${field})` : eff < 1 ? ` (not very effective ×${eff}${field})` : field ? ` (${field.slice(2)})` : ''}${play.damage.isCrit ? ', critical' : ''}.`;
  }
  if (!play.playable && play.reason) footer = <span>Locked — {REJECT_TEXT[play.reason]}</span>;
  return <Tip icon={<img src={typeGlyph(move.type)} alt="" height={18} style={{ imageRendering: 'pixelated' }} />} title={move.name} meta={meta} body={lines.map((l, i) => <div key={i}>{l}</div>)} footer={footer} />;
}

/** The same card, outside a fight (Move Manager, Dojo): no target, no cost changes. */
export function moveDefTip(move: MoveDef): ReactNode {
  const meta: ReactNode[] = [typeName(move.type), move.range === 'melee' ? 'Melee' : 'Ranged', `${move.apCost} AP`];
  if (move.power > 0) meta.push(`${move.power} power`);
  const lines: ReactNode[] = [describeMoveDef(move), RANGE_BODY[move.range]];
  const mod = MODIFIER_BODY[move.modifier];
  if (mod) lines.push(mod);
  return <Tip icon={<img src={typeGlyph(move.type)} alt="" height={18} style={{ imageRendering: 'pixelated' }} />} title={move.name} meta={meta} body={lines.map((l, i) => <div key={i}>{l}</div>)} />;
}

// ── Intents ──────────────────────────────────────────────────────────────────────────────────────────────

const INTENT_BODY: Record<string, string> = {
  attack: 'A single hit on the slot named. Whoever is standing in that slot when the turn ends takes it — swap, and the newcomer takes it instead.',
  cleave: 'Hits every one of your slots at once. Nobody can dodge it by swapping; a shield or a swap to a sturdier Lead is the answer.',
  backstrike: 'Aims past your Lead at a bench slot. If that slot is empty when it lands, it fizzles.',
  buff: 'Raising one of its own stats this turn. It is not hitting you — this is the turn to hit it.',
  debuff: 'Lowering one of your stats. Usually aimed at the Lead.',
  stall: 'Recovering HP or setting up. A free turn for you.',
  status: 'Trying to inflict a status on your Lead. A swap moves the target.',
  unknown: 'Hidden. You can see what kind of thing is coming, not how hard or where. Some abilities and relics reveal it.',
  incapacitated: 'Asleep, frozen, or caught off guard by your Time Spinner. It does nothing this turn.',
  summon: 'Calling a companion into the fight. It spends its turn on it — a free turn for you, and the last one against fewer enemies.',
  guard: 'Finish the Lead now, or switch to Ranged.',
};

/** §5.5 — what an intent means and what to do about it. `hidden` intents show the kind only. */
export function intentTip(kind: string, detail?: string, hidden = false): ReactNode {
  return <Tip title={`Enemy intent: ${INTENT_LABEL[kind] ?? cap(kind)}`} meta={detail && !hidden ? [detail] : undefined} body={INTENT_BODY[hidden ? 'unknown' : kind] ?? INTENT_BODY.unknown} footer="Every enemy move is telegraphed a turn ahead. Nothing here is a guess." />;
}

/**
 * §9.2.5 — the intent card: everything the intent will do, the enemy side's counterpart to a move card's bubble.
 * The move and its type, who it is aimed at, the HP it takes off each Pokémon it lands on (the forecast's numbers,
 * the same ones on the portraits), its riders and its recharge. A hidden intent tells its kind and nothing else.
 */
export function intentCardTip(state: CombatState, enemy: EnemyCombatant, forecast: TurnForecast, action: 0 | 1 = 0, ifLead: { name: string; amount: number; ko: boolean }[] = []): ReactNode {
  const intent = action === 1 ? enemy.second ?? null : enemy.intent;
  if (!intent) return null;
  const move = intent.moveId ? getContent().move(intent.moveId) : null;
  if (intent.hidden || !move) return intentTip(intent.kind, undefined, intent.hidden);
  const meta: ReactNode[] = [typeName(move.type), INTENT_LABEL[intent.kind] ?? cap(intent.kind)];
  if (move.power > 0) meta.push(`${move.power} power`, move.range === 'melee' ? 'Melee' : 'Ranged');
  const lines: ReactNode[] = [];
  const ally = intent.targetEnemyUid ? intentRecipient(state, enemy, intent) : enemy;
  if (intent.kind === 'cleave') lines.push('Aimed at every Pokémon on your side.');
  else if (intent.targetSlot) lines.push(`Aimed at your ${SLOT_LABEL[intent.targetSlot]} — ${slotOccupant(state, intent.targetSlot)?.name ?? 'nobody there'}.`);
  else if (intent.kind === 'summon') {
    // §5.6.2 — who answers, by name, and where they stand.
    const who = summonedBy(state, enemy, move, DEFAULT_BATTLE_CONFIG.maxOnField).map((h) => getContent().species(h.species).name);
    lines.push(
      who.length === 0 ? 'Nobody can answer: no companion is left, or the field is full.'
      : who.length === 1 ? `${who[0]} joins the fight as a support, behind its Lead. It acts from next turn.`
      : `${who.join(' and ')} join the fight as supports, behind their Lead. They act from next turn.`,
    );
  } else if (intent.kind === 'guard') lines.push(`Steps in front of ${ally.name}: after this turn it leads, braced with +1 Defence, and your Melee cards reach only it.`);
  else lines.push(ally.uid === enemy.uid ? 'On itself.' : `On ${ally.name}, its Lead.`);
  if (enemy.acts === 2) lines.push(action === 0 ? 'It acts twice: this first, then the Also below.' : 'Its second action this turn, right after the first.');
  const hits = forecast.byAction[`${enemy.uid}#${action}`]?.hits ?? [];
  for (const h of hits) {
    const mon = state.player.team.find((m) => m.uid === h.targetUid);
    lines.push(<b key={h.targetUid}>{`${mon?.name ?? '?'}: ${h.amount} damage${h.ko ? ' — knocks it out' : ''}`}</b>);
  }
  if (move.power > 0 && hits.length === 0) lines.push('No damage lands: the target is immune, or the slot is empty.');
  // §9.2.5 — aimed at your Lead: the same hit on whoever else could stand there (v0.8.6).
  for (const w of ifLead) lines.push(`If ${w.name} led: ${w.amount} damage${w.ko ? ' — knocks it out' : ''}`);
  for (const fx of move.effects) {
    if (fx.kind === 'status' && !fx.self) lines.push(`${fx.chance >= 1 ? 'Inflicts' : `${Math.round(fx.chance * 100)}% chance to inflict`} ${fx.status}.`);
    if (fx.kind === 'stage' && fx.target === 'foe') lines.push(`${fx.stages > 0 ? '+' : ''}${fx.stages} ${cap(fx.stat)} on the target.`);
    if (fx.kind === 'stage' && fx.target === 'self') lines.push(`${fx.stages > 0 ? '+' : ''}${fx.stages} ${cap(fx.stat)} for ${ally.name}.`);
    if (fx.kind === 'heal') lines.push(`${ally.name} recovers ${Math.round(fx.percentOfMaxHp * 100)}% of its HP.`);
    if (fx.kind === 'recoil') lines.push(`It takes ${Math.round(fx.percentOfDamage * 100)}% of the damage back.`);
    if (fx.kind === 'drain') lines.push(`It heals ${Math.round(fx.percentOfDamage * 100)}% of the damage it deals.`);
  }
  if (move.cooldown) lines.push(`Then it cannot use it for ${move.cooldown} turn${move.cooldown === 1 ? '' : 's'}.`);
  return (
    <Tip
      icon={<img src={typeGlyph(move.type)} alt="" height={18} style={{ imageRendering: 'pixelated' }} />}
      title={`${enemy.name}: ${move.name}`}
      meta={meta}
      body={lines.map((l, i) => <div key={i}>{l}</div>)}
      footer={INTENT_BODY[intent.kind]}
    />
  );
}

const mult = (m: number) => `×${Math.round(m * 100) / 100}`;

/** §4.3.1–§4.3.4 — a Battlefield, with its numbers read off the config, and what answers it. */
export function fieldTip(id: FieldId, suppressed = false): ReactNode {
  const c = DEFAULT_BATTLE_CONFIG;
  const body: Record<FieldId, string> = {
    'sunny-day': `Fire moves ${mult(c.weatherBoost)}, Water moves ${mult(c.weatherDamp)} — for both sides. Chlorophyll draws one more card on turn 1.`,
    'rain-dance': `Water moves ${mult(c.weatherBoost)}, Fire moves ${mult(c.weatherDamp)} — for both sides. Swift Swim draws one more card on turn 1.`,
    'electric-terrain': `Electric moves ${mult(c.electricTerrainBoost)} into a grounded Pokémon (not Flying), and a grounded Pokémon cannot be Paralysed.`,
    sandstorm: `Everyone but Rock-, Ground- and Fighting-types loses ${Math.round(c.sandstormPercent * 100)}% of their HP at the end of every turn.`,
    hail: `Everyone but Ice-types loses ${Math.round(c.hailPercent * 100)}% of their HP at the end of every turn.`,
    'grassy-terrain': `Grass moves ${mult(c.typeTerrainBoost)} from a grounded Pokémon, and every grounded Pokémon gets ${Math.round(c.grassyHealPercent * 100)}% of its HP back at the end of every turn — on both sides.`,
    'psychic-terrain': `Psychic moves ${mult(c.typeTerrainBoost)} from a grounded Pokémon, and a grounded Pokémon cannot be put to Sleep.`,
    'misty-terrain': 'A grounded Pokémon cannot be given any status — no Burn, Poison, Paralysis, Sleep, Freeze or Confusion. On both sides.',
    'toxic-spikes': 'Whoever steps into the Lead mid-fight — a swap, a step, a replacement, on either side — is Poisoned, unless it is a Poison-type or not on the ground.',
    'sticky-web': `Whoever steps into the Lead mid-fight, on either side, loses ${c.stickyWebStages} Speed stage — unless it is not on the ground.`,
  };
  return <Tip title={FIELD_LABEL[id]} body={body[id]} footer={suppressed ? 'Suppressed: a Cloud Nine Pokémon is leading.' : 'A Defog clears it for the rest of the fight.'} />;
}

/** §4.3.5 — a Home Field: the enemy's own type hits harder, yours gets nothing. */
export function homeFieldTip(type: PokemonType, suppressed = false): ReactNode {
  return (
    <Tip
      title={homeFieldLabel(type)}
      body={`The enemy's ${typeName(type)} moves deal ${mult(DEFAULT_BATTLE_CONFIG.homeFieldBoost)} on its own turf. Yours of that type get nothing. Resist its type, and it has nothing to amplify.`}
      footer={suppressed ? 'Suppressed: a Cloud Nine Pokémon is leading.' : 'A Defog clears it for the rest of the fight.'}
    />
  );
}

/** §5.6.3 — a fight node's shape on the map: a pack, a pair, a caller, a support, a Pokémon that acts twice. */
export function groupTip(plan: GroupPlan): ReactNode {
  if (plan.kind === 'single') return null;
  return <Tip title={groupLabel(plan)} body={GROUP_HINT[plan.kind]} />;
}

/** §5.6 — an enemy's place in a group: the Lead in front, or a support behind it with its role. */
export function roleTip(place: string, role: string | null, escalateFrom: number, alone = false, shiny = false): ReactNode {
  const withShiny = (text: string): ReactNode => (shiny ? [<div key="r">{text}</div>, shinyLine(false)] : text);
  if (place === 'Lead' && alone) return <Tip title="Enemy Lead" body={withShiny('It stands alone. Every card reaches it; Melee cards reach only the enemy that leads.')} />;
  if (place === 'Lead') {
    return <Tip title="Enemy Lead" body={withShiny('It stands in front of its group. Your Melee cards reach only this one; Ranged and area cards reach the rest. If it falls, the strongest of the others steps up.')} />;
  }
  return (
    <Tip
      title={role ? `Support · ${ROLE_LABEL[role]}` : 'Support'}
      body={withShiny(role ? ROLE_HINT[role]! : 'It fights behind the Lead.')}
      footer={`Supports stand behind the Lead: only Ranged and area cards reach them. They enter weaker, and one still standing on turn ${escalateFrom} grows fiercer every turn.`}
    />
  );
}

/** §5.5.1 Trainer's Instinct — the enemy's plan for next turn, and the one way it can change. */
export function nextIntentTip(detail: string): ReactNode {
  return (
    <Tip
      title="Next turn (Trainer's Instinct)"
      body={detail}
      footer="It commits to this plan. It only thinks again if it can no longer play it — a cooldown, a fainted target, a new boss phase."
    />
  );
}

// ── AP, swaps, the Lead ──────────────────────────────────────────────────────────────────────────────────

/** §3.2.2 — the AP pool. */
export function apTip(ap: number, max = 3): ReactNode {
  return <Tip title={`${ap} of ${max} action points`} body="Every card and every swap costs AP. You get 3 at the start of each turn; unspent AP is lost, so a turn that ends with points left is a turn that did less than it could." />;
}

/** §3.3.1 — the swap ladder. */
export function swapTip(nextCost: number, swapsSoFar: number): ReactNode {
  return <Tip title={`Next swap: ${nextCost} AP`} meta={['1st swap 1 AP', '2nd 2 AP', '3rd 3 AP']} body={`Swapping your Lead costs more each time you do it in a turn — ${swapsSoFar} so far this turn. The ladder resets every turn. Step-Forward and Step-Backward cards swap for free and do not climb it.`} footer="After a manual swap, your first Defensive card that turn is cheaper." />;
}

// ── Abilities, items, relics, badges, modifiers ──────────────────────────────────────────────────────────

/** §6.5 — a passive ability, from the content row. */
export function abilityTip(abilityId: string): ReactNode {
  const a = getContent().ability(abilityId);
  return <Tip title={a.name} meta={['Ability']} body={a.description} footer="Always on. Granted at the first evolution or swapped in at the Dojo." />;
}

/** §7.2 — a consumable card. */
export function consumableTip(c: ConsumableDef, playable = true, reason: string | null = null): ReactNode {
  const meta: ReactNode[] = [c.apCost === 0 ? 'Free' : `${c.apCost} AP`, 'Single use'];
  return <Tip icon={<img src={itemIcon(c.id)} alt="" width={22} height={22} />} title={c.name} meta={meta} body={c.description} footer={!playable && reason ? `Locked — ${reason}` : 'Used up when played. Buy more at a Poké Mart.'} />;
}

// ── Catching, money, balls ───────────────────────────────────────────────────────────────────────────────


/** §2.14 — Poké Dollars. */
export function moneyTip(amount: number): ReactNode {
  return <Tip title={`${amount} ₽`} body="Poké Dollars. Earned from fights, spent at the Poké Mart, the Dojo and the Centre's Therapy. What you do not spend carries into the next Region." footer={`When the run ends, every ${MONEY_TO_TOKENS.per} ₽ left becomes a Token, up to ${MONEY_TO_TOKENS.cap}.`} />;
}

/** §2.6.4 — balls as a counted resource. */
export function ballsTip(count: number): ReactNode {
  return <Tip title={`${count} Poké Ball${count === 1 ? '' : 's'}`} body="One is spent per catch. With none, wild fights offer no catch card. Buy more at a Poké Mart for 50 ₽." />;
}

/** §8.2 — Trauma. */
export function traumaTip(stacks: number, max: number): ReactNode {
  return <Tip title={`Trauma ×${stacks}`} meta={[`Max HP ${max}`]} body="Each faint leaves a stack, and each stack lowers max HP a little. A Pokémon Centre's Therapy removes them, for a price that rises with the count." />;
}

/** The Pokémon itself: species, types, level, ability, item — the summary a portrait owes on hover. */
export function combatantTip(c: Combatant, extra?: { isLead?: boolean; swapCost?: number; incoming?: { name: string; move: string; amount: number }[]; incomingKo?: boolean; asLead?: { amount: number; ko: boolean } }): ReactNode {
  const content = getContent();
  const meta: ReactNode[] = [`Lv ${c.level}`, ...c.types.map(typeName)];
  const lines: ReactNode[] = [];
  if (c.abilityIds[0]) {
    const a = content.ability(c.abilityIds[0]);
    lines.push(<div key="a"><b>{a.name}</b> — {a.description}</div>);
  }
  if (c.heldItemId) {
    const h = content.heldItem(c.heldItemId);
    lines.push(<div key="h"><b>{h.name}</b> — {h.description}</div>);
  }
  if (c.status) lines.push(<div key="s"><b>{STATUS_LABEL[c.status.kind]}</b> — {STATUS_HINT[c.status.kind]}</div>);
  if (c.traumaStacks > 0) lines.push(<div key="t"><b>Trauma ×{c.traumaStacks}</b> — max HP is lowered until treated.</div>);
  if (c.shiny) lines.push(shinyLine(true));
  // §9.2.5 — what lands on it this turn, one line per enemy, the same numbers as the chips beside it.
  for (const h of extra?.incoming ?? []) lines.push(<div key={`i-${h.name}-${h.move}`}><b>−{h.amount}</b> from {h.name}'s {h.move} this turn.</div>);
  if (extra?.incomingKo) lines.push(<div key="ko"><b>Together they knock it out</b> unless you act.</div>);
  // §9.2.5 — the swap, priced in HP (v0.8.6).
  if (extra?.asLead) lines.push(<div key="al">As your Lead this turn it would take <b>{extra.asLead.amount}</b>{extra.asLead.ko ? ' — a knockout' : ''}.</div>);
  const footer = extra?.isLead ? 'Your Lead: takes single-target hits, plays Melee.' : extra?.swapCost !== undefined ? `Swap in for ${extra.swapCost} AP.` : undefined;
  return <Tip title={c.name} meta={meta} body={lines.length ? lines : undefined} footer={footer} />;
}

// ── The account (§8.3–§8.6, §5.13) ───────────────────────────────────────────────────────────────────────

/** §8.3.1 — Trainer Level and the bar under it. */
export function trainerLevelTip(level: number, into: number, span: number, max: number): ReactNode {
  const body = level >= max
    ? 'The prestige cap. Every reward on the track is yours.'
    : `${span - into} XP to Level ${level + 1}. Trainer XP comes from every fight, recruit, evolution and Badge, and from a lost run too. It is never spent and never a point of damage: each level opens something.`;
  return <Tip title={`Trainer Level ${level}`} meta={level < max ? [`${into} / ${span} XP`] : ['Max']} body={body} />;
}

/** §8.3.4 — Tokens. */
export function tokenTip(tokens: number, earned: number): ReactNode {
  return <Tip title={`${tokens} Token${tokens === 1 ? '' : 's'}`} meta={[`${earned} earned`]} body={`Every Trainer Level pays Tokens — ${TRACK_TOKENS.level}, more at every fifth — and so does every Gold or Platinum medal, and a run's leftover ₽ (${MONEY_TO_TOKENS.per} ₽ a Token, up to ${MONEY_TO_TOKENS.cap}). They are spent at the Poké Mart: starters, Hub upgrades, relics and cosmetics.`} />;
}

/** §8.3.4 / §8.3.5 — the Poké Mart's shelves, as one sentence: what opens each, and where the Tokens come from. */
export function martShelvesTip(): ReactNode {
  return (
    <Tip
      title="The shop of the pass"
      body={`Trainer Level opens the shelves: Starters at ${SHELVES.starters.level}, Hub upgrades at ${SHELVES.hub.level}, the Mastery lane at ${SHELVES.mastery.level}; the Trainer's Corner is open from the start. Nothing here is power — starters, conveniences, relics for your pool, and things to wear on the card.`}
      footer="Tokens come from every level, the Gold and Platinum medals, and the ₽ a run ends with."
    />
  );
}

/** §8.3.1 / §8.3.4 — Trainer XP and Tokens, for the Trainer Card and the run's summary. */
export function trainerXpTip(footer?: string): ReactNode {
  const shelves = SHELF_ORDER.filter((s) => SHELVES[s].level > 1).length;
  return (
    <Tip
      title="Trainer XP and Tokens"
      body={`XP is never spent: it moves the level, every level pays Tokens, and ${shelves} levels open a shelf at the Poké Mart. A fight pays ${XP.combat} XP, a first recruit ${XP.recruit}, an evolution ${XP.evolution}, a Badge ${XP.gym}; a lost run pays by how far it got. Tokens also come from Gold and Platinum medals and from the ₽ a run ends with.`}
      footer={footer}
    />
  );
}

/** §8.4.2 — the Hub upgrades, as many as the Mart sells today. */
export function hubUpgradesTip(onSale: number): ReactNode {
  return <Tip title="Hub upgrades" body={`${onSale} conveniences sold at the Poké Mart — the fourth Starting Relic at the Trainer's Corner, the rest on the Hub upgrades shelf from Level ${SHELVES.hub.level}. Each widens an option — a bigger Box, two starters, a second modifier slot — and none adds a point of damage.`} />;
}

/** §8.3.4 — the run's leftover ₽ and what it became, on the run's summary. */
export function moneyTokensTip(money: number, tokens: number): ReactNode {
  return <Tip title={`${money} ₽ → ${tokens} Token${tokens === 1 ? '' : 's'}`} body={`The ₽ a run ends with, won or lost, becomes Tokens: one for every ${MONEY_TO_TOKENS.per} ₽, up to ${MONEY_TO_TOKENS.cap} a run.`} footer="₽ spent in the run is worth more than ₽ carried out." />;
}

/** §8.3.5 — one row of the reward track. */
export function trackRewardTip(level: number, label: string, state: 'claimed' | 'next' | 'locked', xpNeeded: number): ReactNode {
  const footer = state === 'claimed' ? 'Claimed.' : state === 'next' ? `${xpNeeded} XP away.` : `Reached at ${xpNeeded} lifetime XP.`;
  return <Tip title={`Level ${level}`} body={label} footer={footer} />;
}

/** §8.4.2 — a Hub upgrade: what it does, and where and for how much the Mart sells it. */
export function hubUpgradeTip(name: string, effect: string, price: number, shelfLevel: number, owned: boolean, pending?: string): ReactNode {
  const footer = pending ? (owned ? `Yours, but waiting: ${pending}.` : `Not sold yet: ${pending}.`) : 'Quality of life, never power.';
  return <Tip title={name} meta={[owned ? 'Yours' : `${price} Tokens`, `Poké Mart · Level ${shelfLevel}`]} body={effect} footer={footer} />;
}

/** §8.4.4 — a cosmetic on the Trainer's Corner shelf. */
export function cosmeticTip(name: string, kind: string, blurb: string, price: number, state: 'wearing' | 'owned' | 'buyable' | 'locked'): ReactNode {
  const footer = state === 'wearing' ? 'On your card now.' : state === 'owned' ? 'Yours — Wear puts it on.' : state === 'buyable' ? `${price} Tokens at the Trainer's Corner.` : 'Not enough Tokens yet.';
  return <Tip title={name} meta={[cap(kind), state === 'owned' || state === 'wearing' ? 'Yours' : `${price} Tokens`]} body={blurb} footer={footer} />;
}

/** §8.5.2 — a starter on the Starters shelf. */
export function starterTip(name: string, blurb: string | null, price: number, state: 'owned' | 'soulbound' | 'buyable' | 'locked' | 'pending', detail?: string): ReactNode {
  const footer =
    state === 'owned' ? 'Yours — on the starter screen.'
    : state === 'soulbound' ? `Soulbound: the line earned its place by being played (Bond rank ${BOND_TIER.soulbound}).`
    : state === 'pending' ? `Not sold yet: ${detail}.`
    : state === 'buyable' ? `${price} Tokens at the Starters shelf.`
    : detail ?? 'Not enough Tokens yet.';
  // §8.9.2 — an unmet starter's blurb would give it away; it says what the silhouette means instead.
  const body = blurb ?? 'A Pokémon you have not met yet. Its name and kit stay hidden until you meet it on a route — or buy it blind.';
  return <Tip title={name} meta={[state === 'owned' || state === 'soulbound' ? 'Yours' : `${price} Tokens`, `Poké Mart · Level ${SHELVES.starters.level}`]} body={body} footer={footer} />;
}

/** §5.13 / §8.9 — a Pokédex card: number, types, met or not, the line's rank. The sheet has the rest. */
export function dexCardTip(name: string, dex: number, types: readonly string[], met: boolean, encounters: number, lineName: string, rank: number, shiniesCaught = 0): ReactNode {
  const lines: ReactNode[] = [
    ...(shiniesCaught > 0 ? [<div key="sh"><b>Shiny</b> — caught {shiniesCaught === 1 ? 'once' : `${shiniesCaught} times`}: it is in your collection.</div>] : []),
    <div key="m">{met ? `Faced ${encounters} time${encounters === 1 ? '' : 's'}.` : 'Not met yet — its name, types and kit are unknown until it takes the field.'}</div>,
    <div key="b">{rank > 0 ? `${lineName} line: ${BOND_RANK_NAME[rank]} (rank ${rank}).` : `${lineName} line: not yet played.`}</div>,
  ];
  return <Tip title={`#${String(dex).padStart(3, '0')} ${name}`} meta={types.map(cap)} body={lines} footer="Open for its record, its kit and its line." />;
}

/** §8.4 — the Trainer Hub's doors, in the lobby. */
export function hubSpotTip(spot: 'mart' | 'card' | 'pc' | 'run', tokens: number): ReactNode {
  switch (spot) {
    case 'mart':
      return <Tip title="Poké Mart" meta={[`${tokens} Tokens`]} body="Spend Tokens on starters, Hub upgrades, relics for your pool and cosmetics. Trainer Level opens its shelves." />;
    case 'card':
      return <Tip title="Trainer Card" body="The nurse keeps the League's register: your level, the road ahead and your record." />;
    case 'pc':
      return <Tip title="PC Terminal" body="The Pokédex and every line's Bond, the medals, and the relics you have discovered." />;
    case 'run':
      return <Tip title="New run" body="Through the door to the Elite Four: choose a starter, a Starting Relic and the run's options, and set out." />;
  }
}

/** §8.4 — the lobby's doormat. */
export function hubExitTip(): ReactNode {
  return <Tip title="Menu" body="Back to the title menu. Everything here is kept." />;
}

/** §5.14 — one line on a shiny, for a host's own bubble (a portrait, an enemy card, a Box row, a Pokédex card). */
export function shinyLine(owned: boolean): ReactNode {
  return <div key="shiny"><b>Shiny</b> — {owned ? 'yours keeps its alternate colours all run.' : `a rare find: catch it and its line gains +${BOND.shiny} Bond.`}</div>;
}

/** §5.14 — a shiny, wherever it shows on its own. `owned`: one of yours, rather than one in the wild. */
export function shinyTip(name: string, owned = false): ReactNode {
  return (
    <Tip
      title={`Shiny ${name}`}
      body={owned
        ? `Caught in its alternate colours, and it keeps them for the rest of the run. Its line gained +${BOND.shiny} Bond.`
        : `A rare wild Pokémon in its alternate colours. Catch it and it stays shiny for the rest of the run — and its line gains +${BOND.shiny} Bond.`}
      footer={`No battle effect. A line's Shiny Charm (Bond rank ${SHINY.charmRank}) makes its shinies ${SHINY.charmMultiplier} times as common.`}
    />
  );
}

/** §6.8.1 — how a line's Bond grows, in one voice for the PC Terminal and the line sheet. */
export function bondRulesText(): string {
  return `Play the line. +${BOND.win} per trainer or Elite fight won with it on the Active Team (+${BOND.lead} if it led), +${BOND.gym} for a Gym, +${BOND.evolution} per evolution, +${BOND.recruit} the first time you recruit it in a run, +${BOND.shiny} for a shiny of it, +${BOND.runFinished} for finishing a run with it, +${BOND.runWon} for winning one. Wild fights pay no Bond.`;
}

/** §6.8.1 — what the last fight paid a line, on the reward screen. */
export function bondGainTip(lineName: string, points: number, total: number, rankUps: readonly number[]): ReactNode {
  const top = rankUps.length ? rankUps[rankUps.length - 1]! : null;
  const p = bondProgress(total);
  const next = p.next === null ? 'Every rank open.' : `${p.next - total} more to ${BOND_RANK_NAME[p.rank + 1]}.`;
  return <Tip title={`${lineName} line — +${points} Bond`} meta={[`${total} Bond`]} body={top ? `Now ${BOND_RANK_NAME[top]} (rank ${top}). ${next}` : next} />;
}

/** §5.13.2 — the fifth card, on a card face. */
export function masteryCardTip(move: MoveDef, ownerName: string): ReactNode {
  return <Tip title={`${move.name} — Mastery`} meta={[typeName(move.type), `${move.apCost} AP`, move.power ? `${move.power} power` : 'Utility']} body={describeMoveDef(move)} footer={`${ownerName}'s Mastery Move: a fifth card no TM or Move Manager can touch.`} />;
}

/** §8.6.1 — a relic's meta tier, for the Poké Mart and the PC Terminal's discoveries board. */
export function relicTierTip(r: RelicDef, state: 'pool' | 'discoverable' | 'buyable' | 'owned' | 'locked', progress?: { have: number; goal: number; text: string } | null, sale?: { price: number; level: number }): ReactNode {
  const tierName = r.tier === 3 ? 'Tier 3 · Mastery' : r.tier === 2 ? 'Tier 2 · Discovered' : 'Tier 1 · Foundation';
  const discover = progress ? `Discover it: ${progress.text} (${progress.have} / ${progress.goal}).` : null;
  const footer =
    state === 'pool' ? 'Always in your pool.'
    : state === 'owned' ? 'In your pool.'
    : state === 'buyable' ? [`${sale?.price ?? MART_PRICE.mastery} Tokens at the Poké Mart.`, discover].filter(Boolean).join(' ')
    : state === 'locked' ? [`The Poké Mart sells it from Trainer Level ${sale?.level ?? SHELVES.mastery.level}.`, discover].filter(Boolean).join(' ')
    : discover ?? 'Discovered by doing its thing in a run — the Poké Mart does not sell it.';
  return <Tip icon={<img src={itemIcon(r.id)} alt="" width={22} height={22} />} title={r.name} meta={[cap(r.rarity), tierName]} body={r.description} footer={r.pending ? `Not working yet: ${r.pending}` : footer} />;
}

/** §3.1.2 — the Run button: what it costs here, or why it cannot be pressed. */
export function fleeTip(tier: FleeTier | null, toll: FleeToll | null): ReactNode {
  if (!tier || !toll) return <Tip title="No running from a Gym" body="The fork was the choice. A Gym Leader is fought to the end." />;
  const WHO: Record<FleeTier, string> = { wild: 'A wild fight', trainer: 'A trainer', elite: 'An Elite' };
  return (
    <Tip
      title="Run"
      meta={[WHO[tier], describeToll(toll)]}
      body="The enemy takes the action it has telegraphed first — the parting shot — then the fight ends. No XP, no drop, no catch; the node is behind you."
      footer={toll.loot === 'relic' ? 'The relic is picked at random, never a Legendary.' : toll.loot === 'consumable' ? 'The consumable is picked at random.' : 'Cheaper than a wipe, dearer than a win.'}
    />
  );
}

// ── Cities ───────────────────────────────────────────────────────────────────────────────────────────────

/** §2.11.4 — a City's door: what is behind it, and whether it is open, under the name the screen gives it. */
export function doorTip(door: CityDoor, open: boolean, title: string): ReactNode {
  return <Tip title={title} meta={[open ? (door === 'gate' ? 'Ends the visit' : 'Open') : 'Not open yet']} body={CITY_DOOR_HINT[door]} />;
}

/**
 * §2.2, §2.2.1 — what a Region does to its enemies, in a line: the status accent and the stat tier, read off the
 * sim so the bubble can never promise a different number from the fight.
 */
export function regionAccent(regionIndex: number, greaterThreats: boolean): string {
  const tier = statTierFor(regionIndex, greaterThreats);
  const parts: string[] = [];
  if (regionIndex >= STATUS_ACCENT_FROM) parts.push('every enemy carries a status move');
  const stats = [...(tier.hp !== 1 ? [`HP ×${tier.hp}`] : []), ...(tier.attack !== 1 ? [`Attack ×${tier.attack}`] : [])];
  if (stats.length) parts.push(`enemy ${stats.join(' and ')}`);
  // Uncapitalised, so it reads the same at the start of a bubble and after "Region 3 is next:".
  return (parts.length ? parts.join('; ') : 'enemies at their base strength') + '.';
}
const capitalise = (line: string) => line.charAt(0).toUpperCase() + line.slice(1);

/** §2.2 — the Region you are in, beside its name on the map. */
export function regionTip(regionIndex: number, greaterThreats: boolean): ReactNode {
  // §2.6.1 — the biomes it is made of, primary first: what the wild nodes here will offer.
  const region = regionContent(regionIndex);
  const biomes = [...region.biomeWeights].sort((x, y) => y.weight - x.weight).map((b) => region.biomes[b.biome]?.name ?? b.biome);
  const name = regionName(regionIndex);
  return <Tip title={name ? `Region ${regionIndex + 1} — ${name}` : `Region ${regionIndex + 1}`} meta={biomes} body={capitalise(regionAccent(regionIndex, greaterThreats))} footer={regionIndex >= STATUS_ACCENT_FROM ? 'Enemies here also field the forms their levels warrant.' : undefined} />;
}

/** §2.5 — the footer of a Gym's tooltip in the map header: where the route leans toward it, and where it commits. */
export function forkFooter(yColumn: number, noReturnColumn: number): string {
  return `Two of the four Gyms are drawn each run. The tracks lean toward them from column ${yColumn}; the river at column ${noReturnColumn} is the point of no return.`;
}

/** §2.5 — the river at the point of no return. */
export function noReturnTip(gyms: readonly string[]): ReactNode {
  return <Tip title="Point of no return" body={`Past the river the two lanes never meet again: the top one ends at ${gyms[0]}, the bottom one at ${gyms[1]}. The middle track's last stop offers both.`} />;
}

/** §9.3 — the strip under the route. */
export function routeStripTip(): ReactNode {
  return <Tip title="The whole route" body="Where you stand, the two Gyms at the end, and the stretch the board is showing. Click to jump there." />;
}

/** §2.11.0 — the town itself: how a lobby works, and what waits past its gate. */
export function townTip(name: string, nextRegion: number, greaterThreats: boolean): ReactNode {
  return <Tip title={name} body="Every labelled building is a door — walk in as often as you like. The road at the top leaves town." footer={`Region ${nextRegion} is next: ${regionAccent(nextRegion - 1, greaterThreats)}`} />;
}

/** §7.2–§7.5 — the bag button, on the map and in town. */
export function bagTip(): ReactNode {
  return <Tip title="Your bag" body="Relics, held items and consumables. Equip held items on a Pokémon from here." />;
}

/** §2.11.1 — a Box member seen from the town or the nurse: what a Pokémon Center would still fix. */
export function partyTip(name: string, level: number, hp: number, max: number, status: string | null, trauma: number): ReactNode {
  const meta = [`Lv ${level}`, `${hp} / ${max} HP`, ...(status ? [STATUS_LABEL[status] ?? status] : []), ...(trauma ? [`Trauma ×${trauma}`] : [])];
  const hurt = hp < max || status !== null;
  return <Tip title={name} meta={meta} body={hurt ? 'A Pokémon Center heals and cures, free — every town has one.' : 'Fighting fit.'} footer={trauma ? 'Trauma comes off only with Therapy, at a Pokémon Center.' : undefined} />;
}

/** §2.9.1 — the field nurse. */
export function nurseTip(): ReactNode {
  return <Tip title="Field nurse" body={`${AID_HEAL_PCT} % of max HP back for everyone in the Box, fainted or not, and every status cured. Free.`} footer="Trauma stays — only a Pokémon Center's Therapy takes it off." />;
}

/** §2.9.2 / §2.11.2 — which shop this is, and how it differs from the other kind. */
export function shopTip(title: string, inCity: boolean): ReactNode {
  return inCity
    ? <Tip title={title} body={`Picked for your team, a little dearer than the merchant. What you leave stays on the shelf until you leave town, and the counter buys held items back for ${Math.round(PRICES.sellShare * 100)} % of their price.`} />
    : <Tip title={title} body={`The basics at route prices: cures, Poké Balls by ${PRICES.merchantBalls.qty}, and one thing worth a look. Once you walk on, the cart is gone.`} />;
}

/** §2.11.2.4 — the sell counter, and each item on it. */
export function sellTip(): ReactNode {
  return <Tip title="The clerk" body={`Any held item in your bag sells for ${sellPrice()} ₽ — ${Math.round(PRICES.sellShare * 100)} % of its price. The merchant on the route does not buy.`} />;
}
export function heldItemSellTip(itemId: string): ReactNode {
  const item = getContent().heldItem(itemId);
  return <Tip title={item.name} meta={['Held item', `Sells for ${sellPrice()} ₽`]} body={item.description} footer="Selling is for good." />;
}

/** §2.9.4 — the Dojo, beside its one-line lede. */
export function dojoTip(): ReactNode {
  return <Tip title="The Dojo" body="The master teaches a Pokémon a move it would never learn by levelling, an egg move from the line's own scrolls, or swaps its passive ability. As many as you can pay for; the price is on every offer." />;
}
/** §2.9.4 — a Dojo tab's count: what this Pokémon has not bought there yet. */
export function counterTabTip(name: string, left: number, price: number): ReactNode {
  return <Tip title={name} meta={[`${left} still to buy`, `${price} ₽ each`]} body="The count is for the Pokémon picked on the left: what this counter still has to teach it." />;
}
/** §6.4.3 — the tutor counter. */
export function tutorTip(): ReactNode {
  return <Tip title="Tutor moves" body="Moves off this stage's learnset — the kind it would never learn by levelling. In the city the list holds every stage the line has reached." />;
}
/** §6.4.2 — the passive counter. */
export function passiveTip(): ReactNode {
  return <Tip title="Passive ability" body={`One passive slot per Pokémon; teaching one replaces what is there, and swapping back is allowed. The line's hidden ability opens at Bond rank ${BOND_TIER.hiddenAbility}.`} />;
}
/** §2.9.4.2 — the master's scrolls. */
export function eggMovesTip(): ReactNode {
  return <Tip title="Egg moves" body="Moves this line is born knowing in the games, and never learns any other way — up to three a line. Every stage of the line is offered the same scrolls." footer="Dearer than a tutor move." />;
}

/** §5.10 — a Badge: permanent, so what it does is the whole tip. */
export function badgeTip(name: string, description: string): ReactNode {
  return <Tip title={name} meta={['Badge']} body={description} footer="Kept for the rest of the run." />;
}

// ── The city (v0.7.2) ─────────────────────────────────────────────────────────────────────────────────────

/** §2.9.4.1 — the Ring's fee, on the button that pays it: what the ladder pays, bottom to top. */
export function ringEntryTip(name: string, fee: number, prizes: string[]): ReactNode {
  return <Tip title={name} meta={[`${fee} ₽ to enter`, 'Once per visit']} body={`Pays ${prizes.join(' → ')}.`} footer="Once you pay, the way out is cashing out, the top, or a lost rung." />;
}

/** §2.9.4.1 — a rung of the ladder, by what it pays and whether it is behind you. */
export function rungTip(index: number, prize: string, level: number, state: 'won' | 'next' | 'ahead', top: boolean): ReactNode {
  const meta = [`Rung ${index + 1}`, `Lv ${level}+`, state === 'won' ? 'Won' : state === 'next' ? 'Next' : 'Ahead'];
  const body = top
    ? 'The top of the ladder: win it to pick one relic of three, and the ladder pays out what it banked.'
    : state === 'won'
      ? 'Banked — yours if you cash out, gone if you lose a rung.'
      : 'Win the rung to bank it.';
  return <Tip title={prize} meta={meta} body={body} />;
}

/** §2.9.4.1 — the Ring's own heading bubble, under the name its City gives it. */
export function ringTip(name: string): ReactNode {
  return <Tip title={name} body={CITY_DOOR_HINT.ring} />;
}

/** §2.9.4.1 — what the ladder has paid so far. */
export function bankedTip(banked: number): ReactNode {
  return <Tip title="Banked" meta={[`${banked} ₽`]} body="What the rungs you have won have paid. Yours if you cash out; gone if you lose a rung." />;
}

/** §2.11.5 — the Game Corner's heading bubble. */
export function gameCornerTip(): ReactNode {
  return <Tip title="Game Corner" body="Two machines, the odds printed beside each. Both return a little less than they take, on average — they turn money you cannot use into a chance at something you can." />;
}

// ── Team Rocket's Black Market (v0.7.7) ──────────────────────────────────────────────────────────────────

/**
 * §2.11.6 — the Game Corner's back wall. Discovery, not teaching: the poster only says it is not quite right, the
 * Grunt only says to keep away from it, and the stairs say where they go once they are there.
 */
export function posterTip(): ReactNode {
  return <Tip title="A poster" body="It doesn’t sit quite flat against the wall." />;
}
export function stairsTip(): ReactNode {
  return <Tip title="Stairs down" body="Down to Team Rocket’s back room. It locks behind you when you come back up." />;
}
export function hatchTip(): ReactNode {
  return <Tip title={MARKET_TEXT.hatchTitle} body="Where the stairs were. Team Rocket will not open it twice in one visit." />;
}

/** §2.11.5 — the Game Corner's machines, in the room. */
export function slotsBankTip(): ReactNode {
  const top = Math.max(...CASINO.slots.table.map((r) => r.multiplier));
  const face = SLOT_FACE_LABEL[CASINO.slots.faces[top] ?? ''] ?? '';
  return <Tip title="Slot machines" meta={[`${CASINO.slots.stake} ₽ a pull`]} body={`Three reels, and one dream: three ${face.toLowerCase()}s pay ×${top}. Play one and its odds are on the machine.`} />;
}
export function rouletteTableTip(): ReactNode {
  const { pays } = CASINO.wheel;
  return <Tip title="Roulette" meta={[`Stake ${CASINO.wheel.minStake}–${CASINO.wheel.maxStake} ₽`]} body={`The classic wheel: thirty-seven pockets. Bet on red or black for ×${pays.red}, or on the one green zero for ×${pays.green}. Play and the odds are on the table.`} />;
}

/** §2.11.6 — the market's heading bubble: four counters, and a door that locks behind you. */
export function marketTip(): ReactNode {
  return <Tip title="Black Market" body="Team Rocket’s back room. Nothing here is paid for in the usual way: a Pokémon for a Pokémon, relics on a wager, and the rarest relic of all for three of your team." footer="Every counter deals once a visit. The door locks when you go back up." />;
}

/** §2.11.6 — one of the Trader's two stolen Pokémon. */
export function tradeTip(name: string, types: readonly string[]): ReactNode {
  return <Tip title={name} meta={[...types.map(typeName), 'No route offers it']} body="Hand over one of yours and this one takes its place — at your Pokémon’s level, fresh, with no Trauma. Its held item comes back to your bag." footer="One trade a visit." />;
}

/** §2.11.6 — the Fence's Rare Candy. */
export function candyTip(price: number, left: number): ReactNode {
  return <Tip title="Rare Candy" meta={[`${price} ₽`, `${left} left`]} body="One level, now, for the Pokémon you pick — with every move and evolution the level brings." footer="No shop sells these." />;
}

/** §2.11.6 — the Fence buying one of your relics. */
export function fenceTip(relic: RelicDef, price: number, takes: boolean): ReactNode {
  return <Tip title={relic.name} meta={[cap(relic.rarity), `Sells for ${price} ₽`]} body={relic.description} footer={takes ? 'Selling is for good.' : 'The Fence won’t take it: its charge is spent, or your Box needs it.'} />;
}

/** §2.11.6 — one of your relics, as a stake on the Gambler's table. */
export function stakeTip(relic: RelicDef, value: number, takes: boolean): ReactNode {
  return <Tip title={relic.name} meta={[cap(relic.rarity), `Worth ${value} ₽ to the Gambler`]} body={relic.description} footer={takes ? 'Staked, it is gone whether you win or lose.' : 'He won’t take it: its charge is spent, or your Box needs it.'} />;
}

/** §2.11.6 — a counter that has already dealt this visit. */
export function dealtTip(): ReactNode {
  return <Tip title="Dealt" body="This counter has done its business for this visit." />;
}

/** §2.11.6 — the Gambler's printed chance, and what a stake is worth to him. */
export function wagerTip(chance: number, staked: number, target: number): ReactNode {
  return <Tip title={`${Math.round(chance * 100)} % to win`} meta={[`Stake worth ${staked} ₽`, `Prize worth ${target} ₽`]} body={`The chance is ${Math.round(BLACK_MARKET.edge * 100)} % of what you stake over what the prize is worth, from ${Math.round(BLACK_MARKET.minChance * 100)} % to ${Math.round(BLACK_MARKET.maxChance * 100)} %. The stake is his either way.`} footer="One wager a visit." />;
}

/** §2.11.6 / §7.3.7 — the showcase's Legendary and its price in Pokémon. */
export function showcaseTip(relic: RelicDef, price: number, atCap: boolean): ReactNode {
  return <Tip title={relic.name} meta={['Legendary', `${price} of your Pokémon`]} body={relic.description} footer={atCap ? `You already carry ${SHOWCASE_CAP} Legendaries — even the Black Market sells no more.` : `Off the books: it can take you past the usual ${LEGENDARY_CAP}, to ${SHOWCASE_CAP}. The deal closes the market — do the other counters first.`} />;
}

/** §2.11.2 / §2.9.3 — the re-roll button: the ladder, and why it is off when it is. */
export function rerollTip(ladder: number[], price: number | null, unsold: number, restockable: boolean, floor: boolean): ReactNode {
  const body =
    price === null
      ? 'No re-rolls left this visit.'
      : unsold === 0
        ? 'Nothing left to re-roll — you bought the shelf.'
        : !restockable
          ? 'Nothing else to stock on this floor — a re-roll would show the same shelf.'
          : `Re-rolls the ${unsold} unsold slot${unsold === 1 ? '' : 's'}${floor ? ' on this floor' : ''}. What you already bought stays yours.`;
  return <Tip title="Re-roll" meta={[`${ladder.join(' · ')} ₽`, ladder.length === 1 ? 'One per visit' : `${ladder.length} per visit`]} body={body} />;
}

/** §2.9.4.1 — the top rung's prize: Rares, or what the account has open when it has fewer than three (§8.6.2). */
export function ringPrizeTip(banked: number, allRare: boolean): ReactNode {
  const body = allRare
    ? 'A Rare relic, chosen from three — the one prize the Ring holds back for the top rung.'
    : 'A relic, chosen from three. Rares join this offer as the account opens them; until then the rarity below fills the gap.';
  return <Tip title="The Ring's prize" body={body} footer={banked ? `The ${banked} ₽ the ladder banked is paid out as well.` : 'Leaving all three is allowed.'} />;
}

/** §2.11.1 — the Center: what is free, and what the three counters are for. */
export function centerTip(): ReactNode {
  return <Tip title="The Centre" body="Healing and status cures are free on entry. The counters do what the machine cannot: Therapy takes Trauma off, the Daycare trades a fight for a level, and the PC Box picks the team." />;
}
/** §8.2.4 — Therapy's price and why Trauma is worth paying for. */
export function therapyTip(): ReactNode {
  return <Tip title="Therapy" meta={['100 ₽ × (1 + stacks)']} body="Each Trauma stack costs 5 % of max HP up to five, then 10 % each. It never heals on its own — Therapy is the only place it comes off, one stack at a time, dearer the worse the count." />;
}
/** §2.11.1 — the Daycare: a level for a fight sat out, once a visit. */
export function daycareTip(price: number): ReactNode {
  return <Tip title="Daycare" meta={[`${price} ₽`, 'Once a visit']} body="Leave one Pokémon for a whole level, with whatever the level brings. It then sits out the next fight and rejoins the team after it." footer="Someone else has to be able to fight while it rests." />;
}
/** §2.11.1 — a Pokémon resting after the Daycare. */
export function restingTip(): ReactNode {
  return <Tip title="Resting" meta={['Daycare']} body="It took a level at the Daycare and sits out the next fight. When that fight is over it rejoins the team, in the first free slot." />;
}
/** §2.11.1 — one Daycare offer: what the level brings, and why it cannot be taken when it cannot. */
export function daycareRowTip(name: string, level: number, brings: string[], blocked: string | null): ReactNode {
  return <Tip title={`${name} → Lv ${level}`} meta={['Daycare']} body={brings.length ? brings.join(' ') : 'A level: more HP and power.'} footer={blocked ?? 'It sits out the next fight.'} />;
}
/** §2.11.1 — the PC Box: the map's Box panel, indoors. */
export function pcBoxTip(): ReactNode {
  return <Tip title="PC Box" body="The team for the next door: click a Box row to field it, an Active row to make it the Lead, and the cards button to choose its four moves." />;
}

/** §2.11.5 — a machine's printed table, as the bubble on its name. */
export function machineTip(machine: 'wheel' | 'slots', ev: number): ReactNode {
  return <Tip title={machine === 'wheel' ? 'The Roulette' : 'The Slots'} meta={[`Returns ${Math.round(ev * 100)} % on average`]} body="The outcome is rolled against the table below first, then shown." footer="The house edge is real." />;
}

/** §2.11.0 — the shop's way out: the corner arrow and the room's door. What you leave stays on the shelf. */
export function shopExitTip(label: string, inCity: boolean): ReactNode {
  return <Tip title={label} body={inCity ? 'Unsold stock stays on the shelf until you leave town.' : 'Once you walk on, the cart is gone.'} />;
}
/** §2.11.2 — a shelf's count, in words: stock on a shelf, everything the room sells at the clerk. */
export function shelfCountLine(shelf: keyof typeof SHELF_LABEL, count: number): string {
  return shelf === 'clerk' ? `${count} for sale here` : `${count} on the shelf`;
}
/** §2.11.2 — a shelf in the room: what it holds, and how much of it is left. */
export function shelfTip(shelf: keyof typeof SHELF_LABEL, count: number): ReactNode {
  return <Tip title={SHELF_LABEL[shelf]} meta={[shelfCountLine(shelf, count)]} body={SHELF_HINT[shelf]} />;
}
/** §2.11.2 — a Department Store floor. */
export function floorTip(label: string, count: number): ReactNode {
  return <Tip title={label} meta={[`${count} on the shelf`]} body="Each floor sells one kind of thing. A re-roll restocks the floor you are on; the others stay as they are." />;
}

// ── The Safari Zone (v0.7.6) ─────────────────────────────────────────────────────────────────────────────

/** §2.11.6 — the ticket: what it buys. */
export function safariTicketTip(fee: number, balls: number, clock: number): ReactNode {
  return <Tip title="Safari ticket" meta={[`${fee} ₽`, `${balls} Safari Balls`, `${clock} turns`]} body="The balls and the turns are shared by every Pokémon you stalk. What is left when you leave stays behind." />;
}

/** §2.11.6 — the Safari Balls left. */
export function safariBallsTip(balls: number): ReactNode {
  return <Tip title="Safari Balls" meta={[`${balls} left`]} body="One per throw, caught or not. Only good in here." />;
}

/** §2.11.6 — the park clock. */
export function safariClockTip(turns: number): ReactNode {
  return <Tip title="Park clock" meta={[`${turns} turns left`]} body="Every turn of every stalk comes off it. When it stops, the park closes — with whatever you were stalking still out there." />;
}

/** §2.11.6 — the Pokémon's temper: alarms taken of how many it will take. */
export function safariAlarmTip(alarms: number, temper: number): ReactNode {
  return <Tip title="Temper" meta={[`${alarms} of ${temper} alarms`]} body={temper === 1 ? 'One alarm and it is gone — so is one missed ball.' : 'Seeing you is an alarm; so is a ball it breaks out of. The last one sends it off.'} />;
}

/** §2.11.6 — what makes this Pokémon's board the harder one. */
export function safariTraitTip(label: string, hint: string): ReactNode {
  return <Tip title={label} body={hint} />;
}

/** §2.11.6 — the throw, with every term that moved it. */
export function safariThrowTip(o: { chance: number; range: number; unseen: boolean; behind: boolean; eating: boolean } | null, apShort: boolean): ReactNode {
  if (!o) return <Tip title="Throw" body="Out of reach. A Safari Ball carries two tiles, and a rock in the way stops it." />;
  const meta: ReactNode[] = [`${Math.round(o.chance * 100)} %`, o.range === 1 ? 'Close' : 'Two tiles'];
  if (o.unseen) meta.push('Never saw you');
  if (o.behind) meta.push('From behind');
  if (o.eating) meta.push('Eating');
  return <Tip title="Throw" meta={meta} body={apShort ? 'A throw takes the whole turn — end this one where you stand and throw next turn.' : 'The only roll in the Safari. A miss is an alarm.'} />;
}

/** §2.11.6 — the board's marks, on the InfoDot beside it. */
export function safariBoardTip(): ReactNode {
  return (
    <Tip
      title="Reading the board"
      meta={['Dots: its path', 'Yellow: a click acts', 'Arrow keys walk']}
      body="Red with an eye: it would see you there when this turn ends. Pale red: it looks there, but the tall grass hides you. Boulders block a look and a throw; the water is its pond."
    />
  );
}

/** §2.11.6 — the turn's actions and what each costs. */
export function safariApTip(ap: number): ReactNode {
  return <Tip title="This turn" meta={[`${ap} of 2 left`, 'Step 1', 'Bait 1', 'Rock 1', 'Throw 2']} body="A throw needs the whole turn. Spending the last action ends the turn: then it walks, and looks." />;
}

/** §2.11.6 — the bait, and why it cannot be thrown now. */
export function safariBaitTip(why: string | null): ReactNode {
  return <Tip title="Bait" meta={['1 action', 'Up to 3 tiles']} body="It walks to the bait and eats for two turns. Eating, it looks only at the tile in front of it and hears nothing — and a ball thrown then is better." footer={why ?? undefined} />;
}

/** §2.11.6 — the rock, and why it cannot be thrown now. */
export function safariRockTip(why: string | null): ReactNode {
  return <Tip title="Rock" meta={['1 action', 'Up to 3 tiles']} body="It stops where it stands this turn and turns to face the noise — put it at its back and walk in behind. Never two turns running." footer={why ?? undefined} />;
}

/** §2.11.6 — the lineup's tier badge: how that board behaves. */
export function safariTierTip(label: string, t: { sight: number; speed: number; temper: number; ears: number }): ReactNode {
  const meta: ReactNode[] = [`Sees ${t.sight} ahead`, t.speed > 1 ? `Walks ${t.speed} a turn` : 'Walks 1 a turn', `${t.temper} alarm${t.temper === 1 ? '' : 's'}`];
  if (t.ears) meta.push(`Hears ${t.ears} tile${t.ears === 1 ? '' : 's'} away`);
  return <Tip title={label} meta={meta} body="Rarer means a bigger board and a harder Pokémon — and a lower chance on every throw." />;
}

/** §2.11.6 — what the Pokémon is doing right now, on its tile. */
export function safariStateTip(line: string): ReactNode {
  return <Tip title={line} body="Its head is down or its feet are still: this is the moment to close in." />;
}

// ── Supplies and scarce relics (v0.8.6) ──────────────────────────────────────────────────────────────────

/** §2.6.2 / §2.7.2 — Poké Balls a fight turned up. */
export function ballsFoundTip(n: number): ReactNode {
  return <Tip icon={<img src={itemIcon('poke-ball')} alt="" width={22} height={22} />} title={`Poké Ball ×${n}`} meta={['Counted']} body="One throw at a wild Pokémon each, spent whether it catches or not." footer="Wild nodes leave some in the grass now and then; trainers and the Elite drop a few." />;
}

/** §2.8.1 — the Elite Trainer's relic pick. */
export function elitePrizeTip(): ReactNode {
  return <Tip title="Relics are scarce" body="An Elite Trainer is one of the few places a relic is guaranteed: two Uncommons and a Rare on the table." footer="Until your account has discovered a Rare, an Uncommon takes its place. Leaving all three is allowed." />;
}

/** §2.11.2.3 — the collector's premium, as the line a relic card's tooltip adds. */
export function relicPremiumLine(bought: number, listPrice: number): string {
  return `Collector's premium: +${Math.round(RELIC_PREMIUM * 100)} % of the list price (${listPrice.toLocaleString('en-GB')} ₽) for each relic bought this run — ${bought} so far.`;
}

/** §7.3.7 — the Gym's pick: Rares at the first Gym, Legendaries from the second until the cap. */
export function gymRelicTip(legendary: boolean, atCap: boolean): ReactNode {
  return (
    <Tip
      title={legendary ? 'Legendary relics' : 'Rare relics'}
      body={
        legendary
          ? 'Never on a shop shelf and never dropped — a pick like this, at a Gym victory, is the way to one.'
          : atCap
            ? `You already hold ${LEGENDARY_CAP} Legendaries, the most anyone carries, so this pick is the tier below.`
            : 'The first Gym pays in Rares. From the second Gym on, the pick is Legendary.'
      }
      footer={`Legendary picks stop at ${LEGENDARY_CAP} a run. Leaving all three is allowed.`}
    />
  );
}

/** §3.5 — the bag in a fight (v0.8.6). */
export function combatBagTip(total: number, left: number, cap: number): ReactNode {
  return (
    <Tip
      title="Bag"
      meta={[`${total} item${total === 1 ? '' : 's'}`, `${left} of ${cap} left this turn`]}
      body={total === 0 ? 'Empty. Buy supplies at a merchant or a Poké Mart; trainers drop them too.' : 'Everything you carry, open every turn: potions, cures, Ethers, Poké Balls. A used item is gone for good.'}
    />
  );
}

/** §2.6.4.2 — every ball above the Poké Ball and its multiplier, from the content rows: "A Great Ball is ×1.5, …". */
function ballMultipliers(): string {
  const balls = getContent().allConsumables().filter((c) => c.effect.kind === 'catch' && c.effect.ballMultiplier > 1);
  const parts = balls.map((c) => `${c.name} ×${c.effect.kind === 'catch' ? c.effect.ballMultiplier : 1}`);
  return parts.length ? `${parts.join(', ')}.` : '';
}

/** §2.6.4 / §2.6.4.2 — the catch picker's InfoDot: what the chances are and what moves them (v0.8.6). */
export function catchPickerTip(odds: CatchOdds): ReactNode {
  const ceiling = Math.round(odds.catchRate * 100);
  return (
    <Tip
      title={odds.guaranteed ? 'Master Ball Charm — this throw cannot miss' : 'Catching'}
      meta={[odds.hasStatus ? (odds.statusMult >= 1.5 ? 'Asleep or frozen ×1.5' : 'Status ×1.2') : 'No status yet', `Species ceiling ${ceiling}%`]}
      body={
        odds.guaranteed
          ? 'Throw any ball: the charm is spent on this run whatever happens.'
          : `Each throw spends the ball and is the series' four shake checks — three wobbles, then the click — which all pass at exactly the chance on its row; the lights under the ball show each one. ${ballMultipliers()} The chance climbs as its HP falls — steeply in the last quarter — and a status multiplies it; Sleep and Freeze most.`
      }
      footer="Knock it out and the recruit is lost."
    />
  );
}
