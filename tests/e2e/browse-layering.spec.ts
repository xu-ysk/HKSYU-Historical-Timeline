import { test, expect, type Page } from './fixtures';

// Hit-test the painted polygons, not only z-index values or bounding boxes.
async function paintedOrder(page: Page) {
  return page.evaluate(() => {
    const center = innerWidth * 0.47 - Math.sin((-32 * Math.PI) / 180) * -20;
    const counts = { left: 0, right: 0 };
    const errors: string[] = [];
    // Keep every original overlap sample, but avoid expensive hit-tests where
    // fewer than two visible bounding boxes could possibly intersect.
    const boxes = [...document.querySelectorAll<HTMLElement>('.photo-card')]
      .filter((el) => getComputedStyle(el).visibility === 'visible')
      .map((el) => el.getBoundingClientRect());
    for (let x = 50; x < innerWidth - 30; x += 22)
      for (let y = 60; y < innerHeight - 155; y += 18) {
        if (
          boxes.filter((b) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom).length < 2
        )
          continue;
        const stack = [
          ...new Set(
            document
              .elementsFromPoint(x, y)
              .map((el) => el.closest<HTMLElement>('.photo-card'))
              .filter((el): el is HTMLElement => el !== null),
          ),
        ];
        if (stack.length < 2) continue;
        const side = x < center ? 'left' : 'right';
        counts[side]++;
        const ids = stack.map((el) => el.dataset.eventId!);
        for (let i = 1; i < ids.length; i++) {
          const previous = ids[i - 1].split('-').slice(1).map(Number);
          const current = ids[i].split('-').slice(1).map(Number);
          if (previous[0] > current[0] || (previous[0] === current[0] && previous[1] > current[1]))
            errors.push(`${side}: ${ids[i - 1]} covers ${ids[i]}`);
        }
      }
    return { counts, errors };
  });
}

test('painted lower-left cards cover later events throughout dragging; upper-right order stays intact', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('year-slider').fill('1997');
  const scene = page.getByTestId('scene');
  await expect(scene).toHaveAttribute('data-zoom', '1.0000');
  // The hidden keyboard navigation scrolls its container when Playwright focuses it.
  // Restore the actual mouse-browsing viewport before hit-testing both photo stacks.
  await page.evaluate(() => {
    document.querySelector('.museum-app')!.scrollTop = 0;
  });
  const count = await page.locator('.photo-card').count();
  const initial = Number(await scene.getAttribute('data-focus'));
  const upperRightBefore = await page.evaluate(() => {
    const z = (id: string) =>
      Number(getComputedStyle(document.querySelector(`[data-event-id="${id}"]`)!).zIndex);
    return { older: z('school-1998-0'), newer: z('school-1999-0') };
  });
  await page.mouse.move(720, 410);
  await page.mouse.down();
  for (const distance of [35, 70, 120, 180, 120, 70, 35]) {
    await page.mouse.move(720 - distance, 410 + distance * 0.625, { steps: 4 });
    await expect(scene).toHaveAttribute('data-phase', 'dragging');
    const result = await paintedOrder(page);
    expect(result.counts.left, 'actually sampled overlapping lower-left polygons').toBeGreaterThan(
      5,
    );
    expect(
      result.counts.right,
      'actually sampled overlapping upper-right polygons',
    ).toBeGreaterThan(5);
    expect(result.errors).toEqual([]);
  }
  await page.mouse.up();
  expect(Number(await scene.getAttribute('data-focus'))).toBeGreaterThan(initial);
  const upperRightAfter = await page.evaluate(() => {
    const z = (id: string) =>
      Number(getComputedStyle(document.querySelector(`[data-event-id="${id}"]`)!).zIndex);
    return { older: z('school-1998-0'), newer: z('school-1999-0') };
  });
  expect(upperRightBefore.older).toBeGreaterThan(upperRightBefore.newer);
  expect(upperRightAfter.older).toBeGreaterThan(upperRightAfter.newer);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.photo-card')).toHaveCount(count);
  await page.screenshot({ path: test.info().outputPath('chronological-browse.png') });
});
