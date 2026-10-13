import { test, expect } from '@playwright/test';
import { themes, themeIds } from '../../src/config/themes';

test('first visitor sees the guide, can reopen it, and gets it again after inactivity', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const guide = page.getByTestId('help-overlay');
  await expect(guide).toBeVisible();
  await expect(page.getByRole('dialog', { name: '操作指引' })).toBeVisible();
  await expect(guide.getByText('一起走進時光之間')).toHaveCount(0);
  await expect(guide.locator('.help-swipe')).toHaveText('↗ ↙');
  await expect(guide.locator('.help-views span')).toHaveText(['全覽', '瀏覽']);
  await expect(guide.locator('.help-photo')).not.toContainText('⊕');
  const home = (await guide.locator('.help-photo-home').boundingBox())!;
  const left = (await guide.locator('.help-photo-left').boundingBox())!;
  const right = (await guide.locator('.help-photo-right').boundingBox())!;
  expect(Math.abs(home.x + home.width / 2 - left.x - left.width / 2)).toBeLessThan(1);
  expect(left.y - home.y - home.height).toBeGreaterThanOrEqual(7);
  expect(Math.abs(left.y - right.y)).toBeLessThan(1);
  await expect(guide.getByText('選擇視角', { exact: true })).toBeVisible();
  await expect(guide.getByText('主題切換', { exact: true })).toBeVisible();
  await expect(guide).toContainText('滑動時請在時間線兩側的空白區域操作');
  await expect(guide).not.toContainText('用手指拖動下方年份滑桿');
  await expect(guide).not.toContainText('輕觸左上角 EN');
  await expect(guide.locator('.help-themes')).toHaveText('');
  const dotColors = await guide.locator('.help-themes i').evaluateAll((dots) =>
    dots.map((dot) => getComputedStyle(dot).backgroundColor),
  );
  expect(dotColors).toEqual(themeIds.map((id) => {
    const channels = themes[id].color.slice(1).match(/../g)!.map((value) => parseInt(value, 16));
    return `rgb(${channels.join(', ')})`;
  }));
  await expect(guide).not.toContainText('滑鼠');
  await expect(page.getByTestId('help-trigger')).toBeVisible();
  await expect(page.locator('.museum-app')).toHaveAttribute('inert', '');

  await guide.getByRole('combobox', { name: '指引語言' }).selectOption('zh-Hans');
  await expect(guide).toContainText('滑动时请在时间线两侧的空白区域操作');
  await expect(guide).not.toContainText('鼠标');
  await guide.getByRole('combobox', { name: '指引语言' }).selectOption('en');
  await expect(page.getByRole('dialog', { name: 'Visitor guide' })).toBeVisible();
  await expect(guide).toContainText('Swipe along the arrows with one finger');
  await expect(guide).not.toContainText('mouse');
  await guide.getByRole('button', { name: 'Start exploring' }).click();
  await expect(guide).toHaveCount(0);
  await expect(page.locator('.museum-app')).not.toHaveAttribute('inert', '');

  await page.getByTestId('year-slider').fill('1971');
  await expect(page.getByTestId('year-slider')).toHaveValue('1971');
  await page.getByTestId('help-trigger').click();
  await expect(page.getByRole('dialog', { name: 'Visitor guide' })).toBeVisible();
  await page.getByRole('button', { name: 'Close guide' }).click();
  await expect(page.getByTestId('year-slider')).toHaveValue('1971');

  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await page.getByTestId('detail-help').click();
  await expect(page.getByTestId('help-overlay')).toBeVisible();
  await page.getByRole('button', { name: 'Close guide' }).click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');

  await page.reload();
  await expect(page.getByTestId('help-overlay')).toHaveCount(0);
  await page.clock.fastForward(170_000);
  await page.getByTestId('view-overview').click();
  await page.clock.fastForward(20_000);
  await expect(page.getByTestId('help-overlay')).toHaveCount(0);
  await page.clock.fastForward(160_100);
  await expect(page.getByTestId('help-overlay')).toBeVisible();
});
