import type { DisplayCard, Locale } from '../domain/timeline';
import { memo } from 'react';
import { localized, localizedYearLabel } from '../domain/timeline';
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
    const image = card.photo?.kind === 'image' && card.photo.src ? card.photo.src : null;
    const title = localized(card.event.title, locale).trim();
    const body = localized(card.event.body, locale).trim();
    const placeholder = !image;
    const placeholderBody = title ? body : body || title;
    return (
      <button
        className={'photo-card' + (image ? ' photo-card-image' : ' photo-card-placeholder')}
        data-card-id={card.id}
        data-event-id={card.event.id}
        data-theme={card.event.themeId}
        data-placeholder={placeholder ? 'true' : undefined}
        data-testid={'card-' + card.id}
        aria-label={
          card.event.year +
          ' · ' +
          (title || body || localizedYearLabel(card.event, locale)) +
          ' · ' +
          (placeholder ? body || title || 'Text only' : localized(card.photo!.alt, locale))
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
        <span className={'photo-paper' + (image ? ' photo-image-paper' : '')}>
          {image ? (
            <img
              className="photo-image"
              src={image}
              alt={localized(card.photo!.alt, locale)}
              draggable={false}
            />
          ) : (
            <span
              className={'photo-placeholder-content' + (title ? '' : ' photo-placeholder-no-title')}
            >
              <span className="photo-placeholder-year">
                {localizedYearLabel(card.event, locale)}
              </span>
              {title && <span className="photo-placeholder-title">{title}</span>}
              {placeholderBody && <span className="photo-placeholder-body">{placeholderBody}</span>}
            </span>
          )}
        </span>
      </button>
    );
  },
  (before, after) => before.card === after.card && before.locale === after.locale,
);
