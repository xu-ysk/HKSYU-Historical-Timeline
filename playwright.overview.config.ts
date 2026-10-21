import { defineConfig } from '@playwright/test';
import base from './playwright.real.config';

export default defineConfig({
  ...base,
  testMatch: 'overview-only.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4186', hasTouch: true },
  projects: base.projects?.map((project) => ({
    ...project,
    use: { ...project.use, hasTouch: true },
  })),
  webServer: {
    command: 'npm run build && npm run preview -- --port 4186',
    url: 'http://127.0.0.1:4186',
    reuseExistingServer: false,
  },
});
