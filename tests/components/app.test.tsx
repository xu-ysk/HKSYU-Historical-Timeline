import { act, fireEvent, render, screen } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import App from '../../src/app/App';
import { mockProvider } from '../../src/data/mockProvider';

test('guide opens only on request, never on first visit or after inactivity', async () => {
  window.sessionStorage.removeItem('museum-help-seen');
  // Keep the guide lifecycle independent of the canvas/layout controller.
  const provider = vi.spyOn(mockProvider, 'load').mockImplementation(() => new Promise(() => {}));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const { unmount } = render(<App />);
  try {
    expect(screen.queryByTestId('help-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('view-overview')).toHaveAttribute('aria-pressed', 'true');
    await act(async () => { await vi.advanceTimersByTimeAsync(181_000); });
    expect(screen.queryByTestId('help-overlay')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('help-trigger'));
    expect(screen.getByTestId('help-overlay')).toBeInTheDocument();
    expect(document.querySelector('.museum-app')).toHaveProperty('inert', true);
    fireEvent.click(screen.getByRole('button', { name: '關閉操作指引' }));
    expect(screen.queryByTestId('help-overlay')).not.toBeInTheDocument();
    expect(document.querySelector('.museum-app')).toHaveProperty('inert', false);
    await act(async () => { await vi.advanceTimersByTimeAsync(181_000); });
    expect(screen.queryByTestId('help-overlay')).not.toBeInTheDocument();
  } finally {
    unmount();
    vi.useRealTimers();
    provider.mockRestore();
  }
});
test('application identifies the museum and marks sample content', () => {
  window.sessionStorage.setItem('museum-help-seen', 'true');
  render(<App />);
  expect(screen.queryByRole('heading', { name: '時光之間' })).not.toBeInTheDocument();
  expect(screen.queryByText('一所大學，與一座城市的成長')).not.toBeInTheDocument();
  expect(screen.queryByText('HKSYU Museum Timeline')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '繁' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '简' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
  expect(screen.getByText(/展示內容為示例/)).toBeInTheDocument();
});

test('right-click menu is suppressed while ordinary clicks still work', () => {
  window.sessionStorage.setItem('museum-help-seen', 'true');
  render(<App />);
  const englishButton = screen.getByRole('button', { name: 'EN' });
  const contextMenu = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
  });

  expect(englishButton.dispatchEvent(contextMenu)).toBe(false);
  expect(contextMenu.defaultPrevented).toBe(true);

  fireEvent.click(englishButton);
  expect(document.documentElement.lang).toBe('en');
});
