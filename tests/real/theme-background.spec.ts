import { test, expect } from '../e2e/fixtures';
import { themes, themeIds } from '../../src/config/themes';

test.use({ viewport: { width: 1920, height: 1080 } });

const paper = [247, 245, 242];

test('all theme backgrounds stay softly tinted through photo detail and reset', async ({ page }) => {
  await page.goto('/');
  const app = page.locator('.museum-app');
  const background = () =>
    app.evaluate((element) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      context.fillStyle = getComputedStyle(element).backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    });
  async function expectColor(expected: number[]) {
    await expect
      .poll(async () => Math.max(...(await background()).map((channel, i) => Math.abs(channel - expected[i]))))
      .toBeLessThan(2);
  }

  await expect(app).toHaveAttribute('data-active-theme', 'all');
  await expectColor(paper);
  const defaultHeader = await page
    .locator('.header-top')
    .evaluate((el) => getComputedStyle(el).backgroundColor);

  for (const id of themeIds) {
    await page.getByTestId(`theme-${id}`).click();
    await expect(app).toHaveAttribute('data-active-theme', id);
    const color = themes[id].color.match(/[\da-f]{2}/gi)!.map((part) => Number.parseInt(part, 16));
    await expectColor(paper.map((channel, i) => Math.round(channel * 0.82 + color[i] * 0.18)));
  }
  const tintedHeader = await page
    .locator('.header-top')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(tintedHeader).not.toBe(defaultHeader);
  await page.screenshot({ path: test.info().outputPath('theme-E-page.png') });

  await page.getByTestId('year-slider').fill('2021');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  const photo = page.locator('.photo-card[data-event-id="P91"]').first();
  await photo.focus();
  await photo.press('Enter');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  const colorE = themes.E.color.match(/[\da-f]{2}/gi)!.map((part) => Number.parseInt(part, 16));
  await expectColor(paper.map((channel, i) => Math.round(channel * 0.82 + colorE[i] * 0.18)));
  await expect(page.locator('.detail-scrim')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.screenshot({ path: test.info().outputPath('theme-E-detail.png') });

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('event-detail')).toHaveCount(0);
  await expectColor(paper.map((channel, i) => Math.round(channel * 0.82 + colorE[i] * 0.18)));
  await page.getByTestId('theme-E').click();
  await expect(app).toHaveAttribute('data-active-theme', 'all');
  await expectColor(paper);
});
