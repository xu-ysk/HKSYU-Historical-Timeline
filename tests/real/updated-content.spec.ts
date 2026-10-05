import { test, expect } from '../e2e/fixtures';

test('upper rail displays the newly imported English text', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('language-en').click();
  await expect(page.getByTestId('upper-rail-title')).toContainText('Hu Hung Lick');
  await expect(page.getByTestId('upper-rail-body')).toContainText('After the war');
});

for (const sample of [
  { id: 'P54', year: 2001, photos: 2, locale: 'zh-Hant', width: 1440, height: 900 },
  { id: 'P58', year: 2004, photos: 1, locale: 'zh-Hans', width: 1280, height: 720 },
  { id: 'P59', year: 2004, photos: 1, locale: 'en', width: 1440, height: 900 },
  { id: 'P67', year: 2006, photos: 2, locale: 'zh-Hant', width: 1280, height: 720 },
])
  test(`${sample.id} displays photos left and new body right`, async ({ page }) => {
    await page.setViewportSize({ width: sample.width, height: sample.height });
    await page.goto('/');
    await page.getByTestId(`language-${sample.locale}`).click();
    await page.getByTestId('year-slider').fill(String(sample.year));
    await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
    const source = page.locator(`.photo-card[data-event-id="${sample.id}"]`).first();
    await expect(source).toBeVisible();
    await source.focus();
    await source.press('Enter');
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', sample.id);
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
    await expect(page.getByTestId('event-detail')).toHaveAttribute(
      'data-placeholder-only',
      'false',
    );
    await expect(page.getByTestId('detail-body')).not.toBeEmpty();
    const text = (await page.getByTestId('detail-text').boundingBox())!;
    const photos = await page.locator('[data-extracted="true"]').all();
    expect(photos).toHaveLength(sample.photos);
    for (const photo of photos) {
      const box = (await photo.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThan(text.x);
    }
    await page.screenshot({
      path: test.info().outputPath(`${sample.id}-left-photo-right-text.png`),
    });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('event-detail')).toHaveCount(0);
  });
