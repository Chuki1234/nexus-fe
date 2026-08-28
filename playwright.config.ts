import { defineConfig, devices } from '@playwright/test';

/**
 * Cấu hình Playwright cho E2E của Nexus (chuẩn chung thay cho Cypress).
 *
 * Chạy:
 *   npx playwright install        # tải browser (lần đầu)
 *   npm run e2e                   # chạy toàn bộ E2E
 *   npm run e2e -- --ui           # chế độ UI để xem trực quan
 *
 * `webServer` tự bật dev server nếu chưa chạy. Nhiều E2E cần đăng nhập — xem
 * `e2e/chat-link-embed.e2e.ts` để biết cách nạp `storageState` (phiên đăng nhập).
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
