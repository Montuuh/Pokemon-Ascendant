---
name: session-close
description: >
  Close a finished unit of work on Pokémon Ascendant: the checks green, the UI review queue empty, the derived
  docs and the session pointer updated, only your own files staged in the shared folder, committed and pushed to
  main, with or without a version as the release doctrine decides. Use at the end of a task, when the user says
  "commit", "push", "cierra", "termina", "déjalo listo", or before handing the tree to another session.
---

# Close the unit — Pokémon Ascendant

Committing and pushing every finished unit to `main` is the user's standing instruction. The folder is shared:
read `docs/session/standing-facts.md`, *Working in a shared folder*, once per session.

## 1. Is it finished

- `npm run check` green in this session, output seen.
- UI touched: `npm run shot` read, the `ui-review` loop run and cleared (`.claude/state/ui-pending.txt` empty or
  a deliberate `ui-skip` with its reason told to the user).
- Verified, implemented and published are three different states. Say which one each claim is.

## 2. Version or not (docs/release-doctrine.md, R0)

A design change or large art a player would be told about is a version: run `ship-version`, which owns the
changelog, the bump and the stamps. Anything else is committed and pushed with no number, no changelog line and
no stamp. When unsure, it is not a version.

## 3. Derived docs

- `docs/design/implementation-status.md`: the rows whose state moved.
- `docs/design/00-codex.md`: only if a topic changed meaningfully.
- `docs/roadmap.md`: only if scope moved, or an idea was parked in the backlog.
- `docs/session/active.md`: where we are now, 30 lines at most. Another session may have edited it: re-read it,
  keep their lines, fold the oldest entries away rather than growing it.

## 4. Stage only what is yours

```bash
git status --short
git add <each path you changed>
git diff --cached --stat
```

Files in `git status` you never touched belong to another session: leave them. A file both of you edited is
committed with only your hunk (standing-facts has the `git hash-object` / `git update-index --cacheinfo`
recipe). The guard hook refuses `git add -A`, `git add .`, `git commit -a`, `git stash` and anything that
discards the tree, for this reason.

## 5. Commit and push

Conventional subject in en-GB, the change in the player's or the reader's terms, no attribution lines:
`feat(sim): …` · `feat(ui): …` · `fix(…): …` · `content: …` · `design: …` · `docs: …` · `chore: …`.

```bash
git commit -m "<type(scope)>: <subject>"
git push
```

Never force. A rejected push means someone else pushed: `git pull --rebase`, re-run `npm run check`, push again.
A shared working tree that passes does not prove the committed tree passes: for a release, verify the exact
committed tree (standing-facts, same section) and watch the Pages run with `gh run list --limit 1`.

## 6. Report

In Spanish, shortest first: what changed for the player, what was verified and how, what was not, what is
waiting on the user. Mention any design row you changed on your own judgement.
