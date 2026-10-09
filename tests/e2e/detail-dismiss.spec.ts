import { test, expect } from './fixtures';

test('only the return arrow closes detail without changing underlying controls', async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.goto('/');
  await page.getByTestId('year-slider').fill('1997');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  await page.evaluate(() => {
    document.querySelector('.museum-app')!.scrollTop = 0;
  });
  const source = page.locator('.photo-card[data-event-id="school-1997-0"]').first();
  const theme = await source.getAttribute('data-theme');
  await page.getByTestId(`theme-${theme}`).click();
  await expect(
    page.locator(`.photo-card:not([data-theme="${theme}"])`).filter({ visible: true }).first(),
  ).toHaveAttribute('style', /scale\(0.35\)/);
  const focus = await page.getByTestId('scene').getAttribute('data-focus');
  const originalTransform = await source.evaluate((el) => (el as HTMLElement).style.transform);
  for (const region of ['blank', 'photo', 'text', 'view', 'language', 'theme']) {
    await source.click();
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
    await expect(page.getByTestId('close-detail')).toBeVisible();
    let point = { x: 1400, y: 140 };
    if (region !== 'blank') {
      const target =
        region === 'photo'
          ? source
          : page.getByTestId(
              {
                text: 'detail-body',
                view: 'view-overview',
                language: 'language-en',
                theme: 'theme-A',
              }[region]!,
            );
      const box = (await target.boundingBox())!;
      point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }
    await page.mouse.click(point.x, point.y);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByTestId('close-detail').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[data-extracted=true]')).toHaveCount(0);
    await expect(page.getByTestId('scene')).toHaveAttribute('data-focus', focus!);
    expect(await source.evaluate((el) => (el as HTMLElement).style.transform)).toBe(
      originalTransform,
    );
    await expect(page.getByTestId(`theme-${theme}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('view-browse')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
    await expect(source).toBeFocused();
  }
});

test('return arrow during pair extraction reverses smoothly without reopening', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('year-slider').fill('1953');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  for (let i = 1; i <= 3; i++) {
    await page.getByTestId('next-event').click();
    await expect(page.getByTestId('focused-event')).toHaveText(`school-1953-${i}`);
  }
  await page.getByTestId('open-focused').click();
  await expect
    .poll(async () => Number(await page.getByTestId('scene').getAttribute('data-detail-progress')))
    .toBeGreaterThan(0.15);
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'opening');
  await page.getByTestId('close-detail').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'closing');
  await page.mouse.click(720, 400);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-extracted=true]')).toHaveCount(0);
  await expect(page.getByTestId('scene')).toHaveAttribute('data-phase', 'idle');
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await expect(page.locator('[data-extracted=true]')).toHaveCount(2);
  await page.getByTestId('close-detail').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('detail returns automatically after three minutes', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  const focus = await page.getByTestId('scene').getAttribute('data-focus');
  await page.clock.fastForward(178_000);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.clock.fastForward(3_000);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('scene')).toHaveAttribute('data-focus', focus!);
});

test('reopening detail starts a fresh three-minute timer', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await page.clock.fastForward(60_000);
  await page.getByTestId('close-detail').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await page.clock.fastForward(118_000);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.clock.fastForward(63_000);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test.describe('touch screen', () => {
  test.use({ hasTouch: true });

  test('only tapping the return arrow closes detail', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('open-focused').tap();
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
    await page.touchscreen.tap(30, 30);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByTestId('close-detail').tap();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
