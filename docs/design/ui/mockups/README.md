# UI mockups (canonical references)

Self-contained HTML mockups from the Unity-era UI design pass (Q23 / CL-023). **Open any `.html` in a browser**
to view. They are the reference render for every screen; the React components in `src/ui/screens` implement
them with the tokens in `src/ui/styles/tokens.css`. Art slots inside them are placeholders — real art comes
from `docs/art/pipeline.md`. Fonts: Baloo 2 + Nunito; icons: Tabler stand-ins.

| File | Screen | Spec | Implemented by |
|---|---|---|---|
| `combat-screen-final.html` | **Combat** — squad formation, intent chip, catch pill, hand tray, damage preview | `ui/02 §2.1` | ✅ `src/ui/screens/CombatScreen.tsx` (v0.1) — adds animated sprites over a stage backdrop, combat log, floating numbers |
| `move-card-final.html` | Move card: playable · not-enough-AP · out-of-melee | `ui/09` | ✅ `src/ui/components/MoveCard.tsx` |
| `consumable-card-final.html` | Consumable card | `ui/09` | ✅ `src/ui/components/ConsumableCard.tsx` |
| `move-card-full.html` | Fully-loaded card + icon legend | `ui/09` | reference |
| `newrun-1-difficulty.html` … `newrun-4-region.html` | New-run stepper (difficulty, starter, relic, region modifier) | `ui/03 §3.3` | v0.2 / v0.4 / v0.5 |
| `team-loadout.html` | Team & Loadout overlay | `ui/04 §4.1` | v0.2 |
| `move-manager.html` | TM & Move Manager | `ui/04 §5.8` | v0.3 |
| `shop.html` | Shop / Poké Mart | `ui/04 §2.12` | v0.4 |
| `pokemon-center.html` | Pokémon Center | `ui/04 §5.11` | v0.2 |
| `dojo-tutor.html` | Dojo / Tutor | `ui/04 §5.12` | v0.3 |
| `city-plaza.html` | City / Choice Plaza | CL-015 | v0.7 |
| `mystery-event.html` | Mystery Event | event template | v0.4 |
| `node-preview.html` | Node Preview popover | `ui/03 §3.4` | v0.2 |
| `legendary-pick.html` | Legendary Pick | `ui/03 §3.7` | v0.5 |
| `victory-summary.html`, `defeat-summary.html` | Run end | `ui/03 §3.8–3.9` | v0.2 (combat-level version ✅ `OutcomeOverlay.tsx`) |
| `achievements.html` | Achievements | `ui/05 §6.2` | v0.5 |
| `settings-basic.html` | Settings (basics) | `ui/05 §6.3` | v0.5 |
| `pause-menu.html` | Pause | `ui/05 §6.4` | v0.2 |
| `boot-splash.html` | Boot / Splash | `ui/03 §3.1` | v1.0 |

Superseded pre-final mockups (`combat-hand`, `consumable-card`, `move-card`) were not migrated; they live in the
Unity repo history if ever needed.
