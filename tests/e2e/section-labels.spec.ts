import { test, expect } from './fixtures';

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
])
  test(`timeline section labels are correct at ${size.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByTestId('scene')).toBeVisible();

    const upperLabel = page.locator('.upper-rail-panel .eyebrow');
    const education = page.locator('.education-panel');
    const educationLabel = page.locator('.education-panel .eyebrow');
    const themePanel = page.getByTestId('theme-panel');
    await expect(page.locator('.school-label')).toHaveCount(0);
    await expect(upperLabel).toBeVisible();
    await expect(upperLabel).toHaveText('01/ 樹仁校史');
    await expect(educationLabel).toBeVisible();
    await expect(educationLabel).toHaveText('02 / 香港教育史');
    await expect(upperLabel).toHaveCSS('font-size', '14px');
    await expect(educationLabel).toHaveCSS('font-size', '14px');
    for (const [upperSelector, educationSelector] of [
      ['.upper-rail-year', '.education-year'],
      ['.upper-rail-copy h2', '.education-copy h2'],
      ['.upper-rail-copy p', '.education-copy p'],
    ]) {
      const upperSize = await page.locator(upperSelector).evaluate((element) => getComputedStyle(element).fontSize);
      await expect(page.locator(educationSelector)).toHaveCSS('font-size', upperSize);
    }
    const schoolLineHeight = await page.locator('.upper-rail-copy p').evaluate((element) => getComputedStyle(element).lineHeight);
    await expect(page.locator('.education-copy p')).toHaveCSS('line-height', schoolLineHeight);

    const educationBox = (await education.boundingBox())!;
    const educationLabelBox = (await educationLabel.boundingBox())!;
    const themeBox = (await themePanel.boundingBox())!;
    expect(educationLabelBox.x).toBeGreaterThan(size.width * 0.7);
    expect(educationBox.y).toBeLessThan(themeBox.y);
    expect(educationBox.y + educationBox.height).toBeLessThan(themeBox.y);
    await expect(education).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath(`header-labels-${size.width}.png`),
    });
  });

test('the school-history heading follows the selected interface language', async ({ page }) => {
  await page.goto('/');
  const upperLabel = page.locator('.upper-rail-panel .eyebrow');

  await page.getByTestId('language-en').click();
  await expect(upperLabel).toHaveText('01/ Shue Yan history');
  await page.getByTestId('language-zh-Hans').click();
  await expect(upperLabel).toHaveText('01/ 树仁校史');
});
