import { test, expect } from './fixtures';

test('browse cards leave the parallel education timeline visible', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('year-slider').fill('1970');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  await page.waitForTimeout(900);

  const cards = page.locator('.photo-card[data-event-id^="school-1970-"]');
  await expect(cards.first()).toHaveCSS('width', '238px');
  const widths = await cards.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));
  expect(Math.max(...widths)).toBeLessThanOrEqual(242);

  const educationPanel = page.getByTestId('education-panel');
  await expect(educationPanel).toBeVisible();
  const panelBox = await educationPanel.boundingBox();
  expect(panelBox).not.toBeNull();
  const overlappingCards = await cards.evaluateAll((items, panel) => {
    if (!panel) return 0;
    return items.filter((item) => {
      if (getComputedStyle(item).visibility === 'hidden') return false;
      const box = item.getBoundingClientRect();
      return !(box.right <= panel.x || box.left >= panel.x + panel.width || box.bottom <= panel.y || box.top >= panel.y + panel.height);
    }).length;
  }, panelBox);
  expect(overlappingCards).toBe(0);
});
