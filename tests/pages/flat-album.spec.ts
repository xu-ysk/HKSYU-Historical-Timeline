import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { TimelineDataset } from '../../src/domain/timeline';

const data = JSON.parse(
  readFileSync(new URL('../../public/timeline.json', import.meta.url), 'utf8'),
) as TimelineDataset;

async function prepare(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('museum-help-seen', 'true'));
  await page.route('**/timeline.json', (route) => route.fulfill({ json: data }));
  const photos = new Map(
    data.schoolEvents.flatMap((event) => event.photos).map((photo) => [photo.src, photo]),
  );
  await page.route(/^https:\/\/umtimeline\.hksyu\.edu\//, (route) => {
    const photo = photos.get(route.request().url());
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${photo?.width ?? 2400}" height="${photo?.height ?? 1600}"><rect width="100%" height="100%" fill="#d8d2c7"/></svg>`,
    });
  });
  await page.goto('/');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-album-layout', 'serpentine');
  return errors;
}

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`default campus stacks and every theme fit one flat screen at ${size.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    const errors = await prepare(page);
    await expect(page.getByTestId('theme-A')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'A');
    for (const theme of ['A', 'B', 'C', 'D', 'E'] as const) {
      await page.getByTestId(`theme-${theme}`).click();
      const events = data.schoolEvents.filter((event) => event.themeId === theme);
      const groups = [...new Set(events.map((event) => event.photoGroupId))];
      const expectedCards = events.reduce(
        (sum, event) => sum + Math.max(1, event.photos.length),
        0,
      );
      await expect(page.getByTestId('scene')).toHaveAttribute(
        'data-album-groups',
        String(groups.length),
      );
      await expect(page.locator('.photo-card:visible')).toHaveCount(expectedCards);
      await expect(page.locator('.flat-album-year:not([hidden])')).toHaveCount(groups.length);
      const themeBox = (await page.getByTestId('theme-panel').boundingBox())!;
      const boxes = await page.locator('.photo-card:visible').evaluateAll((cards) =>
        cards.map((card) => {
          const box = card.getBoundingClientRect();
          return {
            x: box.x,
            y: box.y,
            right: box.right,
            bottom: box.bottom,
            transform: (card as HTMLElement).style.transform,
          };
        }),
      );
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(32);
        expect(box.right).toBeLessThanOrEqual(size.width - 32);
        expect(box.y).toBeGreaterThanOrEqual(100);
        expect(box.bottom).toBeLessThan(themeBox.y - 8);
        expect(box.transform).toContain('rotateY(0deg) rotateZ(0deg) skewY(0deg) scale(1)');
      }
      const sequence = await page.locator('.flat-album-year:not([hidden])').evaluateAll((labels) =>
        labels.map((label) => ({
          eventId: (label as HTMLElement).dataset.eventId!,
          row: Number((label as HTMLElement).dataset.albumRow),
          x: label.getBoundingClientRect().x,
          y: label.getBoundingClientRect().y,
        })),
      );
      expect(sequence.map((item) => item.eventId)).toEqual(events.map((event) => event.id));
      for (let index = 1; index < sequence.length; index++) {
        const current = sequence[index],
          previous = sequence[index - 1];
        if (current.row === previous.row)
          expect(Math.sign(current.x - previous.x)).toBe(current.row % 2 ? -1 : 1);
        else expect(current.y).toBeGreaterThan(previous.y);
      }
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollHeight <= innerHeight &&
            document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (theme === 'A' || theme === 'E')
        await page.screenshot({ path: test.info().outputPath(`flat-${theme}-${size.width}.png`) });
    }
    await expect(page.locator('.flat-album-reset, .theme-home')).toHaveCount(0);
    await page.getByTestId('theme-A').click();
    await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'A');
    expect(errors).toEqual([]);
  });
}

test('a five-photo stack opens slowly, restores the same stack, and preserves detail navigation', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-21T04:00:00Z') });
  const errors = await prepare(page);
  await page.getByTestId('theme-E').click();
  await page.clock.pauseAt(new Date('2026-10-21T04:01:00Z'));
  const stack = page.locator('.photo-card[data-event-id="P118"]');
  const before = await stack.evaluateAll((cards) =>
    cards.map((card) => ({
      transform: (card as HTMLElement).style.transform,
      width: (card as HTMLElement).style.width,
    })),
  );
  const selected = stack.last();
  await selected.click();
  const detail = page.getByTestId('event-detail');
  await expect(detail).toHaveAttribute('data-phase', 'opening');
  await page.clock.runFor(400);
  await expect(page.locator('[data-extracted="true"]')).toHaveCount(5);
  expect(
    Number(await page.getByTestId('scene').getAttribute('data-detail-progress')),
  ).toBeGreaterThan(0.15);
  await expect(detail).toHaveAttribute('data-phase', 'opening');
  expect(await stack.first().getAttribute('style')).not.toContain(before[0].transform);
  await page.clock.runFor(1400);
  await expect(detail).toHaveAttribute('data-phase', 'detail');
  await expect(page.getByTestId('view-browse')).toBeDisabled();
  const rects = await stack.evaluateAll((cards) =>
    cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
    }),
  );
  for (let index = 0; index < rects.length; index++)
    for (let other = index + 1; other < rects.length; other++) {
      const a = rects[index],
        b = rects[other];
      expect(
        a.x < b.right - 1 && a.right > b.x + 1 && a.y < b.bottom - 1 && a.bottom > b.y + 1,
      ).toBe(false);
    }
  await page.getByTestId('close-detail').click();
  await page.clock.runFor(1000);
  await expect(detail).toHaveCount(0);
  expect(
    await stack.evaluateAll((cards) =>
      cards.map((card) => ({
        transform: (card as HTMLElement).style.transform,
        width: (card as HTMLElement).style.width,
      })),
    ),
  ).toEqual(before);
  await stack.last().click();
  await page.clock.runFor(1800);
  await expect(detail).toHaveAttribute('data-phase', 'detail');
  await page.getByTestId('detail-previous').click();
  await expect(detail).not.toHaveAttribute('data-event', 'P118');
  await page.getByTestId('close-detail').click();
  await page.clock.runFor(1000);
  await expect(detail).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('resizing reflows the selected theme and keeps its years above the footer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors = await prepare(page);
  await page.getByTestId('theme-D').click();
  const firstCard = page.locator('.photo-card[data-theme="D"]').first();
  const initialWidth = await firstCard.evaluate((card) => card.getBoundingClientRect().width);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect
    .poll(() => firstCard.evaluate((card) => card.getBoundingClientRect().width))
    .toBeLessThan(initialWidth - 1);
  await page.getByTestId('language-en').click();
  await expect(page.getByTestId('theme-D')).toHaveAttribute('aria-pressed', 'true');
  const footer = (await page.getByTestId('theme-panel').boundingBox())!;
  await expect
    .poll(() =>
      page.locator('.photo-card:visible, .flat-album-year:not([hidden])').evaluateAll((elements) =>
        elements.every((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.left >= 32 && box.right <= 1248 && box.top >= 100 && box.bottom < innerHeight - 176
          );
        }),
      ),
    )
    .toBe(true);
  const years = await page
    .locator('.flat-album-year:not([hidden])')
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().bottom));
  expect(Math.max(...years)).toBeLessThan(footer.y - 8);
  await expect(page.locator('.flat-album-year:not([hidden])')).toHaveCount(
    new Set(
      data.schoolEvents.filter((event) => event.themeId === 'D').map((event) => event.photoGroupId),
    ).size,
  );
  expect(errors).toEqual([]);
});

test.describe('photo touchscreen', () => {
  test.use({ hasTouch: true, viewport: { width: 1920, height: 1080 } });
  test('pinch and one-finger pan retain the expanded five-photo layout', async ({ page }) => {
    const errors = await prepare(page);
    await page.getByTestId('theme-E').tap();
    await page.locator('.photo-card[data-event-id="P118"]').last().tap();
    const detail = page.getByTestId('event-detail');
    await expect(detail).toHaveAttribute('data-phase', 'detail');
    const photo = page.locator('.photo-card[data-event-id="P118"]').first();
    await expect
      .poll(() => photo.locator('img').evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    const box = (await photo.boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    const poses = await page
      .locator('[data-extracted="true"]')
      .evaluateAll((cards) => cards.map((card) => (card as HTMLElement).style.transform));
    const session = await page.context().newCDPSession(page);
    const points = (gap: number) => [
      { x: x - gap, y, id: 1 },
      { x: x + gap, y, id: 2 },
    ];
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(25) });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(65) });
    await expect
      .poll(async () => Number(await photo.getAttribute('data-photo-scale')))
      .toBeGreaterThan(1.5);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const image = photo.locator('img');
    const before = await image.evaluate((element) => element.style.transform);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + 35, y, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(await image.evaluate((element) => element.style.transform)).not.toBe(before);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(25) });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(5) });
    await expect.poll(async () => Number(await photo.getAttribute('data-photo-scale'))).toBe(1);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(
      await page
        .locator('[data-extracted="true"]')
        .evaluateAll((cards) => cards.map((card) => (card as HTMLElement).style.transform)),
    ).toEqual(poses);
    await expect(detail).toHaveAttribute('data-event', 'P118');
    await page.getByTestId('close-detail').tap();
    await expect(detail).toHaveCount(0);
    await expect(photo).not.toHaveAttribute('data-photo-scale');
    await session.detach();
    expect(errors).toEqual([]);
  });
});

test('either exposed sheet of a pair opens the whole event and reduced motion remains supported', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await prepare(page);
  const event = data.schoolEvents.find(
    (event) => event.themeId === 'A' && event.photos.length === 2,
  )!;
  const cards = page.locator(`.photo-card[data-event-id="${event.id}"]`);
  const back = (await cards.first().boundingBox())!;
  await page.mouse.click(back.x + 4, back.y + back.height - 4);
  const detail = page.getByTestId('event-detail');
  await expect(detail).toHaveAttribute('data-phase', 'detail');
  await expect(detail).toHaveAttribute('data-event', event.id);
  await expect(page.locator('[data-extracted="true"]')).toHaveCount(2);
  await page.getByTestId('close-detail').click();
  await expect(detail).toHaveCount(0);
  await cards.last().click();
  await expect(detail).toHaveAttribute('data-phase', 'detail');
  await page.getByTestId('close-detail').click();
  await expect(detail).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('automatic return restores campus development without showing all photographs', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-21T04:00:00Z') });
  const errors = await prepare(page);
  await page.getByTestId('theme-D').click();
  await page.clock.fastForward(180100);
  const guide = page.getByTestId('help-overlay');
  if (await guide.isVisible()) await guide.getByRole('button', { name: '開始探索' }).click();
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'A');
  await expect(page.locator('.photo-card:visible:not([data-theme="A"])')).toHaveCount(0);
  await expect(page.locator('.photo-card:visible')).toHaveCount(
    data.schoolEvents
      .filter((event) => event.themeId === 'A')
      .reduce((sum, event) => sum + Math.max(1, event.photos.length), 0),
  );
  await expect(page.locator('.flat-album-reset, .theme-home')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'A');
  expect(errors).toEqual([]);
});
