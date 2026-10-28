---
name: ship-version
description: >
  Ship a version of Pokémon Ascendant the way docs/release-doctrine.md requires: write the CHANGELOG.md entry the
  game's What's new screen reads, bump the version, and stamp it in every place that shows it (package.json and
  its lockfile, the roadmap, the README Status line, the session header), then prove it with check:version.
  Use whenever a version or patch is finished ("ship v0.7.4", "cierra la versión", "sube la versión"), and when
  a change big enough to announce (a design change, large art) is about to land on main. Small changes do not
  get a version: commit and push them without one (docs/release-doctrine.md R0).
---

# Ship a version

Read `docs/release-doctrine.md` first; this is its checklist.

## Does it earn a version? (R0 first)

Only a change that is informative to a player and large for the game ships as a version: a design or rule
change, new player-met content, a large art change (new scenes, a screen recomposed around new art, a set of
sprites or effects), or a serious fix (lost run, soft-lock, wrong result). Everything else — polish, spacing,
motion or focus tuning, a11y nits, review-block follow-ups, refactors, tests, tooling, docs, `.claude/` — is a
**maintenance commit**: `npm run check`, a conventional commit with **no `— vX.Y.Z`**, push; no `npm version`,
no changelog, no roadmap ✅, no README/session version stamp. Batch several small steps into one release when they
add up to something a player would see. When in doubt: would it go on the What's new screen of a game you played?

There is no `## Next`: a release-worthy change outside a planned sub-version takes the next patch number
(v0.7.10 → v0.7.11, never v0.7.10.1) and ships the same day, with the steps below.

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
7. **Commit and push**: `feat: <what it is> — vX.Y.Z`, no attribution lines.

If `check:version` fails, it names the place that disagrees. Fix that place; never loosen the guard.
