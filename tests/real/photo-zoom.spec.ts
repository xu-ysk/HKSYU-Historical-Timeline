import { expect, test } from '../e2e/fixtures';

test.use({ viewport: { width: 1920, height: 1080 } });

async function openFivePhotoDetail(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByTestId('year-slider').fill('2026');
  const source = page.locator('.photo-card[data-event-id="P118"]').first();
  await source.focus();
  await source.press('Enter');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  const photo = page.locator('.photo-card[data-event-id="P118"][data-extracted="true"]').first();
  await expect(photo.locator('img')).toBeVisible();
  await expect.poll(() => photo.locator('img').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  return photo;
}

test('mouse wheel zooms one photo without moving the timeline and resets on close', async ({ page }) => {
  const photo = await openFivePhotoDetail(page);
  const box = (await photo.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -400);
  await expect.poll(async () => Number(await photo.getAttribute('data-photo-scale'))).toBeGreaterThan(1.2);
  await expect(page.locator('.photo-card[data-event-id="P118"]').nth(1)).not.toHaveAttribute('data-photo-scale');
  const image = photo.locator('img');
  const beforePan = await image.evaluate((element) => element.style.transform);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 3 });
  await page.mouse.up();
  expect(await image.evaluate((element) => element.style.transform)).not.toBe(beforePan);
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await expect(page.getByTestId('current-year')).toContainText('2026');
  await page.mouse.wheel(0, 1000);
  await expect.poll(async () => Number(await photo.getAttribute('data-photo-scale'))).toBe(1);
  await page.getByTestId('close-detail').click();
  await expect(page.getByTestId('event-detail')).toHaveCount(0);
  await expect(page.locator('.photo-card[data-event-id="P118"]').first()).not.toHaveAttribute('data-photo-scale');
});

test.describe('exhibition touchscreen', () => {
  test.use({ hasTouch: true });

  test('two fingers enlarge and shrink a photo without changing its layout', async ({ page }) => {
    const photo = await openFivePhotoDetail(page);
    const box = (await photo.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const session = await page.context().newCDPSession(page);
    const points = (gap: number) => [
      { x: x - gap, y, id: 1 },
      { x: x + gap, y, id: 2 },
    ];
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(25) });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(65) });
    await expect.poll(async () => Number(await photo.getAttribute('data-photo-scale'))).toBeGreaterThan(1.5);
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(20) });
    await expect.poll(async () => Number(await photo.getAttribute('data-photo-scale'))).toBe(1);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
    await session.detach();
  });
});
