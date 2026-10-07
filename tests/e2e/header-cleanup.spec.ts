import { test, expect } from './fixtures';

test('header keeps compact language and view controls without a duplicate school title', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  for (const locale of ['zh-Hant', 'zh-Hans', 'en']) {
    await page.getByTestId('language-' + locale).click();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByTestId('school-title')).toHaveCount(0);
    await expect(page.locator('.upper-rail-panel .eyebrow')).toContainText(
      locale === 'zh-Hant' ? '樹仁校史' : locale === 'zh-Hans' ? '树仁校史' : 'Shue Yan history',
    );
    await expect(page.getByTestId('institution-title')).toHaveCount(0);
    await expect(page.getByText('HKSYU Museum Timeline', { exact: true })).toHaveCount(0);
    await expect(page.locator('.title-block')).toHaveCount(0);
    await expect(page.getByTestId('subtitle')).toHaveCount(0);
    await expect(page.locator('.languages button')).toHaveCount(3);
  }
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('UNIVERSITY ARCHIVE');
  expect(bodyText).not.toContain('THE LIVING ARCHIVE');
  await expect(page.locator('.theme-heading')).toHaveCount(0);
});
