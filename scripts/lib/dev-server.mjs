// The dev server the measuring scripts and the e2e talk to, and the check that it is this game's.
//
// Another project's Vite on the same machine can hold :5173 — it did, on 2026-10-27, and a Playwright run that reuses
// "the existing server" then measures someone else's app. The port comes from PW_PORT (default 5173; Vite reads the
// same variable), and nothing measures a server until its page says it is Pokémon Ascendant.
export const devPort = Number(process.env.PW_PORT ?? 5173);
export const devBase = process.env.UI_AUDIT_BASE ?? `http://localhost:${devPort}`;

/** Resolves when `base` serves this game; rejects with what it found otherwise (nothing, or another app's title). */
export async function assertOurServer(base = devBase) {
  let html;
  try {
    const r = await fetch(base);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    html = await r.text();
  } catch (e) {
    throw new Error(`no dev server at ${base} (${e.message}) — start it: npm run dev (PW_PORT=<port> for another port).`);
  }
  if (!/<title>\s*Pokémon Ascendant\s*<\/title>/.test(html)) {
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? 'no title';
    throw new Error(`${base} serves another app ("${title}"), not Pokémon Ascendant — free the port or run with PW_PORT=<free port>.`);
  }
}
