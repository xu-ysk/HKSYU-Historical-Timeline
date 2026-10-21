import { test, expect, type Page } from '@playwright/test';
import { createMockTimeline } from '../../src/data/mockTimeline';
import { toCards } from '../../src/domain/normalizeTimeline';
import type { TimelineDataset } from '../../src/domain/timeline';
import { readFileSync } from 'node:fs';

const real = JSON.parse(
  readFileSync(new URL('../../public/timeline.json', import.meta.url), 'utf8'),
) as TimelineDataset;
const mock = createMockTimeline(2026);

async function prepare(page: Page, data: TimelineDataset, showGuide = false) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  if (!showGuide)
    await page.addInitScript(() => sessionStorage.setItem('museum-help-seen', 'true'));
  await page.route('**/timeline.json', (route) => route.fulfill({ json: data }));
  // Exercise real event text and dimensions without relying on remote school image availability.
  const dimensions = new Map(
    data.schoolEvents
      .flatMap((event) => event.photos)
      .filter((photo) => photo.src)
      .map((photo) => [photo.src!, photo]),
  );
  await page.route(/^https:\/\/umtimeline\.hksyu\.edu\//, (route) => {
    const photo = dimensions.get(route.request().url());
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${photo?.width ?? 2400}" height="${photo?.height ?? 1600}"><rect width="100%" height="100%" fill="#d8d2c7"/></svg>`,
    });
  });
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  return errors;
}

async function openTimelines(page: Page) {
  await page.getByTestId('view-browse').click();
  await expect(page.getByTestId('dual-timeline-scene')).toBeVisible();
  await expect(page.getByTestId('scene')).toHaveCount(0);
  await expect(page.locator('.photo-card')).toHaveCount(0);
}

async function keyYear(page: Page, key: string, year: number) {
  const scene = page.getByTestId('dual-timeline-scene');
  await scene.focus();
  await scene.press(key);
  await expect(scene).toHaveAttribute('data-year', String(year));
  await expect(scene).toHaveAttribute('data-target-year', String(year));
  await expect
    .poll(() =>
      scene.evaluate((element) => {
        const contents = element.querySelectorAll<HTMLElement>('[data-rail-content]');
        return contents[0].style.transform === contents[1].style.transform;
      }),
    )
    .toBe(true);
}

for (const [name, data] of [
  ['mock', mock],
  ['real', real],
] as const) {
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    test(`${name}: separate pages preserve album geometry and horizontal rails at ${size.width}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      const errors = await prepare(page, data);
      const count = toCards(data).length;
      await expect(page.locator('.photo-card')).toHaveCount(count);
      await expect(page.getByTestId('view-overview')).toHaveText('校史照片');
      await expect(page.getByTestId('view-browse')).toHaveText('雙時間軸');
      await expect(page.locator('.theme-button')).toHaveCount(5);
      await expect(page.getByTestId('upper-rail-panel')).toHaveCount(0);
      await expect(page.getByTestId('education-panel')).toHaveCount(0);
      const poses = await page.locator('.photo-card').evaluateAll((cards) =>
        cards.map((card) => ({
          transform: (card as HTMLElement).style.transform,
          width: (card as HTMLElement).style.width,
        })),
      );
      await page.mouse.move(size.width * 0.55, size.height * 0.4);
      await page.mouse.wheel(0, 800);
      await page.mouse.down();
      await page.mouse.move(size.width * 0.3, size.height * 0.65, { steps: 8 });
      await page.mouse.up();
      await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '0.0000');
      await expect(page.getByTestId('event-detail')).toHaveCount(0);
      expect(
        await page.locator('.photo-card').evaluateAll((cards) =>
          cards.map((card) => ({
            transform: (card as HTMLElement).style.transform,
            width: (card as HTMLElement).style.width,
          })),
        ),
      ).toEqual(poses);
      await openTimelines(page);
      await expect(page.locator('[data-upper-year]')).toHaveCount(
        data.upperRailEvents.filter((event) =>
          data.schoolEvents.some((school) => school.themeId === 'A' && school.year === event.year),
        ).length,
      );
      await expect(page.locator('[data-education-year]')).toHaveCount(
        data.educationEvents.filter((event) =>
          data.schoolEvents.some((school) => school.themeId === 'A' && school.year === event.year),
        ).length,
      );
      await expect(page.locator('.dual-rail-heading')).toHaveText([
        '01 | 樹仁校史',
        '02 | 香港教育史',
      ]);
      const rails = await page.locator('.dual-rail-line').evaluateAll((lines) =>
        lines.map((line) => {
          const rect = line.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }),
      );
      expect(rails[0].height).toBe(1);
      expect(rails[1].height).toBe(1);
      expect(rails[0].width).toBe(rails[1].width);
      expect(rails[0].y).toBeLessThan(rails[1].y);
      await expect(page.getByTestId('theme-panel')).toHaveCount(0);
      const sceneBox = (await page.getByTestId('dual-timeline-scene').boundingBox())!;
      for (const rail of rails) {
        expect(Math.abs(rail.x + rail.width / 2 - size.width / 2)).toBeLessThan(1);
      }
      expect(
        Math.abs((rails[0].y + rails[1].y + 1) / 2 - (sceneBox.y + sceneBox.height / 2)),
      ).toBeLessThan(1);
      for (const [rowId, panelId] of [
        ['upper-history-row', 'upper-rail-panel'],
        ['education-history-row', 'education-panel'],
      ]) {
        const row = page.getByTestId(rowId);
        const heading = (await row.locator('.dual-rail-heading').boundingBox())!;
        const panel = (await page.getByTestId(panelId).boundingBox())!;
        expect(panel.x).toBeGreaterThan(heading.x + heading.width);
        expect(Math.abs(panel.y - heading.y)).toBeLessThan(1);
      }
      const upperRow = (await page.getByTestId('upper-history-row').boundingBox())!;
      const educationHeading = (await page
        .getByTestId('education-history-row')
        .locator('.dual-rail-heading')
        .boundingBox())!;
      expect(upperRow.y + upperRow.height).toBeLessThan(rails[0].y);
      expect(educationHeading.y).toBeGreaterThan(rails[1].y + 40);
      const box = (await page.getByTestId('dual-drag-area').boundingBox())!;
      expect(box.y).toBeGreaterThan(rails[0].y);
      expect(box.y + box.height).toBeLessThan(rails[1].y);
      await page.screenshot({ path: test.info().outputPath(`${name}-dual-${size.width}.png`) });
      await page.getByTestId('view-overview').click();
      await expect(page.getByTestId('dual-timeline-scene')).toHaveCount(0);
      await expect(page.locator('.photo-card')).toHaveCount(count);
      await expect(page.locator('.theme-button')).toHaveCount(5);
      await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '0.0000');
      expect(
        await page.locator('.photo-card').evaluateAll((cards) =>
          cards.map((card) => ({
            transform: (card as HTMLElement).style.transform,
            width: (card as HTMLElement).style.width,
          })),
        ),
      ).toEqual(poses);
      expect(errors).toEqual([]);
    });
  }
}

test('both timelines share gestures, year clicks, endpoints and three-language content', async ({
  page,
}) => {
  const errors = await prepare(page, real);
  await openTimelines(page);
  await expect(page.getByTestId('theme-panel')).toHaveCount(0);
  const scene = page.getByTestId('dual-timeline-scene');
  // The selected theme retains its education year and matching content.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (let index = 0; index < 5; index++) await scene.press('ArrowRight');
  await page.locator('[data-education-year="1984"]').click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(scene).toHaveAttribute('data-year', '1984');
  await expect(page.getByTestId('education-panel')).toHaveAttribute('data-event-year', '1984');
  for (const locale of ['zh-Hans', 'en', 'zh-Hant'] as const) {
    await page.getByTestId(`language-${locale}`).click();
    await expect(scene).toHaveAttribute('data-year', '1984');
    await expect(page.getByTestId('education-panel')).toContainText(
      real.educationEvents.find((event) => event.year === 1984)!.title[locale]!,
    );
  }
  await keyYear(page, 'Home', 1949);
  const drag = (await page.getByTestId('dual-drag-area').boundingBox())!;
  await page.mouse.move(drag.x + drag.width * 0.55, drag.y + drag.height - 35);
  await page.mouse.down();
  await page.mouse.move(drag.x + drag.width * 0.15, drag.y + drag.height - 35, { steps: 12 });
  await expect(scene).toHaveAttribute('data-phase', 'dragging');
  const during = await scene.getAttribute('data-year');
  expect(Number(during)).toBeGreaterThan(1949);
  await page.mouse.up();
  await expect(scene).toHaveAttribute('data-phase', 'idle');
  expect(await scene.getAttribute('data-year')).not.toBe('1949');
  await keyYear(page, 'End', 2026);
  await keyYear(page, 'ArrowLeft', 2004);
  await keyYear(page, 'Home', 1949);
  await page.mouse.move(drag.x + drag.width / 2, drag.y + drag.height - 20);
  await page.mouse.wheel(0, 5000);
  await expect
    .poll(async () => Number(await scene.getAttribute('data-year')))
    .toBeGreaterThan(1949);
  await keyYear(page, 'Home', 1949);
  // Traverse all intermediate years with reduced motion after checking animated gestures above.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (let index = 0; index < 22; index++) {
    await scene.press('ArrowRight');
    await expect
      .poll(async () => await scene.getAttribute('data-year'))
      .toBe(await scene.getAttribute('data-target-year'));
  }
  const current = Number(await scene.getAttribute('data-year'));
  const target = page.locator('[data-upper-year="2004"]');
  if (current > 2004) await keyYear(page, 'Home', 1949);
  // Traverse via keyboard so no hidden offscreen marker needs a forced click.
  while (!(await target.isVisible())) {
    await scene.press('ArrowRight');
    await expect
      .poll(async () => await scene.getAttribute('data-year'))
      .toBe(await scene.getAttribute('data-target-year'));
  }
  await target.click();
  await expect(scene).toHaveAttribute('data-year', '2004');
  await expect(page.getByTestId('upper-rail-panel')).toHaveAttribute('data-event-year', '2004');
  await expect(page.getByTestId('education-panel')).toHaveAttribute('data-event-year', '2004');
  const both = await page.locator('[data-timeline-year="2004"]').evaluateAll((markers) =>
    markers.map((marker) => {
      const rect = marker.getBoundingClientRect();
      return rect.x + rect.width / 2;
    }),
  );
  expect(Math.abs(both[0] - both[1])).toBeLessThan(1);
  expect(
    await page.locator('.dual-rail').evaluateAll((rails) => rails.map((rail) => rail.scrollLeft)),
  ).toEqual([0, 0]);
  expect(errors).toEqual([]);
});

test('theme and language survive page switches without an all-themes entry', async ({ page }) => {
  const errors = await prepare(page, real);
  await page.getByTestId('language-en').click();
  await page.getByTestId('theme-C').click();
  await openTimelines(page);
  const years = new Set(
    real.schoolEvents.filter((event) => event.themeId === 'C').map((event) => event.year),
  );
  await expect(page.locator('[data-upper-year]')).toHaveCount(
    real.upperRailEvents.filter((event) => years.has(event.year)).length,
  );
  await page.getByTestId('view-overview').click();
  await expect(page.getByTestId('theme-C')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect
    .poll(() =>
      page
        .locator('.photo-card[data-theme="C"]')
        .first()
        .evaluate((card) => (card as HTMLElement).style.transform),
    )
    .toContain('scale(1)');
  await openTimelines(page);
  await expect(page.locator('.dual-reset')).toHaveCount(0);
  await page.getByTestId('view-overview').click();
  await expect(page.getByTestId('scene')).toBeVisible();
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'C');
  expect(errors).toEqual([]);
});

for (const size of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test(`English content stays in the matching heading row at ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await prepare(page, real);
    await page.getByTestId('language-en').click();
    await openTimelines(page);
    const years = [
      ...new Set([
        1949,
        2026,
        ...real.upperRailEvents
          .filter((event) =>
            real.schoolEvents.some(
              (school) => school.themeId === 'A' && school.year === event.year,
            ),
          )
          .map((event) => event.year),
        ...real.educationEvents
          .filter((event) =>
            real.schoolEvents.some(
              (school) => school.themeId === 'A' && school.year === event.year,
            ),
          )
          .map((event) => event.year),
      ]),
    ].sort((a, b) => a - b);
    const scene = page.getByTestId('dual-timeline-scene');
    for (const year of years) {
      if (year !== 1949) {
        await scene.focus();
        await scene.press('ArrowRight');
      }
      await expect(scene).toHaveAttribute('data-year', String(year));
      for (const [id, rowId, events] of [
        ['upper-rail-panel', 'upper-history-row', real.upperRailEvents],
        ['education-panel', 'education-history-row', real.educationEvents],
      ] as const) {
        const panel = page.getByTestId(id);
        const event = events.find(
          (item) =>
            item.year === year &&
            real.schoolEvents.some((school) => school.themeId === 'A' && school.year === year),
        );
        await expect(panel).toHaveAttribute('data-has-event', String(Boolean(event)));
        if (!event) continue;
        await expect(panel).toContainText(event.body.en!);
        const row = page.getByTestId(rowId);
        const rowBox = (await row.boundingBox())!;
        const heading = (await row.locator('.dual-rail-heading').boundingBox())!;
        const box = (await panel.boundingBox())!;
        expect(box.x).toBeGreaterThan(heading.x + heading.width);
        expect(box.x + box.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
        expect(box.y).toBeGreaterThanOrEqual(rowBox.y);
        expect(box.y + box.height).toBeLessThanOrEqual(rowBox.y + rowBox.height + 1);
        const reading = await panel.evaluate((element) => ({
          horizontalOverflow: element.scrollWidth > element.clientWidth + 1,
          overflowY: getComputedStyle(element).overflowY,
        }));
        expect(reading.horizontalOverflow).toBe(false);
        expect(reading.overflowY).toBe('auto');
      }
      if (year === 2004)
        await page.screenshot({ path: test.info().outputPath(`english-2004-${size.width}.png`) });
    }
    expect(errors).toEqual([]);
  });
}

test('photo details retain year navigation, wheel zoom, close and page-switch blocking', async ({
  page,
}) => {
  const errors = await prepare(page, real);
  await page.getByTestId('theme-E').click();
  const source = page.locator('.photo-card[data-event-id="P118"]').first();
  await expect(source).toBeVisible();
  await expect
    .poll(() => source.locator('img').evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await source.focus();
  await source.press('Enter');
  const detail = page.getByTestId('event-detail');
  await expect(detail).toHaveAttribute('data-phase', 'detail');
  await expect(page.locator('[data-extracted="true"]')).toHaveCount(5);
  await expect(page.getByTestId('view-browse')).toBeDisabled();
  const photo = page.locator('[data-extracted="true"]').first();
  const rect = (await photo.boundingBox())!;
  await expect
    .poll(() => photo.locator('img').evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.wheel(0, -500);
  await expect
    .poll(async () => Number(await photo.getAttribute('data-photo-scale')))
    .toBeGreaterThan(1);
  const image = photo.locator('img');
  const beforePan = await image.evaluate((element) => element.style.transform);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2 + 40, rect.y + rect.height / 2, { steps: 3 });
  await page.mouse.up();
  expect(await image.evaluate((element) => element.style.transform)).not.toBe(beforePan);
  await page.getByTestId('detail-previous').click();
  await expect(detail).not.toHaveAttribute('data-event', 'P118');
  await page.getByTestId('close-detail').click();
  await expect(detail).toHaveCount(0);
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '0.0000');
  await openTimelines(page);
  expect(errors).toEqual([]);
});

test('guide explains both pages, preserves the selected year, and returns after idle', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-21T04:00:00Z') });
  const errors = await prepare(page, real, true);
  const guide = page.getByTestId('help-overlay');
  await expect(guide).toBeVisible();
  await expect(guide.locator('.help-views span')).toHaveText(['校史照片', '雙時間軸']);
  await expect(guide).toContainText('兩條時間線中間的空白區域');
  await guide.getByRole('button', { name: '開始探索' }).click();
  await openTimelines(page);
  await keyYear(page, 'End', 2026);
  await page.getByTestId('help-trigger').click();
  await expect(guide).toBeVisible();
  await guide.getByRole('button', { name: '關閉操作指引' }).click();
  await expect(page.getByTestId('dual-timeline-scene')).toHaveAttribute('data-year', '2026');
  await page.clock.fastForward(180100);
  await expect(guide).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe('touchscreen', () => {
  test.use({ hasTouch: true, viewport: { width: 1920, height: 1080 } });
  test('horizontal swiping moves both timelines and tapping the album still opens details', async ({
    page,
  }) => {
    const errors = await prepare(page, real);
    await openTimelines(page);
    const box = (await page.getByTestId('dual-drag-area').boundingBox())!;
    const session = await page.context().newCDPSession(page);
    const x = box.x + box.width * 0.6;
    const y = box.y + box.height - 26;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    for (let step = 1; step <= 10; step++)
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - step * 55, y, id: 1 }],
      });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect
      .poll(async () =>
        Number(await page.getByTestId('dual-timeline-scene').getAttribute('data-year')),
      )
      .toBeGreaterThan(1949);
    await page.getByTestId('view-overview').tap();
    await expect(page.getByTestId('scene')).toBeVisible();
    await expect(page.getByTestId('dual-timeline-scene')).toHaveCount(0);
    const cards = page.locator('.photo-card');
    const reachable = await cards.evaluateAll((items) =>
      items.findIndex((item) => {
        const rect = item.getBoundingClientRect();
        return (
          document
            .elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
            ?.closest('.photo-card') === item
        );
      }),
    );
    expect(reachable).toBeGreaterThanOrEqual(0);
    const card = cards.nth(reachable);
    await card.tap();
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
    await page.getByTestId('close-detail').tap();
    await expect(page.getByTestId('event-detail')).toHaveCount(0);
    await session.detach();
    expect(errors).toEqual([]);
  });
});
