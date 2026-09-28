import type { TimelineDataset } from '../domain/timeline';
export interface TimelineProvider {
  load(signal?: AbortSignal): Promise<TimelineDataset>;
}
