import { defineConfig, devices } from '@playwright/test';

// Visual verification harness — see docs/architecture.md §Verification and .claude/skills/playtest.
// `npm run shot` writes PNGs to playtest/ (gitignored) that Claude reads back.
//
// Browser: we run the locally installed Google Chrome (`channel: 'chrome'`) instead of Playwright's bundled
// Chromium — the CDN download timed out on this machine and system Chrome is always present here.
// Override with PW_CHANNEL=chromium once `npx playwright install chromium` succeeds, or PW_CHANNEL=msedge.
const channel = process.env.PW_CHANNEL ?? 'chrome';

export default defineConfig({
  testDir: './e2e',
  outputDir: './playtest/test-results',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
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
