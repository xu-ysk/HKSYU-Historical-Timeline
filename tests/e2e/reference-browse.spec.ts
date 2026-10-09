import { test, expect } from './fixtures';
import { sceneConfig } from '../../src/config/scene';

test('T1: real wheel input visits same-year events in sequence in both directions', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-09-29T12:00:00Z') });
  await page.goto('/');
  await page.getByTestId('year-slider').fill('1997');
  const scene = page.getByTestId('scene');
  await expect(scene).toHaveAttribute('data-zoom', '1.0000');
  await page.mouse.move(720, 410);
  const wheelPerEvent = ((0.12 / 77) * sceneConfig.browseLength) / sceneConfig.wheelSensitivity;
  let previousOrder = 0;
  for (const order of [1, 2, 3, 2, 1, 0]) {
    await page.mouse.wheel(0, wheelPerEvent * Math.sign(order - previousOrder));
    await expect(page.getByTestId('focused-event')).toHaveText(`school-1997-${order}`);
    await expect
      .poll(async () =>
        scene.evaluate((el) =>
          Math.abs(
            Number((el as HTMLElement).dataset.focus) -
              Number((el as HTMLElement).dataset.targetFocus),
          ),
        ),
      )
      .toBeLessThan(0.000001);
    await expect(page.getByTestId('current-year')).toContainText('1997');
    previousOrder = order;
  }
});

test('T1: animation frames preserve parallel chronological stacks without reversals', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('year-slider').fill('1997');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  await page.mouse.move(720, 410);
  const sampling = page.evaluate(
    () =>
      new Promise<{
        samples: number;
        reversed: number;
        reordered: number;
        angles: number;
        travel: number;
      }>((resolve) => {
        const groups = [1996, 1997, 1998, 1999].flatMap((year) =>
          [0, 1, 2, 3].map((order) =>
            document.querySelector<HTMLElement>(
              `.photo-card[data-event-id="school-${year}-${order}"]`,
            )!,
          ),
        );
        let samples = 0,
          reversed = 0,
          reordered = 0,
          angles = 0,
          previous: number[] = [],
          initial = 0,
          last = 0;
        const start = performance.now();
        function frame() {
          const boxes = groups.map((el) => {
            const b = el.getBoundingClientRect();
            return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
          });
          const x = boxes.map(
            (b) => b.x * Math.cos((-32 * Math.PI) / 180) + b.y * Math.sin((-32 * Math.PI) / 180),
          );
          // Hidden nodes are culled, so compare only consecutive visible events.
          groups.forEach((el, i) => {
            if (getComputedStyle(el).visibility === 'hidden') return;
            if (i && getComputedStyle(groups[i - 1]).visibility !== 'hidden' && x[i] <= x[i - 1])
              reordered++;
            if (
              previous.length &&
              el.dataset.eventId === 'school-1997-0' &&
              x[i] > previous[i] + 0.3
            )
              reversed++;
            if (!el.style.transform.includes('rotateY(-52deg) rotateZ(0deg)')) angles++;
          });
          if (!samples) initial = x[4];
          last = x[4];
          previous = x;
          samples++;
          if (performance.now() - start < 1000) requestAnimationFrame(frame);
          else resolve({ samples, reversed, reordered, angles, travel: initial - last });
        }
        requestAnimationFrame(frame);
      }),
  );
  await page.mouse.wheel(0, 100);
  const result = await sampling;
  expect(result.samples).toBeGreaterThan(20);
  expect(result.travel).toBeGreaterThan(110);
  expect(result.travel).toBeLessThan(150);
  expect(result.reordered).toBe(0);
  expect(result.reversed).toBe(0);
  expect(result.angles).toBe(0);
  await page.screenshot({ path: test.info().outputPath('T1-browse.png') });
});
