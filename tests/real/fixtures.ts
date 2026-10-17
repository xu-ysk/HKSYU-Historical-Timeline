import { test as base, expect } from '../e2e/fixtures';
export { expect };
export type { Page } from '@playwright/test';

// Real-data tests load school-hosted images; V1 mock tests keep their stricter audit.
export const test = base.extend<{ runtimeAudit: void }>({
  runtimeAudit: async ({ page }, use) => {
    const errors: string[] = [];
    const forbidden: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (/\.xlsx(?:$|[?#])/i.test(url.pathname)) forbidden.push(request.url());
      if (/(?:^|\.)hksyu\.edu$/i.test(url.hostname) &&
          !(url.hostname === 'umtimeline.hksyu.edu' && request.resourceType() === 'image'))
        forbidden.push(request.url());
    });
    await use();
    expect(errors, 'no runtime errors while displaying school images').toEqual([]);
    expect(forbidden, 'only school images, never source workbooks, are fetched by the browser').toEqual([]);
  },
});
