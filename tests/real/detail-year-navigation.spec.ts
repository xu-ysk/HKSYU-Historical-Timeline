import { test, expect } from '../e2e/fixtures';

test.use({ viewport: { width: 1920, height: 900 } });

async function expectButtonsAtPhotoCorners(page: import('@playwright/test').Page) {
  const photos = page.locator('.photo-card[data-extracted="true"]');
  const boxes = await photos.evaluateAll((items) => items.map((item) => {
    const rect = item.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  }));
  expect(boxes.length).toBeGreaterThan(0);
  const left = Math.min(...boxes.map((box) => box.left));
  const right = Math.max(...boxes.map((box) => box.right));
  const top = Math.min(...boxes.map((box) => box.top));
  const bottom = Math.max(...boxes.map((box) => box.bottom));
  const home = (await page.getByTestId('close-detail').boundingBox())!;
  expect(Math.abs(home.x - left)).toBeLessThan(3);
  expect(home.y + home.height).toBeLessThan(top);
  for (const [testId, edge] of [['detail-previous', left], ['detail-next', right]] as const) {
    const button = page.getByTestId(testId);
    if (!(await button.count())) continue;
    const box = (await button.boundingBox())!;
    expect(box.y).toBeGreaterThan(bottom);
    expect(Math.abs((testId === 'detail-previous' ? box.x : box.x + box.width) - edge)).toBeLessThan(3);
  }
}

test('home and event arrows navigate every real event without returning to the timeline', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('year-slider').fill('1971');
  const first = page.locator('.photo-card[data-event-id="P01"]').first();
  await first.focus();
  await first.press('Enter');
  const detail = page.getByTestId('event-detail');
  await expect(detail).toHaveAttribute('data-phase', 'detail');
  await expect(detail).toHaveAttribute('data-event', 'P01');
  await expect(page.getByTestId('detail-previous')).toHaveCount(0);
  const next = page.getByTestId('detail-next');
  await expect(next).toBeVisible();
  const initialDescription = await page.getByTestId('detail-body').textContent();
  const text = (await page.getByTestId('detail-text').boundingBox())!;
  const arrow = (await next.boundingBox())!;
  expect(arrow.y).toBeGreaterThan(text.y + text.height);
  expect(arrow.x).toBeGreaterThan(text.x);
  await next.click();
  await expect(detail).toHaveAttribute('data-event', 'P02');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-phase', 'detail');
  await expect(page.locator('.photo-card[data-event-id="P02"][data-extracted="true"]')).toHaveCount(2);
  await expect(page.getByTestId('detail-body')).not.toHaveText(initialDescription!);
  await page.getByTestId('detail-next').click();
  await expect(detail).toHaveAttribute('data-event', 'P03');
  await expect(page.locator('.photo-card[data-event-id="P03"][data-extracted="true"]')).toHaveCount(1);
  await expect(page.getByTestId('detail-previous')).toBeVisible();
  await page.getByTestId('detail-previous').click();
  await expect(detail).toHaveAttribute('data-event', 'P02');
  await page.getByTestId('detail-previous').click();
  await expect(detail).toHaveAttribute('data-event', 'P01');
  await expect(page.locator('.photo-card[data-event-id="P01"][data-extracted="true"]')).toHaveCount(2);
  await page.getByTestId('close-detail').click();
  await expect(detail).toHaveCount(0);
});

test('theme navigation stays within the theme and final event has no next arrow', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('theme-A').click();
  await page.getByTestId('year-slider').fill('1971');
  const first = page.locator('.photo-card[data-event-id="P01"]').first();
  await first.focus();
  await first.press('Enter');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', 'P01');
  await page.getByTestId('detail-next').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', 'P06');
  await page.getByTestId('close-detail').click();
  await expect(page.getByTestId('event-detail')).toHaveCount(0);

  await page.getByTestId('theme-A').click();
  await expect(page.getByTestId('theme-A')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('year-slider').fill('2026');
  const final = page.locator('.photo-card[data-event-id="P118"]').first();
  await expect(final).toBeVisible();
  await expect(final).toHaveAttribute('tabindex', '0');
  await final.evaluate((element: HTMLElement) => element.focus({ preventScroll: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', 'P118');
  await expect(page.getByTestId('detail-next')).toHaveCount(0);
  await page.getByTestId('detail-previous').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', 'P117');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-phase', 'detail');
});

test('all 2026 events show their own text and photos in sequence', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('year-slider').fill('2026');
  const first = page.locator('.photo-card[data-event-id="P113"]').first();
  await first.focus();
  await first.press('Enter');
  const detail = page.getByTestId('event-detail');
  for (const [index, [id, count]] of ([
    ['P113', 1], ['P114', 2], ['P115', 2], ['P116', 2], ['P117', 1], ['P118', 5],
  ] as [string, number][]).entries()) {
    await expect(detail).toHaveAttribute('data-event', id);
    await expect(page.getByTestId('detail-body')).not.toBeEmpty();
    await expect(page.locator(`.photo-card[data-event-id="${id}"][data-extracted="true"]`)).toHaveCount(count);
    if (index < 5) await page.getByTestId('detail-next').click();
  }
  await expect(page.getByTestId('detail-next')).toHaveCount(0);
});

test.describe('touch screen', () => {
  test.use({ hasTouch: true });

  test('visitors can tap through events and return with the home button', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('year-slider').fill('1971');
    const first = page.locator('.photo-card[data-event-id="P01"]').first();
    await expect(first).toBeVisible();
    await first.tap();
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', 'P01');
    await page.getByTestId('detail-next').tap();
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', 'P02');
    await expect(page.getByTestId('scene')).toHaveAttribute('data-phase', 'detail');
    await page.getByTestId('close-detail').tap();
    await expect(page.getByTestId('event-detail')).toHaveCount(0);
  });
});

test('year arrows remain below the text in the narrow browser view', async ({ page }) => {
  await page.setViewportSize({ width: 738, height: 668 });
  await page.goto('/');
  await page.getByTestId('year-slider').fill('1971');
  const first = page.locator('.photo-card[data-event-id="P01"]').first();
  await first.focus();
  await page.evaluate(() => { document.querySelector<HTMLElement>('.museum-app')!.scrollTop = 0; });
  await first.press('Enter');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  const text = (await page.getByTestId('detail-text').boundingBox())!;
  const next = (await page.getByTestId('detail-next').boundingBox())!;
  expect(next.y).toBeGreaterThan(text.y + text.height);
  expect(next.y + next.height).toBeLessThan(668);
});

test('text placeholder positions all three buttons around the card', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('year-slider').fill('2013');
  const card = page.locator('.photo-card[data-event-id="P76"]').first();
  await card.focus();
  await card.press('Enter');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await expectButtonsAtPhotoCorners(page);
  await page.getByTestId('detail-previous').click();
  await expect(page.getByTestId('event-detail')).not.toHaveAttribute('data-event', 'P76');
  await page.getByTestId('detail-next').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', 'P76');
  await expectButtonsAtPhotoCorners(page);
  await page.getByTestId('close-detail').click();
  await expect(page.getByTestId('event-detail')).toHaveCount(0);
});
