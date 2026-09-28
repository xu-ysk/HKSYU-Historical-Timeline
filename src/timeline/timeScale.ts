export const START_YEAR = 1949;
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function timeScale(endYear: number) {
  const span = Math.max(1, endYear - START_YEAR);
  return {
    toUnit: (year: number) => clamp((year - START_YEAR) / span),
    toYear: (unit: number) => START_YEAR + clamp(unit) * span,
    span,
  };
}
export function rebaseFocus(focus: number, oldEnd: number, newEnd: number) {
  return timeScale(newEnd).toUnit(timeScale(oldEnd).toYear(focus));
}
