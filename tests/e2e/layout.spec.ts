import { test, expect } from './fixtures';
import { createMockTimeline } from '../../src/data/mockTimeline';
import { toCards } from '../../src/domain/normalizeTimeline';
for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
])
  test('overview layout ' + size.width, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-28T12:00:00Z'));
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.locator('.photo-card')).toHaveCount(toCards(createMockTimeline(2026)).length);
    const education = await page.getByTestId('education-panel').boundingBox(),
      themes = await page.getByTestId('theme-panel').boundingBox();
    expect(education!.y + education!.height).toBeLessThan(themes!.y);
    const firstPhoto = await page.locator('.photo-card').first().boundingBox();
    const navigation = await page.locator('.navigation-panel').boundingBox();
    expect(firstPhoto!.y + firstPhoto!.height).toBeLessThan(navigation!.y);
    await expect(page.locator('.museum-app')).toHaveCSS('background-color', 'rgb(247, 245, 242)');
    await page.screenshot({ path: 'docs/screenshots/stage2-overview-' + size.width + '.png' });
  });
