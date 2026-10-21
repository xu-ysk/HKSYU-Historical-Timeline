import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Keep both existing local previews running while verifying the new two-page contract.
export default defineConfig({
  ...base,
  testDir: './tests/pages',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4180' },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4180 --strictPort',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: false,
  },
});
