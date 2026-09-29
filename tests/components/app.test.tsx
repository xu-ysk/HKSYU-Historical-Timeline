import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import App from '../../src/app/App';
test('application identifies the museum and marks sample content', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '時光之間' })).toBeInTheDocument();
  expect(screen.queryByText('HKSYU Museum Timeline')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '繁' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '简' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '英' })).toBeInTheDocument();
  expect(screen.getByText(/展示內容為示例/)).toBeInTheDocument();
});
