import { defineConfig, devices } from '@playwright/test';

// Visual verification harness — see docs/architecture.md §Verification and .claude/skills/playtest.
// `npm run shot` writes PNGs to playtest/ (gitignored) that Claude reads back.
//
// Browser: we run the locally installed Google Chrome (`channel: 'chrome'`) instead of Playwright's bundled
// Chromium — the CDN download timed out on this machine and system Chrome is always present here.
// Override with PW_CHANNEL=chromium once `npx playwright install chromium` succeeds, or PW_CHANNEL=msedge.
const channel = process.env.PW_CHANNEL ?? 'chrome';
// The dev server's port: PW_PORT (Vite reads it too), 5173 by default. e2e/global-setup.ts refuses a server on it that
// is not this game — another project's Vite on :5173 would otherwise be "reused" and measured.
const port = Number(process.env.PW_PORT ?? 5173);

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  outputDir: './playtest/test-results',
  timeout: 30_000,
  retries: 0,
  // Four at a time: at the default (half the cores) the full suite starves the one dev server and the canvas-heavy
  // cases (move windows, item pixels, the route's caption scan) time out, then pass alone — failures that are the
  // machine's, not the game's. Four ran the suite in about 7 minutes with them green. PW_WORKERS overrides.
  workers: Number(process.env.PW_WORKERS ?? 4),
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    // §9.9 — the screens are asserted still: the arena's beats (a Pokémon sent out, fainting, the catch) hold a sprite
    // hidden or the outcome back for a moment, and a test acts at once. `e2e/animations.spec.ts` turns motion on.
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${port}`,
    env: { PW_PORT: String(port) },
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        ...(channel === 'chromium' ? {} : { channel }),
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
