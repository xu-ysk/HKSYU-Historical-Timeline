import type { DisplayCard, Locale } from '../domain/timeline';
import { memo } from 'react';
import { localized } from '../domain/timeline';
import { themes } from '../config/themes';
import { transform, type Pose } from './layout';
export const PhotoCard = memo(
  function PhotoCard({
    card,
    locale,
    pose,
    onSelect,
  }: {
    card: DisplayCard;
    locale: Locale;
    pose: Pose;
    onSelect?: (id: string) => void;
  }) {
    return (
      <button
        className="photo-card"
        data-card-id={card.id}
        data-event-id={card.event.id}
        data-theme={card.event.themeId}
        data-testid={'card-' + card.id}
        aria-label={
          card.event.year +
          ' · ' +
          localized(card.event.title, locale) +
          ' · ' +
          (card.photo?.alt.en ?? 'Text only')
        }
        style={
          {
            width: pose.width,
            height: pose.height,
            transform: transform(pose),
            zIndex: pose.z,
            '--card-accent': themes[card.event.themeId].color,
          } as React.CSSProperties
        }
        onClick={() => onSelect?.(card.event.id)}
      >
        <span className="photo-paper">
          <span className="photo-top">
            HKSYU ARCHIVE <span>{card.event.year}</span>
          </span>
          <span className="photo-letter">
            {card.event.themeId}
            {card.photo && card.event.photos.length > 1 && (
              <small>{card.photo.id.endsWith('-0') ? '1' : '2'}</small>
            )}
          </span>
          <span className="photo-bottom">
            {card.photo ? 'A MOMENT IN TIME' : 'A STORY IN WORDS'}
            <span>—</span>
          </span>
        </span>
      </button>
    );
  },
  (before, after) => before.card === after.card && before.locale === after.locale,
);
