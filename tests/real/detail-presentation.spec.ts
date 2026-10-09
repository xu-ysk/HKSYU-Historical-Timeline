import { test, expect } from '../e2e/fixtures';

test.use({ viewport: { width: 1920, height: 1080 } });

for (const { id, minimum, count } of [
  { id: 'P03', minimum: { height: 530 }, count: 1 },
  { id: 'P04', minimum: { width: 560 }, count: 2 },
]) {
  test(`${id} uses the larger single or paired detail photo region`, async ({ page }) => {
    await page.setViewportSize({ width: 1900, height: 850 });
    await page.goto('/');
    await page.getByTestId('year-slider').fill('1972');
    const source = page.locator(`.photo-card[data-event-id="${id}"]`).first();
    await source.focus();
    await source.press('Enter');
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
    const photos = page.locator(`.photo-card[data-event-id="${id}"][data-extracted="true"]`);
    await expect(photos).toHaveCount(count);
    const text = (await page.getByTestId('detail-text').boundingBox())!;
    const scene = (await page.getByTestId('scene').boundingBox())!;
    for (const photo of await photos.all()) {
      const box = (await photo.boundingBox())!;
      if (minimum.height) expect(box.height).toBeGreaterThan(minimum.height);
      if (minimum.width) expect(box.width).toBeGreaterThan(minimum.width);
      expect(box.x + box.width).toBeLessThan(text.x - 25);
      expect(box.y).toBeGreaterThanOrEqual(scene.y + 100);
      expect(box.y + box.height).toBeLessThanOrEqual(scene.y + scene.height - 100);
    }
    if (id === 'P04') {
      const box = (await photos.first().boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, -300);
      await expect.poll(async () => Number(await photos.first().getAttribute('data-photo-scale'))).toBeGreaterThan(1.2);
    }
    await page.getByTestId('close-detail').click();
    await expect(page.getByTestId('event-detail')).toHaveCount(0);
  });
}

for (const { id, year, count } of [
  { id: 'P58', year: 2004, count: 2 },
  { id: 'P54', year: 2001, count: 2 },
  { id: 'P118', year: 2026, count: 5 },
]) {
  test(`${id} keeps only centered left photos and right text in detail`, async ({ page }) => {
    if (id === 'P118') await page.setViewportSize({ width: 1832, height: 766 });
    await page.goto('/');
    await page.getByTestId('year-slider').fill(String(year));
    await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
    const source = page.locator(`.photo-card[data-event-id="${id}"]`).first();
    await source.evaluate((element: HTMLElement) => element.focus({ preventScroll: true }));
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');

    const text = page.getByTestId('detail-text');
    await expect(text).toBeVisible();
    await expect(text.locator('.detail-caption')).toHaveCount(0);
    await expect(page.locator('.detail-scrim')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    for (const selector of ['.masthead', '.view-switch', '.bottom-panel', '.track-lines']) {
      await expect(page.locator(selector)).toHaveCSS('opacity', '0');
    }
    await expect(page.locator('.photo-card:not([data-extracted="true"])').first()).toHaveCSS(
      'opacity',
      '0',
    );

    const photos = page.locator(`.photo-card[data-event-id="${id}"][data-extracted="true"]`);
    await expect(photos).toHaveCount(count);
    await expect.poll(() => photos.locator('img').evaluateAll((images) =>
      images.every((image) => (image as HTMLImageElement).complete &&
        (image as HTMLImageElement).naturalWidth > 0),
    )).toBe(true);
    const boxes = await photos.evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }),
    );
    const textBox = (await text.boundingBox())!;
    expect(boxes.every((box) => box.left >= 0 && box.right < textBox.x)).toBe(true);
    const top = Math.min(...boxes.map((box) => box.top));
    const bottom = Math.max(...boxes.map((box) => box.bottom));
    expect(Math.abs((top + bottom) / 2 - page.viewportSize()!.height / 2)).toBeLessThan(2);
    if (id === 'P118') {
      expect(Math.min(...boxes.map((box) => box.right - box.left))).toBeGreaterThan(300);
      expect(Math.max(...boxes.slice(0, 3).map((box) => box.bottom))).toBeLessThan(
        Math.min(...boxes.slice(3).map((box) => box.top)),
      );
      for (const [index, box] of boxes.entries())
        for (const other of boxes.slice(index + 1))
          expect(
            Math.max(0, Math.min(box.right, other.right) - Math.max(box.left, other.left)) *
              Math.max(0, Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top)),
          ).toBeLessThan(0.01);
    }

    await page.getByTestId('close-detail').click();
    await expect(page.getByTestId('event-detail')).toHaveCount(0);
    await expect(page.locator('.masthead')).toHaveCSS('opacity', '1');
    await expect(page.locator('.track-lines')).toHaveCSS('opacity', '1');
  });
}
