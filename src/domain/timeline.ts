export type Locale = 'zh-Hant' | 'zh-Hans' | 'en';
export type ThemeId = 'A' | 'B' | 'C' | 'D' | 'E';
export type TimelineLane = 'upper' | 'school' | 'education' | 'axis';
export type LocalizedText = Partial<Record<Locale, string>>;
export interface EventText {
  title: LocalizedText;
  body: LocalizedText;
}
export interface EventPhoto {
  id: string;
  kind: 'placeholder' | 'blank' | 'image';
  src?: string;
  width: number;
  height: number;
  alt: LocalizedText;
}
export interface SchoolEvent extends EventText {
  id: string;
  year: number;
  yearLabel?: string;
  orderInYear: number;
  themeId: ThemeId;
  photoGroupId: string;
  photos: EventPhoto[];
}
export interface UpperRailEvent extends EventText {
  id: string;
  year: number;
  yearLabel?: string;
  orderInYear: number;
}
export interface EducationEvent extends EventText {
  id: string;
  year: number;
  yearLabel?: string;
  orderInYear: number;
}
export interface TimelineDataset {
  schemaVersion: 1;
  revision: string;
  upperRailEvents: UpperRailEvent[];
  schoolEvents: SchoolEvent[];
  educationEvents: EducationEvent[];
}
export interface DisplayCard {
  id: string;
  event: SchoolEvent;
  photo: EventPhoto | null;
  slot: number;
  countInYear: number;
}
export const localized = (text: LocalizedText, locale: Locale) =>
  text[locale] ?? text.en ?? text['zh-Hant'] ?? text['zh-Hans'] ?? '';

export const localizedYearLabel = (event: { year: number; yearLabel?: string }, locale: Locale) => {
  const label = event.yearLabel ?? String(event.year);
  return locale === 'en' ? label.replace(/(\d{4})年代/g, '$1s') : label;
};
