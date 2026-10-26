# Session State — Pokémon Ascendant

**Date:** 2026-10-26 · **Version:** v0.9.55 (*Room for every reward*).
**First, read [standing-facts.md](standing-facts.md): Working with the user and Working in a shared folder.**
**Next:** v1.0 release; continue the user's remaining art-review blocks.
**A02/A03:** v0.9.54 supplied the combat-stage results flow. v0.9.55 reserves separate ground for level-up panels and Gym Badges, wraps enlarged stat text and learned moves, and keeps the outcome headline clear. Evidence: playtest/art-review-2026-10-24/implementation/A02-A03.
**B02:** completedRegions counts all three regions after Victory Road and League losses. Regional defeats count only previously cleared Gyms; badge count is not regional progress. The pending implementation now joins this release.
**B01/B03–B14:** shipped in v0.9.41–v0.9.53; individual evidence and reviews remain in playtest/art-review-2026-10-24/implementation/BXX. Earlier queue-exclusion notes are historical; A02/A03 are now in scope.
**A19/A20:** art provenance and measured audit improvements; full final-team ending scenes, native sprite scales, badges and the Run record door. Evidence: playtest/a19-a20.
**Route:** habitat residents, separated captions and bounded marker hit targets; Team owns management. Move Manager closes independently.
**Shared folder:** preserve unrelated design-name, Victory Road stage, audit-script and art-generation changes. Stage only this release's owned paths.
**Release history:** v0.9.32–35 failed clean Pages CI because a guard required an unpublished field; v0.9.36 fixed it. Validate the exact release tree: the shared folder can mask dependencies.
**Gameplay preferences:** evolution is a surprise on Continue; HP/XP/level gains are audiovisual beats. The stat panel is temporary and nearby.
**Shipping:** docs/release-doctrine.md; every finished unit goes to main with the next patch, changelog and all stamps.
**Verification:** UI reviewer Ship; 13 focused browser cases pass, 918 unit tests pass with 3 skipped; isolated Pages-prefix build and four production smoke cases pass with no broken images/errors. A02/A03 review queue cleared.
