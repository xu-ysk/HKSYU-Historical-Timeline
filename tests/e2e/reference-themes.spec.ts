import { test, expect } from './fixtures';

for (const mode of ['overview', 'browse'])
  test(`T2: ${mode} interleaves theme sizes on one chronological photo lane`, async ({ page }) => {
    test.setTimeout(60_000);
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
        const axis = document.querySelector<SVGLineElement>('[data-track="axis"]')!;
        const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((name) =>
          Number(axis.getAttribute(name)),
        );
        const length = Math.hypot(x2 - x1, y2 - y1);
        const maxLineDistance = Math.max(
          ...visible.map((el) => {
            const match = el.style.transform.match(
              /translate3d\(\s*([-\d.e+]+)px,\s*([-\d.e+]+)px,\s*0(?:px)?\s*\)/,
            );
            if (!match) return Infinity;
            const x = Number(match[1]),
              y = Number(match[2]);
            return Math.abs((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)) / length;
          }),
        );
        return {
          selected: visible.filter((el) => el.dataset.theme === active).length,
          reduced: visible.filter((el) => el.dataset.theme !== active).length,
          sizeTransitions: visible
            .slice(1)
            .filter(
              (el, index) =>
                (visible[index].dataset.theme === active) !== (el.dataset.theme === active),
            ).length,
          chronological: visible.every(
            (el, index) => index === 0 || +visible[index - 1].style.zIndex > +el.style.zIndex,
          ),
          maxLineDistance,
          widthsCorrect: visible.every(
            (el) =>
              Math.abs(
                Number.parseFloat(el.style.width) -
                  (document.querySelector<HTMLElement>('[data-testid="scene"]')!.dataset.mode ===
                  'browse'
                    ? 238
                    : 42),
              ) < 0.01,
          ),
        };
      }, theme);
      expect(result.selected).toBeGreaterThan(0);
      expect(result.reduced).toBeGreaterThan(0);
      expect(result.sizeTransitions).toBeGreaterThan(0);
      expect(result.chronological).toBe(true);
      expect(result.maxLineDistance).toBeLessThan(0.1);
      expect(result.widthsCorrect).toBe(true);
      await expect(page.getByTestId('scene')).toHaveAttribute('data-focus', focus!);
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
  test.setTimeout(60_000);
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const cards = page.locator('.photo-card');
  const count = await cards.count();
  // Confirm the recorder is armed before clicking; an unresolved evaluate
  // races its locator lookup against the first theme change and can miss frames.
  await cards.first().evaluate((el) => {
    const capture = { values: [] as { t: number; scale: number }[], done: false };
    (el as HTMLElement & { themeCapture: typeof capture }).themeCapture = capture;
    const start = performance.now();
    const frame = () => {
      capture.values.push({
        t: performance.now() - start,
        scale: Number((el as HTMLElement).style.transform.match(/scale\(([^)]+)\)/)?.[1]),
      });
      if (performance.now() - start < 2500) requestAnimationFrame(frame);
      else capture.done = true;
    };
    requestAnimationFrame(frame);
  });
  for (const id of ['B', 'A', 'E', 'A', 'C']) {
    await page.getByTestId('theme-' + id).click();
    await page.waitForTimeout(220);
  }
  await expect
    .poll(() =>
      cards
        .first()
        .evaluate(
          (el) => (el as HTMLElement & { themeCapture: { done: boolean } }).themeCapture.done,
        ),
    )
    .toBe(true);
  const scales = await cards
    .first()
    .evaluate(
      (el) => (el as HTMLElement & { themeCapture: { values: { t: number; scale: number }[] } }).themeCapture.values,
    );
  expect(scales.filter((sample) => sample.scale > 0.4 && sample.scale < 0.95).length).toBeGreaterThan(5);
  expect(Math.max(...scales.slice(1).map((sample, i) =>
    Math.abs(sample.scale - scales[i].scale) / Math.max(1, sample.t - scales[i].t),
  ))).toBeLessThan(0.005);
  await expect(cards).toHaveCount(count);
  await expect(page.getByTestId('theme-C')).toHaveAttribute('aria-pressed', 'true');
});
