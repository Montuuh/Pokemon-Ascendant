import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// B07 / §9.6 — doors, dialogs and persistent shelf/service choices announce different actions.
const evidence = process.env.B07_EVIDENCE ?? 'playtest/art-review-2026-10-24/implementation/B07/after';
const runtimeErrors = new WeakMap<Page, string[]>();

async function enter(page: Page, destination: 'hub' | 'center' | 'dojo' | 'shop' | 'market', text: number) {
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(({ destination, text }) => {
    document.documentElement.style.setProperty('--text-scale', String(text / 100));
    const a = window.__ascendant!;
    if (destination === 'hub') return a.goTo('hub');
    a.run.new('squirtle', 7);
    a.run.fill(5);
    a.run.city(destination === 'market' ? 1 : 0);
    a.run.pay(3000);
    if (destination === 'market') {
      a.run.dispatch({ type: 'enter-building', building: 'game-corner' });
      a.run.dispatch({ type: 'push-switch' });
      a.run.dispatch({ type: 'enter-black-market' });
    }
  }, { destination, text });
  if (destination !== 'hub' && destination !== 'market') await page.getByTestId(`door-${destination === 'shop' ? 'mart' : destination}`).click();
  if (destination === 'center') await expect(page.getByTestId('center-counters')).toHaveAttribute('data-ready', 'true');
}

async function capture(page: Page, name: string) {
  mkdirSync(evidence, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  });
  await page.screenshot({ path: `${evidence}/${name}.png` });
  writeFileSync(`${evidence}/${name}.aria.txt`, await page.locator('body').ariaSnapshot());
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight)).toBe(false);
}

/** Compound furniture keeps one accessible button and one Tab stop per named action. */
async function pieces(page: Page, room: Locator) {
  const primary = room.locator('button:not([aria-hidden="true"])');
  const secondary = room.locator('button[aria-hidden="true"]');
  for (const button of await secondary.all()) await expect(button).toHaveAttribute('tabindex', '-1');
  const count = await primary.count();
  await primary.first().focus();
  for (let i = 0; i < count; i++) {
    await expect(primary.nth(i)).toBeFocused();
    await expect(primary.nth(i)).toHaveAccessibleName(/\S/);
    if (i < count - 1) await page.keyboard.press('Tab');
  }
}

for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
  for (const text of [100, 150]) {
    test.describe(`Room semantics ${viewport.width} ${text}% — §9.6 / D8`, () => {
      test.use({ viewport, reducedMotion: text === 100 ? 'reduce' : 'no-preference' });
      test.beforeEach(async ({ page }) => {
        const errors: string[] = [];
        runtimeErrors.set(page, errors);
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {
          if (message.type() !== 'error') return;
          // The existing site has no favicon.ico. Keep this unrelated 404 in evidence, not a B07 gate.
          if (new URL(message.location().url || page.url()).pathname === '/favicon.ico') {
            mkdirSync(evidence, { recursive: true });
            writeFileSync(`${evidence}/known-favicon-404.txt`, `${message.text()} (${message.location().url})\n`);
            return;
          }
          errors.push(`${message.text()} (${message.location().url})`);
        });
      });
      test.afterEach(async ({ page }) => { expect(runtimeErrors.get(page)).toEqual([]); });
      const suffix = `${viewport.width}-${text}`;

      test('Hub_NavigationButtons_OpenScreensAndReturnFocus', async ({ page }) => {
        await enter(page, 'hub', text);
        const room = page.getByTestId('hub-lobby');
        await expect(room.locator('[aria-pressed], [aria-haspopup], [aria-expanded]')).toHaveCount(0);
        await pieces(page, room);
        await page.getByTestId('kiosk-pc').focus();
        await expect(room.locator('[data-shape="pc"]')).toHaveAttribute('data-state', 'near');
        await capture(page, `hub-focus-${suffix}`);
        for (const id of ['pc', 'card', 'mart', 'guide']) {
          const door = page.getByTestId(`kiosk-${id}`);
          await door.focus();
          await door.press(id === 'pc' ? 'Enter' : 'Space');
          await expect(page.getByTestId(`hub-panel-${id}`)).toBeVisible();
          await expect(page.getByTestId('btn-hub-lobby')).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(door).toBeFocused();
        }
        await page.getByTestId('kiosk-run').click();
        await expect(page.getByTestId('starter-select')).toBeVisible();
      });

      test('Center_ServiceDoors_AnnounceDialogsAndRestoreFocus', async ({ page }) => {
        await enter(page, 'center', text);
        const room = page.getByTestId('center-lobby');
        await expect(room.locator('[aria-pressed]')).toHaveCount(0);
        await pieces(page, room);
        await capture(page, `center-${suffix}`);
        for (const id of ['pc', 'daycare', 'therapy']) {
          const door = page.getByTestId(`door-center-${id}`);
          await expect(door).toHaveAttribute('aria-haspopup', 'dialog');
          await expect(door).toHaveAttribute('aria-expanded', 'false');
          await door.focus();
          await door.press(id === 'daycare' ? 'Space' : 'Enter');
          await expect(door).toHaveAttribute('aria-expanded', 'true');
          await expect(page.getByRole('dialog', { name: id === 'pc' ? /^PC Box/ : id === 'daycare' ? /^Daycare/ : /^Therapy/ })).toBeVisible();
          await expect(page.getByTestId('center-service-back')).toBeFocused();
          if (id === 'pc') await capture(page, `center-pc-${suffix}`);
          await page.keyboard.press('Escape');
          await expect(page.getByRole('dialog')).toHaveCount(0);
          await expect(door).toHaveAttribute('aria-expanded', 'false');
          await expect(door).toBeFocused();
        }
      });

      test('Market_CounterDoors_AnnounceDialogsForEveryPiece', async ({ page }) => {
        await enter(page, 'market', text);
        const room = page.getByTestId('black-market-room');
        await expect(room.locator('[aria-pressed]')).toHaveCount(0);
        await pieces(page, room);
        await capture(page, `market-${suffix}`);
        for (const id of ['trader', 'fence', 'gambler', 'showcase']) {
          const door = page.getByTestId(`market-${id}`);
          await expect(door).toHaveAttribute('aria-haspopup', 'dialog');
          await expect(door).toHaveAttribute('aria-expanded', 'false');
          // The second rectangle is pointer-only but must open the same service.
          if (id === 'fence') await room.locator('button[aria-hidden="true"]').nth(1).click();
          else { await door.focus(); await door.press('Enter'); }
          await expect(door).toHaveAttribute('aria-expanded', 'true');
          await expect(page.getByTestId('market-counter')).toHaveAttribute('role', 'dialog');
          await expect(page.getByTestId('btn-close-market-counter')).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(door).toHaveAttribute('aria-expanded', 'false');
          await expect(door).toBeFocused();
        }
      });

      test('Shop_ShelfChoices_RetainPersistentPressedState', async ({ page }) => {
        await enter(page, 'shop', text);
        const room = page.getByTestId('shop-room');
        await pieces(page, room);
        await expect(room.locator('[aria-haspopup], [aria-expanded]')).toHaveCount(0);
        for (const door of await room.locator('button[data-testid^="shelf-"]').all()) {
          await door.focus(); await door.press('Space');
          await expect(door).toHaveAttribute('aria-pressed', 'true');
          await expect(room.getByRole('button', { pressed: true })).toHaveCount(1);
        }
        await capture(page, `shop-${suffix}`);
      });

      test('Dojo_ServiceChoices_RetainPersistentPressedState', async ({ page }) => {
        await enter(page, 'dojo', text);
        const room = page.getByTestId('dojo-room');
        await pieces(page, room);
        for (const id of ['master', 'scrolls', 'apprentice']) {
          const door = page.getByTestId(`dojo-${id}`);
          await expect(door).not.toHaveAttribute('aria-haspopup');
          await door.focus(); await door.press('Enter');
          await expect(door).toHaveAttribute('aria-pressed', 'true');
          await expect(room.getByRole('button', { pressed: true })).toHaveCount(1);
        }
        await capture(page, `dojo-${suffix}`);
      });
    });
  }
}
