#!/usr/bin/env bash
# SessionStart hook — prints the session pointer so every session starts oriented (.claude/README.md).
cd "$(dirname "$0")/../.." 2>/dev/null || exit 0
echo "=== Pokémon Ascendant — session start ==="
if [ -f docs/session/active.md ]; then
  cat docs/session/active.md
  lines=$(wc -l < docs/session/active.md)
  [ "$lines" -gt 30 ] && echo "(active.md is $lines lines; the limit is 30 — fold the oldest entries away)"
else
  echo "(docs/session/active.md missing — recreate it: date, version, what shipped last, what is waiting on the user)"
fi
echo
echo "--- git ---"
git log -1 --oneline 2>/dev/null || echo "(no commits yet)"
git status --short 2>/dev/null | head -15
if [ -s .claude/state/ui-pending.txt ]; then
  echo
  echo "--- UI review queue: $(grep -c . .claude/state/ui-pending.txt) file(s) pending (skill: ui-review) ---"
fi
echo
echo "Verify loop: npm run check · npm run shot → Read playtest/*.png · window.__ascendant.dump()"
echo "Workshop map (skills, agents, hooks, MCP): .claude/README.md"
exit 0
