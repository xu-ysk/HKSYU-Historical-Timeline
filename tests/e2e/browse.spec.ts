import { test, expect } from './fixtures';
test('wheel and drag move both lanes and stop at the end', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  const scene = page.getByTestId('scene');
  await scene.hover({ position: { x: 720, y: 400 } });
  await page.mouse.wheel(0, 700);
  await expect(page.getByTestId('view-browse')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => Number(await scene.getAttribute('data-focus'))).toBeGreaterThan(0);
  const first = Number(await scene.getAttribute('data-focus'));
  await page.mouse.move(800, 390);
  await page.mouse.down();
  await page.mouse.move(630, 500, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await scene.getAttribute('data-focus')))
    .toBeGreaterThan(first);
  await page.mouse.wheel(0, 100000);
  await expect.poll(async () => Number(await scene.getAttribute('data-focus'))).toBe(1);
  await page.mouse.wheel(0, 100000);
  await expect.poll(async () => Number(await scene.getAttribute('data-focus'))).toBe(1);
  await page.mouse.wheel(0, -100000);
  await expect.poll(async () => Number(await scene.getAttribute('data-focus'))).toBe(0);
  await page.getByTestId('year-slider').fill('1997');
  await expect(page.getByTestId('current-year')).toContainText('1997');
  await expect(scene).toHaveAttribute('data-zoom', '1.0000');
  await page.screenshot({ path: 'docs/screenshots/stage3-browse.png' });
  const jumped = Number(await scene.getAttribute('data-focus'));
  await scene.hover({ position: { x: 720, y: 400 } });
  await page.mouse.wheel(0, 100);
  await expect
    .poll(async () => Number(await scene.getAttribute('data-focus')))
    .toBeGreaterThan(jumped);
});
test('pointer cancellation releases drag and resizing retains year', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1980');
  await expect(page.getByTestId('current-year')).toContainText('1980');
  await page.mouse.move(700, 400);
  await page.mouse.down();
  await page.mouse.move(600, 440, { steps: 5 });
  await expect(page.getByTestId('scene')).toHaveAttribute('data-phase', 'dragging');
  await page.getByTestId('scene').dispatchEvent('pointercancel');
  await page.mouse.up();
  await expect(page.getByTestId('scene')).toHaveAttribute('data-phase', 'idle');
  const focus = await page.getByTestId('scene').getAttribute('data-focus');
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByTestId('scene')).toHaveAttribute('data-focus', focus!);
});
