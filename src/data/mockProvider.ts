import type { TimelineProvider } from './TimelineProvider';
import { createMockTimeline } from './mockTimeline';
import { normalizeTimeline } from '../domain/normalizeTimeline';
import { getCurrentYear } from '../domain/currentYear';
export const mockProvider: TimelineProvider = {
  async load(signal) {
    signal?.throwIfAborted();
    const year = getCurrentYear();
    return normalizeTimeline(createMockTimeline(year), year);
  },
};
