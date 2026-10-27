#!/usr/bin/env bash
# SessionStart hook — prints the session pointer so every session starts oriented (docs/ai/claude-code-guide.md).
cd "$(dirname "$0")/../.." 2>/dev/null || exit 0
echo "=== Pokémon Ascendant — session start ==="
if [ -f docs/session/active.md ]; then
  cat docs/session/active.md
else
  echo "(docs/session/active.md missing — create it from the template in docs/ai/claude-code-guide.md)"
fi
echo
echo "--- git ---"
git log -1 --oneline 2>/dev/null || echo "(no commits yet)"
git status --short 2>/dev/null | head -15
echo
echo "Verify loop: npm run check · npm run shot → Read playtest/*.png · window.__ascendant.dump()"
exit 0
