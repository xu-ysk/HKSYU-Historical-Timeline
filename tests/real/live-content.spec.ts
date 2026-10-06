import { expect, test } from '@playwright/test';
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
  const before = await page.getByTestId('focused-event').textContent();
  const updated = structuredClone(timeline);
  updated.upperRailEvents.find((event) => event.year === 1971)!.title['zh-Hant'] =
    '已自動更新的校史內容';
  current = updated;
  await page.clock.runFor(15000);
  await expect(page.getByTestId('upper-rail-title')).toHaveText('已自動更新的校史內容');
  await expect(page.getByTestId('focused-event')).toHaveText(before!);
  await expect(page.getByTestId('theme-B')).toHaveAttribute('aria-pressed', 'true');
});
