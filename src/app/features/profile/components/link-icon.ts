/**
 * Đoán icon Material cho một liên kết theo tên miền.
 *
 * Trước đây mọi liên kết hiện chung một biểu tượng mắt xích, nhìn vào không
 * phân biệt được GitHub với YouTube. Dùng ligature của material-icons (đã nạp
 * sẵn trong styles.css) chứ không vẽ lại logo thương hiệu: tự vẽ logo vừa khó
 * đúng vừa dính chuyện bản quyền nhãn hiệu.
 */

const DOMAIN_ICONS: Record<string, string> = {
  'github.com': 'code',
  'gitlab.com': 'code',
  'x.com': 'chat',
  'twitter.com': 'chat',
  'linkedin.com': 'work',
  'youtube.com': 'smart_display',
  'youtu.be': 'smart_display',
  'instagram.com': 'photo_camera',
  'facebook.com': 'groups',
  'tiktok.com': 'music_note',
  'discord.com': 'forum',
  'discord.gg': 'forum',
  'behance.net': 'palette',
  'dribbble.com': 'palette',
};

/**
 * `try/catch` vì hàm này cũng chạy trên URL người dùng đang gõ dở ở trang sửa
 * hồ sơ — chưa chắc đã là URL hợp lệ.
 */
export function linkIconFor(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return DOMAIN_ICONS[host] ?? 'link';
  } catch {
    return 'link';
  }
}

/** Bỏ `https://` và dấu `/` cuối cho gọn — địa chỉ đầy đủ đã nằm trong href. */
export function prettyUrl(url: string): string {
  return url.replace(/^https:\/\//, '').replace(/\/$/, '');
}
