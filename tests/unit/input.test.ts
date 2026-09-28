import { test, expect } from 'vitest';
import { wheelPixels, dragProjection } from '../../src/timeline/input';
test('wheel modes are normalized and diagonal inputs do not double count', () => {
  expect(wheelPixels(5, 10, 0, 900)).toBe(10);
  expect(wheelPixels(-20, 10, 1, 900)).toBe(-320);
  expect(wheelPixels(0, 1, 2, 900)).toBe(900);
});
test('drag projection follows the diagonal scene axis in both directions', () => {
  expect(dragProjection(100, -100)).toBeGreaterThan(100);
  expect(dragProjection(-100, 100)).toBeLessThan(-100);
  expect(dragProjection(0, 0)).toBe(0);
});
