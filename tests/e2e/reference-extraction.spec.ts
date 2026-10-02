import { test, expect } from './fixtures';

type MotionFrame = {
  t: number;
  p: number;
  x: number;
  y: number;
  width: number;
  opacity: number;
};
type CapturedCard = HTMLElement & {
  motionCapture: { frames: MotionFrame[]; done: boolean };
};
type ScrollInterruption = {
  focus: number;
  pendingTarget: number;
  origin: string;
  id: string;
};
type CapturedScene = HTMLElement & {
  scrollInterruption: ScrollInterruption | null;
};

for (const sample of [
  { year: 1997, id: 'school-1995-1', count: 1 },
  { year: 1997, id: 'school-1999-1', count: 1 },
  { year: 1953, id: 'school-1953-3', count: 2 },
  { year: 1954, id: 'school-1954-1', count: 1 },
])
  test(`T3: ${sample.id} lifts from its actual position, turns and returns continuously`, async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.getByTestId('year-slider').fill(String(sample.year));
    await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
    await page.evaluate(() => {
      document.querySelector('.museum-app')!.scrollTop = 0;
    });
    if (sample.count === 2) {
      for (let i = 1; i <= 3; i++) {
        await page.getByTestId('next-event').click();
        await expect(page.getByTestId('focused-event')).toHaveText(`school-1953-${i}`);
      }
      await page.evaluate(() => {
        document.querySelector('.museum-app')!.scrollTop = 0;
      });
    }
    const card = page.locator(`.photo-card[data-event-id="${sample.id}"]`).first();
    await expect
      .poll(() =>
        card.evaluate(
          (el) =>
            new Promise<number>((resolve) => {
              const first = el.getBoundingClientRect();
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  const b = el.getBoundingClientRect();
                  resolve(Math.hypot(b.x - first.x, b.y - first.y));
                }),
              );
            }),
        ),
      )
      .toBeLessThan(0.1);
    const point = await card.evaluate((el) => {
      const b = el.getBoundingClientRect();
      for (let x = Math.max(2, b.left + 2); x < Math.min(innerWidth - 2, b.right - 2); x += 2)
        for (let y = Math.max(85, b.top + 2); y < Math.min(innerHeight - 160, b.bottom - 2); y += 2)
          if (document.elementFromPoint(x, y)?.closest('.photo-card') === el) return { x, y };
      return null;
    });
    expect(point, 'the chosen non-central photograph has a real mouse target').not.toBeNull();
    const before = await card.getAttribute('style');
    await card.evaluate((el) => el.setAttribute('data-same-node', 'true'));
    // Confirm the recorder is armed before clicking. An unresolved locator.evaluate
    // races its element lookup against mouse.click and can miss the opening frames.
    await card.evaluate((el) => {
      const capture = { frames: [] as MotionFrame[], done: false };
      (el as CapturedCard).motionCapture = capture;
      const start = performance.now();
      function frame() {
        const b = el.getBoundingClientRect();
        const p = Number(
          document.querySelector<HTMLElement>('[data-testid="scene"]')?.dataset.detailProgress,
        );
        const text = document.querySelector<HTMLElement>('.detail-text');
        capture.frames.push({
          t: performance.now() - start,
          p,
          x: b.x,
          y: b.y,
          width: Number.parseFloat((el as HTMLElement).style.width),
          opacity: text ? Number(getComputedStyle(text).opacity) : 0,
        });
        if (p === 1 || performance.now() - start > 4000) capture.done = true;
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    await page.mouse.click(point!.x, point!.y);
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
    await expect(page.locator('[data-extracted=true]')).toHaveCount(sample.count);
    await expect
      .poll(() => card.evaluate((el) => (el as CapturedCard).motionCapture.done))
      .toBe(true);
    const frames = await card.evaluate((el) => (el as CapturedCard).motionCapture.frames);
    await testInfo.attach('extraction-frames', {
      body: JSON.stringify(frames),
      contentType: 'application/json',
    });
    const moving = frames.filter((f) => f.p > 0 && f.p < 1);
    expect(moving.length).toBeGreaterThan(15);
    expect(new Set(moving.map((f) => Math.round(f.width))).size).toBeGreaterThan(10);
    expect(moving.filter((f) => f.p < 0.2).every((f) => Math.abs(f.width - 238) < 0.1)).toBe(true);
    expect(moving.filter((f) => f.p < 0.6).every((f) => f.opacity === 0)).toBe(true);
    expect(frames.at(-1)!.opacity).toBe(1);
    for (let i = 1; i < frames.length; i++) {
      const distance = Math.hypot(frames[i].x - frames[i - 1].x, frames[i].y - frames[i - 1].y);
      expect(distance).toBeLessThan(170);
      expect(distance / Math.max(1, frames[i].t - frames[i - 1].t)).toBeLessThan(4);
    }
    await page.screenshot({ path: test.info().outputPath(`T3-${sample.id}.png`) });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(card).toHaveAttribute('data-same-node', 'true');
    // Exact transformation, dimensions and scale must be restored; metadata may be reordered.
    const after = await card.getAttribute('style');
    for (const property of ['transform', 'width', 'height'])
      expect(after?.match(new RegExp(`(?:^|; )${property}: ([^;]+)`))?.[1]).toBe(
        before?.match(new RegExp(`(?:^|; )${property}: ([^;]+)`))?.[1],
      );
  });

test('T3: a mid-opening reversal and theme change never teleport or strand a linked pair', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('year-slider').fill('1953');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-zoom', '1.0000');
  for (let i = 1; i <= 3; i++) {
    await page.getByTestId('next-event').click();
    await expect(page.getByTestId('focused-event')).toHaveText(`school-1953-${i}`);
  }
  await page.getByTestId('open-focused').click();
  await expect
    .poll(async () => Number(await page.getByTestId('scene').getAttribute('data-detail-progress')))
    .toBeGreaterThan(0.2);
  await page.keyboard.press('Escape');
  await page.getByTestId('theme-E').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-extracted=true]')).toHaveCount(0);
  const pair = page.locator('.photo-card[data-event-id="school-1953-3"]');
  await expect(pair).toHaveCount(2);
  for (const card of await pair.all()) await expect(card).toHaveAttribute('style', /scale\(0.35\)/);
  await page.getByTestId('open-focused').click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await expect(page.locator('[data-extracted=true]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('T3: opening during a live scroll freezes the drawn origin and resumes from it', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('year-slider').fill('1997');
  const scene = page.getByTestId('scene');
  await expect(scene).toHaveAttribute('data-zoom', '1.0000');
  await page.evaluate(() => {
    document.querySelector('.museum-app')!.scrollTop = 0;
  });
  await page.mouse.move(720, 410);
  const beforeScroll = Number(await scene.getAttribute('data-focus'));
  // Arm the observer before wheel input: waiting for mouse.wheel's protocol
  // response can consume most of the tween before the first observed frame.
  // Locator.click waits for stability, so use the native handler to interrupt.
  await scene.evaluate((el) => {
    const root = el as CapturedScene;
    root.scrollInterruption = null;
    const first = root.dataset.focus;
    const frame = () => {
      if (root.dataset.focus === first) {
        requestAnimationFrame(frame);
        return;
      }
      const id = root.dataset.focusedEvent!;
      const card = root.querySelector<HTMLButtonElement>(`.photo-card[data-event-id="${id}"]`)!;
      root.scrollInterruption = {
        focus: Number(root.dataset.focus),
        pendingTarget: Number(root.dataset.targetFocus),
        origin: card.style.transform,
        id,
      };
      card.click();
    };
    requestAnimationFrame(frame);
  });
  await page.mouse.wheel(0, 2000);
  await expect
    .poll(() => scene.evaluate((el) => (el as CapturedScene).scrollInterruption))
    .not.toBeNull();
  const interrupted = (await scene.evaluate((el) => (el as CapturedScene).scrollInterruption))!;
  expect(interrupted.focus).toBeGreaterThan(beforeScroll);
  expect(interrupted.pendingTarget - interrupted.focus).toBeGreaterThan(0.01);
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-phase', 'detail');
  await expect(scene).toHaveAttribute('data-focus', interrupted.focus.toFixed(6));
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(scene).toHaveAttribute('data-focus', interrupted.focus.toFixed(6));
  const card = page.locator(`.photo-card[data-event-id="${interrupted.id}"]`).first();
  expect(await card.evaluate((el) => (el as HTMLElement).style.transform)).toBe(interrupted.origin);
  await page.mouse.move(720, 410);
  await page.mouse.wheel(0, -360);
  await expect
    .poll(async () => Number(await scene.getAttribute('data-focus')))
    .toBeLessThan(interrupted.focus);
});
