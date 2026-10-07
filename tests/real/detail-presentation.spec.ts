import { test, expect } from '../e2e/fixtures';

test.use({ viewport: { width: 1920, height: 1080 } });

for (const { id, year, count } of [
  { id: 'P58', year: 2004, count: 1 },
  { id: 'P54', year: 2001, count: 2 },
  { id: 'P118', year: 2026, count: 5 },
]) {
  test(`${id} keeps only centered left photos and right text in detail`, async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('year-slider').fill(String(year));
    await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
    const source = page.locator(`.photo-card[data-event-id="${id}"]`).first();
    await source.focus();
    await source.press('Enter');
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
    expect(Math.abs((top + bottom) / 2 - 540)).toBeLessThan(2);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('event-detail')).toHaveCount(0);
    await expect(page.locator('.masthead')).toHaveCSS('opacity', '1');
    await expect(page.locator('.track-lines')).toHaveCSS('opacity', '1');
  });
}
