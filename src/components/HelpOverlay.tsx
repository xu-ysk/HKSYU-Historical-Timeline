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
    move: '用一根手指沿箭頭方向滑動時間軸，瀏覽不同年份。滑動時請在時間線兩側的空白區域操作，避免誤觸相片集而造成卡頓；輕觸時間線上的年份，可直接跳到那一年。',
    viewTitle: '選擇視角',
    view: '輕觸「全覽」看完整相冊，輕觸「瀏覽」近距離觀看。',
    photoTitle: '細看相片',
    photo: '輕觸相片打開詳情。用雙指張開或捏合來放大、縮小相片，放大後用一根手指移動；輕觸詳情中的左右箭頭切換事件，或輕觸小房子返回時間軸。',
    personalizeTitle: '主題切換',
    personalize: '輕觸右下角彩色圓形按鈕篩選主題；輕觸「請滑動空白區域」旁的小房子，即可恢復全部內容並返回全覽。',
    footer: '隨時可輕觸頁首「操作指引」再次查看。',
    start: '開始探索',
    dismiss: '關閉操作指引',
    language: '指引語言',
  },
  'zh-Hans': {
    eyebrow: '参观指引 / HOW TO EXPLORE',
    dialogLabel: '操作指引',
    moveTitle: '移动时间轴',
    move: '用一根手指沿箭头方向滑动时间轴，浏览不同年份。滑动时请在时间线两侧的空白区域操作，避免误触照片集而造成卡顿；轻触时间线上的年份，可直接跳到那一年。',
    viewTitle: '选择视角',
    view: '轻触“全览”看完整相册，轻触“浏览”近距离观看。',
    photoTitle: '细看照片',
    photo: '轻触照片打开详情。用双指张开或捏合来放大、缩小照片，放大后用一根手指移动；轻触详情中的左右箭头切换事件，或轻触小房子返回时间轴。',
    personalizeTitle: '主题切换',
    personalize: '轻触右下角彩色圆形按钮筛选主题；轻触“请滑动空白区域”旁的小房子，即可恢复全部内容并返回全览。',
    footer: '随时可轻触页首“操作指引”再次查看。',
    start: '开始探索',
    dismiss: '关闭操作指引',
    language: '指引语言',
  },
  en: {
    eyebrow: 'VISITOR GUIDE / HOW TO EXPLORE',
    dialogLabel: 'Visitor guide',
    moveTitle: 'Move along the timeline',
    move: 'Swipe along the arrows with one finger to explore different years. Swipe the empty space on either side of the timeline to avoid accidentally touching photographs and slowing the display. Tap a year on the timeline to jump there.',
    viewTitle: 'Choose a view',
    view: 'Tap Overview to see the whole album or Explore to look closer.',
    photoTitle: 'Look closer',
    photo: 'Tap a photograph to open it. Spread or pinch two fingers to zoom; move the enlarged image with one finger. Tap the detail arrows to switch events, or tap the home button to return to the timeline.',
    personalizeTitle: 'Switch themes',
    personalize: 'Tap a coloured circle at the bottom right to filter by theme; tap either home beside “Swipe on empty space” to show everything and return to Overview.',
    footer: 'Tap Guide beside Overview and Explore to see these instructions again.',
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
            <select value={locale} onChange={(event) => onLocaleChange(event.target.value as Locale)}>
              <option value="zh-Hant">繁</option>
              <option value="zh-Hans">简</option>
              <option value="en">EN</option>
            </select>
          </label>
          <button ref={closeRef} type="button" className="help-close" aria-label={c.dismiss} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="help-body">
          <div className="help-guide">
            <div className="help-step">
              <span className="help-visual help-swipe" aria-hidden="true">↗ ↙</span>
              <div><h3>{c.moveTitle}</h3><p>{c.move}</p></div>
            </div>
            <div className="help-step">
              <span className="help-visual help-views" aria-hidden="true">
                <span>{messages[locale].overview}</span>
                <span>{messages[locale].browse}</span>
              </span>
              <div><h3>{c.viewTitle}</h3><p>{c.view}</p></div>
            </div>
            <div className="help-step">
              <span className="help-visual help-photo" aria-hidden="true">
                <span className="help-photo-home">⌂</span>
                <span className="help-photo-left">←</span>
                <span className="help-photo-right">→</span>
              </span>
              <div><h3>{c.photoTitle}</h3><p>{c.photo}</p></div>
            </div>
            <div className="help-step">
              <span className="help-visual help-themes" aria-hidden="true">
                {themeIds.map((id) => (
                  <i key={id} style={{ backgroundColor: themes[id].color }} />
                ))}
              </span>
              <div><h3>{c.personalizeTitle}</h3><p>{c.personalize}</p></div>
            </div>
          </div>
        </div>
        <div className="help-actions">
          <p>{c.footer}</p>
          <button type="button" className="help-start" onClick={onClose}>{c.start} <span aria-hidden="true">↗</span></button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
