import { test, expect } from './fixtures';
test('production entry renders without runtime errors or remote data', async ({ page }) => {
  const errors: string[] = [];
  const remote: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (/hksyu\.edu|\.xlsx/i.test(r.url())) remote.push(r.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '時光之間' })).toBeVisible();
  expect(errors).toEqual([]);
  expect(remote).toEqual([]);
});
