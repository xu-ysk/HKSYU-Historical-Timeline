import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import App from '../../src/app/App';
test('application identifies the museum and marks sample content', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '時光之間' })).toBeInTheDocument();
  expect(screen.getByText(/展示內容為示例/)).toBeInTheDocument();
});
