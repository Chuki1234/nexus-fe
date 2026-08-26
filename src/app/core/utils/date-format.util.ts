/**
 * Bảng chữ viết tắt thứ trong tuần tiếng Việt
 * 0: Chủ Nhật -> CN
 * 1: Thứ Hai -> T2
 * 2: Thứ Ba -> T3
 * 3: Thứ Tư -> T4
 * 4: Thứ Năm -> T5
 * 5: Thứ Sáu -> T6
 * 6: Thứ Bảy -> T7
 */
export const VI_WEEKDAYS_SHORT: Record<number, string> = {
  0: 'CN',
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
};

/**
 * Parse chuỗi ISO timestamp an toàn thành Date. Trả về null nếu invalid/missing.
 */
export function parseTimestamp(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Kiểm tra xem 2 Date có thuộc cùng một calendar day theo local timezone không.
 */
export function isSameCalendarDay(d1: Date | null, d2: Date | null): boolean {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Trích xuất calendar date key theo local timezone của client (YYYY-MM-DD).
 */
export function getLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Tạo nhãn hiển thị thông minh cho Date Divider ("Hôm nay", "Hôm qua", hoặc "D tháng M, YYYY").
 */
export function formatDateDividerLabel(
  dateInput: Date | string | null | undefined,
  now = new Date(),
): string {
  const d = typeof dateInput === 'string' ? parseTimestamp(dateInput) : dateInput;
  if (!d) return '';

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (target.getTime() === today.getTime()) {
    return 'Hôm nay';
  }
  if (target.getTime() === yesterday.getTime()) {
    return 'Hôm qua';
  }

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  return `${day} tháng ${month}, ${year}`;
}

/**
 * Định dạng giờ ngắn gọn: HH:mm (ví dụ 18:45).
 */
export function formatCompactTime(dateInput: Date | string | null | undefined): string {
  const d = typeof dateInput === 'string' ? parseTimestamp(dateInput) : dateInput;
  if (!d) return '--:--';
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Định dạng thời gian thông minh cho tin nhắn (hiển thị cạnh tên người dùng):
 * - Đối với tin nhắn trong ngày hôm nay: chỉ hiển thị giờ phút HH:mm (ví dụ: "22:22").
 * - Đối với tin nhắn từ những ngày trước (hôm qua hoặc cũ hơn): hiển thị thứ viết tắt, ngày/tháng/năm và giờ:phút (ví dụ: "T2, 24/08/2026 22:22" hoặc "CN, 23/08/2026 09:15").
 * - Tự động hiển thị thêm ngày tháng năm và thứ khi bước sang ngày mới.
 */
export function formatMessageTimestamp(
  dateInput: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  const d = typeof dateInput === 'string' ? parseTimestamp(dateInput) : dateInput;
  if (!d) return '--:--';

  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // Kiểm tra nếu cùng ngày với hiện tại (Hôm nay)
  if (isSameCalendarDay(d, now)) {
    return timeStr;
  }

  // Khác ngày hiện tại (Hôm qua hoặc các ngày trước đó)
  const weekday = VI_WEEKDAYS_SHORT[d.getDay()] || 'T2';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${weekday}, ${day}/${month}/${year} ${timeStr}`;
}

/**
 * Định dạng thời gian chi tiết cho aria-label và tooltip.
 */
export function formatFullTimestamp(dateInput: Date | string | null | undefined): string {
  const d = typeof dateInput === 'string' ? parseTimestamp(dateInput) : dateInput;
  if (!d) return 'Thời gian không xác định';
  try {
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Thời gian không xác định';
  }
}
