import { test, expect } from './fixtures';

test('each selected theme keeps its photos at normal size and recedes other themes', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  const cards = page.locator('.photo-card');
  const total = await cards.count();
  for (const theme of ['A', 'B', 'C', 'D', 'E']) {
    const selected = page.locator(`.photo-card[data-theme="${theme}"]`).first();
    const beforeWidth = await selected.evaluate((element) => getComputedStyle(element).width);
    await page.getByTestId(`theme-${theme}`).click();
    await expect(selected).toHaveAttribute('style', /scale\(1\)/);
    await expect(
      page.locator(`.photo-card:not([data-theme="${theme}"])`).first(),
    ).toHaveAttribute('style', /scale\(0.35\)/);
    const afterWidth = await selected.evaluate((element) => getComputedStyle(element).width);
    expect(afterWidth).toBe(beforeWidth);
    await expect(cards).toHaveCount(total);
  }
});
