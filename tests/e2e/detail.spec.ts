import { test, expect, type Page } from './fixtures';
async function selectEvent(page: Page, year: number, order: number) {
  await page.getByTestId('view-browse').click();
  await page.getByTestId('year-slider').fill(String(year));
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  await expect(page.getByTestId('focused-event')).toHaveText(`school-${year}-0`);
  for (let i = 0; i < order; i++) {
    await page.getByTestId('next-event').click();
    await expect(page.getByTestId('focused-event')).toHaveText(`school-${year}-${i + 1}`);
  }
  // The nearest event changes before its travel ends; capture the return position
  // only once navigation has reached the requested slot.
  await expect
    .poll(() =>
      page.getByTestId('scene').evaluate((el) => {
        const scene = el as HTMLElement;
        return Math.abs(
          Number(scene.dataset.focus) - Number(scene.dataset.targetFocus ?? scene.dataset.focus),
        );
      }),
    )
    .toBeLessThan(0.000001);
}
for (const sample of [
  { year: 1949, order: 0, count: 1, name: 'text-only' },
  { year: 1949, order: 1, count: 1, name: 'single' },
  { year: 1953, order: 3, count: 2, name: 'portrait-pair' },
  { year: 1956, order: 2, count: 2, name: 'landscape-pair' },
])
  test('extract and return ' + sample.name, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('scene')).toBeVisible();
    const initialCount = await page.locator('.photo-card').count();
    await selectEvent(page, sample.year, sample.order);
    // Choose language and the event's theme before opening.
    await page.getByTestId('language-en').click();
    const focus = await page.getByTestId('scene').getAttribute('data-focus');
    const eventId = `school-${sample.year}-${sample.order}`;
    const source = page.locator(`.photo-card[data-event-id="${eventId}"]`).first();
    const theme = await source.getAttribute('data-theme');
    await page.getByTestId(`theme-${theme}`).click();
    await source.evaluate((el) => el.setAttribute('data-original-node', 'yes'));
    await source.focus();
    await source.press('Enter');
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
    await expect(page.locator('[data-extracted=true]')).toHaveCount(sample.count);
    await expect(page.locator('.photo-card')).toHaveCount(initialCount);
    await expect(source).toHaveAttribute('data-original-node', 'yes');
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event', eventId);
    const placeholderOnly =
      (await page.getByTestId('event-detail').getAttribute('data-placeholder-only')) === 'true';
    const text = placeholderOnly ? null : await page.getByTestId('detail-text').boundingBox();
    const languages = await page.locator('.languages').boundingBox(),
      viewSwitch = await page.getByTestId('view-switch').boundingBox();
    await expect(page.getByTestId('close-detail')).toBeVisible();
    expect(
      Math.abs(
        viewSwitch!.y + viewSwitch!.height / 2 - (languages!.y + languages!.height / 2),
      ),
    ).toBeLessThan(1);
    expect(viewSwitch!.x).toBeGreaterThan(languages!.x + languages!.width);
    await expect(page.getByTestId('education-panel')).toBeHidden();
    await expect(page.getByTestId('upper-rail-panel')).toBeHidden();
    await expect(page.locator('[data-upper-year]:visible')).toHaveCount(0);
    for (const photo of await page.locator('[data-extracted=true]').all()) {
      const box = await photo.boundingBox();
      expect(box!.x).toBeGreaterThan(0);
      if (placeholderOnly) {
        expect(box!.x + box!.width).toBeLessThan(1440);
        expect(box!.y).toBeGreaterThan(0);
        expect(box!.y + box!.height).toBeLessThan(900);
        if (sample.count === 1) {
          expect(Math.abs(box!.x + box!.width / 2 - 720)).toBeLessThan(1);
          expect(Math.abs(box!.y + box!.height / 2 - 450)).toBeLessThan(1);
        }
      } else {
        expect(box!.x + box!.width).toBeLessThan(text!.x);
        expect(box!.y + box!.height).toBeLessThan(710);
      }
    }
    if (sample.count === 2) {
      const boxes = await page.locator('[data-extracted=true]').evaluateAll((items) =>
        items.map((item) => {
          const box = item.getBoundingClientRect();
          return { x: box.x, y: box.y, width: box.width, height: box.height };
        }),
      );
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i],
            b = boxes[j],
            overlap =
              Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
              Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
          expect(overlap).toBeLessThan(1);
        }
    }
    await page.screenshot({ path: test.info().outputPath('stage5-' + sample.name + '.png') });
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTestId('scene')).toHaveAttribute('data-focus', focus!);
    await page.getByTestId('close-detail').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[data-extracted=true]')).toHaveCount(0);
    await expect(page.getByTestId('scene')).toHaveAttribute('data-focus', focus!);
    await expect(page.getByTestId(`theme-${theme}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
test('either placeholder card opens the same pair without moving the timeline', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await selectEvent(page, 1953, 3);
  await page.getByTestId('language-en').click();
  const source = page.locator('.photo-card[data-event-id="school-1953-3"]').nth(1);
  await source.focus();
  await source.press('Enter');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await expect(page.locator('[data-extracted=true]')).toHaveCount(2);
  await page.setViewportSize({ width: 1280, height: 720 });
  const focus = await page.getByTestId('scene').getAttribute('data-focus');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-placeholder-only', 'true');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-focus', focus!);
  await page.screenshot({ path: test.info().outputPath('stage5-compact-english-pair.png') });
  await page.getByTestId('close-detail').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(source).toBeFocused();
});
test('close during opening and dragging across a photograph never leaves a stuck detail', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.getByTestId('open-focused').click();
  await page.getByTestId('close-detail').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await page.getByTestId('close-detail').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByTestId('view-browse').click();
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  const box = await page.locator('.photo-card[data-event-id="school-1949-0"]').boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x - 100, box!.y + 100, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('scene')).toHaveAttribute('data-phase', 'idle');
});
