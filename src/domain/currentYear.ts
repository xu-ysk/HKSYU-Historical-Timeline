export function getCurrentYear(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Hong_Kong', year: 'numeric' }).format(date),
  );
}
export function untilNextHongKongDay(now = Date.now()) {
  const day = 86400000,
    offset = 8 * 3600000;
  return day - ((now + offset) % day) + 100;
}
