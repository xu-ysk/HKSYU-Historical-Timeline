import type { Locale, ThemeId } from '../domain/timeline';
export const themes: Record<ThemeId, { color: string; label: Record<Locale, string> }> = {
  A: {
    color: '#D33A48',
    label: { 'zh-Hant': '校園發展', 'zh-Hans': '校园发展', en: 'Campus development' },
  },
  B: {
    color: '#F0C243',
    label: {
      'zh-Hant': '榮譽、服務和緬懷',
      'zh-Hans': '荣誉、服务和缅怀',
      en: 'Honours, service & remembrance',
    },
  },
  C: {
    color: '#7B68EE',
    label: {
      'zh-Hant': '從書院到大學',
      'zh-Hans': '从书院到大学',
      en: 'From college to university',
    },
  },
  D: {
    color: '#2A6F62',
    label: { 'zh-Hant': '校務拓展', 'zh-Hans': '校务拓展', en: 'Institutional advancement' },
  },
  E: {
    color: '#005BEA',
    label: {
      'zh-Hant': '重塑博雅教育',
      'zh-Hans': '重塑博雅教育',
      en: 'Reinventing liberal arts education',
    },
  },
};
export const themeIds = Object.keys(themes) as ThemeId[];
