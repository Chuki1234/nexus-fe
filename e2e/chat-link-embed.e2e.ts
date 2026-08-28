import { test, expect, type Page } from '@playwright/test';

/**
 * E2E cho card embed link nội bộ trong khung chat (feature Profile Embed).
 *
 * ĐIỀU KIỆN CHẠY:
 *  1) `npx playwright install` (tải browser lần đầu).
 *  2) Phiên đăng nhập: các test này cần đã đăng nhập để vào được khung chat.
 *     Cách khuyến nghị — tạo `e2e/.auth/state.json` một lần rồi tái dùng:
 *       - Viết `global-setup` đăng nhập qua UI (điền form /auth/login) và
 *         `context.storageState({ path: 'e2e/.auth/state.json' })`.
 *       - Trong config thêm `use: { storageState: 'e2e/.auth/state.json' }`.
 *     Ở đây dùng `test.use({ storageState })` cục bộ; nếu file chưa có, test sẽ
 *     được đánh dấu skip để không đỏ CI khi chưa cấu hình auth.
 *
 * Chiến lược: MOCK API bằng `page.route` để test độc lập với dữ liệu thật.
 */

const AUTH_STATE = 'e2e/.auth/state.json';
const hasAuth = (() => {
  try {
    return require('node:fs').existsSync(AUTH_STATE);
  } catch {
    return false;
  }
})();

test.describe('chat-link-embed', () => {
  test.skip(!hasAuth, `Cần phiên đăng nhập ở ${AUTH_STATE} (xem chú thích đầu file).`);
  test.use({ storageState: AUTH_STATE });

  /** Mock các API mà embed gọi. */
  async function mockApis(page: Page) {
    await page.route('**/api/profiles/lukenguyen', (route) =>
      route.fulfill({
        json: {
          id: 'p1',
          username: 'lukenguyen',
          displayName: 'Luke_214',
          avatarUrl: null,
          bannerUrl: null,
          statusMessage: null,
          bio: 'Full-Stack Developer & AI Engineer',
          location: null,
          links: [],
          accentColor: null,
          createdAt: '2009-01-01T00:00:00.000Z',
          isSelf: false,
        },
      }),
    );
    await page.route('**/api/invites/abcd1234', (route) =>
      route.fulfill({
        json: {
          code: 'abcd1234',
          serverId: '11111111-2222-4333-8444-555555555555',
          serverName: 'Nexus HQ',
          serverIconUrl: null,
          memberCount: 42,
          expiresAt: null,
          maxUses: null,
          uses: 0,
          status: 'valid',
          isExpired: false,
          isMaxUsed: false,
        },
      }),
    );
  }

  /** Gửi một tin nhắn vào kênh DM đầu tiên. Điều chỉnh selector nếu UI đổi. */
  async function sendMessage(page: Page, text: string) {
    const box = page.getByRole('textbox').last();
    await box.click();
    await box.fill(text);
    await box.press('Enter');
  }

  test('link /u/:username → card hồ sơ; bấm tên mở dialog', async ({ page }) => {
    await mockApis(page);
    await page.goto('/channels/@me');

    await sendMessage(page, `${new URL(page.url()).origin}/u/lukenguyen`);

    const embed = page.locator('app-chat-link-embed').last();
    await expect(embed.getByText('Luke_214')).toBeVisible();
    await expect(embed.getByText('@lukenguyen')).toBeVisible();

    // Không còn nút "Xem hồ sơ"
    await expect(embed.getByRole('link', { name: 'Xem hồ sơ' })).toHaveCount(0);

    // Bấm vào TÊN → mở dialog preview hồ sơ
    await embed.getByRole('button', { name: /Luke_214/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('link /invite/:code → card server + nút "Tham gia"', async ({ page }) => {
    await mockApis(page);
    await page.goto('/channels/@me');

    await sendMessage(page, `${new URL(page.url()).origin}/invite/abcd1234`);

    const embed = page.locator('app-chat-link-embed').last();
    await expect(embed.getByText('Nexus HQ')).toBeVisible();
    await expect(embed.getByRole('link', { name: /Tham gia/ })).toBeVisible();
  });

  test('link ngoài → KHÔNG tạo embed', async ({ page }) => {
    await page.goto('/channels/@me');
    await sendMessage(page, 'https://youtube.com/watch?v=abc');
    await expect(page.locator('app-chat-link-embed')).toHaveCount(0);
  });
});
