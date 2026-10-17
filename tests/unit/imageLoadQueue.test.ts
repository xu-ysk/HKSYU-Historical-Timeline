import { expect, test } from 'vitest';
import { queueImage, prioritizeImage, releaseImage } from '../../src/timeline/imageLoadQueue';

test('opened detail photos take the next available slot before background photos', () => {
  const started: number[] = [];
  const requests = Array.from({ length: 7 }, (_, index) => queueImage(() => started.push(index)));
  try {
    expect(started).toEqual([0, 1, 2, 3]);
    prioritizeImage(requests[6]);
    releaseImage(requests[0]);
    expect(started).toEqual([0, 1, 2, 3, 6]);
    releaseImage(requests[1]);
    expect(started).toEqual([0, 1, 2, 3, 6, 4]);
  } finally {
    requests.forEach(releaseImage);
  }
});

test('cancelling a queued photo never starts it and repeated cleanup keeps the limit intact', () => {
  const started: number[] = [];
  const requests = Array.from({ length: 6 }, (_, index) => queueImage(() => started.push(index)));
  try {
    releaseImage(requests[4]);
    releaseImage(requests[4]);
    releaseImage(requests[0]);
    releaseImage(requests[0]);
    expect(started).toEqual([0, 1, 2, 3, 5]);
  } finally {
    requests.forEach(releaseImage);
  }
});
