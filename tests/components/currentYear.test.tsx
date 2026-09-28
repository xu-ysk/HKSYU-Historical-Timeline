import { render, screen, act } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import { useCurrentYear } from '../../src/domain/useCurrentYear';
function Clock() {
  return <output>{useCurrentYear()}</output>;
}
test('an already-open page updates at Hong Kong midnight and cleans its timer on unmount', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-12-31T15:59:59Z'));
  try {
    const { unmount } = render(<Clock />);
    expect(screen.getByText('2026')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1200));
    expect(screen.getByText('2027')).toBeInTheDocument();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
