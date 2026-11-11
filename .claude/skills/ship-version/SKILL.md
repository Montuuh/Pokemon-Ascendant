---
name: ship-version
description: >
  Ship a version of Pokémon Ascendant the way docs/release-doctrine.md requires: write the CHANGELOG.md entry the
  game's What's new screen reads, bump the version, and stamp it in every place that shows it (package.json and
  its lockfile, the roadmap, the README Status line, the session header), then prove it with check:version.
  Use whenever a package a player can see is finished ("ship v0.7.4", "cierra la versión", "sube la versión",
  "cierra el paquete"): work ships in packages, one commit each, and a package a player can see is a version
  (docs/release-doctrine.md R0). A package nobody plays (workshop, docs) is one commit with no version.
---

# Ship a version

Read `docs/release-doctrine.md` first; this is its checklist.

## Does it earn a version? (R0 first)

Work ships in **packages**: a themed set of improvements and features, built in steps and committed once. A
package a player can see — a rule, content, art, a screen, the game's words — ships as a version, named after the
package. A package nobody plays (`.claude/`, tooling, tests, docs only) is one commit with no `npm version`, no
changelog, no roadmap ✅ and no README/session stamp. Small fixes and polish never ship alone: they ride in the
package in progress. Only a hotfix (a lost run or save, a soft-lock, a wrong result) ships at once as its own patch.

There is no `## Next`: a package takes the next patch number (v0.7.10 → v0.7.11, never v0.7.10.1) the day it
ships, with the steps below.

## Shipping vX.Y.Z

1. **Changelog.** Write the new entry — brief and technical: 2–4 bullets for a patch, a few words each saying what changed, no roleplay (R2):
   - a patch → `### vX.Y.Z — Name · YYYY-MM-DD` under its minor's `## vX.Y` heading, newest first;
   - a minor → its `## vX.Y — Name · in progress` heading takes the date and gains 5–8 bullets that sum up the
     whole version (its patches stay under it).
   One line of lede; bullets written for players (R2): no §, no file names, under ~120 characters each.
2. **Number.** `npm version X.Y.Z --no-git-tag-version` (a minor is `X.Y.0`). This updates the lockfile too.
3. **Roadmap.** Mark the row (minor) or the heading (patch) `✅ YYYY-MM-DD`, and write its **Shipped.** paragraph.
4. **README.** Rewrite the Status line: `**vX.Y.Z — Name.** …` plus what it adds.
5. **Session.** Rewrite the header of `docs/session/active.md` (≤ 30 lines) to name the version shipped and what's next.
6. **Prove it.** `npm run check` — `check:version` must print "stamped everywhere" and `changelog.test.ts` must
   pass. A UI change still goes through the `ui-review` skill.
7. **One commit, one push** for the whole package: `feat: <Package name> — vX.Y.Z`, the body listing its parts,
   no attribution lines (the `session-close` skill stages it by path).

If `check:version` fails, it names the place that disagrees. Fix that place; never loosen the guard.
