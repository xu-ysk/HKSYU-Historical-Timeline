import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { TapButton } from '../../src/components/TapButton';

function pointer(button: HTMLElement, type: string, x = 10, y = 10) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerType: 'touch',
    pointerId: 1,
    isPrimary: true,
    clientX: x,
    clientY: y,
  });
  fireEvent(button, event);
}

test('a touch tap activates without requiring a compatibility click', () => {
  const onActivate = vi.fn();
  render(<TapButton onActivate={onActivate}>Page</TapButton>);
  const button = screen.getByRole('button');
  pointer(button, 'pointerdown');
  pointer(button, 'pointerup');
  expect(onActivate).toHaveBeenCalledTimes(1);
  fireEvent.click(button, { detail: 1 });
  expect(onActivate).toHaveBeenCalledTimes(1);
  fireEvent.click(button, { detail: 0 });
  expect(onActivate).toHaveBeenCalledTimes(2);
});

test('dragging across or cancelling a touch does not activate a page or year', () => {
  const onActivate = vi.fn();
  render(<TapButton onActivate={onActivate}>Page</TapButton>);
  const button = screen.getByRole('button');
  pointer(button, 'pointerdown');
  pointer(button, 'pointerup', 80);
  pointer(button, 'pointerdown');
  pointer(button, 'pointercancel');
  pointer(button, 'pointerup');
  expect(onActivate).not.toHaveBeenCalled();
});

test('disabled buttons ignore touch while ordinary mouse clicks remain available', () => {
  const onActivate = vi.fn();
  const view = render(
    <TapButton disabled onActivate={onActivate}>
      Page
    </TapButton>,
  );
  const button = screen.getByRole('button');
  pointer(button, 'pointerdown');
  pointer(button, 'pointerup');
  fireEvent.click(button);
  expect(onActivate).not.toHaveBeenCalled();
  view.rerender(<TapButton onActivate={onActivate}>Page</TapButton>);
  fireEvent.click(button, { detail: 1 });
  expect(onActivate).toHaveBeenCalledTimes(1);
});
