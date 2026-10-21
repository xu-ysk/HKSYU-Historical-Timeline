import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('museum-help-seen', 'true'));
});

const samples = [
  { theme: 'A', event: 'P01', year: 1971 },
  { theme: 'B', event: 'P07', year: 1974 },
  { theme: 'C', event: 'P03', year: 1972 },
  { theme: 'D', event: 'P02', year: 1971 },
  { theme: 'E', event: 'P92', year: 2021 },
];

for (const mode of ['overview', 'browse']) {
  test(`${mode} filters all five real photo themes and restores the full album`, async ({ page }) => {
    test.setTimeout(60000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByTestId('scene')).toBeVisible();
    const scene = page.getByTestId('scene');
    const cards = page.locator('.photo-card');
    const total = await cards.count();

    for (const sample of samples) {
      if (mode === 'browse') {
        await page.getByTestId('year-slider').fill(String(sample.year));
        await expect(scene).toHaveAttribute('data-zoom', '1.0000');
        await expect.poll(() => scene.evaluate((element) => {
          const { focus, targetFocus } = (element as HTMLElement).dataset;
          return Math.abs(Number(focus) - Number(targetFocus));
        })).toBeLessThan(0.000001);
        await page.locator('.museum-app').evaluate((element) => { element.scrollTop = 0; });
      }
      const focus = await scene.getAttribute('data-focus');
      const source = page.locator(`.photo-card[data-event-id="${sample.event}"]`).first();
      const normalWidth = (await source.boundingBox())!.width;
      const button = page.getByTestId(`theme-${sample.theme}`);
      await button.click();
      await expect(source).toHaveAttribute('style', /scale\(1.25\)/);
      await expect(page.locator(`.photo-card:not([data-theme="${sample.theme}"]):visible`)).toHaveCount(0);
      expect((await source.boundingBox())!.width / normalWidth).toBeCloseTo(1.25, 2);
      await expect(scene).toHaveAttribute('data-focus', focus!);
      expect(await page.locator(`.photo-card:not([data-theme="${sample.theme}"])`).evaluateAll((elements) =>
        elements.every((element) => (element as HTMLButtonElement).tabIndex === -1 &&
          getComputedStyle(element).pointerEvents === 'none'),
      )).toBe(true);

      await source.focus();
      await source.press('Enter');
      await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', sample.event);
      await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
      await page.getByTestId('close-detail').click();
      await expect(page.getByTestId('event-detail')).toHaveCount(0);
      await expect(page.locator(`.photo-card:not([data-theme="${sample.theme}"]):visible`)).toHaveCount(0);

      await page.getByTestId('theme-home-upper').click();
      await expect(source).toHaveAttribute('style', /scale\(1\)/);
      await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');
      await expect(cards).toHaveCount(total);
      await expect(scene).toHaveAttribute('data-zoom', '0.0000');
      await expect(scene).toHaveAttribute('data-focus', '0.000000');
      await expect(source).toHaveCSS('width', '42px');
      if (mode === 'overview') expect((await source.boundingBox())!.width).toBeCloseTo(normalWidth, 2);
      await expect(page.locator('.photo-card:visible:not([data-theme="' + sample.theme + '"])').first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
