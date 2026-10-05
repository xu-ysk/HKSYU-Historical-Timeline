import type { TimelineProvider } from './TimelineProvider';
import type { TimelineDataset } from '../domain/timeline';
import { normalizeTimeline } from '../domain/normalizeTimeline';
import { getCurrentYear } from '../domain/currentYear';

export const realProvider: TimelineProvider = {
  async load(signal) {
    signal?.throwIfAborted();
    const response = await fetch(`${import.meta.env.BASE_URL}timeline.json`, {
      signal,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Timeline data request failed: ${response.status}`);
    const data = (await response.json()) as TimelineDataset;
    const latestDataYear = Math.max(
      ...data.schoolEvents.map((event) => event.year),
      ...data.upperRailEvents.map((event) => event.year),
      ...data.educationEvents.map((event) => event.year),
      1949,
    );
    return normalizeTimeline(data, Math.max(getCurrentYear(), latestDataYear));
  },
};
