import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const port = 4183;
export default defineConfig({
  ...base,
  testDir: './tests/real',
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `npm run build && npm run serve:live -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
