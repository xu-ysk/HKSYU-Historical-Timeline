import { test, expect } from '../e2e/fixtures';
import type { TimelineDataset } from '../../src/domain/timeline';

test('a text-only school event opens as a centered, readable card and returns', async ({
  page,
}) => {
  await page.goto('/');
  const timeline = (await (await page.request.get('/timeline.json')).json()) as TimelineDataset;
  const event = timeline.schoolEvents.find((item) => item.id === 'P44')!;
  await page.getByTestId('year-slider').fill(String(event.year));
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  const source = page.locator('.photo-card[data-event-id="P44"]');
  await expect(source).toBeVisible();
  await expect(source.locator('.photo-placeholder-year')).toHaveText(String(event.year));
  await expect(source.locator('.photo-placeholder-body')).toHaveText(event.body['zh-Hant']!);
  expect(await source.locator('.photo-letter').count()).toBe(0);
  const originalStyle = await source.getAttribute('style');

  await source.focus();
  await source.press('Enter');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-placeholder-only', 'true');
  await expect(source).toHaveAttribute('data-extracted', 'true');
  const box = (await source.boundingBox())!;
  expect(box.width).toBeGreaterThan(500);
  expect(box.height).toBeGreaterThan(400);
  expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(1);
  expect(Math.abs(box.y + box.height / 2 - 450)).toBeLessThan(1);
  const body = source.locator('.photo-placeholder-body');
  await expect(body).toHaveText(event.body['zh-Hant']!);
  expect(await body.evaluate((element) => getComputedStyle(element).webkitLineClamp)).toBe('none');

  await page.getByTestId('close-detail').click();
  await expect(page.getByTestId('event-detail')).toHaveCount(0);
  await expect(source).toHaveAttribute('data-extracted', 'false');
  await expect(source).toHaveAttribute('style', originalStyle!);

  await page.getByTestId('language-en').click();
  await expect(source.locator('.photo-placeholder-body')).toHaveText(event.body.en!);
});
