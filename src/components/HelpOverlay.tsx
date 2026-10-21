import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Locale } from '../domain/timeline';
import { themes, themeIds } from '../config/themes';
import { messages } from '../i18n/messages';

const copy = {
  'zh-Hant': {
    eyebrow: '參觀指引 / HOW TO EXPLORE',
    dialogLabel: '操作指引',
    moveTitle: '移動時間軸',
    move: '在「雙時間軸」頁面，用一根手指在兩條時間線中間的空白區域左右滑動，即可同步瀏覽不同年份；輕觸任一時間線上的年份，可直接跳到那一年。',
    viewTitle: '選擇視角',
    view: '「校史照片」預設顯示校園發展，照片按年份沿折返線平面排列，同一事件的多張相片疊在一起，全部內容自動縮放至一屏。輕觸「雙時間軸」查看樹仁校史與香港教育史。',
    photoTitle: '細看相片',
    photo:
      '輕觸任一相片，該組相片會緩緩展開。用雙指張開或捏合來放大、縮小相片，放大後用一根手指移動；輕觸詳情中的左右箭頭切換事件，或輕觸小房子返回校史照片。',
    personalizeTitle: '主題切換',
    personalize: '在「校史照片」頁，輕觸右下角彩色圓形按鈕切換主題，每次只顯示一個主題的照片。',
    footer: '隨時可輕觸頁首「操作指引」再次查看。',
    start: '開始探索',
    dismiss: '關閉操作指引',
    language: '指引語言',
  },
  'zh-Hans': {
    eyebrow: '参观指引 / HOW TO EXPLORE',
    dialogLabel: '操作指引',
    moveTitle: '移动时间轴',
    move: '在“双时间轴”页面，用一根手指在两条时间线中间的空白区域左右滑动，即可同步浏览不同年份；轻触任一时间线上的年份，可直接跳到那一年。',
    viewTitle: '选择视角',
    view: '“校史照片”默认显示校园发展，照片按年份沿折返线平面排列，同一事件的多张照片叠在一起，全部内容自动缩放至一屏。轻触“双时间轴”查看树仁校史与香港教育史。',
    photoTitle: '细看照片',
    photo:
      '轻触任一照片，该组照片会缓缓展开。用双指张开或捏合来放大、缩小照片，放大后用一根手指移动；轻触详情中的左右箭头切换事件，或轻触小房子返回校史照片。',
    personalizeTitle: '主题切换',
    personalize: '在“校史照片”页，轻触右下角彩色圆形按钮切换主题，每次只显示一个主题的照片。',
    footer: '随时可轻触页首“操作指引”再次查看。',
    start: '开始探索',
    dismiss: '关闭操作指引',
    language: '指引语言',
  },
  en: {
    eyebrow: 'VISITOR GUIDE / HOW TO EXPLORE',
    dialogLabel: 'Visitor guide',
    moveTitle: 'Move along the timeline',
    move: 'On Dual Timelines, swipe left or right in the empty space between the two timelines to move them together. Tap a year on either timeline to jump there.',
    viewTitle: 'Choose a view',
    view: 'History Photos starts with Campus development. Flat photo stacks follow a chronological, back-and-forth path, with the whole collection fitted on one screen. Tap Dual Timelines for Shue Yan history and Hong Kong education history.',
    photoTitle: 'Look closer',
    photo:
      'Tap any photograph to slowly unfold its group. Spread or pinch two fingers to zoom; move the enlarged image with one finger. Tap the detail arrows to switch events, or tap the home button to return to History Photos.',
    personalizeTitle: 'Switch themes',
    personalize:
      'On History Photos, tap a coloured circle at the bottom right to switch themes. Photographs from one theme are shown at a time.',
    footer: 'Tap Guide beside History Photos and Dual Timelines to see these instructions again.',
    start: 'Start exploring',
    dismiss: 'Close guide',
    language: 'Guide language',
  },
} satisfies Record<Locale, Record<string, string>>;

export function HelpOverlay({
  open,
  locale,
  onClose,
  onLocaleChange,
}: {
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onLocaleChange: (locale: Locale) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  if (!open) return null;
  const c = copy[locale];
  const trapKeys = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>('button, select') ?? [],
    );
    const index = focusable.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && index === 0) {
      event.preventDefault();
      focusable.at(-1)?.focus();
    } else if (!event.shiftKey && index === focusable.length - 1) {
      event.preventDefault();
      focusable[0]?.focus();
    }
    event.stopPropagation();
  };
  return createPortal(
    <div className="help-overlay" data-testid="help-overlay">
      <section
        ref={dialogRef}
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={c.dialogLabel}
        onKeyDown={trapKeys}
      >
        <div className="help-topline">
          <span>{c.eyebrow}</span>
          <label className="help-language">
            <span>{c.language}</span>
            <select
              value={locale}
              onChange={(event) => onLocaleChange(event.target.value as Locale)}
            >
              <option value="zh-Hant">繁</option>
              <option value="zh-Hans">简</option>
              <option value="en">EN</option>
            </select>
          </label>
          <button
            ref={closeRef}
            type="button"
            className="help-close"
            aria-label={c.dismiss}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="help-body">
          <div className="help-guide">
            <div className="help-step">
              <span className="help-visual help-swipe" aria-hidden="true">
                ← →
              </span>
              <div>
                <h3>{c.moveTitle}</h3>
                <p>{c.move}</p>
              </div>
            </div>
            <div className="help-step">
              <span className="help-visual help-views" aria-hidden="true">
                <span>{messages[locale].overview}</span>
                <span>{messages[locale].browse}</span>
              </span>
              <div>
                <h3>{c.viewTitle}</h3>
                <p>{c.view}</p>
              </div>
            </div>
            <div className="help-step">
              <span className="help-visual help-photo" aria-hidden="true">
                <span className="help-photo-home">⌂</span>
                <span className="help-photo-left">←</span>
                <span className="help-photo-right">→</span>
              </span>
              <div>
                <h3>{c.photoTitle}</h3>
                <p>{c.photo}</p>
              </div>
            </div>
            <div className="help-step">
              <span className="help-visual help-themes" aria-hidden="true">
                {themeIds.map((id) => (
                  <i key={id} style={{ backgroundColor: themes[id].color }} />
                ))}
              </span>
              <div>
                <h3>{c.personalizeTitle}</h3>
                <p>{c.personalize}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="help-actions">
          <p>{c.footer}</p>
          <button type="button" className="help-start" onClick={onClose}>
            {c.start} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
