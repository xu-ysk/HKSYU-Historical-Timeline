import { expect, test } from './fixtures';

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 869 },
]) {
  test(`both homes sit beside the swipe hints and restore all photos at ${size.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    const scene = page.getByTestId('scene');
    const app = page.locator('.museum-app');
    await expect(scene).toBeVisible();
    await expect(page.locator('.theme-home')).toHaveCount(0);
    const count = await page.locator('.photo-card').count();

    for (const lane of ['upper', 'education']) {
      await page.getByTestId('view-browse').click();
      await expect(scene).toHaveAttribute('data-zoom', '1.0000');
      await page.getByTestId('theme-A').click();
      await page.getByTestId('theme-A').click();
      await expect(app).toHaveAttribute('data-active-theme', 'A');
      await expect(app).toHaveAttribute('data-mode', 'browse');
      await expect(page.locator('.theme-home')).toHaveCount(2);
      for (const name of ['upper', 'education']) {
        const home = page.getByTestId(`theme-home-${name}`);
        await expect(home).toBeVisible();
        await expect(home).toHaveAccessibleName('返回全覽');
        const box = (await home.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(size.width);
        expect(box.y + box.height).toBeLessThanOrEqual(size.height);
        expect(
          await home.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return (
              document
                .elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
                ?.closest('button') === element
            );
          }),
        ).toBe(true);
      }
      const home = page.getByTestId(`theme-home-${lane}`);
      await home.click();
      await expect(app).toHaveAttribute('data-active-theme', 'all');
      await expect(app).toHaveAttribute('data-mode', 'overview');
      await expect(scene).toHaveAttribute('data-zoom', '0.0000');
      await expect(scene).toHaveAttribute('data-focus', '0.000000');
      await expect(page.locator('.theme-home')).toHaveCount(0);
      await expect(page.locator('.photo-card')).toHaveCount(count);
      await expect(page.locator('.photo-card:visible:not([data-theme="A"])').first()).toBeVisible();
      await expect(page.getByTestId('event-detail')).toHaveCount(0);
    }
  });
}

test('homes stay visible during the hint pulse and support three-language keyboard navigation', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  for (const [locale, label] of [
    ['zh-Hant', '返回全覽'],
    ['zh-Hans', '返回全览'],
    ['en', 'Return to overview'],
  ]) {
    await page.getByTestId(`language-${locale}`).click();
    await page.getByTestId('theme-B').click();
    await page.clock.fastForward(2300);
    const home = page.getByTestId('theme-home-education');
    await expect(home).toHaveAccessibleName(label);
    await expect(home).toBeEnabled();
    await expect(home).toHaveCSS('opacity', '1');
    expect(
      await home.evaluate((element) => getComputedStyle(element.parentElement!).animationName),
    ).toBe('none');
    await home.focus();
    await expect(home).toBeFocused();
    await home.press('Enter');
    await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');
  }
});

test('home works immediately after dragging and is unavailable inside photo details', async ({
  page,
}) => {
  await page.goto('/');
  const scene = page.getByTestId('scene');
  await page.getByTestId('view-browse').click();
  await expect(scene).toHaveAttribute('data-zoom', '1.0000');
  await page.getByTestId('theme-A').click();
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(520, 475, { steps: 8 });
  await expect(scene).toHaveAttribute('data-phase', 'dragging');
  await page.mouse.up();
  await page.getByTestId('theme-home-upper').click();
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');
  await expect(scene).toHaveAttribute('data-zoom', '0.0000');

  await page.getByTestId('theme-A').click();
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  for (const lane of ['upper', 'education']) {
    await expect(page.getByTestId(`theme-home-${lane}`)).toBeDisabled();
    await expect(page.getByTestId(`theme-home-${lane}`)).toBeHidden();
  }
  await page.getByTestId('close-detail').click();
  await expect(page.getByTestId('event-detail')).toHaveCount(0);
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'A');
  await page.getByTestId('theme-home-education').click();
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');
});

test.describe('touchscreen home buttons', () => {
  test.use({ hasTouch: true, viewport: { width: 1440, height: 900 } });
  test('both homes offer a 44-pixel target and accept one tap', async ({ page }) => {
    await page.goto('/');
    for (const lane of ['upper', 'education']) {
      await page.getByTestId('theme-D').tap();
      const home = page.getByTestId(`theme-home-${lane}`);
      const box = (await home.boundingBox())!;
      await expect(home).toHaveCSS('width', '44px');
      await expect(home).toHaveCSS('height', '44px');
      expect(box.width).toBeCloseTo(44, 3);
      expect(box.height).toBeCloseTo(44, 3);
      await home.tap();
      await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');
      await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '0.0000');
    }
  });
});
