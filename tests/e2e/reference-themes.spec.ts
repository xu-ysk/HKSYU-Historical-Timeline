import { test, expect } from './fixtures';

for (const mode of ['overview', 'browse'])
  test(`T2: ${mode} keeps selected sleeves exposed above small ones for all five themes`, async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('scene')).toBeVisible();
    if (mode === 'browse') {
      await page.getByTestId('year-slider').fill('1997');
      await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
      await page.evaluate(() => {
        document.querySelector('.museum-app')!.scrollTop = 0;
      });
    }
    const focus = await page.getByTestId('scene').getAttribute('data-focus');
    const original = await page.locator('.photo-card').evaluateAll((els) =>
      els.map((el) => ({
        id: (el as HTMLElement).dataset.cardId,
        width: (el as HTMLElement).style.width,
      })),
    );
    for (const theme of ['A', 'B', 'C', 'D', 'E']) {
      await page.getByTestId('theme-' + theme).click();
      await expect(
        page.locator(`.photo-card[data-theme="${theme}"]`).filter({ visible: true }).first(),
      ).toHaveAttribute('style', /scale\(1\)/);
      await expect(
        page.locator(`.photo-card:not([data-theme="${theme}"])`).filter({ visible: true }).first(),
      ).toHaveAttribute('style', /scale\(0.35\)/);
      const result = await page.locator('.photo-card').evaluateAll((els, active) => {
        const visible = els.filter(
          (el) => getComputedStyle(el).visibility === 'visible',
        ) as HTMLElement[];
        const large = visible.filter((el) => el.dataset.theme === active),
          small = visible.filter((el) => el.dataset.theme !== active);
        const unobscured = large.filter((el) => {
          const b = el.getBoundingClientRect();
          for (let x = Math.max(0, b.left) + 1; x < Math.min(innerWidth, b.right) - 1; x += 2)
            for (
              let y = Math.max(60, b.top) + 1;
              y < Math.min(innerHeight - 155, b.bottom) - 1;
              y += 2
            )
              if (document.elementFromPoint(x, y)?.closest('.photo-card') === el) return true;
          return false;
        });
        return {
          minLarge: Math.min(...large.map((el) => +el.style.zIndex)),
          maxSmall: Math.max(...small.map((el) => +el.style.zIndex)),
          exposed: unobscured.map((el) => el.dataset.cardId),
          visibleLarge: large
            .filter((el) => {
              const b = el.getBoundingClientRect();
              return (
                b.left > 200 &&
                b.right < innerWidth - 20 &&
                b.top > 90 &&
                b.bottom < innerHeight - 160
              );
            })
            .map((el) => el.dataset.cardId),
        };
      }, theme);
      expect(result.minLarge).toBeGreaterThan(result.maxSmall);
      expect(result.exposed).toEqual(expect.arrayContaining(result.visibleLarge));
      await expect(page.getByTestId('scene')).toHaveAttribute('data-focus', focus!);
      expect(
        await page.locator('.photo-card').evaluateAll((els) =>
          els.map((el) => ({
            id: (el as HTMLElement).dataset.cardId,
            width: (el as HTMLElement).style.width,
          })),
        ),
      ).toEqual(original);
    }
    await page.screenshot({ path: test.info().outputPath(`T2-${mode}.png`) });
    await page.getByTestId('theme-E').click();
    await expect(page.locator('.photo-card').filter({ visible: true }).first()).toHaveAttribute(
      'style',
      /scale\(1\)/,
    );
  });

test('T2: rapid retargeting scales continuously and leaves every photograph available', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  const cards = page.locator('.photo-card');
  const count = await cards.count();
  const samples = cards.first().evaluate(
    (el) =>
      new Promise<number[]>((resolve) => {
        const values: number[] = [];
        const start = performance.now();
        const frame = () => {
          values.push(Number((el as HTMLElement).style.transform.match(/scale\(([^)]+)\)/)?.[1]));
          if (performance.now() - start < 1500) requestAnimationFrame(frame);
          else resolve(values);
        };
        requestAnimationFrame(frame);
      }),
  );
  for (const id of ['B', 'E', 'C']) {
    await page.getByTestId('theme-' + id).click();
    await page.waitForTimeout(120);
  }
  const scales = await samples;
  expect(scales.filter((s) => s > 0.4 && s < 0.95).length).toBeGreaterThan(5);
  expect(Math.max(...scales.slice(1).map((s, i) => Math.abs(s - scales[i])))).toBeLessThan(0.2);
  await expect(cards).toHaveCount(count);
  await expect(page.getByTestId('theme-C')).toHaveAttribute('aria-pressed', 'true');
});
