import { test, expect } from './fixtures';
test('new year updates an open page without resetting the current detail, theme or focus', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-12-31T15:30:00Z') });
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1997');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  await page.getByTestId('theme-B').click();
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  const selected = await page.getByTestId('event-detail').getAttribute('data-event');
  await page.clock.setSystemTime(new Date('2026-12-31T16:00:01Z'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByTestId('year-slider')).toHaveAttribute('max', '2027');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', selected!);
  await expect(page.getByTestId('current-year')).toContainText('1997');
  await expect(page.getByTestId('theme-B')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.photo-card[data-event-id="school-2027-0"]')).toHaveCount(1);
  await page.getByTestId('year-slider').fill('2027');
  await expect(page.getByTestId('current-year')).toContainText('2027');
});
test('reduced motion keeps every operation available and restores keyboard focus', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1997');
  await page.getByTestId('theme-C').click();
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await expect(page.getByTestId('close-detail')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('open-focused')).toBeFocused();
});
test('mouse can select a photo and repeated mixed operations keep returning correctly', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('view-browse').click();
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  await page.locator('.photo-card[data-event-id="school-1949-0"]').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const year of [1971, 1997, 2006]) {
    await page.getByTestId('year-slider').fill(String(year));
    await expect(page.getByTestId('current-year')).toContainText(String(year));
    await page.getByTestId('theme-A').click();
    await page.getByTestId('open-focused').click();
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
    await page.getByTestId('language-en').click();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByTestId('theme-all').click();
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByTestId('view-overview').click();
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '0.0000');
  await expect(page.locator('[data-extracted=true]')).toHaveCount(0);
});
test('central focused event is visually separated from both adjacent event groups', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1997');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  const focused = page.locator('.photo-card[data-event-id="school-1997-0"]');
  const next = page.locator('.photo-card[data-event-id="school-1997-1"]');
  await expect
    .poll(async () => {
      const a = await focused.boundingBox(),
        b = await next.boundingBox();
      return Math.hypot(
        a!.x + a!.width / 2 - b!.x - b!.width / 2,
        a!.y + a!.height / 2 - b!.y - b!.height / 2,
      );
    })
    .toBeGreaterThan(250);
  await page.screenshot({ path: 'docs/screenshots/final-central-separation.png' });
});
