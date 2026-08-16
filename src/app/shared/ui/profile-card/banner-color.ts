/**
 * Màu ảnh bìa dự phòng khi người dùng chưa tải ảnh lên.
 *
 * Không lấy màu vai trò: cùng một người sẽ đổi màu bìa khi sang máy chủ khác,
 * mà ảnh bìa là thứ thuộc về con người chứ không thuộc về máy chủ. Cũng không
 * lấy token theme: một dải xám nhạt thì không đọc ra là "ảnh bìa", nó chỉ trông
 * như chỗ trống.
 *
 * Đây là màu trang trí, không có chữ nào nằm trên nên không cần tính tương phản.
 *
 * PHẢI khớp constraint `profiles_accent_color_valid` (migration
 * `profile_accent_color`) và `ACCENT_COLORS` bên backend (`update-profile.dto.ts`)
 * — ba nơi cùng một bảng màu, đổi một chỗ thì đổi cả ba.
 */
export const BANNER_FALLBACKS = [
  '#4453c4',
  '#2f7a68',
  '#7c46b8',
  '#a8514c',
  '#a8752a',
  '#37628f',
  '#8d3f6b',
  '#3f7a3a',
];

/**
 * Băm username thành một màu trong bảng trên.
 *
 * Cần ổn định giữa các lần mở và giữa các máy — nếu không, cùng một người mỗi
 * lần bấm lại ra một màu bìa khác, trông như lỗi hiển thị.
 */
function hashToColor(username: string): string {
  let hash = 0;
  for (const char of username) {
    hash = (hash * 31 + char.codePointAt(0)!) % 100_000;
  }
  return BANNER_FALLBACKS[hash % BANNER_FALLBACKS.length];
}

/**
 * Màu nền ảnh bìa của một người: `accentColor` nếu họ đã tự chọn, không thì
 * băm từ username như trước — người dùng cũ chưa từng chọn màu không bị đổi
 * màu bìa đột ngột khi tính năng này ra mắt.
 */
export function bannerFallback(username: string, accentColor?: string | null): string {
  return accentColor || hashToColor(username);
}
