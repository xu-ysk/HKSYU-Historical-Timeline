import { test, expect } from './fixtures';

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
])
  test(`timeline section labels are prominent and separated at ${size.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByTestId('scene')).toBeVisible();

    const school = page.locator('.school-label');
    const laneNumber = page.locator('.school-label .lane-number');
    const education = page.locator('.education-panel');
    const educationLabel = page.locator('.education-panel .eyebrow');
    const themePanel = page.getByTestId('theme-panel');
    await expect(school).toBeVisible();
    await expect(school).toHaveText('01 /樹仁校史');
    await expect(educationLabel).toBeVisible();
    await expect(educationLabel).toHaveText('02 / 香港教育史');
    await expect(school).toHaveCSS('font-size', '14px');
    await expect(laneNumber).toHaveCSS('font-size', '12px');
    await expect(educationLabel).toHaveCSS('font-size', '14px');

    const schoolBox = (await school.boundingBox())!;
    const educationBox = (await education.boundingBox())!;
    const educationLabelBox = (await educationLabel.boundingBox())!;
    const themeBox = (await themePanel.boundingBox())!;
    expect(schoolBox.x).toBeCloseTo(42, 0);
    expect(schoolBox.y).toBeGreaterThan(size.height * 0.3);
    expect(schoolBox.y).toBeLessThan(size.height * 0.45);
    expect(educationLabelBox.x).toBeGreaterThan(size.width * 0.7);
    expect(educationBox.y).toBeLessThan(themeBox.y);
    expect(educationBox.y + educationBox.height).toBeLessThan(themeBox.y);
    await expect(education).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath(`header-labels-${size.width}.png`),
    });
  });
