import {
  IconArrowsLeftRight, IconBolt, IconCards, IconCoins, IconEye, IconCheck, IconHeartBroken,
  IconMap2, IconSparkles, IconTargetArrow, IconVaccineBottle,
} from '@tabler/icons-react';
import { Modal } from './Modal';
import styles from './HowToPlay.module.css';

// Per §9.6.1 (cognitive accessibility) — the cheap half of "a tutorial mode".
//
// Everything on the combat screen carries a tooltip, so a patient player can reverse-engineer the rules by
// hovering. That is not the same as being taught them, and a first-time player meets six unfamiliar systems at
// once: a shared hand, AP, the Lead, telegraphed intents, the type chip, and a four-card budget against a
// growing pool. This is the sixty-second version. The real tutorial mode — longer telegraphs, an opt-in hint
// overlay — is still §9.6.1's, and still later.
//
// Six fight rules and no more: a seventh would make it a manual, and a manual does not get read. v0.4 added a
// whole second layer between the fights — money, a shelf, relics, items, Trauma — and the honest fix was not
// a seventh combat rule but a second, separately-headed list. A player can read the first six and start; the
// route four are there when the first Poké Mart raises the question.

const RULES = [
  {
    icon: IconCards,
    title: 'Your party is your deck',
    body: 'Three Pokémon are active at once, and each contributes four of its moves. They shuffle into one shared hand, so every card you draw belongs to somebody — the portrait on the card is whose it is.',
  },
  {
    icon: IconBolt,
    title: 'Three AP a turn',
    body: 'Cards cost Action Points, shown as dots on the card and as pips beside End Turn. Unspent AP does not carry over. Most turns are one big card or two small ones.',
  },
  {
    icon: IconArrowsLeftRight,
    title: 'The Lead takes the hits',
    body: 'Your front Pokémon absorbs every single-target attack, and Melee cards can only be played from there. Ranged cards work from the bench at three-quarters damage. Swapping costs 1 AP, then 2, then 3 within the same turn.',
  },
  {
    icon: IconEye,
    title: 'The enemy tells you first',
    body: 'Every turn the enemy shows what it will do, to which slot, and for how much. Nothing is hidden and nothing is random about it. Read the chip, then decide who should be standing there.',
  },
  {
    icon: IconTargetArrow,
    title: 'Types decide the number',
    body: 'A card shows the damage it would actually deal right now, not its raw power. A ×2 or ×¼ chip in the corner is why. Hover the enemy with a card selected to see the full breakdown.',
  },
  {
    icon: IconSparkles,
    title: 'Four cards, a growing pool',
    body: 'Levelling, evolving and the Dojo all add moves, but a Pokémon still contributes exactly four. The rest wait in its pool — open the Move Manager from any Box row to change which four. Evolution asks you to pick an archetype, and that choice is what makes the run yours.',
  },
] as const;

/** §2.9, §2.10, §7.3, §7.4, §8.2 — the layer between the fights, which v0.4 is the version that added. */
const ROUTE_RULES = [
  {
    icon: IconMap2,
    title: 'A stop costs a fight',
    body: 'You clear exactly one node per layer, so walking into the Poké Mart, the Dojo or a Mystery means not fighting the node beside it — and not getting its XP. That is the trade the whole route is built on. The map shows every node from the start, so you can plan the run before you take the first step.',
  },
  {
    icon: IconCoins,
    title: 'Money buys three things',
    body: 'Fights pay Poké Dollars. The Poké Mart sells a shelf you get one visit at, the Dojo sells tutor moves and passive abilities for as long as you can pay, and the Pokémon Centre sells Therapy. Your balance is on the map, next to the route, because that is where you decide whether a stop is worth it.',
  },
  {
    icon: IconVaccineBottle,
    title: 'Relics are free, items are worn',
    body: 'A relic works from the moment you pick it up, for the rest of the run, and there is nothing to equip. A Held Item is one per Pokémon and does nothing in the bag — put it on someone from the bag button on the map. The loadout locks when you enter a node, so it is the map or nowhere.',
  },
  {
    icon: IconHeartBroken,
    title: 'Fainting leaves a mark',
    body: 'A Pokémon that faints carries a Trauma stack for the rest of the run, and each stack costs it Max HP permanently. Nothing heals it back — not levelling, not a Centre’s free restore. Only the Centre’s Therapy takes a stack off, and it charges more the worse it already is.',
  },
] as const;

function RuleList({ rules, from }: { rules: readonly { icon: typeof IconCards; title: string; body: string }[]; from: number }) {
  return (
    <ol className={styles.list} start={from}>
      {rules.map(({ icon: Icon, title, body }, i) => (
        <li key={title} className={styles.rule}>
          <span className={styles.badge} aria-hidden="true">
            <Icon size={20} stroke={2.2} />
          </span>
          <div>
            <h3 className={`${styles.ruleTitle} display`}>
              <span className={`${styles.n} tabular`} aria-hidden="true">
                {from + i}
              </span>
              {title}
            </h3>
            <p className={styles.ruleBody}>{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How to play" testId="how-to-play" size="reading">
      <p className={styles.intro}>
        A roguelike deckbuilder where the party is the deck. Six rules and you can start; the four after them
        are about the route between the fights, and they keep until your first Poké Mart.
      </p>

      <h2 className={styles.group}>In a fight</h2>
      <RuleList rules={RULES} from={1} />

      <h2 className={styles.group}>On the route</h2>
      <RuleList rules={ROUTE_RULES} from={RULES.length + 1} />

      <button type="button" className={styles.close} onClick={onClose} data-testid="btn-close-how-to-play">
        <IconCheck size={18} /> Got it
      </button>
    </Modal>
  );
}
