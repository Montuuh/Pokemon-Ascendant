---
name: session-close
description: >
  Close a finished package of work on Pokémon Ascendant: the whole package verified as one (checks, screens, UI
  review, slop pass), shipped as a version when a player can see it, the derived docs and the session pointer
  updated, only your own files staged in the shared folder, and one commit and one push to main. Use at the end
  of a package, when the user says "commit", "push", "sube", "cierra", "termina", "déjalo listo", or before
  handing the tree to another session.
---

# Close the package — Pokémon Ascendant

Work ships in **packages** (`docs/release-doctrine.md` R0, the user's call 2026-11-11): a themed set of
improvements and features, built step by step, then **one commit and one push** when the whole package is done.
Steps inside a package are not committed on their own. The folder is shared: read
`docs/session/standing-facts.md`, *Working in a shared folder*, once per session.

## 1. Is the package finished

- Every part the package promised is in the tree. A part that is not ready leaves the package (it opens the next
  one); the package is not shipped half-built.
- `npm run check` green in this session, output seen.
- UI touched: `npm run shot` read, the `ui-review` loop run and cleared (`.claude/state/ui-pending.txt` empty or
  a deliberate `ui-skip` with its reason told to the user).
- Words the player reads touched: `node .claude/skills/slop-remover/slop-scan.mjs --changed`, each candidate
  judged with the `slop-remover` skill.
- Verified, implemented and published are three different states. Say which one each claim is.

## 2. Version or not (R0)

A package a player can see — a rule, content, art, a screen, the game's words — ships as a version: run
`ship-version` (the next patch number, one changelog entry named after the package, every stamp). A package
nobody plays (`.claude/`, tooling, tests, docs only) ships as one commit with no number.

## 3. Derived docs

- `docs/design/implementation-status.md`: the rows whose state moved.
- `docs/design/00-codex.md`: only if a topic changed meaningfully.
- `docs/roadmap.md`: the package's "Shipped" paragraph when it is a version; the backlog if an idea was parked.
- `docs/session/active.md`: where we are now, 30 lines at most. Another session may have edited it: re-read it,
  keep their lines, fold the oldest entries away rather than growing it.

## 4. Stage only what is yours

```bash
git status --short
git add <each path the package changed>
git diff --cached --stat
```

A package lives uncommitted for longer, so this step matters more: files in `git status` you never touched belong
to another session — leave them. A file both of you edited is committed with only your hunk (standing-facts has
the `git hash-object` / `git update-index --cacheinfo` recipe). The guard hook refuses `git add -A`, `git add .`,
`git commit -a`, `git stash` and anything that discards the tree, for this reason.

## 5. One commit, one push

The subject names the package; the body lists its parts, one line each, in the player's or the reader's terms.
No attribution lines.

```bash
git commit -F <message file>     # feat: <Package name> — vX.Y.Z   ·   chore: <Package name> (nobody plays it)
git push
```

Never force. A rejected push means someone else pushed: `git pull --rebase`, re-run `npm run check`, push again.
A shared working tree that passes does not prove the committed tree passes: for a version, verify the exact
committed tree (standing-facts, same section) and watch the Pages run with `gh run list --limit 1`.

## 6. Report

In Spanish, shortest first: what the package changed for the player, what was verified and how, what was not,
what is waiting on the user. Mention any design row you changed on your own judgement.
