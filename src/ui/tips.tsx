import type { ReactNode } from 'react';
import { AID_HEAL_PCT, regionContent, regionName, STATUS_ACCENT_FROM, statTierFor, BOND_RANK_NAME, POKEMON_TYPES, PRICES, SHELVES, describeToll, sellPrice, typeMultiplier, type FleeTier, type FleeToll, type CardPlayability, type Combatant, type ConsumableDef, type MoveDef, type PokemonType, type RelicDef } from '@/sim';
import type { CatchOdds } from '@/sim/combat/catch';
import { getContent } from '@/content/registry';
import { itemIcon, statusGlyph, typeGlyph } from '@/ui/art';
import { describeMoveDef } from '@/ui/moveText';
import { CITY_DOOR_HINT, INTENT_LABEL, REJECT_TEXT, STATUS_HINT, STATUS_LABEL, type CityDoor } from '@/ui/strings';
import { Tip } from '@/ui/tooltip';

// Every explanation the game offers on hover, in one file.
//
// The rule the user set on 2026-09-21: short text on the screen, the explanation in a bubble when you rest on
// it. That only works if the bubbles say the same kind of thing in the same voice everywhere, so they are all
// built here from the content rows and the string tables — a component never writes tooltip prose of its own.
// Nothing in this file is a rule: every sentence restates something the sim already does, in the player's
// words, and the § it comes from is named in a comment rather than in the text (players do not read §).

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const typeName = (t: string) => cap(t);

// ── Types and statuses ───────────────────────────────────────────────────────────────────────────────────

/** §4.1.2 — the type, and what it is weak to. Weakness is the fact a player actually wants at a glance. */
export function typeTip(type: PokemonType, defenderTypes?: readonly PokemonType[]): ReactNode {
  const weakTo = POKEMON_TYPES.filter((atk) => typeMultiplier(atk, defenderTypes ?? [type]) > 1).map(typeName);
  const resists = POKEMON_TYPES.filter((atk) => {
    const m = typeMultiplier(atk, defenderTypes ?? [type]);
    return m > 0 && m < 1;
  }).map(typeName);
  const immune = POKEMON_TYPES.filter((atk) => typeMultiplier(atk, defenderTypes ?? [type]) === 0).map(typeName);
  const meta: ReactNode[] = [];
  if (weakTo.length) meta.push(`Weak to ${weakTo.join(', ')}`);
  if (resists.length) meta.push(`Resists ${resists.join(', ')}`);
  if (immune.length) meta.push(`Immune to ${immune.join(', ')}`);
  return <Tip icon={<img src={typeGlyph(type)} alt="" height={18} style={{ imageRendering: 'pixelated' }} />} title={`${typeName(type)} type`} meta={meta} />;
}

/** §4.2 — a status condition, what it does, and how long it lasts. */
export function statusTip(status: string): ReactNode {
  return <Tip icon={<img src={statusGlyph(status)} alt="" width={20} height={20} />} title={STATUS_LABEL[status] ?? cap(status)} body={STATUS_HINT[status]} />;
}

// ── Moves ────────────────────────────────────────────────────────────────────────────────────────────────

const RANGE_BODY = {
  melee: 'Melee: only your Lead can play it.',
  ranged: 'Ranged: anyone on your team can play it, from the bench too.',
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
  if (move.targeting === 'cleave') meta.push('Hits every slot');
  // §5.13.2 — the fifth card says so: it is the one card in the hand no Move Manager can reach.
  if (play.card.mastery) meta.push('★ Mastery');
  const lines: ReactNode[] = [describeMoveDef(move)];
  lines.push(RANGE_BODY[move.range]);
  const mod = MODIFIER_BODY[move.modifier];
  if (mod) lines.push(mod);
  let footer: ReactNode = play.card.mastery ? `${owner.name}'s Mastery Move — a fifth card its line has earned.` : `${owner.name}'s card.`;
  if (play.damage) {
    const eff = play.damage.typeMultiplier;
    footer = `Against this target: ${play.damage.final} damage${eff === 0 ? ' — no effect' : eff > 1 ? ` (super effective ×${eff})` : eff < 1 ? ` (not very effective ×${eff})` : ''}${play.damage.isCrit ? ', critical' : ''}.`;
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
};

/** §5.5 — what an intent means and what to do about it. `hidden` intents show the kind only. */
export function intentTip(kind: string, detail?: string, hidden = false): ReactNode {
  return <Tip title={`Enemy intent: ${INTENT_LABEL[kind] ?? cap(kind)}`} meta={detail && !hidden ? [detail] : undefined} body={INTENT_BODY[hidden ? 'unknown' : kind] ?? INTENT_BODY.unknown} footer="Every enemy move is telegraphed a turn ahead. Nothing here is a guess." />;
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

/** §2.6.4 — the odds. The number is the chance, and this says what moves it. */
export function catchTip(odds: CatchOdds & { ballsLeft: number }): ReactNode {
  const pct = Math.max(1, Math.round(odds.chance * 100));
  const ceiling = Math.round(odds.catchRate * 100);
  return (
    <Tip
      title={odds.guaranteed ? 'Master Ball Charm — this throw cannot miss' : `${pct}% to catch`}
      meta={[`${odds.ballsLeft} ball${odds.ballsLeft === 1 ? '' : 's'}`, odds.hasStatus ? (odds.statusMult >= 1.5 ? 'Asleep or frozen ×1.5' : 'Status ×1.2') : 'No status yet', `Species ceiling ${ceiling}%`]}
      body={
        odds.guaranteed
          ? 'Play the Poké Ball card. The charm is spent on this run whatever happens.'
          : `Each throw is one roll at this chance and spends a ball either way. The chance climbs as its HP falls — steeply in the last quarter — and a status multiplies it; Sleep and Freeze most.`
      }
      footer="Knock it out and the recruit is lost."
    />
  );
}

/** §2.14 — Poké Dollars. */
export function moneyTip(amount: number): ReactNode {
  return <Tip title={`${amount} ₽`} body="Poké Dollars. Earned from fights, spent at the Poké Mart, the Dojo and the Centre's Therapy. What you do not spend carries into the next Region." />;
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
export function combatantTip(c: Combatant, extra?: { isLead?: boolean; swapCost?: number }): ReactNode {
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
  return <Tip title={`${tokens} Token${tokens === 1 ? '' : 's'}`} meta={[`${earned} earned`]} body="Every Trainer Level pays Tokens — two, more at every fifth — and so does every Gold or Platinum medal. They are spent at the Poké Mart: starters, Hub upgrades, relics and cosmetics, on five shelves that Trainer Level opens." />;
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
    : state === 'soulbound' ? 'Soulbound: the line earned its place by being played (Bond rank 5).'
    : state === 'pending' ? `Not sold yet: ${detail}.`
    : state === 'buyable' ? `${price} Tokens at the Starters shelf.`
    : detail ?? 'Not enough Tokens yet.';
  // §8.9.2 — an unmet starter's blurb would give it away; it says what the silhouette means instead.
  const body = blurb ?? 'A Pokémon you have not met yet. Its name and kit stay hidden until you meet it on a route — or buy it blind.';
  return <Tip title={name} meta={[state === 'owned' || state === 'soulbound' ? 'Yours' : `${price} Tokens`, `Poké Mart · Level ${SHELVES.starters.level}`]} body={body} footer={footer} />;
}

/** §5.13 / §8.9 — a Pokédex card: number, types, met or not, the line's rank. The sheet has the rest. */
export function dexCardTip(name: string, dex: number, types: readonly string[], met: boolean, encounters: number, lineName: string, rank: number): ReactNode {
  const lines: ReactNode[] = [
    <div key="m">{met ? `Faced ${encounters} time${encounters === 1 ? '' : 's'}.` : 'Not met yet — its name, types and kit are unknown until it takes the field.'}</div>,
    <div key="b">{rank > 0 ? `${lineName} line: ${BOND_RANK_NAME[rank]} (rank ${rank}).` : `${lineName} line: not yet played.`}</div>,
  ];
  return <Tip title={`#${String(dex).padStart(3, '0')} ${name}`} meta={types.map(cap)} body={lines} footer="Open for its record, its kit and its line." />;
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
    : state === 'buyable' ? [`${sale?.price ?? 5} Tokens at the Poké Mart.`, discover].filter(Boolean).join(' ')
    : state === 'locked' ? [`The Poké Mart sells it from Trainer Level ${sale?.level ?? 10}.`, discover].filter(Boolean).join(' ')
    : discover ?? `Sold at the Poké Mart's Discoveries shelf from Level ${SHELVES.discoveries.level}.`;
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
  return <Tip title="The counter" body={`Any held item in your bag sells for ${sellPrice()} ₽ — ${Math.round(PRICES.sellShare * 100)} % of its price. The merchant on the route does not buy.`} />;
}
export function heldItemSellTip(itemId: string): ReactNode {
  const item = getContent().heldItem(itemId);
  return <Tip title={item.name} meta={['Held item', `Sells for ${sellPrice()} ₽`]} body={item.description} footer="Selling is for good." />;
}

/** §2.9.4 — the Dojo, beside its one-line lede. */
export function dojoTip(): ReactNode {
  return <Tip title="The Dojo" body="The master teaches a Pokémon a move it would never learn by levelling, or swaps its passive ability. As many as you can pay for; the price is on every offer." />;
}

/** §5.10 — a Badge: permanent, so what it does is the whole tip. */
export function badgeTip(name: string, description: string): ReactNode {
  return <Tip title={name} meta={['Badge']} body={description} footer="Kept for the rest of the run." />;
}

// ── The city (v0.7.2) ─────────────────────────────────────────────────────────────────────────────────────

/** §2.9.4.1 — the Ring's door inside the Dojo: the fee, the ladder, and whether it is still open this visit. */
export function ringDoorTip(fee: number, prizes: string[], open: boolean): ReactNode {
  return <Tip title="Challenge Ring" meta={open ? [`${fee} ₽ to enter`] : ['Done for this visit']} body={CITY_DOOR_HINT.ring} footer={`Pays ${prizes.join(' → ')}.`} />;
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

/** §2.9.4.1 — the Ring's own heading bubble. */
export function ringTip(): ReactNode {
  return <Tip title="Challenge Ring" body={CITY_DOOR_HINT.ring} footer="Nothing heals between rungs. Losing one loses the ladder, never the run." />;
}

/** §2.9.4.1 — what the ladder has paid so far. */
export function bankedTip(banked: number): ReactNode {
  return <Tip title="Banked" meta={[`${banked} ₽`]} body="What the rungs you have won have paid. Yours if you cash out; gone if you lose a rung." />;
}

/** §2.11.5 — the Game Corner's heading bubble. */
export function gameCornerTip(): ReactNode {
  return <Tip title="Game Corner" body="Two machines, the odds printed beside each. Both return a little less than they take, on average — they turn money you cannot use into a chance at something you can." />;
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

/** §2.11.5 — a machine's printed table, as the bubble on its name. */
export function machineTip(machine: 'wheel' | 'slots', table: string, ev: number): ReactNode {
  return <Tip title={machine === 'wheel' ? 'The Wheel' : 'The Slots'} meta={[`Returns ${Math.round(ev * 100)} % on average`]} body={table} footer="The outcome is rolled against this table first, then shown. The house edge is real." />;
}

/** §2.11.2 — a Department Store floor. */
export function floorTip(label: string, count: number): ReactNode {
  return <Tip title={label} meta={[`${count} on the shelf`]} body="Each floor sells one kind of thing. A re-roll restocks the floor you are on; the others stay as they are." />;
}

// ── The Safari Zone (v0.7.6) ─────────────────────────────────────────────────────────────────────────────

/** §2.11.6 — the Safari's heading bubble: the whole rule set, once. */
export function safariTip(): ReactNode {
  return (
    <Tip
      title="Safari Zone"
      body="Pick one of today's Pokémon and stalk it through the grass. Tall grass hides you from everything but the tile in front of it; open ground does not. You always see where it will walk and where it will look. End a turn within two tiles, then spend the next on a throw."
      footer="Seen is an alarm, and so is a ball that misses. Its last alarm sends it off. Once per visit."
    />
  );
}

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
      meta={['Red + eye: seen', 'Pale red: hidden', 'Dots: its path', 'Yellow: a click acts', 'Arrow keys walk']}
      body="The red is where it will be looking once this turn ends. On a tile marked with the eye it would notice you; pale red is its look, but the tall grass hides you. Boulders block a look and a throw; the water is its pond."
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
