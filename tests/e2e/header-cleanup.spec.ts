import { test, expect } from './fixtures';

test('header uses the centered museum title and omits archive labels', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  const title = page.getByTestId('institution-title');
  await expect(title).toHaveText('HKSYU Museum Timeline');
  const box = await title.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width / 2).toBeCloseTo(720, -1);
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('UNIVERSITY ARCHIVE');
  expect(bodyText).not.toContain('THE LIVING ARCHIVE');
  await expect(page.locator('.title-block > .eyebrow')).toHaveCount(0);
  await expect(page.locator('.theme-heading > span')).toBeHidden();
});
