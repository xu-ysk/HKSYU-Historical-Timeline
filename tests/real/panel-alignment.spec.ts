import { test, expect } from '../e2e/fixtures';

test.use({ viewport: { width: 1920, height: 1080 } });

test('event copy follows the same focused year while both timelines remain', async ({ page }) => {
  await page.goto('/');
  const upper = page.getByTestId('upper-rail-panel');
  const education = page.getByTestId('education-panel');

  async function check(year: number, hasUpper: boolean, hasEducation: boolean) {
    await page.getByTestId('year-slider').fill(String(year));
    await expect(upper).toHaveAttribute('data-has-event', String(hasUpper));
    await expect(education).toHaveAttribute('data-has-event', String(hasEducation));
    await expect(upper).toHaveAttribute('aria-hidden', String(!hasUpper));
    await expect(education).toHaveAttribute('aria-hidden', String(!hasEducation));
    if (hasUpper) {
      await expect(upper).toBeVisible();
      await expect(page.getByTestId('upper-rail-year')).toHaveText(String(year));
    } else {
      await expect(upper).toBeHidden();
      await expect(upper).toHaveCSS('opacity', '0');
    }
    if (hasEducation) {
      await expect(education).toBeVisible();
      await expect(education.locator('.education-year')).toHaveText(
        year === 1949 ? '1949–1950' : String(year),
      );
    } else {
      await expect(education).toBeHidden();
      await expect(education).toHaveCSS('opacity', '0');
    }
    await expect(page.locator('[data-track="upper"]')).toHaveCount(1);
    await expect(page.locator('[data-track="education"]')).toHaveCount(1);
    await expect(page.locator('[data-upper-year]')).toHaveCount(28);
    await expect(page.locator('[data-education-year]')).toHaveCount(20);
  }

  await check(1949, true, true);
  await check(1960, false, true);
  await check(1971, true, false);
  await check(1978, true, true);
  await check(1970, false, false);
});
