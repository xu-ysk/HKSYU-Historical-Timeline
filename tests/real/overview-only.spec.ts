import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import type { TimelineDataset } from '../../src/domain/timeline';
import { educationYearLabel, localized } from '../../src/domain/timeline';

const data = JSON.parse(readFileSync('public/timeline.json', 'utf8')) as TimelineDataset;
const locales = ['en', 'zh-Hans', 'zh-Hant'] as const;
const prefix = (lane: 'upper' | 'education') => lane === 'upper' ? 'upper-rail' : 'education';
test.use({ hasTouch: true });

test('the 1949 education point stays visible and updates its inline panel on exhibition screens', async ({ page }) => {
  test.setTimeout(60000);
  for (const size of [
    { width: 1280, height: 720 }, { width: 1440, height: 900 },
    { width: 1920, height: 1080 }, { width: 3840, height: 2160 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('/');
    const point = page.locator('[data-education-year="1949"]');
    await expect(point).toBeVisible();
    for (const element of [point, point.locator('.education-year-label')])
      await expect(element).toBeInViewport({ ratio: 1 });
    await point.tap();
    await expect(page.getByTestId('education-panel')).toBeVisible();
    await expect(page.getByTestId('education-year')).toHaveText('1949–1950');
    await expect(page.getByTestId('rail-event-detail')).toHaveCount(0);
    await expect(page.locator('.museum-app')).toHaveJSProperty('inert', false);
    await page.getByTestId('theme-A').click();
    await page.getByTestId('theme-home-education').click();
    await expect(point).toBeInViewport({ ratio: 1 });
    await point.tap();
    await expect(page.getByTestId('education-year')).toHaveText('1949–1950');
  }
});

test('every real point updates its own panel in all languages without moving the album or blocking the other lane', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await expect(page.locator('[data-upper-year]')).toHaveCount(data.upperRailEvents.length);
  const geometry = () => page.locator('.photo-card,[data-track]').evaluateAll(nodes => nodes.map(node =>
    node instanceof SVGLineElement ? [node.getAttribute('x1'), node.getAttribute('y1'), node.getAttribute('x2'), node.getAttribute('y2')] : (node as HTMLElement).style.transform));
  const before = await geometry();
  for (const lane of ['upper', 'education'] as const) {
    const events = lane === 'upper' ? data.upperRailEvents : data.educationEvents;
    const years = [...new Set(events.map(event => event.year))];
    const panel = page.getByTestId(`${prefix(lane)}-panel`);
    const other = page.getByTestId(lane === 'upper' ? 'education-panel' : 'upper-rail-panel');
    const otherText = await other.textContent();
    for (const year of years) {
      await page.locator(lane === 'upper' ? `[data-upper-year="${year}"]` : `[data-education-year="${year}"]`).first().click();
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute('data-event-year', String(year));
      const records = events.filter(event => event.year === year);
      await expect(panel.locator('[data-rail-record]')).toHaveCount(records.length);
      for (const locale of locales) {
        await page.getByTestId(`language-${locale}`).click();
        for (const record of records) {
          const article = panel.locator(`[data-rail-record="${record.id}"]`);
          if (localized(record.title, locale)) await expect(article.locator('h2')).toHaveText(localized(record.title, locale));
          if (localized(record.body, locale)) await expect(article.locator('p')).toHaveText(localized(record.body, locale));
        }
      }
      await expect(page.getByTestId('rail-event-detail')).toHaveCount(0);
      await expect(page.locator('.museum-app')).toHaveJSProperty('inert', false);
      expect(await other.textContent()).toBe(otherText);
    }
  }
  expect(await geometry()).toEqual(before);
});

for (const size of [
  { width: 1280, height: 720 }, { width: 1440, height: 900 },
  { width: 1920, height: 869 }, { width: 1920, height: 1080 }, { width: 3840, height: 2160 },
]) {
  test(`inline history copy fits the side regions in all languages at ${size.width}x${size.height}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize(size);
    await page.goto('/');
    for (const lane of ['upper', 'education'] as const) {
      const events = lane === 'upper' ? data.upperRailEvents : data.educationEvents;
      const targets = lane === 'upper' ? ['T01', 'T17', 'T28'] : ['B03', 'B14', 'B16', 'B20'];
      const panel = page.getByTestId(`${prefix(lane)}-panel`);
      for (const id of targets) {
        const event = events.find(item => item.id === id)!;
        await page.locator(lane === 'upper' ? `[data-upper-year="${event.year}"]` : `[data-education-year="${event.year}"]`).first().tap();
        for (const locale of locales) {
          await page.getByTestId(`language-${locale}`).click();
          await expect(panel).toBeVisible();
          await expect(panel.locator(`[data-rail-record="${id}"] p`)).toHaveText(localized(event.body, locale));
          if (lane === 'education') await expect(panel.locator('.rail-side-year')).toHaveText(educationYearLabel(event, locale));
          await expect(panel).toBeInViewport({ ratio: 1 });
          const box = (await panel.boundingBox())!;
          if (lane === 'upper') expect(box.x + box.width).toBeLessThan(size.width / 2);
          else expect(box.x).toBeGreaterThan(size.width / 2);
          const heading = (await panel.locator('.eyebrow').boundingBox())!;
          const copy = (await panel.locator('.rail-side-copy').boundingBox())!;
          expect(copy.y).toBeGreaterThanOrEqual(heading.y + heading.height);
          expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
          const theme = (await page.locator('.theme-list').boundingBox())!;
          if (lane === 'education') expect(box.y + box.height + 12).toBeLessThan(theme.y);
          const text = panel.locator(`[data-rail-record="${id}"] p`);
          expect(Number.parseFloat(await text.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(10);
        }
      }
    }
    await page.screenshot({ path: test.info().outputPath('inline-history.png') });
  });
}

for (const lane of ['upper', 'education'] as const) {
  test(`inline arrows traverse distinct years on ${lane} and stop at both ends`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    const panel = page.getByTestId(`${prefix(lane)}-panel`);
    const previous = page.getByTestId(`${prefix(lane)}-previous`);
    const next = page.getByTestId(`${prefix(lane)}-next`);
    const events = lane === 'upper' ? data.upperRailEvents : data.educationEvents;
    const years = [...new Set(events.map(event => event.year))].sort((a, b) => a - b);
    await page.locator(lane === 'upper' ? '[data-upper-year]' : '[data-education-year]').first().tap();
    await expect(previous).toBeDisabled();
    for (const [index, year] of years.entries()) {
      await expect(panel).toHaveAttribute('data-event-year', String(year));
      await expect(panel.locator('[data-rail-record]')).toHaveCount(events.filter(event => event.year === year).length);
      await expect(previous).toBeInViewport({ ratio: 1 });
      await expect(next).toBeInViewport({ ratio: 1 });
      if (index < years.length - 1) await next.tap();
    }
    await expect(next).toBeDisabled();
    for (const year of years.slice(0, -1).reverse()) {
      await previous.tap();
      await expect(panel).toHaveAttribute('data-event-year', String(year));
    }
    await expect(previous).toBeDisabled();
    await expect(page.getByTestId('rail-event-detail')).toHaveCount(0);
    await page.getByTestId('language-en').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('language-en')).toHaveAttribute('aria-pressed', 'true');
  });
}

test('wheel, mouse drag and touch swipe leave the overview geometry unchanged', async ({ page }) => {
  await page.goto('/');
  const scene = page.getByTestId('scene');
  await expect(scene).toHaveAttribute('data-zoom', '0.0000');
  await expect(page.getByTestId('view-browse')).toHaveCount(0);
  const geometry = () => page.locator('[data-track],.photo-card').evaluateAll((nodes) =>
    nodes.map((node) => node instanceof SVGLineElement
      ? [node.getAttribute('x1'), node.getAttribute('y1'), node.getAttribute('x2'), node.getAttribute('y2')]
      : (node as HTMLElement).style.transform),
  );
  const before = await geometry();
  await page.mouse.move(720, 750);
  await page.mouse.wheel(0, 900);
  await page.mouse.down();
  await page.mouse.move(1000, 500, { steps: 12 });
  await page.mouse.up();
  // Native touch events exercise the same input path as the exhibition screen.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 700, y: 750 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 1000, y: 500 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(1100); // Would allow the former browse transition to finish.
  await expect(scene).toHaveAttribute('data-mode', 'overview');
  await expect(scene).toHaveAttribute('data-zoom', '0.0000');
  await expect(scene).toHaveAttribute('data-focus', '0.000000');
  expect(await geometry()).toEqual(before);
  await expect(page.getByTestId('event-detail')).toHaveCount(0);
});

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 869 },
  { width: 1920, height: 1080 },
]) {
  test(`theme collections have even spacing and align with the home album at ${size.width}x${size.height}`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize(size);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const cards = page.locator('.photo-card');
    await expect(cards).toHaveCount(data.schoolEvents.reduce((sum, event) => sum + Math.max(1, event.photos.length), 0));
    await expect(cards.first()).toHaveAttribute('style', /scale\(1\)/);
    const overview = await cards.evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).style.transform));
    const homeAxisY = await page.locator('[data-track="upper"],[data-track="education"]').evaluateAll((lines) => {
      const heights = lines.map((line) => {
        const x1 = Number(line.getAttribute('x1')), y1 = Number(line.getAttribute('y1'));
        const x2 = Number(line.getAttribute('x2')), y2 = Number(line.getAttribute('y2'));
        return y1 + (window.innerWidth / 2 - x1) * (y2 - y1) / (x2 - x1);
      });
      return (heights[0] + heights[1]) / 2;
    });
    for (const theme of ['A', 'B', 'C', 'D', 'E']) {
      await page.getByTestId(`theme-${theme}`).click();
      const selected = page.locator(`.photo-card[data-theme="${theme}"]:visible`);
      const count = data.schoolEvents
        .filter((event) => event.themeId === theme)
        .reduce((sum, event) => sum + Math.max(1, event.photos.length), 0);
      await expect(selected).toHaveCount(count);
      await expect(selected.last()).toHaveAttribute('style', /scale\(2.2\)/);
      const boxes = await selected.evaluateAll((nodes) => nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2,
          left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }));
      const gaps = boxes.slice(1).map((box, index) => Math.hypot(box.x - boxes[index].x, box.y - boxes[index].y));
      expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.1);
      expect(Math.min(...gaps)).toBeGreaterThan(15);
      expect(Math.max(...gaps)).toBeLessThanOrEqual(52.1);
      expect(Math.abs((boxes[0].x + boxes.at(-1)!.x) / 2 - size.width / 2)).toBeLessThan(1);
      expect(Math.abs((boxes[0].y + boxes.at(-1)!.y) / 2 - homeAxisY)).toBeLessThan(1);
      expect(boxes.every((box) => box.left > 0 && box.top > 0 && box.right < size.width && box.bottom < size.height)).toBe(true);
      await selected.first().click();
      await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
      await page.getByTestId('close-detail').click();
      await expect(page.getByTestId('event-detail')).toHaveCount(0);
      await page.getByTestId('theme-home-upper').click();
      await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');
      await expect(cards.first()).toHaveAttribute('style', /scale\(1\)/);
      expect(await cards.evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).style.transform))).toEqual(overview);
    }
  });
}

test('theme filtering, photo detail and return controls remain usable', async ({ page }) => {
  await page.goto('/');
  const historyElements = page.locator(
    '[data-track="upper"],[data-track="education"],.upper-rail-marker,.education-dot,.year-tick,.upper-rail-panel,.education-panel,.swipe-guide > span,.swipe-guide-arrow',
  );
  for (const theme of ['A', 'B', 'C', 'D', 'E']) {
    await page.getByTestId(`theme-${theme}`).click();
    await expect(page.getByTestId(`theme-${theme}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(historyElements.filter({ visible: true })).toHaveCount(0);
    await expect(page.locator(`[data-theme="${theme}"].photo-card:visible`).first()).toBeVisible();
    await expect(page.locator(`[data-theme]:not([data-theme="${theme}"]).photo-card:visible`)).toHaveCount(0);
    await expect(page.getByTestId('theme-home-upper')).toBeVisible();
    await expect(page.getByTestId('theme-home-education')).toBeVisible();
  }
  await page.getByTestId('theme-A').click();
  await expect(page.getByTestId('theme-A')).toHaveAttribute('aria-pressed', 'true');
  const photos = page.locator('.photo-card[data-theme="A"]:visible');
  await expect(photos.first()).toBeVisible();
  await expect(page.locator('.photo-card:not([data-theme="A"]):visible')).toHaveCount(0);
  await photos.first().tap();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await page.getByTestId('close-detail').tap();
  await expect(page.getByTestId('event-detail')).toHaveCount(0);
  await expect(page.getByTestId('theme-A')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('theme-home-upper').tap();
  await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');
  await expect(page.locator('[data-track="upper"]')).toBeVisible();
  await expect(page.locator('[data-track="education"]')).toBeVisible();
  await expect(page.locator('[data-education-year="2000"]')).toBeVisible();
  await page.locator('[data-upper-year="1971"]').tap();
  await expect(page.getByTestId('upper-rail-panel')).toHaveAttribute('data-event-year', '1971');
  await expect(page.getByTestId('rail-event-detail')).toHaveCount(0);
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '0.0000');
  await expect(page.getByTestId('theme-A')).toHaveAttribute('aria-pressed', 'false');
});

test('both history rails restore their dots and year labels after every theme return', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  const markers = page.locator('[data-upper-year],[data-education-year],[data-education-label]');
  const geometry = () => markers.evaluateAll((nodes) => nodes.map((node) => {
    const el = node as HTMLElement;
    return {
      year: el.dataset.upperYear ?? el.dataset.educationYear ?? el.dataset.educationLabel,
      left: el.style.left,
      top: el.style.top,
      labelX: el.style.getPropertyValue('--year-label-x'),
      labelY: el.style.getPropertyValue('--year-label-y'),
      visibility: el.style.visibility,
    };
  }));
  const distances = () => page.locator('[data-upper-year],[data-education-year]').evaluateAll((nodes) =>
    nodes.map((node) => {
      const lane = node.hasAttribute('data-upper-year') ? 'upper' : 'education';
      const line = document.querySelector<SVGLineElement>(`[data-track="${lane}"]`)!;
      const matrix = line.getScreenCTM()!;
      const start = new DOMPoint(line.x1.baseVal.value, line.y1.baseVal.value).matrixTransform(matrix);
      const end = new DOMPoint(line.x2.baseVal.value, line.y2.baseVal.value).matrixTransform(matrix);
      const box = node.getBoundingClientRect();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      return Math.abs((end.x - start.x) * (y - start.y) - (end.y - start.y) * (x - start.x)) /
        Math.hypot(end.x - start.x, end.y - start.y);
    }),
  );
  await expect.poll(async () => (await geometry()).every((marker) => marker.labelY !== '')).toBe(true);
  for (const size of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    // Wait for the ResizeObserver's viewport animation before recording the home layout.
    await page.waitForTimeout(350);
    const before = await geometry();
    await expect.poll(async () => Math.max(...await distances())).toBeLessThan(0.1);
    for (const [index, theme] of ['A', 'B', 'C', 'D', 'E'].entries()) {
      await page.getByTestId(`theme-${theme}`).click();
      await expect(page.locator('[data-track="upper"]')).toBeHidden();
      await page.getByTestId(`theme-home-${index % 2 ? 'education' : 'upper'}`).click();
      await expect(page.locator('.museum-app')).toHaveAttribute('data-active-theme', 'all');
      await expect.poll(geometry, { message: `restore all year labels after ${theme} at ${size.width}` }).toEqual(before);
      await expect.poll(async () => Math.max(...await distances()), {
        message: `keep every history dot on its rail after ${theme} at ${size.width}`,
      }).toBeLessThan(0.1);
    }
  }
});
