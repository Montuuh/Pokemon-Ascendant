---
name: ship-version
description: >
  Ship a version of Pokémon Ascendant the way docs/release-doctrine.md requires: write the CHANGELOG.md entry the
  game's What's new screen reads, bump the version, and stamp it in every place that shows it (package.json and
  its lockfile, the roadmap, the README Status line, the session header), then prove it with check:version.
  Use whenever a version or patch is finished ("ship v0.7.4", "cierra la versión", "sube la versión"), and when
  work lands on main between versions (it goes under `## Next`).
---

# Ship a version

Read `docs/release-doctrine.md` first; this is its checklist.

## Work that lands between versions

Add a bullet under `## Next` in `CHANGELOG.md` in the same commit: `- **Headline.** One sentence for players.`
Create the `## Next` heading above the newest version if it is not there.

## Shipping vX.Y.Z

1. **Changelog.** Turn `## Next` into the new entry, or write it:
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
7. **Commit and push**: `feat: <what it is> — vX.Y.Z`, no attribution lines.

If `check:version` fails, it names the place that disagrees. Fix that place; never loosen the guard.
