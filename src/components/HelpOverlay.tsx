import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Locale } from '../domain/timeline';
import { themes, themeIds } from '../config/themes';

const copy = {
  'zh-Hant': {
    eyebrow: '參觀指引 / HOW TO EXPLORE',
    dialogLabel: '操作指引',
    moveTitle: '查看歷史節點',
    move: '輕觸兩條時間線上的任一圓點，文字會顯示於「樹仁校史」或「高等教育重點政策」標題下方。使用頁首 EN／繁／簡切換語言，或使用文字下方的左右箭頭切換年份。',
    photoTitle: '細看相片',
    photo: '輕觸相片打開詳情。用雙指張開或捏合來放大、縮小相片，放大後用一根手指移動；輕觸詳情中的左右箭頭切換事件，或輕觸小房子返回時間軸。',
    personalizeTitle: '主題切換',
    personalize: '輕觸右下角彩色圓形按鈕篩選主題；輕觸相冊旁的小房子，即可恢復全部內容並返回全覽。',
    footer: '隨時可輕觸頁首「操作指引」再次查看。',
    start: '開始探索',
    dismiss: '關閉操作指引',
    language: '指引語言',
  },
  'zh-Hans': {
    eyebrow: '参观指引 / HOW TO EXPLORE',
    dialogLabel: '操作指引',
    moveTitle: '查看历史节点',
    move: '轻触两条时间线上的任意圆点，文字会显示于“树仁校史”或“高等教育重点政策”标题下方。使用页首 EN／繁／简切换语言，或使用文字下方的左右箭头切换年份。',
    photoTitle: '细看照片',
    photo: '轻触照片打开详情。用双指张开或捏合来放大、缩小照片，放大后用一根手指移动；轻触详情中的左右箭头切换事件，或轻触小房子返回时间轴。',
    personalizeTitle: '主题切换',
    personalize: '轻触右下角彩色圆形按钮筛选主题；轻触照片集旁的小房子，即可恢复全部内容并返回全览。',
    footer: '随时可轻触页首“操作指引”再次查看。',
    start: '开始探索',
    dismiss: '关闭操作指引',
    language: '指引语言',
  },
  en: {
    eyebrow: 'VISITOR GUIDE / HOW TO EXPLORE',
    dialogLabel: 'Visitor guide',
    moveTitle: 'Read the history',
    move: 'Tap any point on either timeline to read the text below Shue Yan history or Key Tertiary Education Policies. Use EN / 繁 / 简 at the top to switch languages, or the arrows below the text to change years.',
    photoTitle: 'Look closer',
    photo: 'Tap a photograph to open it. Spread or pinch two fingers to zoom; move the enlarged image with one finger. Tap the detail arrows to switch events, or tap the home button to return to the timeline.',
    personalizeTitle: 'Switch themes',
    personalize: 'Tap a coloured circle at the bottom right to filter by theme; tap either home beside the album to show everything and return to Overview.',
    footer: 'Tap Guide beside Overview to see these instructions again.',
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
              <span className="help-visual help-timeline" aria-hidden="true">
                <span className="help-timeline-line" />
                <span className="help-timeline-point" />
                <span className="help-timeline-year">1971</span>
                <span className="help-timeline-finger">👆</span>
              </span>
              <div><h3>{c.moveTitle}</h3><p>{c.move}</p></div>
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
