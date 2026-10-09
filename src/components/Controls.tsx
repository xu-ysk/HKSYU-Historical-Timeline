import type { Locale, ThemeId } from '../domain/timeline';
import { themes, themeIds } from '../config/themes';
import { messages } from '../i18n/messages';
export function LanguageSwitcher({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <nav className="languages" aria-label={messages[locale].language}>
      {(['en', 'zh-Hant', 'zh-Hans'] as Locale[]).map((l) => (
        <button
          key={l}
          data-testid={'language-' + l}
          aria-pressed={locale === l}
          onClick={() => onChange(l)}
        >
          {{ en: 'EN', 'zh-Hant': '繁', 'zh-Hans': '简' }[l]}
        </button>
      ))}
    </nav>
  );
}
export function ThemeSwitcher({
  locale,
  active,
  onChange,
}: {
  locale: Locale;
  active: ThemeId | null;
  onChange: (id: ThemeId | null) => void;
}) {
  const m = messages[locale];
  return (
    <section className="theme-panel" data-testid="theme-panel" aria-label={m.themes}>
      <div className="theme-list">
        {themeIds.map((id) => (
          <button
            key={id}
            className="theme-button"
            data-testid={'theme-' + id}
            aria-pressed={active === id}
            onClick={() => onChange(active === id ? null : id)}
            style={{ '--swatch': themes[id].color } as React.CSSProperties}
          >
            <span>{themes[id].label[locale]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
