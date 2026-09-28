import { test, expect } from './fixtures';
import { writeFile, mkdir } from 'node:fs/promises';
// Per-action DOM snapshots distort frame timings; functional tests retain traces.
// Keep the same real interactions and performance assertions without recording overhead.
test.use({ trace: 'off' });
test('30 second scroll and theme performance sample', async ({ page }, testInfo) => {
  test.setTimeout(65000);
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1997');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  const measurement = page.evaluate(
    () =>
      new Promise<{ frames: number; meanMs: number; p95Ms: number; over50ms: number }>(
        (resolve) => {
          const frames: number[] = [],
            start = performance.now();
          let last = start;
          function sample(now: number) {
            frames.push(now - last);
            last = now;
            if (now - start < 30000) requestAnimationFrame(sample);
            else {
              const sorted = [...frames].sort((a, b) => a - b);
              resolve({
                frames: frames.length,
                meanMs: frames.reduce((a, b) => a + b, 0) / frames.length,
                p95Ms: sorted[Math.floor(sorted.length * 0.95)],
                over50ms: frames.filter((n) => n > 50).length,
              });
            }
          }
          requestAnimationFrame(sample);
        },
      ),
  );
  const started = Date.now();
  let i = 0;
  while (Date.now() - started < 30000) {
    await page.mouse.move(720, 410);
    await page.mouse.wheel(0, i % 12 < 6 ? 100 : -100);
    if (i % 8 === 0)
      await page.getByTestId('theme-' + ['A', 'B', 'C', 'D', 'E'][Math.floor(i / 8) % 5]).click();
    i++;
    await page.waitForTimeout(180);
  }
  const stats = await measurement;
  const active = await page.locator('.photo-card').filter({ visible: true }).count();
  await mkdir('docs/performance', { recursive: true });
  await writeFile(
    'docs/performance/' + testInfo.project.name + '.json',
    JSON.stringify(
      {
        browser: testInfo.project.name,
        viewport: page.viewportSize(),
        ...stats,
        activeCards: active,
        operations: i,
      },
      null,
      2,
    ),
  );
  expect(stats.frames).toBeGreaterThan(600);
  expect(stats.p95Ms).toBeLessThan(50);
});
