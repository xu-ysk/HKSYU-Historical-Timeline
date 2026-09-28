import { test, expect } from './fixtures';

test('view switch sits under the subtitle and the lower-left time box is out of the visual layout', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  const subtitle = await page.getByTestId('subtitle').boundingBox();
  const viewSwitch = await page.getByTestId('view-switch').boundingBox();
  const navigation = await page.getByTestId('navigation-panel').boundingBox();
  expect(subtitle).not.toBeNull();
  expect(viewSwitch).not.toBeNull();
  expect(navigation).not.toBeNull();
  expect(viewSwitch!.y).toBeGreaterThanOrEqual(subtitle!.y + subtitle!.height);
  expect(navigation!.x).toBeGreaterThanOrEqual(0);
  await expect(page.getByTestId('navigation-panel')).toHaveCSS('opacity', '0');
  await expect(page.getByTestId('view-overview')).toBeVisible();
  await expect(page.getByTestId('view-browse')).toBeVisible();
});
