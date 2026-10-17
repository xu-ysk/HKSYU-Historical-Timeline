import { expect, test } from './fixtures';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { TimelineDataset } from '../../src/domain/timeline';

const timeline = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../public/timeline.json', import.meta.url)), 'utf8'),
) as TimelineDataset;

test('an open page receives a new workbook publication without navigation', async ({ page }) => {
  let current = structuredClone(timeline);
  await page.route('**/timeline.json', (route) => route.fulfill({ json: current }));
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1971');
  await page.getByTestId('theme-B').click();
  await page.clock.runFor(1500);
  const before = await page.getByTestId('focused-event').textContent();
  const displayedYear = Number(await page.getByTestId('upper-rail-year').textContent());
  const updated = structuredClone(timeline);
  updated.upperRailEvents.find((event) => event.year === displayedYear)!.title['zh-Hant'] =
    '已自動更新的校史內容';
  current = updated;
  await page.clock.fastForward(15000);
  await expect(page.getByTestId('upper-rail-title')).toHaveText('已自動更新的校史內容');
  await expect(page.getByTestId('focused-event')).toHaveText(before!);
  await expect(page.getByTestId('theme-B')).toHaveAttribute('aria-pressed', 'true');
});

test('school photos load and a changed link is applied after leaving detail', async ({ page }) => {
  test.setTimeout(60000);
  let current = structuredClone(timeline);
  await page.route('**/timeline.json', (route) => route.fulfill({ json: current }));
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1971');
  const source = page.locator('.photo-card[data-event-id="P01"]').first();
  const image = source.locator('img');
  await source.focus();
  await source.press('Enter');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const original = await image.getAttribute('src');
  expect(new URL(original!).hostname).toBe('umtimeline.hksyu.edu');
  const updated = structuredClone(timeline);
  updated.revision = 'school-link-updated';
  const event = updated.schoolEvents.find((item) => item.id === 'P01')!;
  event.photos[0].src = event.photos[1].src;
  event.title['zh-Hant'] = '校方照片連結更新演示';
  current = updated;
  // Let the real polling interval elapse while the visitor is reading.
  await page.waitForTimeout(16000);
  await expect(image).toHaveAttribute('src', original!);
  await page.getByTestId('close-detail').click();
  await expect.poll(async () => new URL((await image.getAttribute('src'))!).pathname, { timeout: 20000 })
    .toBe(new URL(event.photos[1].src!).pathname);
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(source).toHaveAttribute('aria-label', /校方照片連結更新演示/);
});
