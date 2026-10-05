import { test, expect, type Page } from '../e2e/fixtures';

async function checkLabels(page: Page) {
  const boxes = await page.locator('.upper-year-label:visible').evaluateAll((labels) =>
    labels.map((label) => {
      const box = label.getBoundingClientRect();
      return { year: label.textContent, x: box.x, y: box.y, right: box.right, bottom: box.bottom };
    }),
  );
  expect(boxes.length).toBeGreaterThan(1);
  for (let i = 0; i < boxes.length; i++)
    for (const b of boxes.slice(i + 1)) {
      const a = boxes[i];
      expect(
        a.right + 6 <= b.x || b.right + 6 <= a.x || a.bottom + 6 <= b.y || b.bottom + 6 <= a.y,
        `${a.year} and ${b.year} have breathing room`,
      ).toBe(true);
    }
}

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
])
  test(`real year labels stay separated at ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.locator('[data-upper-year]')).toHaveCount(28);
    await checkLabels(page);
    await page.screenshot({ path: test.info().outputPath('real-overview.png') });
    const target = page.locator('[data-upper-year][data-label-visible="true"]:visible').last();
    const year = await target.getAttribute('data-upper-year');
    await target.locator('.upper-year-label').click();
    await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
    await expect(page.getByTestId('current-year')).toContainText(year!);
    await checkLabels(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect
      .poll(async () => page.getByTestId('scene').evaluate((el) => el.clientWidth))
      .toBe(1366);
    await page.waitForTimeout(300);
    await checkLabels(page);
    await page.getByTestId('view-overview').click();
    await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '0.0000');
    await checkLabels(page);
  });
