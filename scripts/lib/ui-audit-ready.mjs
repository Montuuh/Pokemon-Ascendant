/** A19 — a screenshot is evidence only after its declared screen and assets are ready. */
export async function auditReady(page, screen, timeout = 15_000) {
  if (!screen.root) throw new Error('Audit preset has no expected root.');
  const root = page.getByTestId(screen.root);
  await root.waitFor({ state: 'visible', timeout });
  if (screen.rootAttributes) await page.waitForFunction(({ id, attrs }) => {
    const node = document.querySelector(`[data-testid="${id}"]`);
    return node && Object.entries(attrs).every(([key, value]) => node.getAttribute(key) === value);
  }, { id: screen.root, attrs: screen.rootAttributes }, { timeout });
  if (screen.ready && screen.ready !== screen.root) await page.getByTestId(screen.ready).waitFor({ state: 'visible', timeout });
  if (screen.root === 'map-screen') await page.waitForFunction(() => document.querySelector('[data-testid="route-board"]')?.getAttribute('data-painted') === 'true', null, { timeout });
  try {
    await page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.images].every((image) => image.complete && image.naturalWidth > 0), null, { timeout });
    await page.evaluate(async () => {
      await Promise.all([...document.images].map(async (image) => {
        const source = image.currentSrc || image.src;
        try { await image.decode(); }
        catch (error) {
          // Only a genuinely replaced/detached image explains an aborted decode; corruption still fails.
          if (!image.isConnected) return;
          if ((image.currentSrc || image.src) === source) throw error;
          await image.decode();
        }
      }));
    });
  } catch (error) {
    const pending = await page.evaluate(() => [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).slice(0, 8).map((image) => image.getAttribute('src')));
    throw new Error(`Assets not ready for ${screen.root}: ${pending.join(', ') || error.message}`);
  }
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  await root.waitFor({ state: 'visible', timeout });
}

export async function auditObserved(page) {
  return page.evaluate(() => ({
    roots: [...document.querySelectorAll('main[data-testid], [role="dialog"][data-testid]')].filter((node) => {
      const r = node.getBoundingClientRect();
      const s = getComputedStyle(node);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    }).map((node) => node.getAttribute('data-testid')),
    phase: window.__ascendant?.run?.state()?.phase ?? null,
    outcome: window.__ascendant?.run?.state()?.outcome ?? null,
  }));
}

/** Hover an actual exposed part of the node; overlapping captions can cover its geometric centre. */
export async function auditHover(page, selector, timeout = 15_000) {
  const target = page.locator(selector).first();
  await target.waitFor({ state: 'visible', timeout });
  await target.scrollIntoViewIfNeeded();
  const point = await target.evaluate((node) => {
    const r = node.getBoundingClientRect();
    for (const fy of [0.5, 0.8, 0.2, 0.95, 0.05]) for (const fx of [0.5, 0.25, 0.75, 0.05, 0.95]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      const hit = document.elementFromPoint(x, y);
      if (x >= 0 && y >= 0 && x < innerWidth && y < innerHeight && hit && (hit === node || node.contains(hit))) return { x, y };
    }
    return null;
  });
  if (!point) throw new Error(`Hover target has no exposed pointer area: ${selector}`);
  await page.mouse.move(point.x, point.y);
  await page.waitForFunction((selector) => document.querySelector(selector)?.matches(':hover'), selector, { timeout });
  await page.getByTestId('node-hover').waitFor({ state: 'visible', timeout });
}
