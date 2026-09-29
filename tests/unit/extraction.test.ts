import { expect, test } from 'vitest';
import { extractPose } from '../../src/timeline/detailLayout';
import type { Pose } from '../../src/timeline/layout';

const source: Pose = {
  x: 950,
  y: 280,
  width: 238,
  height: 238 / 1.5,
  ry: -52,
  rz: 0,
  skew: 18,
  scale: 0.35,
  z: 700,
};
const target: Pose = {
  x: 475,
  y: 460,
  width: 620,
  height: 620 / 1.5,
  ry: 0,
  rz: 0,
  skew: 0,
  scale: 1,
  z: 1701,
};

test('extraction begins at the exact rendered pose and lifts before growing', () => {
  expect(extractPose(source, target, 0)).toEqual(source);
  const lift = extractPose(source, target, 0.13);
  expect(Math.hypot(lift.x - source.x, lift.y - source.y)).toBeGreaterThan(8);
  expect(lift.width).toBe(source.width);
  expect(lift.height).toBe(source.height);
  expect(lift.scale).toBe(source.scale);
  expect(extractPose(source, target, 1)).toEqual(target);
});

test('turning and approaching are continuous in both directions with quiet endpoints', () => {
  const frames = Array.from({ length: 121 }, (_, index) =>
    extractPose(source, target, index / 120),
  );
  for (let i = 1; i < frames.length; i++) {
    expect(Math.hypot(frames[i].x - frames[i - 1].x, frames[i].y - frames[i - 1].y)).toBeLessThan(
      15,
    );
    expect(Math.abs(frames[i].width - frames[i - 1].width)).toBeLessThan(15);
    expect(frames[i].width).toBeGreaterThanOrEqual(frames[i - 1].width);
  }
  expect(Math.hypot(frames[1].x - source.x, frames[1].y - source.y)).toBeLessThan(0.05);
  expect(Math.hypot(frames[119].x - target.x, frames[119].y - target.y)).toBeLessThan(0.05);
  expect([...frames].reverse().at(-1)).toEqual(source);
});

test('reversing midway starts exactly where the interrupted animation was drawn', () => {
  for (const progress of [0.05, 0.25, 0.5, 0.85]) {
    const onScreen = extractPose(source, target, progress);
    expect(extractPose(source, onScreen, 1)).toEqual(onScreen);
    expect(extractPose(source, onScreen, 0)).toEqual(source);
  }
});
