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
  render(<ThemeSwitcher locale="en" active="B" onChange={onChange} />);
  expect(screen.getAllByRole('button')).toHaveLength(6);
  expect(screen.getByTestId('theme-B')).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByTestId('theme-E'));
  expect(onChange).toHaveBeenLastCalledWith('E');
  await userEvent.click(screen.getByTestId('theme-all'));
  expect(onChange).toHaveBeenLastCalledWith(null);
});
