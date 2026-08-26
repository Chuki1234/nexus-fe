/**
 * Icon tự nhận diện cho `links[]` theo domain — GitHub, X, LinkedIn, YouTube,
 * Instagram hiện icon riêng thay vì chữ cái đầu/mũi tên chung chung như trước.
 *
 * Glyph trừu tượng, KHÔNG cố vẽ giống logo thật (quyết định đã chốt cùng
 * người dùng): tránh rủi ro bản quyền thương hiệu, và path SVG tay khó vẽ
 * chính xác logo bằng cách này. Theo đúng quy ước vẽ tay 24×24 đã dùng ở
 * `settings-shell.page.ts` — không kéo thêm thư viện icon.
 */
export type LinkIconId = 'github' | 'x' | 'linkedin' | 'youtube' | 'instagram' | 'link';

export const LINK_ICONS: Record<LinkIconId, string> = {
  // Dấu ngoặc code </> — gợi ý "kho mã nguồn" chứ không vẽ lại con mực GitHub.
  github: 'M8 9l-4 3 4 3m8-6l4 3-4 3M14 4l-4 16',
  // Bong bóng trò chuyện — gợi ý "bài đăng/mạng xã hội".
  x: 'M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  // Cặp táp — gợi ý "hồ sơ nghề nghiệp".
  linkedin:
    'M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a1 1 0 00-1 1v10a2 2 0 002 2h14a2 2 0 002-2V8a1 1 0 00-1-1zM9 5h6v2H9V5z',
  // Nút phát trong khung — gợi ý "video".
  youtube:
    'M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM10 9l5 3-5 3V9z',
  // Máy ảnh — gợi ý "ảnh".
  instagram:
    'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM12 13a3 3 0 100 6 3 3 0 000-6z',
  // Mắt xích — icon mặc định cho domain không nhận ra, đúng path mũi tên liên
  // kết đã dùng làm fallback ở profile-body.component.ts trước đây.
  link: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
};

const DOMAIN_TABLE: Record<string, LinkIconId> = {
  'github.com': 'github',
  'x.com': 'x',
  'twitter.com': 'x',
  'linkedin.com': 'linkedin',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'instagram.com': 'instagram',
};

/**
 * Nhận URL, trả về icon phù hợp theo domain. `try/catch` vì hàm này còn được
 * gọi trên URL đang gõ dở (bảng xem trước trực tiếp) — chưa chắc đã là URL hợp lệ.
 */
export function detectLinkIcon(url: string): LinkIconId {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return DOMAIN_TABLE[hostname] ?? 'link';
  } catch {
    return 'link';
  }
}
