import { test, expect } from './fixtures';

test.use({
  hasTouch: true,
  viewport: { width: 1920, height: 1080 },
});

test('exhibition touch input enlarges hit areas, drags the timeline, and opens detail', async ({
  page,
}) => {
  await page.goto('/');
  const scene = page.getByTestId('scene');
  const browse = page.getByTestId('view-browse');
  const browseBox = (await browse.boundingBox())!;
  await page.touchscreen.tap(browseBox.x + browseBox.width / 2, browseBox.y + browseBox.height / 2);
  await expect(scene).toHaveAttribute('data-zoom', '1.0000');

  const touchMetrics = await page.evaluate(() => {
    const marker = document.querySelector<HTMLElement>('.upper-rail-marker');
    const dot = document.querySelector<HTMLElement>('.education-dot');
    const slider = document.querySelector<HTMLElement>('.year-slider');
    return {
      marker: marker ? getComputedStyle(marker).width : '',
      dot: dot ? getComputedStyle(dot).width : '',
      slider: slider ? slider.getBoundingClientRect().height : 0,
    };
  });
  expect(touchMetrics).toEqual({ marker: '44px', dot: '44px', slider: 8 });

  const before = Number(await scene.getAttribute('data-focus'));
  const box = (await scene.boundingBox())!;
  const start = { x: box.x + box.width * 0.55, y: box.y + box.height * 0.45 };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: start.x, y: start.y, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: start.x - 260, y: start.y + 90, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect
    .poll(() => Number(scene.getAttribute('data-focus')))
    .not.toBe(before);

  const point = await page.evaluate(() => {
    const cards = [...document.querySelectorAll<HTMLElement>('.photo-card')];
    for (const card of cards) {
      const box = card.getBoundingClientRect();
      for (let x = Math.max(2, box.left + 2); x < Math.min(innerWidth - 2, box.right - 2); x += 2)
        for (
          let y = Math.max(85, box.top + 2);
          y < Math.min(innerHeight - 160, box.bottom - 2);
          y += 2
        )
          if (document.elementFromPoint(x, y)?.closest('.photo-card') === card) return { x, y };
    }
    return null;
  });
  expect(point).not.toBeNull();
  await page.touchscreen.tap(point!.x, point!.y);
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await page.touchscreen.tap(12, 12);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
