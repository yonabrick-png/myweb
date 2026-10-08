import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('screenshots', { recursive: true });

const settle = (page: Page, ms = 700) => page.waitForTimeout(ms);
const worldReady = async (page: Page) => {
  await page.waitForSelector('html[data-world="ready"]', { timeout: 30_000 });
  await settle(page, 300);
};

/**
 * Jump to a scroll position. Headless frames on the CPU renderer can outlast anime.js's scroll wake
 * window, so fire `scrollend` as a real scroll would; src/scroll-settle.ts then runs the observers.
 */
async function jump(page: Page, top: number) {
  await page.evaluate((top) => {
    window.scrollTo({ top, behavior: 'instant' });
  }, top);
  await settle(page, 250);
  await page.evaluate(() => window.dispatchEvent(new Event('scrollend')));
  await settle(page, 900);
}

const fraction = (page: Page, f: number) =>
  page.evaluate((f) => (document.documentElement.scrollHeight - innerHeight) * f, f).then((y) => jump(page, y));

test('3D mode: screenshots at 0/25/50/75/100% of the page', async ({ page }, info) => {
  await page.goto('/?quality=high');
  await expect(page.locator('html')).toHaveClass(/mode-scroll/);
  await worldReady(page);
  for (const pct of [0, 25, 50, 75, 100]) {
    await fraction(page, pct / 100);
    await page.screenshot({ path: `screenshots/${info.project.name}-page-${pct}.png` });
  }
});

test('3D mode: each bubble shows on its range, inside the viewport', async ({ page }, info) => {
  await page.goto('/?quality=high');
  await worldReady(page);
  const ids = await page.locator('.bubble').evaluateAll((els) => els.map((e) => e.id));
  for (const id of ids) {
    // Centre the viewport on the middle of the bubble's range.
    const y = await page.evaluate((id) => {
      const el = document.getElementById(id)!;
      const section = el.closest('.chapter') as HTMLElement;
      const mid = (Number(el.dataset.from) + Number(el.dataset.to)) / 2;
      return section.getBoundingClientRect().top + scrollY + (mid * innerHeight) / 100 - innerHeight / 2;
    }, id);
    await jump(page, y);
    const floating = await page.evaluate(() => document.documentElement.classList.contains('bubbles-float'));
    if (floating) {
      await expect(page.locator(`#${id}`)).toHaveClass(/is-active/);
      const box = await page.locator(`#${id} .bubble__plate`).boundingBox();
      const vp = page.viewportSize()!;
      expect(box, `${id} has a box`).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height);
      const visible = await page.locator('.bubble.is-active').count();
      expect(visible).toBeLessThanOrEqual(info.project.name === 'phone' ? 1 : 2);
    }
    await page.screenshot({ path: `screenshots/${info.project.name}-bubble-${id}.png` });
  }
});

test('no JavaScript: the page reads as a document', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText(/Yona/i);
  await expect(page.locator('#scene')).toBeHidden();
  expect(await page.getByRole('note').count()).toBe(5);
  expect(await page.locator('.pr').count()).toBe(4);
  await expect(page.locator('#pace-route')).toBeVisible();
  expect(await page.locator('.pace .split').count()).toBe(5);
  expect(await page.locator('.project a').count()).toBe(4);
  await expect(page.locator('.bike')).toBeVisible();
  await expect(page.locator('.hobby__name')).toHaveText('Merida Scultura Juliet 4000');
  await expect(page.locator('a.teaser')).toHaveAttribute('href', 'library.html');
  await expect(page.locator('.sources__list li').first()).toBeVisible();
  await page.screenshot({ path: 'screenshots/no-js.png', fullPage: true });
  await ctx.close();
});

test('reduced motion: poster frame, inline bubbles, no floating', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/mode-poster/);
  await expect(page.locator('html')).not.toHaveClass(/bubbles-float/);
  await expect(page.getByRole('note').first()).toBeVisible();
  await worldReady(page);
  await page.screenshot({ path: 'screenshots/reduced-motion.png' });
  await ctx.close();
});

test('text mode link swaps to the plain document', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Read the page as text' }).click();
  await expect(page.locator('html')).not.toHaveClass(/mode-3d/);
  await expect(page.getByRole('link', { name: 'Run the page in 3D' })).toBeVisible();
});

test('performance budget', async ({ page }, info) => {
  let bytes = 0;
  page.on('response', async (res) => {
    const len = Number(res.headers()['content-length'] ?? 0);
    bytes += len || (await res.body().catch(() => Buffer.alloc(0))).length;
  });
  await page.goto('/?quality=high');
  const fcpHandle = await page.waitForFunction(
    () => performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')?.startTime,
    undefined,
    { timeout: 10_000 },
  );
  const fcp = (await fcpHandle.jsonValue()) as number;
  await worldReady(page);
  console.log(`[${info.project.name}] transfer ${(bytes / 1024).toFixed(0)} KB, FCP ${fcp.toFixed(0)} ms`);
  expect(bytes).toBeLessThan(3 * 1024 * 1024);
  expect(fcp).toBeLessThan(1500);
});

test('PRs: times settle on their true values', async ({ page }) => {
  await page.goto('/?quality=high');
  await worldReady(page);
  const expected = await page.locator('.pr__time time').evaluateAll((els) => els.map((e) => e.textContent?.trim()));
  await page.evaluate(() => document.querySelector('.prs')!.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.dispatchEvent(new Event('scrollend')));
  await settle(page, 3500);
  const shown = await page.locator('.pr__time time').evaluateAll((els) => els.map((e) => e.textContent?.trim()));
  expect(shown).toEqual(expected);
  await expect(page.locator('.pr').first()).toHaveCSS('opacity', '1');
});

test('race: the pace line draws and the clock reaches the finish', async ({ page }, info) => {
  await page.goto('/?quality=high');
  await worldReady(page);
  await expect(page.locator('html')).toHaveClass(/race-live/);
  const at = (f: number) =>
    page.evaluate((f) => {
      const t = document.querySelector('.race__track') as HTMLElement;
      return t.getBoundingClientRect().top + scrollY + (t.offsetHeight - innerHeight) * f;
    }, f);
  await jump(page, await at(0.5));
  await settle(page, 800);
  await expect(page.locator('#ro-km')).not.toHaveText('0.0');
  await page.screenshot({ path: `screenshots/${info.project.name}-race-mid.png` });
  await jump(page, (await at(1)) + 2);
  await settle(page, 800);
  await expect(page.locator('#ro-km')).toHaveText('5.0');
  const sum = Number(await page.locator('.pace').getAttribute('data-total'));
  const clock = `${Math.floor(sum / 60)}:${String(sum % 60).padStart(2, '0')}`;
  await expect(page.locator('#ro-clock')).toHaveText(clock);
  expect(await page.locator('.pace .split.is-passed').count()).toBe(5);
});

test('hobbies: the bike draws in as it scrolls into view', async ({ page }) => {
  await page.goto('/?quality=high');
  await worldReady(page);
  await expect(page.locator('html')).toHaveClass(/bike-live/);
  const centre = await page.evaluate(() => {
    const r = document.querySelector('.bike')!.getBoundingClientRect();
    return r.top + scrollY - (innerHeight - r.height) / 2;
  });
  await jump(page, centre + 40);
  // Fully drawn: every stroke's dash offset has run out.
  const undrawn = await page.locator('.bike line, .bike path, .bike circle').evaluateAll((els) =>
    els.filter((e) => e.getAttribute('draw') && e.getAttribute('draw') !== '0 1').length,
  );
  expect(undrawn).toBe(0);
});

test('library page, no JavaScript: cards, rarity scale and photos read as a document', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/library.html');
  await expect(page.locator('h1')).toHaveText('Library');
  expect(await page.locator('.legend li').count()).toBe(5);
  const card = page.locator('#car-lamborghini-centenario .card');
  await expect(card).toHaveAttribute('data-rarity', 'legendary');
  await expect(card.locator('.card__name')).toContainText('Centenario');
  await expect(card.locator('.card__rarity')).toHaveText(/Legendary/);
  expect((await card.locator('img').getAttribute('alt'))!.length).toBeGreaterThan(20);
  // Rarity follows the number built (4 Veneno coupés: Legendary); an icon moves up two tiers
  // (1,315 F40s is Uncommon, so the F40 is Epic).
  await expect(page.locator('#car-lamborghini-veneno .card')).toHaveAttribute('data-rarity', 'legendary');
  await expect(page.locator('#car-ferrari-f40 .card')).toHaveAttribute('data-rarity', 'epic');
  await expect(page.locator('#car-ferrari-f40 .card__icon')).toHaveText('Icon');
  for (const alt of await page.locator('.card img').evaluateAll((els) => els.map((e) => e.getAttribute('alt') ?? '')))
    expect(alt.length).toBeGreaterThan(20);
  await expect(page.locator('.sources__list li').first()).toBeVisible();
  await page.screenshot({ path: 'screenshots/library-no-js.png', fullPage: true });
  await ctx.close();
});

test('library page: cards deal in and numbers settle on their true values', async ({ page }, info) => {
  await page.goto('/library.html');
  // The true value is in the label; the visible text may already be mid-scramble.
  const expected = await page.locator('.card__power').first().getAttribute('aria-label');
  await page.locator('.card').first().scrollIntoViewIfNeeded();
  await settle(page, 2500);
  await expect(page.locator('.card__power').first()).toHaveText(expected!);
  await expect(page.locator('.car').first()).toHaveCSS('opacity', '1');
  await page.screenshot({ path: `screenshots/${info.project.name}-library.png` });
});
