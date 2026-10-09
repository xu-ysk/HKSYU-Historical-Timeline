import { test, expect } from './fixtures';

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
])
  test(`upper rail visibly marks event years and follows browsing at ${size.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByTestId('scene')).toBeVisible();
    const markers = page.locator('[data-upper-year]');
    await expect(markers).toHaveCount(12);
    for (const year of [1949, 1971, 1999]) {
      const marker = page.getByTestId(`upper-year-${year}`);
      await expect(marker).toBeVisible();
      await expect(marker).toContainText(String(year));
      await expect(marker).toHaveAttribute('data-upper-year', String(year));
      const labelHit = await marker.locator('.upper-year-label').evaluate((label) => {
        const box = label.getBoundingClientRect();
        const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return {
          uncovered:
            target === label.parentElement ||
            target?.closest('.upper-rail-marker') === label.parentElement,
          hit: target?.className,
          bounds: { x: box.x, y: box.y },
        };
      });
      expect(
        labelHit.uncovered,
        `${year} label at ${JSON.stringify(labelHit.bounds)} hit ${labelHit.hit}`,
      ).toBe(true);
    }

    const marker = page.getByTestId('upper-year-1999');
    const original = await marker.boundingBox();
    await marker.click();
    await expect(page.getByTestId('current-year')).toContainText('1999');
    await expect(page.getByTestId('upper-rail-year')).toHaveText('1999');
    await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
    await expect.poll(async () => (await marker.boundingBox())!.x).not.toBeCloseTo(original!.x, 0);
    const position = await marker.evaluate((element) => {
      const marker = element as HTMLElement;
      const line = document.querySelector<SVGLineElement>('[data-track="upper"]')!;
      const x = Number.parseFloat(marker.style.left);
      const y = Number.parseFloat(marker.style.top);
      const x1 = line.x1.baseVal.value;
      const y1 = line.y1.baseVal.value;
      const x2 = line.x2.baseVal.value;
      const y2 = line.y2.baseVal.value;
      return { x, y, expectedY: y1 + ((x - x1) * (y2 - y1)) / (x2 - x1) };
    });
    expect(Math.abs(position.y - position.expectedY)).toBeLessThan(1);
    if ((await marker.getAttribute('data-label-visible')) === 'false') {
      await expect(marker.locator('.upper-year-dot')).toBeVisible();
      await expect(marker).toHaveAttribute('title', /1999/);
    } else {
      const labelState = await marker.locator('.upper-year-label').evaluate((label) => {
        const box = label.getBoundingClientRect();
        const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        const marker = label.parentElement as HTMLElement;
        const oldVisibility = marker.style.visibility;
        marker.style.visibility = 'hidden';
        const behind = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        marker.style.visibility = oldVisibility;
        return {
          uncovered: target === marker || target?.closest('.upper-rail-marker') === marker,
          photoBehind: Boolean(behind?.closest('.photo-card')),
        };
      });
      expect(labelState.uncovered).toBe(true);
      expect(labelState.photoBehind).toBe(false);
    }
  });
