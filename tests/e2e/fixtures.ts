import { test as base, expect } from '@playwright/test';
export { expect };
export type { Page } from '@playwright/test';
export const test = base.extend<{ runtimeAudit: void }>({
  runtimeAudit: [
    async ({ page }, use) => {
      const errors: string[] = [],
        forbidden: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('request', (r) => {
        if (/hksyu\.edu|\.xlsx/i.test(r.url())) forbidden.push(r.url());
      });
      await use();
      expect(errors, 'no uncaught or console errors during the complete flow').toEqual([]);
      expect(forbidden, 'no school server or workbook request in V1').toEqual([]);
    },
    { auto: true },
  ],
});
