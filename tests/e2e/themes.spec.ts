import { test, expect } from './fixtures';
test('all themes change photo scale without changing time or hiding other events', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  const scene = page.getByTestId('scene'),
    cards = page.locator('.photo-card'),
    total = await cards.count();
  const anchor = await page.locator('[data-education-year="1997"]').evaluate((el: HTMLElement) => ({
    left: el.style.left,
    top: el.style.top,
  }));
  for (const theme of ['A', 'B', 'C', 'D', 'E']) {
    await page.getByTestId('theme-' + theme).click();
    await expect(page.locator('.photo-card[data-theme="' + theme + '"]').first()).toHaveAttribute(
      'style',
      /scale\(1\)/,
    );
    await expect(
      page.locator('.photo-card:not([data-theme="' + theme + '"])').first(),
    ).toHaveAttribute('style', /scale\(0.35\)/);
    await expect(cards).toHaveCount(total);
    await expect(scene).toHaveAttribute('data-focus', '0.000000');
    const activeYears = await page.locator(`.photo-card[data-theme="${theme}"]`).evaluateAll((els) =>
      [...new Set(els.map((el) => Number(el.getAttribute('aria-label')?.slice(0, 4))))],
    );
    for (const selector of ['[data-education-year]', '[data-upper-year]']) {
      const years = await page.locator(selector).evaluateAll((els) =>
        els.map((el) => Number(el.getAttribute('data-education-year') ?? el.getAttribute('data-upper-year'))),
      );
      expect(years.every((year) => activeYears.includes(year))).toBe(true);
    }
    const marker = page.locator('[data-education-year="1997"]');
    if (activeYears.includes(1997))
      expect(await marker.evaluate((el: HTMLElement) => ({ left: el.style.left, top: el.style.top }))).toEqual(anchor);
    else await expect(marker).toHaveCount(0);
  }
  await page.getByTestId('theme-A').click();
  await expect(page.locator('.photo-card[data-theme="A"]').first()).toHaveAttribute(
    'style',
    /scale\(1\)/,
  );
  await page.screenshot({ path: test.info().outputPath('stage4-theme-A.png') });
  await page.getByTestId('theme-A').click();
  await expect(cards.first()).toHaveAttribute('style', /scale\(1\)/);
});
test('language and rapid theme changes preserve current browsing position', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1997');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  const focus = await page.getByTestId('scene').getAttribute('data-focus');
  for (const locale of ['en', 'zh-Hans', 'zh-Hant']) {
    await page.getByTestId('language-' + locale).click();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByTestId('scene')).toHaveAttribute('data-focus', focus!);
  }
  for (const theme of ['A', 'C', 'B', 'E']) await page.getByTestId('theme-' + theme).click();
  await expect(page.getByTestId('theme-E')).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.locator('.photo-card[data-theme="E"]').filter({ visible: true }).first(),
  ).toHaveAttribute('style', /scale\(1\)/);
  await expect(page.getByTestId('scene')).toHaveAttribute('data-focus', focus!);
  await page.getByTestId('language-en').click();
  await page.screenshot({ path: test.info().outputPath('stage4-english.png') });
});
