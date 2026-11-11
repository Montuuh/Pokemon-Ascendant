import { expect, test, type Page } from '@playwright/test';

// v0.9.88 — §2.7.3 the Gym guest exception: a Gym's preview and its lane telegraph name its one off-type member,
// its types and its job, and the Team screen's matchup against that Gym names the guest too. Seeds are swept in the
// page and the first whose first Gym node ends at the wanted Leader is used, so the board is pinned.

async function standAtGym(page: Page, gymId: string): Promise<{ id: string; seed: number }> {
  await page.goto('/?screen=menu&seed=7');
  await page.waitForFunction(() => !!window.__ascendant);
  const at = await page.evaluate((want) => {
    const d = window.__ascendant!;
    for (let seed = 1; seed <= 80; seed++) {
      d.run.new('squirtle', seed);
      const r = d.run.state()!;
      const gym = Object.values(r.map.nodes).find((n) => n.kind === 'gym')!;
      if (r.map.gyms[gym.lane!] === want) {
        d.run.jump('gym');
        d.goTo('map');
        return { id: gym.id, seed };
      }
    }
    return null;
  }, gymId);
  expect(at, `a seed whose first Gym node is ${gymId}`).not.toBeNull();
  return at!;
}

/** Every picture inside `selector` has loaded, so a screenshot shows what a player sees. */
async function imagesLoaded(page: Page, selector: string) {
  await page.waitForFunction((sel) => [...document.querySelectorAll(`${sel} img`)].every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0), selector);
}

const cases = [
  { gym: 'rock-gym-r1', guest: 'Sandshrew', job: 'Sand control', size: { width: 1920, height: 1080 } },
  { gym: 'rock-gym-r1', guest: 'Sandshrew', job: 'Sand control', size: { width: 1280, height: 720 } },
  // Two types on the pill: the widest guest Region 1 has.
  { gym: 'bug-gym-r1', guest: 'Oddish', job: 'Garden spores', size: { width: 1280, height: 720 } },
];

for (const c of cases) {
  test(`${c.guest} is named on the Gym preview before the fork — §2.7.3 @${c.size.width}`, async ({ page }) => {
    await page.setViewportSize(c.size);
    const { id } = await standAtGym(page, c.gym);
    await page.getByTestId(`node-${id}`).click();
    const card = page.getByTestId('node-preview');
    const guest = page.getByTestId('preview-guest');
    await expect(guest).toContainText(`Guest: ${c.guest}`);
    // Named once: the telegraph above it does not repeat the guest.
    await expect(card.getByText(/Guest:/)).toHaveCount(1);
    // The other four stay Poké Balls: five in all, no other name.
    await expect(page.getByTestId('preview-team-size').locator('li')).toHaveCount(5);
    const box = await card.boundingBox();
    const chip = await guest.boundingBox();
    expect(chip!.x + chip!.width).toBeLessThanOrEqual(box!.x + box!.width);
    expect(chip!.y + chip!.height).toBeLessThanOrEqual(box!.y + box!.height);
    await guest.hover();
    const tip = page.getByRole('tooltip');
    await expect(tip).toContainText(c.job);
    await expect(tip).toContainText('The other 4');
    // The bubble sits beside the pill, leaving the Poké Balls it describes in view.
    const balls = await page.getByTestId('preview-team-size').boundingBox();
    const bubble = await tip.boundingBox();
    const overlaps = bubble!.x < balls!.x + balls!.width && bubble!.x + bubble!.width > balls!.x && bubble!.y < balls!.y + balls!.height && bubble!.y + bubble!.height > balls!.y;
    expect(overlaps, 'the guest bubble covers the Poké Balls').toBe(false);
    await imagesLoaded(page, '[data-testid="node-preview"]');
    await page.screenshot({ path: `playtest/gym-guest-preview-${c.guest.toLowerCase()}-${c.size.width}.png` });
  });
}

test("the fork banner's telegraph names the guest — §2.7.3", async ({ page }) => {
  await standAtGym(page, 'rock-gym-r1');
  await page.locator('[data-testid="fork-banner"] [data-type="rock"]').hover();
  await expect(page.getByRole('tooltip')).toContainText('Guest: Sandshrew (Ground)');
});

test("the Team screen's matchup names the Gym's guest — §2.7.3", async ({ page }) => {
  await standAtGym(page, 'rock-gym-r1');
  await page.keyboard.press('t');
  const row = page.getByLabel('Against the Gyms ahead');
  await expect(row).toBeVisible();
  // Brock's chip carries the guest's two lines; the other lane's Gym has none.
  const chips = row.locator('[data-good], [data-bad], span').filter({ has: page.locator('img') });
  for (let i = 0; i < (await chips.count()); i++) {
    await chips.nth(i).hover();
    const tip = page.getByRole('tooltip');
    if ((await tip.textContent())?.includes('Brock')) {
      await expect(tip).toContainText('vs Sandshrew ×');
      await expect(tip).toContainText('Ground on it ×');
      await imagesLoaded(page, '[data-testid="team-screen"]');
      await page.screenshot({ path: 'playtest/gym-guest-team.png' });
      return;
    }
  }
  throw new Error("no matchup chip named Brock's Gym");
});
