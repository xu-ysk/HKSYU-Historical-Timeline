import { test, expect } from './fixtures';

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
])
  test(`upper event copy replaces the former school title at ${size.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByTestId('upper-rail-panel')).toBeVisible();
    const panel = (await page.getByTestId('upper-rail-panel').boundingBox())!;
    const controls = (await page.getByTestId('view-switch').boundingBox())!;
    expect(panel.x).toBe(size.width <= 1320 ? 32 : 42);
    expect(panel.y).toBe(92);
    expect(panel.y).toBeGreaterThan(controls.y + controls.height);

    await page.getByTestId('view-browse').click();
    await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
    const browsePanel = (await page.getByTestId('upper-rail-panel').boundingBox())!;
    const browseControls = (await page.getByTestId('view-switch').boundingBox())!;
    expect(browsePanel.x).toBe(panel.x);
    expect(browsePanel.y).toBe(panel.y);
    expect(browsePanel.y).toBeGreaterThan(browseControls.y + browseControls.height);
  });
