import { test, expect } from './fixtures';

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
])
  test(`view switch sits below the language controls and the lower-left time box is out of the visual layout at ${size.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByTestId('scene')).toBeVisible();
    const languages = await page.locator('.languages').boundingBox();
    const viewSwitch = await page.getByTestId('view-switch').boundingBox();
    const navigation = await page.getByTestId('navigation-panel').boundingBox();
    expect(languages).not.toBeNull();
    expect(viewSwitch).not.toBeNull();
    expect(navigation).not.toBeNull();
    expect(viewSwitch!.y).toBeGreaterThanOrEqual(languages!.y + languages!.height);
    expect(viewSwitch!.y).toBeLessThan(150);
    await expect(page.getByTestId('view-overview')).toHaveCSS('font-size', '13px');
    await expect(page.getByTestId('view-browse')).toHaveCSS('font-size', '13px');
    expect(navigation!.x).toBeGreaterThanOrEqual(0);
    await expect(page.getByTestId('navigation-panel')).toHaveCSS('opacity', '0');
    await expect(page.getByTestId('view-overview')).toBeVisible();
    await expect(page.getByTestId('view-browse')).toBeVisible();
  });
