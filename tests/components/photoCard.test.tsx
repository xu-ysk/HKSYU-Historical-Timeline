import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { PhotoCard } from '../../src/timeline/PhotoCard';
import { createMockTimeline } from '../../src/data/mockTimeline';
import { toCards } from '../../src/domain/normalizeTimeline';
import type { SchoolEvent } from '../../src/domain/timeline';
import timeline from '../../public/timeline.json';

test('placeholder cards use the event year and description instead of archive lettering', () => {
  const card = toCards(createMockTimeline(2026)).find((item) => !item.photo)!;
  render(
    <PhotoCard
      card={card}
      locale="en"
      pose={{ x: 100, y: 100, width: 240, height: 160, ry: 0, rz: 0, scale: 1, z: 1 }}
    />,
  );
  const element = screen.getByTestId(`card-${card.id}`);
  expect(element).toHaveAttribute('data-placeholder', 'true');
  expect(element).toHaveTextContent(String(card.event.year));
  expect(element).toHaveTextContent(card.event.body.en!);
  expect(element.querySelector('.photo-letter')).toBeNull();
  expect(element.querySelector('.photo-top')).toBeNull();
  expect(element.querySelector('.photo-bottom')).toBeNull();
});

test('real photo slots display the image without placeholder text', () => {
  const event = timeline.schoolEvents.find((item) => item.id === 'P01')! as SchoolEvent;
  const photo = event.photos[0];
  const card = { id: `${event.id}/${photo.id}`, event, photo, slot: 0, countInYear: 2 };
  const pose = { x: 100, y: 100, width: 240, height: 160, ry: 0, rz: 0, scale: 1, z: 1 };
  render(<PhotoCard card={card} locale="zh-Hant" pose={pose} />);
  const element = screen.getByTestId(`card-${card.id}`);
  expect(element).not.toHaveAttribute('data-placeholder');
  expect(element).toHaveClass('photo-card-image');
  expect(element.querySelector('img')).toHaveAttribute('src', photo.src);
  expect(element.querySelector('.photo-blank')).toBeNull();
  expect(element.querySelector('.photo-placeholder-content')).toBeNull();
});

test('a new content revision reloads a photo even when its path stays the same', () => {
  const event = timeline.schoolEvents.find((item) => item.id === 'P01')! as SchoolEvent;
  const photo = event.photos[0];
  const card = { id: `${event.id}/${photo.id}`, event, photo, slot: 0, countInYear: 2 };
  const pose = { x: 100, y: 100, width: 240, height: 160, ry: 0, rz: 0, scale: 1, z: 1 };
  const view = render(<PhotoCard card={card} locale="en" revision="first" pose={pose} />);
  expect(screen.getByRole('img')).toHaveAttribute('src', `${photo.src}?v=first`);
  view.rerender(<PhotoCard card={card} locale="en" revision="second" pose={pose} />);
  expect(screen.getByRole('img')).toHaveAttribute('src', `${photo.src}?v=second`);
});

for (const id of ['P44', 'P76', 'P82', 'P89', 'P113', 'P117']) {
  test(`${id} displays its imported description in every language`, () => {
    const event = timeline.schoolEvents.find((item) => item.id === id)!;
    const card = {
      id: `${id}/text-only`,
      event: event as SchoolEvent,
      photo: null,
      slot: 0,
      countInYear: 1,
    };
    const pose = { x: 100, y: 100, width: 240, height: 160, ry: 0, rz: 0, scale: 1, z: 1 };
    const view = render(<PhotoCard card={card} locale="zh-Hant" pose={pose} />);
    for (const locale of ['zh-Hant', 'zh-Hans', 'en'] as const) {
      view.rerender(<PhotoCard card={card} locale={locale} pose={pose} />);
      const element = screen.getByTestId(`card-${card.id}`);
      expect(element.querySelector('.photo-placeholder-year')).toHaveTextContent(
        String(event.year),
      );
      expect(element.querySelector('.photo-placeholder-body')?.textContent).toBe(
        event.body[locale]!,
      );
      expect(element.querySelector('.photo-letter')).toBeNull();
    }
  });
}
