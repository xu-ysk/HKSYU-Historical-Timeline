import { test, expect } from './fixtures';

test('each selected theme enlarges photos by 25 percent and hides other themes', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  const cards = page.locator('.photo-card');
  const total = await cards.count();
  for (const theme of ['A', 'B', 'C', 'D', 'E']) {
    const selected = page.locator(`.photo-card[data-theme="${theme}"]`).first();
    const beforeWidth = (await selected.boundingBox())!.width;
    await page.getByTestId(`theme-${theme}`).click();
    await expect(selected).toHaveAttribute('style', /scale\(1.25\)/);
    await expect(
      page.locator(`.photo-card:not([data-theme="${theme}"])`).first(),
    ).toHaveCSS('visibility', 'hidden');
    const hidden = page.locator(`.photo-card:not([data-theme="${theme}"])`);
    expect(await hidden.evaluateAll((elements) => elements.every((element) =>
      (element as HTMLButtonElement).tabIndex === -1 && getComputedStyle(element).pointerEvents === 'none',
    ))).toBe(true);
    const afterWidth = (await selected.boundingBox())!.width;
    expect(afterWidth / beforeWidth).toBeCloseTo(1.25, 2);
    await expect(cards).toHaveCount(total);
    await page.getByTestId(`theme-${theme}`).click();
    await expect(selected).toHaveAttribute('style', /scale\(1\)/);
    expect((await selected.boundingBox())!.width).toBeCloseTo(beforeWidth, 2);
  }
});
