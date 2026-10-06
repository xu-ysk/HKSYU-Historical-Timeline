import { fireEvent, render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import App from '../../src/app/App';
test('application identifies the museum and marks sample content', () => {
  render(<App />);
  expect(screen.queryByRole('heading', { name: '時光之間' })).not.toBeInTheDocument();
  expect(screen.queryByText('一所大學，與一座城市的成長')).not.toBeInTheDocument();
  expect(screen.queryByText('HKSYU Museum Timeline')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '繁' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '简' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '英' })).toBeInTheDocument();
  expect(screen.getByText(/展示內容為示例/)).toBeInTheDocument();
});

test('right-click menu is suppressed while ordinary clicks still work', () => {
  render(<App />);
  const englishButton = screen.getByRole('button', { name: '英' });
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
