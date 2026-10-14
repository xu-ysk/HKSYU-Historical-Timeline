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

test('detail language buttons switch the open event without closing it', async () => {
  const realEvent = timeline.schoolEvents.find((item) => item.id === 'P01')! as SchoolEvent;
  const onLocaleChange = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <EventDetail event={realEvent} locale="zh-Hant" onLocaleChange={onLocaleChange} phase="detail" onClose={onClose} />,
  );
  await userEvent.click(screen.getByTestId('detail-language-en'));
  expect(onLocaleChange).toHaveBeenCalledWith('en');
  view.rerender(
    <EventDetail event={realEvent} locale="en" onLocaleChange={onLocaleChange} phase="detail" onClose={onClose} />,
  );
  expect(screen.getByTestId('event-detail')).toHaveAttribute('data-event', 'P01');
  expect(screen.getByTestId('detail-body')).toHaveTextContent(realEvent.body.en!);
  expect(screen.getByTestId('detail-language-en')).toHaveAttribute('aria-pressed', 'true');
  expect(onClose).not.toHaveBeenCalled();
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

test('only the home button closes detail without reaching underlying actions', async () => {
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
  expect(close.querySelector('path')).toHaveAttribute('d', expect.stringContaining('M5 14.5 16 6'));
  expect(screen.getByText('点击小房子返回时间轴，或使用左右箭头切换年份；三分钟后自动返回。')).toHaveClass('sr-only');
  await userEvent.click(screen.getByTestId('detail-body'));
  await userEvent.click(screen.getByRole('dialog'));
  expect(onClose).not.toHaveBeenCalled();
  expect(underlyingAction).not.toHaveBeenCalled();
  await userEvent.click(close);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(underlyingAction).not.toHaveBeenCalled();
});

test('year arrows switch records without closing and remain keyboard accessible', async () => {
  const onClose = vi.fn();
  const onPrevious = vi.fn();
  const onNext = vi.fn();
  const realEvent = timeline.schoolEvents.find((item) => item.id === 'P03')! as SchoolEvent;
  render(
    <EventDetail
      event={realEvent}
      locale="zh-Hant"
      phase="detail"
      onClose={onClose}
      onPrevious={onPrevious}
      onNext={onNext}
    />,
  );
  const previous = screen.getByRole('button', { name: '上一年照片' });
  const next = screen.getByRole('button', { name: '下一年照片' });
  expect(previous).toBeVisible();
  expect(next).toBeVisible();
  await userEvent.tab();
  expect(screen.getByTestId('detail-body')).toHaveFocus();
  await userEvent.tab();
  expect(previous).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(next);
  expect(onPrevious).toHaveBeenCalledTimes(1);
  expect(onNext).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('a boundary year displays only its available arrow', () => {
  const first = timeline.schoolEvents.find((item) => item.id === 'P01')! as SchoolEvent;
  const view = render(
    <EventDetail event={first} locale="en" phase="detail" onClose={vi.fn()} onNext={vi.fn()} />,
  );
  expect(screen.queryByTestId('detail-previous')).not.toBeInTheDocument();
  expect(screen.getByTestId('detail-next')).toBeVisible();
  view.rerender(
    <EventDetail
      event={timeline.schoolEvents.find((item) => item.id === 'P118')! as SchoolEvent}
      locale="en"
      phase="detail"
      onClose={vi.fn()}
      onPrevious={vi.fn()}
    />,
  );
  expect(screen.getByTestId('detail-previous')).toBeVisible();
  expect(screen.queryByTestId('detail-next')).not.toBeInTheDocument();
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

test('photos without descriptions still have a keyboard-accessible home button', async () => {
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
