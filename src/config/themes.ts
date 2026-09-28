import type { Locale, ThemeId } from '../domain/timeline';
export const themes: Record<ThemeId, { color: string; label: Record<Locale, string> }> = {
  A: {
    color: '#B85C5F',
    label: { 'zh-Hant': '校園發展', 'zh-Hans': '校园发展', en: 'Campus development' },
  },
  B: {
    color: '#C1A46B',
    label: {
      'zh-Hant': '榮譽、服務和緬懷',
      'zh-Hans': '荣誉、服务和缅怀',
      en: 'Honours, service & remembrance',
    },
  },
  C: {
    color: '#7D6A8E',
    label: {
      'zh-Hant': '從書院到大學',
      'zh-Hans': '从书院到大学',
      en: 'From college to university',
    },
  },
  D: {
    color: '#6B8E7A',
    label: { 'zh-Hant': '校務拓展', 'zh-Hans': '校务拓展', en: 'Institutional advancement' },
  },
  E: {
    color: '#5C6E84',
    label: { 'zh-Hant': '重塑博雅教育', 'zh-Hans': '重塑博雅教育', en: 'Reimagining liberal arts' },
  },
};
export const themeIds = Object.keys(themes) as ThemeId[];
