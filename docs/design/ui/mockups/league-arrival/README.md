# A11 — three visual proposals

**Decision preview only.** Nothing here is installed in production, changes the design canon, or modifies run state. Choose a direction before implementation. English labels reproduce the game's choices; the narrow bottom toolbar belongs to the proposal viewer.

Run `npm run dev`, then open [the gallery](http://localhost:5173/docs/design/ui/mockups/league-arrival/index.html). All assets and controls load locally. The twelve captured views are retained beside the source; this viewer is a standalone proposal, not a game route.

## A — Indigo Ascent · recommended

A tall, composed exterior arrival uses the actual Indigo Plateau façade, trees and cliff. The Legendary offer sits beside the destination, with the five anonymous type silhouettes below. Entering reveals a ceremonial transverse gallery with five numbered thresholds; the Champion has its own separator. Existing team navigation remains available.

**Why choose it:** the destination is instantly recognisable, and the League's sequence fits in one glance. It has the strongest contrast between the outdoor arrival and indoor challenge. The familiar door and statues tie both halves together.

**Implementation estimate:** roughly 1.5–2.5 focused working days for native scene exports, production hotspot/preview integration, responsive layout, keyboard states, verification and review. This is a planning estimate, not a commitment. Main risk: avoiding the Trainer Hub's familiar floor treatment while retaining the authentic Indigo vocabulary. Final scene should use a more ceremonial wall/carpet composition and put labels precisely at their doors.

## B — Laurel Court

An open, wide terrace lets the final relic offer sit below the view as three equally sized choices. Inside, a garden-lined cloister connects four Elite thresholds, with the Champion elevated at the right. The player crosses an outdoor-to-sheltered threshold rather than a wholly enclosed lobby.

**Why choose it:** the warmest, most relaxed pause before the final fights; the three-way choice is easiest to compare. Its open-air League is a stronger departure from the familiar Indigo interior.

**Implementation estimate:** roughly 2–3 focused working days. It needs the most new composition work: proper native arcade/roof cuts, a deliberate terrace edge and a stronger elevated Champion entrance. Main risk: an open court can resemble another town; the final art must sell the League's singular importance. The current mockup's arches are represented by original doorway and statue cuts; a finished arcade is not claimed here.

## C — Last Threshold

A quiet, compact antechamber leads into a deep ceremonial passage. Four smaller side thresholds lead towards the Champion's gate at the far end; a numbered side rail shows all five fights and separates the Champion. An explicit information panel keeps the next action obvious.

**Why choose it:** concentrated attention on the current opponent and room for readable details. It gives the final stretch a calm, solemn cadence.

**Implementation estimate:** roughly 1.5–2.5 focused working days. Main tradeoff: five physical thresholds are present, but future opponents have smaller spatial previews and depend more on the numbered rail. This is the weakest option if five equally large doorways must dominate the picture. The current antechamber and passage share too much floor language; final art should give the passage taller pillars and a distinct terminal gate. The rail must preserve a single fixed sequence, with no free path selection.

## Canon and sample data

The Summit restores the whole Box and cures status. The three sampled Legendary relics are real content: Flow State, Last Stand and Type Mastery; their descriptions are copied from the current relic catalogue. Selecting a relic changes the confirm label; confirming or declining takes the viewer to the League. This represents the existing one-way transition. It does not grant a relic to a saved run. All five Summit trainers remain silhouettes without names.

League previews preserve the actual sequence and counts: Bruno/Fighting/2/Sandstorm; Agatha/Ghost/2/Toxic Spikes; Will/Psychic/3/Psychic Terrain; Lance/Dragon/3/Rain Dance; Champion/Many types/5. Opponent species are never exposed. The visible example is the initial League state, so it shows **Next** and **Ahead**, with no invented defeated state. The micro-rest is 30 % of Effective Max HP for standing Pokémon; the fallen stay down. The Team, Box and Bag controls are represented, and previews open information rather than changing the run. Production will reuse existing sheets and combat transitions.

## Art sources and what is authored

- `indigo-source.png`: original **FireRed/LeafGreen Indigo Plateau** map, downloaded from [Bulbagarden Archives](https://archives.bulbagarden.net/wiki/File:Indigo_Plateau_FRLG.png), 384 × 320. The source is retained unchanged. The façade, cliff and paved approach are cut from this source; none is AI generated.
- Existing `public/art/hub/lobby.png`: original **Indigo Plateau Center FRLG** map. Door, northern wall and statues are cut from the existing local asset. Source credit already exists in the repository's art attribution and `scripts/fetch-hub-art.mjs`.
- Existing `public/art/center/source/center-frlg.png`: original **Pokémon Center inside FRLG** map. Floor tile, plants and floor emblem are cut from the same source used by the shipped Center composition.
- Existing `public/art/route/highland/ground.png` and `public/art/route/route/tree.png`: original FRLG terrain crops, recorded in `scripts/fetch-route-tiles.mjs`.
- Existing `public/art/hub/player.png`, trainer sprites, compact party icons, FRLG type pills and Legendary item icons are referenced directly, preserving their current repository provenance.
- **Authored here:** every new floor plan, the repetition and placement of gates/statues, the terrace and corridor geometry, and flat runner strips sampled from the FRLG room palette. Canvas draws native-resolution crops without smoothing; world scenes render at exactly 2×. The fixed 2× visual size is preserved at 1080p rather than stretching pixels to fit extra space.
- **Not claimed as final:** mockup architecture, exact hotspot positions, incidental scene labels, the sample party/HP, or integration of management sheets. Those must be refined and verified after the direction is chosen. No generated Pokémon, trainer, item or backdrop was used. The 45 runtime stage PNGs were deliberately not used as a provenance shortcut.

All Pokémon game imagery is © Nintendo / Creatures / GAME FREAK, used for this non-commercial fan project. A production adoption must add the newly downloaded Indigo map to the shared art attribution; this proposal keeps its own source record so shared documents remain untouched until a direction is selected.

## Evidence

- `a-summit-1280.png`, `a-league-1280.png`
- `b-summit-1280.png`, `b-league-1280.png`
- `c-summit-1280.png`, `c-league-1280.png`
- Matching `*-1920.png` captures preserve the integer-scale composition with extra surrounding cream space.
- `gallery.png` compares all six at once.

Capture checks: all images load, no page errors, all pages stay within the viewport at 1280 × 720 and 1920 × 1080. These checks concern the standalone proposals; no production test result is implied.
