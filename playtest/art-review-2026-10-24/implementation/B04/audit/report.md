# UI audit — 2026-10-24 15:44

Screens: victory, defeat

Captured: 2/2 · Failed: none

## victory  (/?screen=menu)
- **Captured**: expected root `victory-screen` verified at both sizes
- screenshot: `playtest/art-review-2026-10-24/implementation/B04/audit/victory.png` (and `victory-720.png`)
- **D1 text**: 232 chars in 24 blocks · 0 block(s) over 120 chars
- **D2 doors**: 10 tooltip carriers, 0 InfoDots, 12 interactive elements
- **D3 shape**: 0 table(s), 0 text-only list(s) of 8+ rows
- **D5 contrast**: 0 failure(s) · 3 block(s) on a gradient/image, unmeasured
- **D8 works**: 0 unnamed control(s) · overflow 1080p: none · overflow 720p: none · spill 1080p: none · spill 720p: none · console errors: 0

## defeat  (/?screen=menu)
- **Captured**: expected root `defeat-screen` verified at both sizes
- screenshot: `playtest/art-review-2026-10-24/implementation/B04/audit/defeat.png` (and `defeat-720.png`)
- **D1 text**: 216 chars in 22 blocks · 0 block(s) over 120 chars
- **D2 doors**: 10 tooltip carriers, 0 InfoDots, 12 interactive elements
- **D3 shape**: 0 table(s), 0 text-only list(s) of 8+ rows
- **D5 contrast**: 0 failure(s) · 3 block(s) on a gradient/image, unmeasured
- **D8 works**: 0 unnamed control(s) · overflow 1080p: none · overflow 720p: none · spill 1080p: none · spill 720p: none · console errors: 0

## Static (changed files)
- files: `src/app/accountStore.ts`, `src/app/cheats.ts`, `src/app/store.ts`, `src/ui/art.ts`, `src/ui/audio/director.ts`, `src/ui/audio/sfx.ts`, `src/ui/components/ItemCard.tsx`, `src/ui/components/MoveChip.module.css`, `src/ui/components/OutcomeOverlay.tsx`, `src/ui/components/ProgressToasts.tsx`, `src/ui/components/SupplyStrip.tsx`, `src/ui/hooks/useMotionPref.ts`, `src/ui/screens/CombatScreen.tsx`, `src/ui/screens/LegendaryScreen.module.css`, `src/ui/screens/LegendaryScreen.tsx`, `src/ui/screens/RewardScreen.module.css`, `src/ui/screens/RewardScreen.tsx`, `src/ui/screens/run-end/FinalTeam.tsx`, `src/ui/screens/run-end/RunRecord.tsx`, `src/ui/strings.ts`, `src/ui/tips.tsx`, `src/ui/screens/results/FightResults.module.css`, `src/ui/screens/results/FightResults.tsx`, `src/ui/screens/results/LevelUpPanel.module.css`, `src/ui/screens/results/LevelUpPanel.tsx`, `src/ui/screens/results/ProgressDoor.module.css`, `src/ui/screens/results/ProgressDoor.tsx`, `src/ui/screens/results/ResultUnit.module.css`, `src/ui/screens/results/ResultUnit.tsx`, `src/ui/screens/results/SpoilCard.module.css`, `src/ui/screens/results/SpoilCard.tsx`, `src/ui/screens/results/results.test.ts`, `src/ui/screens/results/results.ts`, `src/ui/screens/results/useReveal.ts`
- **D7 dead CSS**: `src/ui/screens/results/LevelUpPanel.module.css` → b1, b2; `src/ui/screens/results/ResultUnit.module.css` → ghost, faded, new
- **D6 literals**: none
- **D2 title=**: none
