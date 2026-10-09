import { test, expect } from './fixtures';
test('new year updates an open page without resetting the current detail, theme or focus', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-12-31T15:30:00Z') });
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1997');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  await expect(page.getByTestId('focused-event')).toHaveText(/school-1997-/);
  const focusedId = await page.getByTestId('focused-event').textContent();
  const theme = await page.locator(`.photo-card[data-event-id="${focusedId}"]`).first().getAttribute('data-theme');
  await page.getByTestId(`theme-${theme}`).click();
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  const selected = await page.getByTestId('event-detail').getAttribute('data-event');
  await page.clock.setSystemTime(new Date('2026-12-31T16:00:01Z'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByTestId('year-slider')).toHaveAttribute('max', '2027');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', selected!);
  await expect(page.getByTestId('current-year')).toContainText('1997');
  await expect(page.getByTestId(`theme-${theme}`)).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('close-detail').click();
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
  await expect(page.getByTestId('focused-event')).toHaveText(/school-1997-/);
  const focusedId = await page.getByTestId('focused-event').textContent();
  const theme = await page.locator(`.photo-card[data-event-id="${focusedId}"]`).first().getAttribute('data-theme');
  await page.getByTestId(`theme-${theme}`).click();
  await expect(page.locator('.photo-card').first()).toHaveCSS('transition-duration', '0s');
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await expect(page.getByTestId('close-detail')).toBeFocused();
  await page.getByTestId('close-detail').click();
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
  await page.getByTestId('close-detail').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const year of [1971, 1997, 2006]) {
    await page.getByTestId('year-slider').fill(String(year));
    await expect(page.getByTestId('current-year')).toContainText(String(year));
    await expect(page.getByTestId('focused-event')).toHaveText(new RegExp(`school-${year}-`));
    const focusedId = await page.getByTestId('focused-event').textContent();
    const theme = await page.locator(`.photo-card[data-event-id="${focusedId}"]`).first().getAttribute('data-theme');
    await page.getByTestId(`theme-${theme}`).click();
    await page.getByTestId('language-en').click();
    await page.getByTestId('open-focused').click();
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByTestId('close-detail').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByTestId(`theme-${theme}`).click();
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByTestId('view-overview').click();
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '0.0000');
  await expect(page.locator('[data-extracted=true]')).toHaveCount(0);
});
test('central event and its neighbor retain distinct clickable surfaces', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1997');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  const focused = page.locator('.photo-card[data-event-id="school-1997-0"]').first();
  const next = page.locator('.photo-card[data-event-id="school-1997-1"]').first();
  for (const card of [focused, next]) {
    const exposedPoints = await card.evaluate((element) => {
      const box = element.getBoundingClientRect();
      let count = 0;
      for (let x = Math.ceil(box.left); x < box.right; x += 4)
        for (let y = Math.ceil(box.top); y < box.bottom; y += 4)
          if (document.elementFromPoint(x, y)?.closest('.photo-card') === element) count++;
      return count;
    });
    expect(exposedPoints).toBeGreaterThan(20);
  }
  await page.screenshot({ path: test.info().outputPath('final-central-separation.png') });
});
