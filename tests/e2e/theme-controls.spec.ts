import { test, expect } from './fixtures';

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
])
  test(`theme controls stay bottom-right and toggle back to normal at ${size.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByTestId('scene')).toBeVisible();
    const panel = page.getByTestId('theme-panel');
    await expect(panel.locator('button')).toHaveCount(5);
    await expect(page.getByTestId('theme-all')).toHaveCount(0);
    await expect(panel.locator('.theme-letter')).toHaveCount(0);
    const box = (await panel.boundingBox())!;
    const inset = size.width < 1320 ? 32 : 36;
    expect(box.x).toBeGreaterThan(size.width * 0.4);
    expect(box.x + box.width).toBeCloseTo(size.width - inset, 0);
    expect(box.y + box.height).toBeCloseTo(size.height - (size.height <= 760 ? 20 : 24), 0);
    const education = (await page.getByTestId('education-panel').boundingBox())!;
    expect(education.y + education.height).toBeLessThan(box.y);
    const focus = await page.getByTestId('scene').getAttribute('data-focus');
    const count = await page.locator('.photo-card').count();
    const themes = [
      ['A', '校園發展', 'rgb(184, 92, 95)'],
      ['B', '榮譽、服務和緬懷', 'rgb(193, 164, 107)'],
      ['C', '從書院到大學', 'rgb(125, 106, 142)'],
      ['D', '校務拓展', 'rgb(107, 142, 122)'],
      ['E', '重塑博雅教育', 'rgb(92, 110, 132)'],
    ];
    for (const [id, label, color] of themes) {
      const button = page.getByTestId('theme-' + id);
      await expect(button).toHaveText(label);
      await expect(button).toHaveCSS('border-top-color', color);
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator(`.photo-card:not([data-theme="${id}"])`).first()).toHaveAttribute(
        'style',
        /scale\(0.35\)/,
      );
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(panel.locator('[aria-pressed=true]')).toHaveCount(0);
      await expect
        .poll(() =>
          page
            .locator('.photo-card')
            .filter({ visible: true })
            .evaluateAll((els) =>
              els.every((el) => (el as HTMLElement).style.transform.endsWith('scale(1)')),
            ),
        )
        .toBe(true);
      await expect(page.locator('.museum-app')).toHaveCSS('--theme-accent', '#796e5d');
      await expect(page.getByTestId('scene')).toHaveAttribute('data-focus', focus!);
      await expect(page.locator('.photo-card')).toHaveCount(count);
    }
    await page.screenshot({ path: test.info().outputPath('theme-controls.png') });
  });
