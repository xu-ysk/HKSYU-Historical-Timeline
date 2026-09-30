export const sceneConfig = {
  angle: (-32 * Math.PI) / 180,
  overviewCardWidth: 36,
  // Keep the browsing cards compact enough for the parallel education lane to remain visible.
  browseCardWidth: 238,
  browseLength: 6500,
  gap: 300,
  gapSoftness: 8,
  // Move 25% less for the same gesture while retaining precise direct dragging.
  wheelSensitivity: 0.2625,
  dragSensitivity: 0.75,
  wheelDuration: 0.8,
  // A selected theme keeps the normal photo size; other themes recede without disappearing.
  themeLarge: 1,
  themeSmall: 0.35,
  duration: 0.75,
};
