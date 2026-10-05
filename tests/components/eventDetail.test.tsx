import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { EventDetail } from '../../src/components/EventDetail';
import { createMockTimeline } from '../../src/data/mockTimeline';

const event = createMockTimeline(2026).schoolEvents[0];

test('detail clicks close once without reaching underlying actions or showing a return button', async () => {
  const onClose = vi.fn(),
    underlyingAction = vi.fn();
  render(
    <div onClick={underlyingAction}>
      <EventDetail event={event} locale="zh-Hans" phase="detail" onClose={onClose} />
    </div>,
  );
  expect(screen.getByRole('dialog')).toHaveFocus();
  expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  expect(screen.queryByTestId('close-detail')).not.toBeInTheDocument();
  expect(screen.getByText('点击页面任意位置返回时间轴，或按 Esc。')).toHaveClass('sr-only');
  await userEvent.click(screen.getByTestId('detail-body'));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(underlyingAction).not.toHaveBeenCalled();
});

test('keyboard focus stays in the detail and Escape listeners are cleaned up', async () => {
  const onClose = vi.fn();
  const { unmount } = render(
    <EventDetail event={event} locale="en" phase="detail" onClose={onClose} />,
  );
  await userEvent.tab();
  expect(screen.getByTestId('detail-body')).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(screen.getByTestId('detail-body')).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledTimes(1);
  unmount();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('placeholder-only details keep the description accessible while marking the centered mode', () => {
  const onClose = vi.fn();
  render(<EventDetail event={event} locale="en" phase="detail" onClose={onClose} />);
  expect(screen.getByRole('dialog')).toHaveAttribute('data-placeholder-only', 'true');
  expect(screen.getByTestId('detail-body')).toHaveTextContent(event.body.en!);
});
