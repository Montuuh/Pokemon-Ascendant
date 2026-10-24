import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const evidence = 'playtest/art-review-2026-10-24/implementation/B03';
const phase = 'after';
const cases = [
  ['region-1', 'Region 1 · Column 1 / 20'],
  ['region-2', 'Region 2 · Column 1 / 20'],
  ['region-3', 'Region 3 · Column 1 / 20'],
  ['victory-road', 'Victory Road · Column 1 / 5'],
  ['elite-four-1', 'League · Bruno'],
  ['elite-four-2', 'League · Agatha'],
  ['elite-four-3', 'League · Will'],
  ['elite-four-4', 'League · Lance'],
  ['champion', 'League · Champion Blue'],
] as const;

async function loseAt(page: Page, location: string) {
  return page.evaluate((location) => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 11);
    if (location === 'victory-road') a.run.victoryRoad();
    else if (!location.startsWith('region-')) a.run.league();
    a.run.patch((d) => {
      if (location.startsWith('region-')) d.regionIndex = Number(location.at(-1)) - 1;
      const node = Object.values(d.map.nodes).find((n) => location.startsWith('region-')
        ? n.layer === 0 && ['wild', 'trainer'].includes(n.kind)
        : location === 'victory-road' ? n.layer === 0 && ['wild', 'trainer'].includes(n.kind)
          : n.preview.rosterId === location)!;
      d.reachable = [node.id];
    });
    const entered = a.run.dispatch({ type: 'enter-node', nodeId: a.run.state()!.reachable[0]! });
    const began = a.run.dispatch({ type: 'begin-combat' });
    const run = a.run.state()!;
    const ended = a.run.dispatch({ type: 'finish-combat', report: {
      outcome: 'defeat', team: run.activeUids.map((uid) => ({ uid, hp: 0, status: null, fainted: true })),
      caught: null, ballsLeft: 0, turns: 3,
    } });
    a.goTo('defeat');
    const final = a.run.state()!;
    return { entered, began, ended, zone: final.zone ?? 'region', position: final.pendingNodeId ?? final.position, visited: final.visited };
  }, location);
}

async function capture(page: Page, path: string) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.screenshot({ path });
}

// B03 / §2.1.3–§2.1.6 / §9.12.3 — reached identifies the attempted location, not a cleared node.
for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
  for (const scale of [1, 1.5]) {
    test(`Ending_LocationAndRecord_${viewport.width}_${scale} — §9.12.3`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: scale === 1 ? 'reduce' : 'no-preference' });
      await page.goto('/?screen=menu');
      await page.evaluate((s) => {
        window.__ascendant!.meta.reset();
        document.documentElement.style.setProperty('--text-scale', String(s));
      }, scale);
      mkdirSync(evidence, { recursive: true });
      const observations = [];
      for (const [location, expected] of cases) {
        const state = await loseAt(page, location);
        expect(state.entered && state.began && state.ended).toBe(true);
        expect(state.position).toBeTruthy();
        expect(state.visited).not.toContain(state.position);
        const distance = page.getByTestId('run-end-distance');
        const actual = await distance.innerText();
        await expect(distance).toBeInViewport();
        const tag = `${phase}-${viewport.width}-${scale * 100}-${location}`;
        if (['region-3', 'victory-road', 'champion'].includes(location)) await capture(page, `${evidence}/${tag}.png`);
        const door = page.getByTestId('btn-run-record');
        await door.focus();
        await page.keyboard.press('Enter');
        const record = page.getByTestId('run-record');
        await expect(record).toBeVisible();
        const depth = record.locator('dt').filter({ hasText: /^Depth reached$/ }).locator('..').locator('dd');
        await expect(depth).toHaveText(actual);
        await depth.locator('..').evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await expect(depth).toBeInViewport();
        expect(await depth.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        if (['region-3', 'victory-road', 'champion'].includes(location)) await capture(page, `${evidence}/${tag}-record.png`);
        observations.push({ location, expected, actual, ...state });
        writeFileSync(`${evidence}/${phase}-${viewport.width}-${scale * 100}.json`, JSON.stringify(observations, null, 2));
        await expect(depth).toHaveText(expected);
        await page.keyboard.press('Tab');
        expect(await record.evaluate((el) => el.contains(document.activeElement))).toBe(true);
        await page.keyboard.press('Escape');
        await expect(record).toHaveCount(0);
        await expect(door).toBeFocused();
        await door.click();
        await page.getByTestId('btn-close-run-record').click();
        await expect(door).toBeFocused();
      }
      expect(new Set(observations.map((o) => o.actual)).size).toBe(cases.length);
    });
  }
}

test('League_EnteredBattle_RealDefeatKeepsOpponent — §2.1.6 / §9.12.3', async ({ page }) => {
  await page.goto('/?screen=menu');
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 11);
    a.run.league();
    a.run.patch((d) => { d.box[0]!.hp = 1; });
  });
  await page.getByTestId('league-door-0').click();
  await page.getByTestId('btn-enter-node').click();
  await expect(page.getByTestId('combat-screen')).toBeVisible();
  await page.getByTestId('btn-end-turn').click();
  // Both the released overlay and concurrent results screen expose this same player action.
  await page.getByRole('button', { name: 'See how far you got', exact: true }).click();
  await expect(page.getByTestId('defeat-screen')).toBeVisible();
  await capture(page, `${evidence}/${phase}-real-league-defeat.png`);
  const state = await page.evaluate(() => ({ combat: window.__ascendant!.state(), run: window.__ascendant!.run.dump() }));
  writeFileSync(`${evidence}/${phase}-real-league-defeat.json`, JSON.stringify(state, null, 2));
  await expect(page.getByTestId('run-end-distance')).toHaveText('League · Bruno');
});

test('Ending_EntrancesAndChampionVictory_UseHonestLocation — §9.12.3', async ({ page }) => {
  await page.goto('/?screen=menu');
  for (const [zone, label] of [['region', 'Region 1'], ['victory-road', 'Victory Road'], ['league', 'League']]) {
    await page.evaluate((zone) => {
      const a = window.__ascendant!;
      a.run.new('squirtle', 11);
      if (zone === 'league') a.run.league();
      if (zone === 'victory-road') a.run.victoryRoad();
      a.goTo('defeat');
    }, zone);
    await expect(page.getByTestId('run-end-distance')).toHaveText(`${label} · Entrance`);
  }
  // Complete all five doors through the reducer: the won state clears pendingNodeId.
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 11);
    a.run.levelTo(50);
    a.run.league();
    for (let i = 0; i < 5; i++) {
      a.run.dispatch({ type: 'enter-node', nodeId: a.run.state()!.reachable[0]! });
      a.run.dispatch({ type: 'begin-combat' });
      const run = a.run.state()!;
      a.run.dispatch({ type: 'finish-combat', report: {
        outcome: 'victory', team: run.activeUids.map((uid) => ({ uid, hp: 20, status: null, fainted: false })),
        caught: null, ballsLeft: 0, turns: 3,
      } });
      a.run.dispatch({ type: 'claim-reward' });
      for (let guard = 0; guard < 6 && a.run.state()!.phase === 'evolution'; guard++) {
        const e = a.run.state()!.pendingEvolutions[0]!;
        a.run.dispatch({ type: 'choose-branch', uid: e.uid, branchId: e.branchIds[0]! });
      }
    }
    a.goTo('victory');
  });
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.outcome)).toBe('victory');
  await expect(page.getByTestId('run-end-distance')).toHaveText('League · Champion Blue');
  await capture(page, `${evidence}/after-champion-victory.png`);
});
