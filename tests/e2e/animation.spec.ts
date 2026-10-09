import { test, expect } from './fixtures';
test('extracting a photo travels through intermediate positions using the original node', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('view-browse').click();
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  const samples = page.locator('.photo-card[data-event-id="school-1949-0"]').evaluate(
    (el) =>
      new Promise<number[]>((resolve) => {
        const values: number[] = [],
          start = performance.now();
        const capture = () => {
          values.push(el.getBoundingClientRect().x);
          if (performance.now() - start < 1400) requestAnimationFrame(capture);
          else resolve(values);
        };
        requestAnimationFrame(capture);
      }),
  );
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  const positions = await samples;
  expect(new Set(positions.map((x) => Math.round(x))).size).toBeGreaterThan(10);
  expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThan(100);
  expect(Math.max(...positions.slice(1).map((x, i) => Math.abs(x - positions[i])))).toBeLessThan(
    200,
  );
  await page.getByTestId('close-detail').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('both photographs of a pair have an exposed mouse target', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1953');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  for (let i = 0; i < 3; i++) {
    await page.getByTestId('next-event').click();
    await expect(page.getByTestId('focused-event')).toHaveText('school-1953-' + (i + 1));
  }
  for (const index of [0, 1]) {
    const card = page.locator('.photo-card[data-event-id="school-1953-3"]').nth(index);
    // Wait for the actual geometry to settle, not for an arbitrary timer.
    await expect
      .poll(() =>
        card.evaluate(
          (el) =>
            new Promise<number>((resolve) => {
              const first = el.getBoundingClientRect();
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  const second = el.getBoundingClientRect();
                  resolve(Math.hypot(second.x - first.x, second.y - first.y));
                }),
              );
            }),
        ),
      )
      .toBeLessThan(0.1);
    const exposed = () =>
      card.evaluate((el) => {
        const b = el.getBoundingClientRect();
        for (let y = b.y + 6; y < b.bottom - 6; y += 4)
          for (let x = b.x + 6; x < b.right - 6; x += 4)
            if (
              [
                [x, y],
                [x - 4, y],
                [x + 4, y],
                [x, y - 4],
                [x, y + 4],
              ].every(
                ([px, py]) => document.elementFromPoint(px, py)?.closest('.photo-card') === el,
              )
            )
              return { x, y };
        return null;
      });
    await expect.poll(exposed).not.toBeNull();
    const point = await exposed();
    await page.mouse.click(point!.x, point!.y);
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
    await expect(page.locator('[data-extracted=true]')).toHaveCount(2);
    await page.getByTestId('close-detail').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});
test('browsing keeps earlier photos above later photos during a left-down slide', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1997');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  await expect.poll(() => page.getByTestId('focused-event').textContent()).toBe('school-1997-0');
  const zIndexes = await page.evaluate(() => {
    const z = (id: string) =>
      Number(getComputedStyle(document.querySelector(`[data-event-id="${id}"]`)!).zIndex);
    return { focused: z('school-1997-0'), previous: z('school-1996-0'), next: z('school-1998-0') };
  });
  expect(zIndexes.previous).toBeGreaterThan(zIndexes.focused);
  expect(zIndexes.focused).toBeGreaterThan(zIndexes.next);
  const scene = page.getByTestId('scene');
  await scene.hover({ position: { x: 720, y: 400 } });
  const beforeSlide = Number(await scene.getAttribute('data-focus'));
  await page.mouse.wheel(0, 360);
  await expect
    .poll(async () => Number(await scene.getAttribute('data-focus')))
    .toBeGreaterThan(beforeSlide);
  await expect
    .poll(() =>
      scene.evaluate((el) =>
        Math.abs(
          Number((el as HTMLElement).dataset.focus) -
            Number((el as HTMLElement).dataset.targetFocus),
        ),
      ),
    )
    .toBeLessThan(0.000001);
  const afterSlide = await page.evaluate(() => {
    const z = (id: string) =>
      Number(getComputedStyle(document.querySelector(`[data-event-id="${id}"]`)!).zIndex);
    return { previous: z('school-1997-0'), next: z('school-1998-0') };
  });
  expect(afterSlide.previous).toBeGreaterThan(afterSlide.next);
});

test('a left-down drag preserves the chronological cover order', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('year-slider').fill('1997');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  const scene = page.getByTestId('scene');
  await scene.hover({ position: { x: 800, y: 390 } });
  await page.mouse.move(800, 390);
  await page.mouse.down();
  await page.mouse.move(620, 520, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => page.getByTestId('scene').getAttribute('data-phase')).toBe('idle');
  const zIndexes = await page.evaluate(() => {
    const z = (id: string) =>
      Number(getComputedStyle(document.querySelector(`[data-event-id="${id}"]`)!).zIndex);
    return {
      older: z('school-1996-0'),
      middle: z('school-1997-0'),
      newer: z('school-1998-0'),
    };
  });
  expect(zIndexes.older).toBeGreaterThan(zIndexes.middle);
  expect(zIndexes.middle).toBeGreaterThan(zIndexes.newer);
});
