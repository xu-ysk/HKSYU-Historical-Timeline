import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect, vi } from 'vitest';
import { LanguageSwitcher, ThemeSwitcher } from '../../src/components/Controls';
test('language controls identify the current language and emit the requested locale', async () => {
  const onChange = vi.fn();
  render(<LanguageSwitcher locale="zh-Hant" onChange={onChange} />);
  expect(screen.getByRole('button', { name: '繁' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: '英' }));
  expect(onChange).toHaveBeenCalledWith('en');
});
test('all five English themes remain present when selecting one or restoring all', async () => {
  const onChange = vi.fn();
  const { rerender } = render(<ThemeSwitcher locale="en" active="B" onChange={onChange} />);
  expect(screen.getAllByRole('button')).toHaveLength(5);
  expect(screen.getByTestId('theme-B')).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByTestId('theme-E'));
  expect(onChange).toHaveBeenLastCalledWith('E');
  rerender(<ThemeSwitcher locale="en" active="E" onChange={onChange} />);
  await userEvent.click(screen.getByTestId('theme-E'));
  expect(onChange).toHaveBeenLastCalledWith(null);
});

test('theme buttons keep their Chinese labels and colors without letters or a separate reset', () => {
  const { container } = render(<ThemeSwitcher locale="zh-Hans" active={null} onChange={vi.fn()} />);
  const labels = ['校园发展', '荣誉、服务和缅怀', '从书院到大学', '校务拓展', '重塑博雅教育'];
  const colors = ['#B85C5F', '#C1A46B', '#7D6A8E', '#6B8E7A', '#5C6E84'];
  for (const [index, button] of screen.getAllByRole('button').entries()) {
    expect(button).toHaveTextContent(new RegExp('^' + labels[index] + '$'));
    expect(button.style.getPropertyValue('--swatch')).toBe(colors[index]);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  }
  expect(container.querySelector('.theme-letter')).toBeNull();
  expect(screen.queryByTestId('theme-all')).not.toBeInTheDocument();
});
