# Release doctrine — every version, written down and stamped everywhere

> The user's rule (2026-09-23): **every time a version of the game ships, the changelog says what it added,
> and every place that shows the active version is changed with it.** A version is not shipped until both are
> true. `npm run check:version` (part of `npm run check`) proves the stamping; `changelog.test.ts` proves the
> changelog reads. The `ship-version` skill walks the steps.

## R1 — What a version is

Versions are numbered `major.minor.patch`, and the number alone says how big the version is:

| Level | Number | What it is | On the What's new screen |
|---|---|---|---|
| **Major** | `v1.0`, `v2.0` | A release: the game's shape changes (v1.0 is the first public build) | The loudest: a gold banner, the biggest number |
| **Minor** | `v0.7`, `v1.1` | A row of the roadmap's summary table | A banner with a big number, its patches under it |
| **Patch** | `v0.7.3` | A roadmap sub-version, or a fix that could not wait | A small card under its minor |

`package.json` holds the number as `X.Y.Z` (`0.6.0` is the roadmap's `v0.6`). The size on screen is derived
from the number (`levelOf` in `src/content/changelog.ts`) and never styled by hand, so the order of importance
cannot drift from the numbering.

**Every change ships as a version** (the user's call, 2026-09-29). There is no "unreleased" block: work that
reaches `main` outside a planned sub-version — a round of polish, a fix — takes the **next patch number** and its
own changelog entry, the same day. The numbering stays three parts (npm and the guard read `X.Y.Z`), so the
patch after v0.7.10 is v0.7.11, never v0.7.10.1; a planned sub-version that was next on the roadmap moves up by
one in `docs/roadmap.md` in the same commit.

## R2 — The changelog entry

`CHANGELOG.md` at the repo root, newest first. The game parses it, so the shape is fixed:

```
## v0.7 — Cities & Regions 2–3 · in progress        ← a minor: its date once shipped, "in progress" until then
One line of lede: what the version is for.

### v0.7.3 — Region 2, Coastal Cliffs · 2026-09-23   ← a patch, under its own minor
One line of lede.

- **Headline.** A few technical words: what changed.
```

- **Brief** (the user's call, 2026-09-29): the most important things only, no explanation and no lore. **2–4
  bullets** for a patch, **4–6** for a minor. The headline is a noun phrase; the sentence after it is a few words,
  **under ~60 characters**. The lede is one short line. How and why a thing works belongs in the game's own
  tooltips and guides, and in the roadmap's "Shipped" paragraph.
- **Technical, not roleplay** (the user's call, 2026-09-29). Name what changed in the build plainly — the system,
  the content, the art's source, the number: "Original FRLG maps imported", "Roulette: red/black ×2, green ×36" —
  never flavour ("the shops are the rooms FireRed drew", "watch the ball"). Leave out what a player finds without
  being told (that a button opens its panel). English, present tense; no § numbers, file names, test counts or internal names.
- **Fixes count** when a player could have met the bug: "Readable map captions", not "fix(ui): D5".
- **A secret stays one.** An entry may hint at a hidden place; it never says where it is or how it opens.
- A minor still being built carries only its lede; its patches carry the bullets. When the minor ships, its
  heading takes the date and gains the bullets that sum up the whole version.

## R3 — Where the active version is stamped

| Place | What reads it | Changed how |
|---|---|---|
| `package.json` `"version"` | the main menu pill, the About pill, the What's new screen (`__APP_VERSION__`) | `npm version X.Y.Z --no-git-tag-version` |
| `package-lock.json` (two fields) | npm | the same command |
| `CHANGELOG.md` | the What's new screen | the new entry (R2) |
| `docs/roadmap.md` | the About screen's timeline (a minor's table row); the reader (a patch's heading) | `✅ YYYY-MM-DD` on the row or heading, and its "Shipped" paragraph |
| `README.md` Status line | GitHub visitors | rewritten: `**vX.Y.Z — Name.**` and what the version adds |
| `docs/session/active.md` | the next session | the header names the version shipped and the next goal |

The game has no other hard-coded version string, and must not grow one: a screen that shows a version reads
`APP_VERSION` (`src/content/roadmap.ts`), the roadmap or the changelog. A new place that shows the version is
added to this table and to `scripts/check-version.mjs` in the same change.

## R4 — The ritual

1. Write the new entry, newest first, with today's date (R2). A minor that finishes takes its date and a summary.
2. `npm version X.Y.Z --no-git-tag-version`.
3. Mark the roadmap (`✅ date`) and write its "Shipped" paragraph.
4. Rewrite the README's Status line and the header of `docs/session/active.md`.
5. `npm run check` — `check:version` must say every place agrees. Then commit (`feat: … — vX.Y.Z`) and push.

## R5 — What the guard proves

`scripts/check-version.mjs` fails `npm run check` when: the lockfile and `package.json` disagree; the newest
dated changelog entry is not the `package.json` version; the roadmap does not mark that version ✅ on the
changelog's date; the README's Status line or the session header does not name it. `changelog.test.ts` adds:
entries are in order, every patch sits under its own minor, every shipped entry has bullets, and every minor
matches its roadmap row's date.
