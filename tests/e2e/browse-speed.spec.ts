import { test, expect, type Page } from './fixtures';

async function prepare(page: Page) {
  await page.clock.install({ time: new Date('2026-09-30T12:00:00Z') });
  await page.goto('/');
  await page.getByTestId('year-slider').fill('1997');
  const scene = page.getByTestId('scene');
  await expect(scene).toHaveAttribute('data-zoom', '1.0000');
  await page.evaluate(() => {
    document.querySelector('.museum-app')!.scrollTop = 0;
  });
  return scene;
}

for (const width of [1280, 1440, 1920])
  test(`drag travels about 25% less, reverses precisely and stops on release at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const scene = await prepare(page);
    const initial = Number(await scene.getAttribute('data-focus'));
    const x = width / 2,
      y = 410,
      dx = -180,
      dy = 110;
    const oldTravel =
      -(dx * Math.cos((-32 * Math.PI) / 180) + dy * Math.sin((-32 * Math.PI) / 180)) /
      (6500 * Math.max(0.8, width / 1440));
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 10 });
    await expect(scene).toHaveAttribute('data-phase', 'dragging');
    const travel = Number(await scene.getAttribute('data-focus')) - initial;
    expect(travel / oldTravel).toBeGreaterThan(0.74);
    expect(travel / oldTravel).toBeLessThan(0.76);
    await page.mouse.move(x - dx, y - dy, { steps: 10 });
    const reverseTravel = initial - Number(await scene.getAttribute('data-focus'));
    expect(reverseTravel / oldTravel).toBeGreaterThan(0.74);
    expect(reverseTravel / oldTravel).toBeLessThan(0.76);
    await page.mouse.move(x, y, { steps: 10 });
    await page.mouse.up();
    await expect(scene).toHaveAttribute('data-phase', 'idle');
    await expect(scene).toHaveAttribute('data-focus', initial.toFixed(6));
    const settled = await scene.getAttribute('data-focus');
    await page.mouse.move(x + 90, y - 50);
    await expect(scene).toHaveAttribute('data-focus', settled!);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

test('wheel moves about 25% less in both directions while small inputs still accumulate', async ({
  page,
}) => {
  const scene = await prepare(page);
  const initial = Number(await scene.getAttribute('data-focus'));
  const delta = 600;
  const oldTravel = (delta * 0.35) / 6500;
  await page.mouse.move(720, 410);
  await page.mouse.wheel(0, delta);
  await expect
    .poll(async () => Number(await scene.getAttribute('data-target-focus')))
    .toBeGreaterThan(initial);
  const target = Number(await scene.getAttribute('data-target-focus'));
  // Snapping rounds to an event, so allow at most half the largest 0.64-year gap.
  expect(Math.abs(target - initial - oldTravel * 0.75)).toBeLessThan(0.32 / 77);
  expect(target - initial).toBeLessThan(oldTravel * 0.9);
  await expect
    .poll(async () => Math.abs(Number(await scene.getAttribute('data-focus')) - target))
    .toBeLessThan(0.000001);
  await page.mouse.wheel(0, -delta);
  await expect
    .poll(async () => Math.abs(Number(await scene.getAttribute('data-focus')) - initial))
    .toBeLessThan(0.000001);
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 3);
  await expect(page.getByTestId('focused-event')).toHaveText('school-1997-1');
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -3);
  await expect(page.getByTestId('focused-event')).toHaveText('school-1997-0');
});
