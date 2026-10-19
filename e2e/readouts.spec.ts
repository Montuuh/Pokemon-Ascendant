import { expect, test, type Page } from '@playwright/test';

// The user's pack of 2026-10-19, read off the screen: a wasted hit struck through (§9.2.5), the Not enough AP tag
// (§9.2.3), Battle Hardened's shield on the card (§7.3.7), and the starter step's filter and the partner's own cards
// (screens §3.3b). Screenshots to playtest/readout-*.png.

type Ascendant = {
  hand: (ids: string[]) => void;
  intend: (id: string, all?: boolean) => void;
  setHp: (who: string, hp: number) => void;
  dispatch: (a: unknown) => boolean;
  state: () => { player: { hand: { id: string }[]; ap: number }; enemies: { uid: string }[] } | null;
  run: { new: (s: string, n: number) => void; grantRelic: (...ids: string[]) => void };
  meta: { xp: (n: number) => void; grantHub: (id: string) => void };
  goTo: (s: string) => void;
};
const asc = (page: Page) => page.evaluate.bind(page);

test.describe('What the fight reads out — §9.2.5, §9.2.3, §7.3.7', () => {
  test('a hit on a Lead already knocked out is struck through, after the KO', async ({ page }) => {
    await page.goto('/?scenario=group-wild-flock&seed=7');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await asc(page)(() => {
      const a = (window as unknown as { __ascendant: Ascendant }).__ascendant;
      a.intend('tackle', true);
      a.setHp('lead', 1);
    });
    const lead = page.locator('[data-testid^="portrait-lead-"]');
    await expect(lead.locator('[data-moot]').first()).toBeVisible();
    await expect(lead.getByTestId('incoming')).toContainText('KO');
    await expect(page.getByTestId('intent-dmg-moot').first()).toBeVisible();
    await page.screenshot({ path: 'playtest/readout-moot.png' });
  });

  test('a card that costs more than the AP left says so on its top edge', async ({ page }) => {
    await page.goto('/?scenario=wild-boss-3phase&seed=7');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await asc(page)(() => {
      const a = (window as unknown as { __ascendant: Ascendant }).__ascendant;
      a.hand(['hyper-beam', 'hyper-beam', 'hyper-beam']);
      for (let i = 0; i < 2; i++) a.dispatch({ type: 'play-card', cardId: a.state()!.player.hand[0]!.id, targetUid: a.state()!.enemies[0]!.uid });
    });
    await expect(page.getByTestId('card-no-ap')).toHaveCount(1);
    await expect(page.getByTestId('card-no-ap')).toHaveText('Not enough AP');
  });

  test("Battle Hardened's shield is on every card of yours", async ({ page }) => {
    await page.goto('/?screen=menu');
    await page.waitForFunction(() => !!(window as unknown as { __ascendant?: unknown }).__ascendant);
    await asc(page)(() => {
      const a = (window as unknown as { __ascendant: Ascendant }).__ascendant;
      a.run.new('charmander', 11);
      a.run.grantRelic('battle-hardened');
      a.goTo('map');
    });
    await page.locator('[data-testid^="node-"][data-status="reachable"][data-kind="wild"], [data-testid^="node-"][data-status="reachable"][data-kind="trainer"]').first().click();
    await page.getByTestId('btn-enter-node').click();
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await expect(page.getByTestId('unit-shield').first()).toContainText('Shield');
    await expect(page.getByTestId('hp-shield').first()).toBeAttached();
  });
});

test.describe('The starter step — screens §3.3b', () => {
  test("a long roster narrows by type, and the partner's detail shows the partner's own cards", async ({ page }) => {
    await page.goto('/?screen=starter');
    await page.waitForFunction(() => !!(window as unknown as { __ascendant?: unknown }).__ascendant);
    await asc(page)(() => {
      const a = (window as unknown as { __ascendant: Ascendant }).__ascendant;
      a.meta.xp(60000);
      a.meta.grantHub('twin-run');
      const key = Object.keys(localStorage).find((k) => k.endsWith('account.v1'))!;
      const p = JSON.parse(localStorage.getItem(key)!);
      p.account.starters = ['magikarp', 'eevee', 'pikachu'];
      localStorage.setItem(key, JSON.stringify(p));
    });
    await page.goto('/?screen=starter');
    await page.waitForFunction(() => !!(window as unknown as { __ascendant?: unknown }).__ascendant);
    await page.getByTestId('btn-continue').click();

    // Six starters: the filter is there; Water leaves Squirtle and Magikarp.
    await expect(page.getByTestId('starter-filters')).toBeVisible();
    await page.getByTestId('starter-filter-water').click();
    await expect(page.getByTestId('starter-roster').locator('[data-testid^="starter-"]')).toHaveCount(2);
    await page.getByTestId('starter-filter-all').click();

    // Lead Charmander, partner Squirtle: the detail is Squirtle's, cards and all.
    await page.getByTestId('starter-charmander').click();
    await page.getByTestId('starter-squirtle').click();
    const detail = page.getByTestId('starter-detail');
    await expect(detail).toContainText('Squirtle');
    await expect(detail).not.toContainText('Ember');
    await expect(page.getByTestId('starter-evo-line')).toContainText('Blastoise');
    await page.screenshot({ path: 'playtest/readout-starter.png' });
  });
});

test.describe('A formation never outgrows its stage — §9.2.2.3', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  test('at 720 p, after a few turns of stages and with every foe acting twice and planning ahead, every foe stands inside the stage', async ({ page }) => {
    for (const scenario of ['group-wild-flock', 'group-trainer-pair', 'league-champion']) {
      await page.goto(`/?scenario=${scenario}&seed=7`);
      await expect(page.getByTestId('combat-screen')).toBeVisible();
      for (const crowd of [false, true]) {
        await asc(page)((c) => {
          const a = (window as unknown as { __ascendant: Ascendant & { auto: (n: number) => number; crowd: () => void } }).__ascendant;
          if (c) a.crowd();
          else a.auto(12);
        }, crowd);
        const out = await asc(page)(() => {
          const stage = document.querySelector('[data-fx-stage]')!.getBoundingClientRect();
          return [...document.querySelectorAll('[data-testid="foe-panel"]')]
            .map((el) => el.getBoundingClientRect())
            .filter((b) => b.width > 0 && (b.top < stage.top - 0.5 || b.bottom > stage.bottom + 0.5 || b.left < stage.left || b.right > stage.right)).length;
        });
        expect(out, `${scenario}${crowd ? ' crowded' : ''}`).toBe(0);
        // On the short stage a bench foe's second action and next plan are badges on its chip.
        if (crowd && scenario === 'group-wild-flock') {
          await expect(page.locator('[data-testid="intent-also-badge"]:visible').first()).toBeVisible();
          await expect(page.locator('[data-testid="intent-next-badge"]:visible').first()).toBeVisible();
          await page.screenshot({ path: 'playtest/readout-720-chips.png' });
        }
      }
    }
  });
});

test.describe('Chips on a short stage — §9.2.2.3', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  test('at 720 p a card with many chips shows the first and "+N", whose bubble names the rest', async ({ page }) => {
    await page.goto('/?scenario=wild-boss-3phase&seed=7');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.evaluate(async () => {
      // The dev server serves the store's module: every chip turned on at once, as no fixture opens with.
      const path = '/src/app/combatStore.ts';
      const m = (await import(/* @vite-ignore */ path)) as { useCombatStore: { getState: () => { state: unknown }; setState: (p: { state: unknown }) => void } };
      const d = JSON.parse(JSON.stringify(m.useCombatStore.getState().state)) as { enemies: { stages: Record<string, number> }[] };
      for (const e of d.enemies) Object.assign(e, { stages: { ...e.stages, attack: -2, defense: 1 }, shield: 15, sturdyAvailable: true });
      m.useCombatStore.setState({ state: d });
    });
    const more = page.getByTestId('unit-chips-more').first();
    await expect(more).toBeVisible();
    await expect(more).toHaveText('+3');
    await more.hover();
    await expect(page.getByRole('tooltip')).toContainText('Armour 15');
  });
});
