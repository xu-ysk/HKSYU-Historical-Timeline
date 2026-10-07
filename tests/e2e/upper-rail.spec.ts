import { test, expect } from './fixtures';

for (const size of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
])
  test(`upper rail sits beside the school album and follows the current year at ${size.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByTestId('scene')).toBeVisible();

    const upper = page.getByTestId('upper-rail-panel');
    const education = page.getByTestId('education-panel');
    await expect(upper).toBeVisible();
    await expect(page.locator('[data-track="upper"]')).toHaveCount(1);
    await expect(page.locator('[data-track="education"]')).toHaveCount(1);
    await expect(upper.locator('.eyebrow')).toHaveText('01/ 樹仁校史');
    await expect(upper).toHaveText(/Founders|College|University/);
    await expect(upper.locator('[data-testid="upper-rail-year"]')).toHaveText('1949');
    await expect(upper.locator('[data-testid="upper-rail-title"]')).toBeVisible();
    await expect(upper.locator('[data-testid="upper-rail-body"]')).toBeVisible();
    await expect(page.locator('.school-label')).toHaveCount(0);
    await expect(education.locator('.eyebrow')).toHaveText(/02\s*\/.*香港教育史/);

    const upperBox = (await upper.boundingBox())!;
    const educationBox = (await education.boundingBox())!;
    expect(upperBox.x + upperBox.width).toBeLessThan(size.width * 0.48);
    expect(upperBox.y + upperBox.height).toBeLessThan(educationBox.y);

    await page.getByTestId('year-slider').fill('1997');
    await expect(upper).toHaveAttribute('data-has-event', 'false');
    await expect(upper).toBeHidden();
    await expect(education).toHaveAttribute('data-has-event', 'true');
    await expect(education).toBeVisible();
    await page.getByTestId('year-slider').fill('1999');
    await expect(page.getByTestId('upper-rail-year')).toHaveText('1999');
    await expect(page.getByTestId('upper-rail-title')).toBeVisible();
    await expect(education).toBeHidden();
    await page.getByTestId('view-browse').click();
    await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
    await expect(page.getByTestId('upper-rail-panel')).toBeVisible();
    if (size.width === 1440) {
      await page.screenshot({ path: test.info().outputPath('stage7-upper-rail.png') });
    }
  });
