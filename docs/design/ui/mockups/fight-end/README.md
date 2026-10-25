# The fight's end — rework proposal (2026-10-21)

> **Status: shipped in v0.9.30** (`src/ui/screens/results/FightResults.tsx`). Canon is §9.4.5 and §9.9.1 in
> `09-presentation.md`; this file keeps the proposal as it was shown, the rejected directions and why.
>
> **The user's go-ahead (2026-10-21): direction A, with three changes.** (1) An evolution is the series' surprise:
> no *Ready to evolve* mark and no *Evolve* button — Continue, then the cutscene. (2) The HP gain, the XP bar and the
> level-up as the series plays them, with their sounds (the bars' fills, the level-up fanfare). (3) What a level gave
> is not on the fight's card: a **temporary panel beside the card** for the length of its beat (the gains, then the
> totals counting up, and a move the level brought), and the lit level tag is its door afterwards — shown at its
> moment rather than only on hover, because a level gained is the news of the fight; kept off the stage after, because
> three standing panels would cover the field. The mockups below predate these changes. The fight's numbers (turns,
> damage) that the proposal put behind the progress door were dropped: nothing decides on them.

Open the mockups through the dev server so the game's own sprites, trainers, badges, backdrops, fonts and tokens load:
`http://localhost:5173/docs/design/ui/mockups/fight-end/stage.html?case=trainer` — cases `wild`, `catch`, `trainer`,
`gym`, `gym-pick`, `evolve`, `defeat`, `escaped`, `fled`, `progress`; `&t=<ms>` freezes the reveal at that moment.
`textbox.html` and `board.html` are the two rejected directions, kept for the comparison.

## What is wrong today (v0.9.29, captured at 1920×1080 and 1280×720)

The end of a fight is two screens that say the same thing: the **outcome overlay** over the blurred arena, then a
separate **reward screen** on the light theme.

1. **Two "Victory!" in a row, two clicks** — the overlay, then the reward screen's own title. An Elite or a Gym takes
   four or five clicks (overlay → reward → relic page → take → map).
2. **The overlay is trivia** — six tiles (turns, cards played, manual swaps, damage dealt and taken, faints) that inform
   no decision (D4, D3); the team as 24 px box icons at a non-integer scale (D9).
3. **The fight's place vanishes at the moment of victory** — the reward screen is a cream page: no backdrop, no trainer,
   no beaten Pokémon. Who you beat is not on it.
4. **The Gym — the Region's climax — reads exactly like a wild Caterpie.** The Badge is not on the reward screen at all;
   it appears afterwards as a 40 px pill above the relic offer.
5. **The XP bar fills from zero**: the gain is not seen as a gain, and after a level-up the bar shows only the leftover
   (1/32), so a level-up reads as an empty bar.
6. **HP disagrees between the two screens** (14/68 on the overlay, 24/68 on the reward): the victory heal happens and is
   never shown.
7. **Loot as bare icons** — consumables in the strip have no name (D2: a mystery until hover).
8. **The medal list is rows of text** (D3), up to seven on an early run, and **overflows at 720p**: the sticky Continue
   covers the medals and the loot (D8).
9. **The flee promises a toll it never shows** — "the toll comes off on the map: money, Trauma…" (D1, 140 characters),
   and the map never says how much.
10. **Neutral outcomes framed as a loss** — "Got away" and "Abra fled" use the defeat's red frame; the defeat's line in
    a run ("Rest, rethink the Lead, try again") describes the scenario mode, where there is a retry.
11. The pointer that pressed the overlay's Continue lands on the reward's medal list and opens a tooltip on arrival.

## The concept — A: the field after (recommended)

**The fight ends where it happened.** No overlay and no second page: the arena stays, the hand tray clears, and the
stage becomes the result. One screen, one click (two where there is a pick).

| Zone | In the fight | At its end |
|---|---|---|
| Top bar | the opponent, the log, turn and AP | the log's line is the result; the right-hand chip becomes the **progress door** (medals, discoveries, Bond, the fight's numbers) |
| Headline | — | the series' word on a ribbon — *Victory!* (gold), *Gotcha!* (red), *Wiped out…* (amber, warm), *Got away safely!* / *Abra fled!* (slate) — and one line in the games' voice: "You defeated Swimmer Cass!" |
| Your side | the formation | the same three cards in their places, each with what the fight gave it: XP filling from where it stood (the gain lit), *Lv 8 → 9* on the level tag, the stat gains as a chip column down the window's left, a learned move on its own line, *Ready to evolve* glowing on the window, the victory heal as a lighter green on the HP bar, *Trauma +1* on a fainted card's corner |
| Their side | the enemy formation, the trainer | **who you beat**: the trainer steps forward with their beaten team at their feet (greyed sprites); a wild foe stays as a greyed *Fainted* card; a catch stands where it was caught (*New · joins the Box*, the Ball beside it); a Gym's **Badge in its case**, the Leader beside it; a runner leaves its sparkles |
| Tray | the hand | **the spoils as cards** in the move card's grammar — prize money (with the wallet after), each item named with its kind; a flee's toll with its number (−34 ₽); a pick deals its three relics here |
| End Turn's place | End Turn | **Continue**, naming where it goes: *to the map*, *Choose a relic*, *Evolve Bulbasaur*, *See how far you got* |

Rules it keeps: the choice still comes after the summary (§7.3.7's reason), but on the same stage — the button reads
*Choose a relic* and the tray swaps its spoils for the three relics. Everything that needs words has a door (the Badge's
effect, each relic, each spoil, the progress list). Theme: the warm-dim stage throughout — the fight's own register.

### The reveal (≈ 2.2 s, a click or a key jumps to the end; reduced motion: all at once)

| ms | Beat |
|---|---|
| 0–320 | the ribbon drops in; the voice line fades under it; the hand tray has cleared |
| 120–500 | the trainer steps forward (a Gym: the Badge's case pops at 250, sparkles to 750) |
| 350–750 | the victory heal fills on every HP bar |
| 600–1600 | XP fills, Lead first then the bench, 150 ms apart; a bar that crosses a level wraps, the tag pops *Lv 8 → 9*, the stat chips and the new move follow |
| 1400–2100 | the spoils are dealt into the tray left to right; the ₽ counts up |
| 1900–2300 | Continue, then the progress chip |

D8 holds: nothing reports a result before its beat lands (the level tag changes as the bar wraps, not before).

### Every case

- **Wild**: the foe's card greyed in its place (*Fainted*); ₽ and any find in the tray.
- **Catch**: *Gotcha!*; the caught Pokémon's card on the foe's spot, the Ball and its three sparkles; the tray says *Box 4 / 6* and *New in the Pokédex*; a shiny wears its palette and *+10 Bond*. A full Box makes Continue read *Make room* (the swap-or-skip that follows is unchanged).
- **Trainer**: the trainer forward, their team greyed at their feet; ₽ and drops.
- **Elite / Gym**: the Leader and the **Badge in its case**; Continue *Choose a relic*; the pick in the tray (*The Gym owes you something — take one*), *Take Trauma Salve* / *Leave them*.
- **Level-up / evolution ready**: Continue *Evolve Bulbasaur*; the existing cutscene (§9.9.1, v0.9.6) starts straight from the stage, then the path screen as today.
- **Defeat**: the stage greys; *Wiped out…* in amber; the team greyed with Trauma; the tray shows what the run keeps (Bond, Trainer XP); *See how far you got* → the run-end screen (unchanged).
- **Ran (escaped)**: *Got away safely!*; the foe still there, faded; the toll as cards with numbers (−20 % of the wallet; a trainer's dropped item); *Trauma +1* on the Lead's card.
- **The runner fled**: *Abra fled!* in slate; *No XP · No toll*.
- **Hold-out won** (§5.6.5): as a wild win, the find in the tray.

## Rejected directions

- **B — the series' text box.** The arena stays and FireRed's box tells it a line at a time ("Pidgey grew to Lv. 9!"
  with the stat window). Faithful and charming, but a trainer fight is ~11 lines and a run ~15 fights: 150+ clicks or
  waits a run. Pacing wins over faithfulness (CLAUDE.md tiebreaker). Its voice survives as A's one line.
- **C — a results board of its own.** The current screen redone as three columns (who you beat, the team, the spoils)
  on the light theme. Tidier and one click, but it still leaves the fight's place, still needs the Badge and the pick
  on other pages, and its height depends on the loot (half empty after a wild fight, overflowing after a Gym).

## Implementation notes (for after the go-ahead)

- **Flow**: dispatch `finish-combat` when the fight's last beat ends and render the `reward` phase on the stage (the
  combat screen's backdrop, `UnitCard` anatomy, the tray) instead of the overlay + `RewardScreen`. `OutcomeOverlay`
  stays only for the scenario mode (Play again / Scenarios).
- **Gym pick before evolution**: move the Gym's offer into `pendingReward.relicPick` as the Elite's is, so the order is
  result → pick → evolution → City for both; the Legendary screen remains for the Summit and the Black Market. Check the
  goldens for the offer's RNG order.
- **The toll seen**: record it on the run (`lastToll`, as `lastHeal` is) so the escaped case can show its numbers.
- **The heal seen**: the result reads the HP before the victory heal from the report.
- **Bond** moves into the progress door; a rank-up stays on its card as news (the hidden ability chip).
- **Sound**: the level-up chime at each wrap (exists), a coin tick on the ₽ count, a short Badge fanfare (new recipe).
- **Canon**: rewrite §9.4.5 and `ui/screens.md` §3.5–3.7, add the fight's end as a beat in §9.9.1, the README row here.

## Open choices for the user

1. Ribbon + voice line, or the ribbon alone.
2. Stat gains as a chip column on the card (shown), or only behind the level tag's tooltip.
3. The pick on the same stage (shown), or its own page as today; and the pick before the evolution.
4. Bond in the progress door (shown), or on each card as today.
5. The evolution cutscene over the fight's own backdrop, dimmed, or on its dark stage as today.
6. The reveal's ~2.2 s (skippable), or shorter.
