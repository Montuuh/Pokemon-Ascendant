# Release doctrine — a version is a release worth announcing, written down and stamped everywhere

> The user's rule (2026-09-23): **every time a version of the game ships, the changelog says what it added,
> and every place that shows the active version is changed with it.** A version is not shipped until both are
> true. `npm run check:version` (part of `npm run check`) proves the stamping; `changelog.test.ts` proves the
> changelog reads. The `ship-version` skill walks the steps.
>
> **Work ships in packages** (the user's call, 2026-11-11, replacing "commit and push every finished unit" and
> "only big changes are versions"): fewer commits, each one large and focused, each one read like a big update of
> the game. See R0.

## R0 — Work ships in packages

The unit of delivery is a **package**: a themed set of improvements and features planned as one (a feature
package, a polish package, a content package, a text pass), built and verified step by step in the working tree,
and **committed and pushed once, when the whole package is done**.

- **One package, one commit.** Steps inside a package are not committed or pushed on their own; each step still
  passes `npm run check` before the next begins. A package that would take more than a long session is split into
  two packages, each finished and shipped on its own — never into partial commits.
- **A package a player can see ships as a version**: the next patch number, one changelog entry named after the
  package (one lede, 2–4 bullets, R2), and every stamp (R3). That is most packages: a rule, content, art, a screen,
  the game's words.
- **A package nobody plays** (workshop `.claude/`, tooling, tests, docs only) is still one commit and one push,
  with no number, no changelog line and no stamp.
- **Small fixes and polish ride in a package.** They do not get a commit of their own: they join the package in
  progress, or wait for the next one. The only exception is a **hotfix** — a bug that loses a run or a save,
  soft-locks or gives a wrong result — which ships at once as its own patch version.
- **Before the commit, the whole package is verified as one**: `npm run check`, `npm run shot` and the screens it
  touches read, the UI review for anything under `src/ui`/`src/app`, the slop pass for any words the player reads
  (`slop-remover`), then `ship-version`. The commit is `feat: <Package name> — vX.Y.Z` (or `chore: <Package name>`
  for one nobody plays), its body listing the package's parts.
- **The folder is shared** (`docs/session/standing-facts.md`): a package in progress lives uncommitted for longer,
  so stage it by path at the end and read `git diff --cached --stat` before the commit.

The user can still ask for a commit at any point ("súbelo ya"); that request wins over the package.

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

**A version that does ship takes the next patch number** (R0 decides whether one ships at all: a package a player can see). There is no
"unreleased" block: a release-worthy change outside a planned sub-version takes the next patch number and its own
changelog entry, the same day; a package nobody plays takes no number. The numbering stays three parts (npm and
the guard read `X.Y.Z`), so the patch after v0.7.10 is v0.7.11, never v0.7.10.1; a planned sub-version that was
next on the roadmap moves up by one in `docs/roadmap.md` in the same commit.

## R2 — The changelog entry

`CHANGELOG.md` at the repo root, newest first. The game parses it, so the shape is fixed:

```
## v0.7 — Cities & Regions 2–3 · in progress        ← a minor: its date once shipped, "in progress" until then
One line of lede: what the version is for.

### v0.7.3 — Region 2, Coastal Cliffs · 2026-09-23   ← a patch, under its own minor
One line of lede.

- **Headline.** A few technical words: what changed.
```

- **One entry per theme, not per patch** (the user's call, 2026-11-10: "hay demasiadas cosas"). v0.9 had grown to
  109 point entries and read as a commit log. Related point versions are gathered under **one themed entry that
  carries the last version of its group** and that version's date. A release that continues the newest entry's
  theme is **folded into it** — the heading takes the new number and date, the bullets are rewritten to stay within
  four — and only a release that opens a new theme gets a new entry. The roadmap keeps every point version; the
  changelog keeps what the game gained.
- **Beta until v1.0** (the same call). The changelog's title, the What's new screen, the menu's and About's version
  pills and the browser tab say "Beta" while the major is 0 (`APP_STAGE` in `src/content/roadmap.ts`, derived from
  the number). v0.9 stays the working minor until the backend work that precedes v1.0 is done.
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

(For a package that ships as a version, R0. A package nobody plays skips it: `npm run check`, one commit, push.)

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
