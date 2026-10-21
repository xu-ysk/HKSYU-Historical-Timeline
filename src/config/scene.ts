export const sceneConfig = {
  angle: (-32 * Math.PI) / 180,
  overviewCardWidth: 42,
  // Keep the browsing cards compact enough for the parallel education lane to remain visible.
  browseCardWidth: 238,
  browseLength: 6500,
  // Shorten the quiet pre-college section without changing later year spacing.
  earlyBrowseEndYear: 1971,
  earlyBrowseScale: 0.2,
  gap: 100,
  gapSoftness: 8,
  // Move 25% less for the same gesture while retaining precise direct dragging.
  wheelSensitivity: 0.2625,
  dragSensitivity: 0.75,
  wheelDuration: 0.8,
  // Enlarge the selected theme; the controller hides photos from other themes.
  themeLarge: 1.25,
  themeSmall: 0.35,
  duration: 0.75,
};
