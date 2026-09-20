# Playtest — v0.4 Economy & Relics

**Date** 2026-09-20 · **Build** v0.4.0-dev · **Player** internal, playing the new systems cold
**Verdict** the economy works and it fixed the thing v0.3 could not. Still a guided playtest, not a public
link — for a different and much smaller reason than last time.

---

## What I was trying to find out

v0.3's audit ended with one named blocker: a 61 / 28 / 90 % win-rate spread between the three starters, caused
by the Region 1 Gym's type matchup, with v0.5's Gym fork as the designed fix. v0.4 was not meant to touch it.

So the questions were:

1. Does the route between the fights have a decision in it now, or is a service node just a node you take?
2. Can a new player tell what money is for, and what a relic is, without being told?
3. Did adding four systems make the build *less* comprehensible than v0.3's?

---

## 1. The route — does a stop mean anything?

**Yes, and it is close to even, which is what it should be.**

A service node costs a fight on a one-node-per-layer route. The whole-run harness A/Bs each one against
skipping it, over 80 seeds per case (a *comparison* needs more samples than a point estimate — at 30 the
standard error of the difference is 13 pp, which is wider than the effect being measured, and the test failed
on pure noise once before that was fixed):

| Take it | Skip it | Read |
|---|---|---|
| Dojo | ~even | Break-even. It buys cards; the fight buys levels. |
| Poké Mart | ~even | Break-even. The relic pays out over the rest of the route. |
| Mystery | ~even | Break-even, and the highest variance of the three. |

Break-even is the right answer. A node that is strictly better is not a choice, and a node that is strictly
worse is a trap. Both were tried on the way here: the first v0.4 route put the Dojo at L3 and it measured
13 points *worse* than skipping it, because §6.4.3's tutor list belongs to the current **stage** and at L3 a
starter has not evolved — the menu was the base form's, the shortest and weakest list in the line. Moving the
Dojo to L6 and the Mart to L3 fixed it with no number changed: the relic gets the whole route to pay itself
back, and the tutor list is the evolved one by the time you can afford it.

**The other route bug this found:** the Dojo layer was pinning its non-service columns to Wild. Two late
trainer fights quietly disappeared from every route and the team arrived at the Elite two levels light. A
service layer is a fork, not a downgrade; its other columns roll normally now.

---

## 2. Money, relics, items — does a new player follow it?

**Mostly. Four things were changed in this playtest because they did not read.**

- **The Mystery Event resolved and vanished.** You pressed a button that said "250 ₽, but the team ends the
  day tired: −15 % HP", and the next thing on screen was the map. For a Gamble that is worse than useless —
  a coin flip the player never sees land is not a gamble. The node now holds a *What happened* panel with the
  actual outcome lines and a Back to the route button. The choice is still a choice; it just gets confirmed.
- **The Pokémon Centre had no screen at all.** It healed on entry and handed the map straight back, which
  meant §8.2.4's Therapy — the one money sink after the Elite — was unreachable through the UI. The Centre is
  a screen now: the free restore is reported, and the Trauma list is the decision.
- **"Sold" and "cannot afford" looked identical** on the shelf. Both were a greyed card. They are different
  facts: one is gone, the other is what you are saving toward. Sold fades out; unaffordable stays readable
  with its price at full strength and a warning border.
- **The Mart was selling a stated no-op for 300 ₽.** Three relics ship inert because the system behind them
  does not exist, and the card said so — which made it honest to *show* and still dishonest to *sell*. A
  labelled blank is a blank, and it takes the slot a working relic would have had. `isOfferable` now keeps
  every pending row out of every drop, shelf and Starting Relic offer.

Two smaller ones: the combat header said **Gym** during an Elite fight (a ternary chain with `'elite'` falling
off the end — it is a lookup table now), and the Elite layer drew **two identical Elite markers** side by
side, which looks like a choice and is not. The Elite and the Gym are the only single-node layers now: a
landmark is a door, not a fork.

**"How to play" needed a second list.** It was six rules, deliberately, with a note saying a seventh would
make it a manual. v0.4 adds a whole layer between the fights, and the honest fix was not a seventh combat
rule but a second headed group: *In a fight* (six) and *On the route* (four — the trade, the money, relics vs
items, and what fainting costs). A player can read the first six and start; the rest keep until their first
Poké Mart raises the question.

---

## 3. The thing nobody was aiming at

**The starter spread closed on its own.**

| | Bulbasaur | Charmander | Squirtle | Spread |
|---|---|---|---|---|
| v0.3 (120 seeds) | 61 % | 28 % | 90 % | **62 points** |
| v0.4 (60 seeds) | 47 % | 47 % | 57 % | **10 points** |
| v0.4 final (30 seeds) | 40 % | 53 % | 57 % | **17 points** |

Nothing in the Gym changed. Nothing in the type chart changed. What changed is that a Fire start now has four
places to find an answer it did not have: a Starting Relic, a shelf at L3, a guaranteed relic off the Elite,
and a Held Item to put on whatever it recruited. v0.3's Charmander was hostage to one matchup with no lever;
v0.4's has levers.

This does not retire v0.5's Gym fork — a mandatory Rock Gym is still a structural problem and the fork is
still the right fix. It does retire it as a **ship blocker**, which is the thing that mattered.

---

## 4. The balance scare that was a harness bug

Closing §7.2.2 — healing as a percentage of Effective Max HP instead of a flat 20/50 — dropped the measured
win rate from 47/47/57 to **17/3/27**. That looks like a catastrophic content regression. It was one line:

```ts
.find((p) => p.playable && p.def.effect.kind === 'heal-flat')
```

The balance harness only knew one healing kind, so the moment nothing shipped on `heal-flat` it **stopped
drinking Potions entirely** and measured a game nobody was playing. The same change bricked its Ether branch,
which fired at `ap === 0` — and §7.2.4's Ether costs 1 AP, so at 0 AP it is unplayable.

Worth recording as a pattern: *a harness that matches on a content shape will silently stop exercising the
system when that shape changes, and the result reads as a balance regression.* Both branches now gate on
`playable` and on the effect's own numbers rather than on a hard-coded kind.

With the harness fixed, the real cost of canon's percentages was ~12 points, concentrated in the first two
fights where a lone Lv 5 starter with 45 Max HP heals 11 instead of 20. The starting kit is ours to set (canon
does not fix it), so it went from two Potions to three — the number is commented where it lives with the
measurement that justifies it.

---

## Still open

1. **The starter spread wants a human read.** 40 / 53 / 57 is a *measurement of the harness*, not of a player.
   A human is better than the harness at some things (planning a route around the Mart) and worse at others
   (never misplaying an AP).
2. **v0.3's two human exit criteria are still open**, and v0.4 adds two more: does the same starter feel
   different across two runs because of what it carried, and can a tester say unprompted why they skipped a
   node.
3. **Toxic's cap still contradicts its own description** (`⚠ OPEN` in `catalogs/tms.md`): "doubles each turn"
   gets exactly one doubling under a MaxHP/8 ceiling that starts at MaxHP/16. Canon's tension, flagged, not
   silently re-tuned.
4. **The economy runs a surplus.** Runs end with 500–800 ₽ unspent, of which the Gym's 500 is designed to
   carry into Region 2 — so the real surplus is small, and it will look different the moment there is a
   Region 2 to carry it to. Worth re-measuring at v0.6 rather than tuning now.

---

## Verdict

**Guided playtest: yes.** The route has decisions in it, the four new screens read, and the build is more
comprehensible than v0.3 despite carrying four more systems — because each one got a screen that explains
itself rather than a tooltip that rewards patience.

**Public link: not yet**, and the reason changed. v0.3's blocker was balance; that is now fixed. What is left
is that nobody outside this machine has played it. The exit criteria that remain are all human, and they stay
open until humans close them.
