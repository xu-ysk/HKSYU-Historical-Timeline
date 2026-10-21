import { expect, test } from './fixtures';

test('selected theme returns to the full overview after three minutes', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByTestId('view-browse').click();
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  await page.getByTestId('theme-A').click();

  await page.clock.fastForward(179_000);
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'A');
  await expect(page.locator('.museum-app')).toHaveAttribute('data-mode', 'browse');

  await page.clock.fastForward(1_000);
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');
  await expect(page.locator('.museum-app')).toHaveAttribute('data-mode', 'overview');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '0.0000');
});

test('switching themes restarts the timer and home cancels it', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByTestId('view-browse').click();
  await page.getByTestId('theme-A').click();
  await page.clock.fastForward(120_000);
  await page.getByTestId('theme-B').click();

  await page.clock.fastForward(170_000);
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'B');
  await expect(page.locator('.museum-app')).toHaveAttribute('data-mode', 'browse');
  await page.getByTestId('theme-B').click();
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'B');
  await page.getByTestId('theme-home-education').click();
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');

  await page.clock.fastForward(190_000);
  await expect(page.locator('.museum-app')).toHaveAttribute('data-mode', 'overview');
});

test('theme timeout closes an open detail before returning to overview', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByTestId('view-browse').click();
  await page.getByTestId('theme-A').click();
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');

  await page.clock.fastForward(180_000);
  await expect(page.getByTestId('event-detail')).toHaveCount(0);
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');
  await expect(page.locator('.museum-app')).toHaveAttribute('data-mode', 'overview');
});

test('repeating the active theme keeps the original three-minute deadline', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByTestId('theme-C').click();
  await page.clock.fastForward(170_000);
  await page.getByTestId('theme-C').click();
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'C');
  await page.clock.fastForward(10_000);
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '0.0000');
});
