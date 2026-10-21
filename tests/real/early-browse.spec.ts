import { test, expect, type Page } from '@playwright/test';
import { sceneConfig } from '../../src/config/scene';

async function settled(page: Page) {
  const scene = page.getByTestId('scene');
  await expect(scene).toHaveAttribute('data-zoom', '1.0000');
  await expect
    .poll(() =>
      scene.evaluate((element) => {
        const { focus, targetFocus } = (element as HTMLElement).dataset;
        return Math.abs(Number(focus) - Number(targetFocus));
      }),
    )
    .toBeLessThan(0.000001);
}

async function goYear(page: Page, year: number) {
  // The exhibition slider is transparent; changing it without focusing avoids
  // scrolling the clipped canvas before exercising real pointer gestures.
  await page.getByTestId('year-slider').evaluate((element, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(year));
  await expect(page.getByTestId('current-year')).toContainText(String(year));
  await settled(page);
}

test('early real-data rails are compact and gestures cross 1971 in both directions', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
  await page.addInitScript(() => sessionStorage.setItem('museum-help-seen', 'true'));
  await page.setViewportSize({ width: 1920, height: 869 });
  await page.goto('/');
  const scene = page.getByTestId('scene');
  await expect(scene).toHaveAttribute('data-zoom', '0.0000');
  const upper = page.locator('[data-upper-year="1949"]');
  const overview = await upper.getAttribute('style');
  const photoCount = await page.locator('.photo-card').count();

  await page.getByTestId('view-browse').click();
  await settled(page);
  const geometry = await page.evaluate(() => {
    const point = (year: number) => {
      const el = document.querySelector<HTMLElement>(`[data-upper-year="${year}"]`)!;
      return { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
    };
    const first = point(1949),
      last = point(1971);
    const starts = ['upper', 'axis', 'education'].map((lane) => {
      const line = document.querySelector(`[data-track="${lane}"]`)!;
      return { x: Number(line.getAttribute('x1')), y: Number(line.getAttribute('y1')) };
    });
    return {
      earlyGap: Math.hypot(last.x - first.x, last.y - first.y),
      laneGaps: starts.slice(1).map((p, i) => Math.hypot(p.x - starts[i].x, p.y - starts[i].y)),
    };
  });
  expect(geometry.earlyGap).toBeGreaterThan(580);
  expect(geometry.earlyGap).toBeLessThan(610);
  geometry.laneGaps.forEach((gap) => expect(gap).toBeCloseTo(90, 6));
  await page.screenshot({ path: test.info().outputPath('1949-1971-compressed.png') });

  await goYear(page, 1970);
  await page.mouse.move(1250, 450);
  await page.mouse.down();
  await page.mouse.move(1130, 525, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(async () => 1949 + Number(await scene.getAttribute('data-focus')) * 77)
    .toBeGreaterThan(1971);
  expect(1949 + Number(await scene.getAttribute('data-focus')) * 77).toBeLessThan(1973);
  await page.mouse.down();
  await page.mouse.move(1250, 450, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(async () => 1949 + Number(await scene.getAttribute('data-focus')) * 77)
    .toBeCloseTo(1970, 3);

  await goYear(page, 1971);
  const wheelPerEvent =
    ((0.24 / 77) * sceneConfig.browseLength * (1920 / 1440)) / sceneConfig.wheelSensitivity;
  await page.mouse.move(960, 420);
  await page.mouse.wheel(0, wheelPerEvent);
  await expect(scene).toHaveAttribute('data-focused-event', 'P02');
  await settled(page);
  await page.mouse.wheel(0, -wheelPerEvent);
  await expect(scene).toHaveAttribute('data-focused-event', 'P01');
  await settled(page);
  await page.screenshot({ path: test.info().outputPath('1971-boundary.png') });

  await goYear(page, 1997);
  await expect(page.getByTestId('current-year')).toContainText('1997');
  await page.screenshot({ path: test.info().outputPath('1997-unchanged.png') });
  await page.getByTestId('view-overview').click();
  await expect(scene).toHaveAttribute('data-zoom', '0.0000');
  await expect(upper).toHaveAttribute('style', overview!);
  await expect(page.locator('.photo-card')).toHaveCount(photoCount);
  expect(errors).toEqual([]);
});
