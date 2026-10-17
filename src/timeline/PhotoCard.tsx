import type { DisplayCard, Locale } from '../domain/timeline';
import { memo, useEffect, useRef, useState } from 'react';
import { localized, localizedYearLabel } from '../domain/timeline';
import { themes } from '../config/themes';
import { transform, type Pose } from './layout';
import { queueImage, prioritizeImage, releaseImage, type ImageRequest } from './imageLoadQueue';
const blankPhotoLabels: Record<Locale, string> = {
  'zh-Hant': '空白相片佔位',
  'zh-Hans': '空白照片占位',
  en: 'Blank photo placeholder',
};
function photoSource(image: string, revision?: string): string {
  // School URLs own their cache keys. Changing copy must not reload every remote photo.
  if (!revision || /^https?:/i.test(image)) return image;
  const url = new URL(image, window.location.href);
  url.searchParams.set('v', revision);
  return `${image.split('#')[0].split('?')[0]}${url.search}${url.hash}`;
}
export const PhotoCard = memo(
  function PhotoCard({
    card,
    locale,
    revision,
    pose,
    onSelect,
  }: {
    card: DisplayCard;
    locale: Locale;
    revision?: string;
    pose: Pose;
    onSelect?: (id: string) => void;
  }) {
    const image = card.photo?.kind === 'image' && card.photo.src ? card.photo.src : null;
    const imageRef = useRef<HTMLImageElement>(null);
    const [visibleOnce, setVisibleOnce] = useState(false);
    const remote = Boolean(image && /^https?:/i.test(image));
    const [allowedSource, setAllowedSource] = useState<string | null>(null);
    const requestRef = useRef<ImageRequest | null>(null);
    useEffect(() => {
      const element = imageRef.current;
      if (!remote || !element || visibleOnce) return;
      if (typeof IntersectionObserver === 'undefined') {
        setVisibleOnce(true);
        return;
      }
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleOnce(true);
          observer.disconnect();
        }
      }, { rootMargin: '250px' });
      observer.observe(element);
      return () => observer.disconnect();
    }, [remote, visibleOnce]);
    useEffect(() => {
      if (!remote || !image || !visibleOnce) return;
      const request = queueImage(() => setAllowedSource(image));
      requestRef.current = request;
      const element = imageRef.current;
      const prioritize = () => prioritizeImage(request);
      element?.addEventListener('photo-priority', prioritize);
      if (element?.closest('[data-extracted="true"]')) prioritize();
      return () => {
        element?.removeEventListener('photo-priority', prioritize);
        releaseImage(request);
        requestRef.current = null;
      };
    }, [image, remote, visibleOnce]);
    const finishLoading = () => {
      if (requestRef.current) releaseImage(requestRef.current);
    };
    const blank = card.photo?.kind === 'blank';
    const photoSurface = Boolean(image || blank);
    const title = localized(card.event.title, locale).trim();
    const body = localized(card.event.body, locale).trim();
    const placeholder = !image;
    const placeholderBody = title ? body : body || title;
    return (
      <button
        className={'photo-card' + (photoSurface ? ' photo-card-image' : ' photo-card-placeholder')}
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
          (blank
            ? blankPhotoLabels[locale]
            : placeholder
              ? body || title || 'Text only'
              : localized(card.photo!.alt, locale))
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
        <span className={'photo-paper' + (photoSurface ? ' photo-image-paper' : '')}>
          {image ? (
            <img
              ref={imageRef}
              className="photo-image"
              src={!remote || allowedSource === image ? photoSource(image, revision) : undefined}
              alt={localized(card.photo!.alt, locale)}
              loading="eager"
              fetchPriority="low"
              onLoad={finishLoading}
              onError={finishLoading}
              draggable={false}
            />
          ) : blank ? (
            <span className="photo-blank" aria-hidden="true" />
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
  (before, after) =>
    before.card === after.card &&
    before.locale === after.locale &&
    before.revision === after.revision,
);
