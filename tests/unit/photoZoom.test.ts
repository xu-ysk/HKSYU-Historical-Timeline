import { expect, test } from 'vitest';
import {
  constrainPhotoPan,
  initialPhotoZoom,
  maxSharpScale,
  zoomPhotoAt,
} from '../../src/timeline/photoZoom';

test('photo zoom stops before source pixels have to be enlarged', () => {
  const large = { imageWidth: 2200, imageHeight: 1400, viewportWidth: 500, viewportHeight: 400 };
  const small = { imageWidth: 400, imageHeight: 300, viewportWidth: 600, viewportHeight: 400 };
  expect(maxSharpScale(large)).toBe(4);
  expect(maxSharpScale(large, 2)).toBeCloseTo(2.2);
  expect(maxSharpScale(small)).toBe(1);
  expect(maxSharpScale({ ...large, imageWidth: 0 })).toBe(1);
});

test('wheel and pinch zoom keep the focal point stable and pan inside the photo', () => {
  const size = { imageWidth: 2000, imageHeight: 1000, viewportWidth: 500, viewportHeight: 500 };
  expect(zoomPhotoAt(initialPhotoZoom, 2, 100, 0, size)).toEqual({ scale: 2, x: -100, y: 0 });
  expect(constrainPhotoPan({ scale: 2, x: 999, y: 999 }, size)).toEqual({
    scale: 2,
    x: 250,
    y: 0,
  });
  expect(zoomPhotoAt(initialPhotoZoom, 20, 0, 0, size).scale).toBe(4);
});
