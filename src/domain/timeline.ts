export type Locale = 'zh-Hant' | 'zh-Hans' | 'en';
export type ThemeId = 'A' | 'B' | 'C' | 'D' | 'E';
export type LocalizedText = Partial<Record<Locale, string>>;
export interface EventText {
  title: LocalizedText;
  body: LocalizedText;
}
export interface EventPhoto {
  id: string;
  kind: 'placeholder' | 'image';
  src?: string;
  width: number;
  height: number;
  alt: LocalizedText;
}
export interface SchoolEvent extends EventText {
  id: string;
  year: number;
  orderInYear: number;
  themeId: ThemeId;
  photos: EventPhoto[];
}
export interface EducationEvent extends EventText {
  id: string;
  year: number;
  orderInYear: number;
}
export interface TimelineDataset {
  schemaVersion: 1;
  revision: string;
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
