import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { EventDetail } from '../../src/components/EventDetail';
import { themes, themeIds } from '../../src/config/themes';
import { createMockTimeline } from '../../src/data/mockTimeline';
import timeline from '../../public/timeline.json';
import type { SchoolEvent } from '../../src/domain/timeline';

const event = createMockTimeline(2026).schoolEvents[0];

test('real photos keep the event description in the right-side detail', () => {
  const realEvent = timeline.schoolEvents.find((item) => item.id === 'P01')! as SchoolEvent;
  render(<EventDetail event={realEvent} locale="zh-Hant" phase="detail" onClose={vi.fn()} />);
  expect(screen.getByRole('dialog')).toHaveAttribute('data-placeholder-only', 'false');
  expect(screen.getByTestId('detail-body')).toHaveTextContent(realEvent.body['zh-Hant']!);
});

test('detail shows only each localized theme name and omits the sample label', () => {
  for (const locale of ['zh-Hant', 'zh-Hans', 'en'] as const)
    for (const themeId of themeIds) {
      const { container, unmount } = render(
        <EventDetail
          event={{ ...event, themeId }}
          locale={locale}
          phase="detail"
          onClose={vi.fn()}
        />,
      );
      expect(container.querySelector('.detail-text .eyebrow')).toBeNull();
      expect(container.querySelector('.detail-theme')).toHaveTextContent(
        themes[themeId].label[locale],
      );
      expect(container.querySelector('.detail-theme span')).toBeNull();
      unmount();
    }
});

test('only the return arrow closes detail without reaching underlying actions', async () => {
  const onClose = vi.fn(),
    underlyingAction = vi.fn();
  render(
    <div onClick={underlyingAction}>
      <EventDetail event={event} locale="zh-Hans" phase="detail" onClose={onClose} />
    </div>,
  );
  const close = screen.getByTestId('close-detail');
  expect(close).toHaveFocus();
  expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  expect(close).toHaveAttribute('aria-label', '返回时间轴');
  expect(screen.getByText('点击年代上方的返回箭头返回时间轴；三分钟后自动返回。')).toHaveClass('sr-only');
  await userEvent.click(screen.getByTestId('detail-body'));
  await userEvent.click(screen.getByRole('dialog'));
  expect(onClose).not.toHaveBeenCalled();
  expect(underlyingAction).not.toHaveBeenCalled();
  await userEvent.click(close);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(underlyingAction).not.toHaveBeenCalled();
});

test('keyboard focus stays on the arrow and description while Escape does not close', async () => {
  const onClose = vi.fn();
  const realEvent = timeline.schoolEvents.find((item) => item.id === 'P01')! as SchoolEvent;
  const { unmount } = render(
    <EventDetail event={realEvent} locale="en" phase="detail" onClose={onClose} />,
  );
  expect(screen.getByTestId('close-detail')).toHaveFocus();
  await userEvent.tab();
  expect(screen.getByTestId('detail-body')).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(screen.getByTestId('close-detail')).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  expect(onClose).not.toHaveBeenCalled();
  await userEvent.keyboard('{Enter}');
  expect(onClose).toHaveBeenCalledTimes(1);
  unmount();
  fireEvent.keyDown(window, { key: 'Tab' });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('placeholder-only details keep the description accessible while marking the centered mode', async () => {
  const onClose = vi.fn();
  render(<EventDetail event={event} locale="en" phase="detail" onClose={onClose} />);
  expect(screen.getByRole('dialog')).toHaveAttribute('data-placeholder-only', 'true');
  expect(screen.getByTestId('detail-body')).toHaveTextContent(event.body.en!);
  expect(screen.getByTestId('close-detail')).toBeVisible();
  await userEvent.tab();
  expect(screen.getByTestId('close-detail')).toHaveFocus();
});

test('photos without descriptions still have a keyboard-accessible return arrow', async () => {
  const onClose = vi.fn();
  render(
    <EventDetail
      event={{ ...event, title: {}, body: {} }}
      locale="zh-Hant"
      phase="detail"
      onClose={onClose}
    />,
  );
  expect(screen.queryByTestId('detail-text')).not.toBeInTheDocument();
  await userEvent.tab();
  expect(screen.getByTestId('close-detail')).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(onClose).toHaveBeenCalledTimes(1);
});
