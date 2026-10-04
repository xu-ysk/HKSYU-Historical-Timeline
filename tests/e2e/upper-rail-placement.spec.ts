import { test, expect } from './fixtures';

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
])
  test(`upper event copy clears view controls and stays near its track at ${size.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByTestId('upper-rail-panel')).toBeVisible();
    const panel = (await page.getByTestId('upper-rail-panel').boundingBox())!;
    const controls = (await page.getByTestId('view-switch').boundingBox())!;
    expect(panel.x).toBeGreaterThan(controls.x + controls.width + 40);

    const line = await page.locator('[data-track="upper"]').evaluate((element) => {
      const el = element as SVGLineElement;
      return {
        x1: el.x1.baseVal.value,
        y1: el.y1.baseVal.value,
        x2: el.x2.baseVal.value,
        y2: el.y2.baseVal.value,
      };
    });
    const x = panel.x + panel.width;
    const y = panel.y + panel.height;
    const trackY = line.y1 + ((x - line.x1) * (line.y2 - line.y1)) / (line.x2 - line.x1);
    expect(Math.abs(y - trackY)).toBeLessThan(160);

    await page.getByTestId('view-browse').click();
    await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
    const browsePanel = (await page.getByTestId('upper-rail-panel').boundingBox())!;
    const browseControls = (await page.getByTestId('view-switch').boundingBox())!;
    expect(browsePanel.x).toBeGreaterThan(browseControls.x + browseControls.width + 40);
  });
