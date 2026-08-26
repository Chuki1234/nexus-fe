import { describe, expect, it } from 'vitest';
import {
  formatCompactTime,
  formatFullTimestamp,
  formatMessageTimestamp,
  getLocalDateKey,
  isSameCalendarDay,
  parseTimestamp,
  VI_WEEKDAYS_SHORT,
} from './date-format.util';

describe('DateFormatUtil', () => {
  describe('VI_WEEKDAYS_SHORT', () => {
    it('ánh xạ đúng toàn bộ 7 ngày trong tuần', () => {
      expect(VI_WEEKDAYS_SHORT[0]).toBe('CN');
      expect(VI_WEEKDAYS_SHORT[1]).toBe('T2');
      expect(VI_WEEKDAYS_SHORT[2]).toBe('T3');
      expect(VI_WEEKDAYS_SHORT[3]).toBe('T4');
      expect(VI_WEEKDAYS_SHORT[4]).toBe('T5');
      expect(VI_WEEKDAYS_SHORT[5]).toBe('T6');
      expect(VI_WEEKDAYS_SHORT[6]).toBe('T7');
    });
  });

  describe('parseTimestamp & isSameCalendarDay & getLocalDateKey', () => {
    it('parse hợp lệ và xử lý null/invalid an toàn', () => {
      expect(parseTimestamp(null)).toBeNull();
      expect(parseTimestamp('invalid-date')).toBeNull();
      const valid = parseTimestamp('2026-08-25T13:30:00.000Z');
      expect(valid).toBeInstanceOf(Date);
    });

    it('so sánh cùng ngày hoặc khác ngày chính xác', () => {
      const d1 = new Date(2026, 7, 25, 10, 0);
      const d2 = new Date(2026, 7, 25, 23, 59);
      const d3 = new Date(2026, 7, 24, 23, 59);

      expect(isSameCalendarDay(d1, d2)).toBe(true);
      expect(isSameCalendarDay(d1, d3)).toBe(false);
      expect(isSameCalendarDay(null, d1)).toBe(false);
      expect(getLocalDateKey(d1)).toBe('2026-08-25');
    });
  });

  describe('formatMessageTimestamp (Smart timestamp formatting)', () => {
    const fixedNow = new Date(2026, 7, 25, 15, 30, 0); // Thứ Ba, 25/08/2026 15:30

    it('tin nhắn trong ngày hôm nay: chỉ hiển thị giờ:phút (HH:mm)', () => {
      const msgTodayMorning = new Date(2026, 7, 25, 9, 5, 0);
      const msgTodayEvening = new Date(2026, 7, 25, 22, 22, 0);

      expect(formatMessageTimestamp(msgTodayMorning, fixedNow)).toBe('09:05');
      expect(formatMessageTimestamp(msgTodayEvening, fixedNow)).toBe('22:22');
      expect(formatMessageTimestamp(msgTodayMorning.toISOString(), fixedNow)).toBe('09:05');
    });

    it('tin nhắn ngày hôm qua: hiển thị thứ viết tắt, ngày/tháng/năm và giờ:phút', () => {
      // 24/08/2026 là Thứ Hai -> T2
      const msgYesterday = new Date(2026, 7, 24, 22, 22, 0);
      expect(formatMessageTimestamp(msgYesterday, fixedNow)).toBe('T2, 24/08/2026 22:22');
    });

    it('tin nhắn các ngày trước đó: hiển thị đúng thứ và ngày tháng năm', () => {
      // 23/08/2026 là Chủ Nhật -> CN
      const msgSunday = new Date(2026, 7, 23, 14, 15, 0);
      expect(formatMessageTimestamp(msgSunday, fixedNow)).toBe('CN, 23/08/2026 14:15');

      // 22/08/2026 là Thứ Bảy -> T7
      const msgSaturday = new Date(2026, 7, 22, 8, 0, 0);
      expect(formatMessageTimestamp(msgSaturday, fixedNow)).toBe('T7, 22/08/2026 08:00');

      // 21/08/2026 là Thứ Sáu -> T6
      const msgFriday = new Date(2026, 7, 21, 18, 45, 0);
      expect(formatMessageTimestamp(msgFriday, fixedNow)).toBe('T6, 21/08/2026 18:45');
    });

    it('tự động đổi từ HH:mm sang thứ + ngày/tháng/năm khi bước sang ngày mới', () => {
      const msg = new Date(2026, 7, 25, 23, 50, 0);

      // Khi còn trong ngày 25/08:
      const sameDayNow = new Date(2026, 7, 25, 23, 55, 0);
      expect(formatMessageTimestamp(msg, sameDayNow)).toBe('23:50');

      // Khi bước sang ngày 26/08 (Thứ Tư):
      const nextDayNow = new Date(2026, 7, 26, 0, 5, 0);
      expect(formatMessageTimestamp(msg, nextDayNow)).toBe('T3, 25/08/2026 23:50');
    });

    it('fallback an toàn khi null hoặc invalid', () => {
      expect(formatMessageTimestamp(null)).toBe('--:--');
      expect(formatMessageTimestamp('invalid')).toBe('--:--');
    });
  });

  describe('formatCompactTime & formatFullTimestamp', () => {
    it('formatCompactTime luôn trả về HH:mm', () => {
      const d = new Date(2026, 7, 20, 8, 9);
      expect(formatCompactTime(d)).toBe('08:09');
      expect(formatCompactTime(null)).toBe('--:--');
    });

    it('formatFullTimestamp trả về định dạng chi tiết', () => {
      const d = new Date(2026, 7, 25, 14, 30, 15);
      expect(formatFullTimestamp(d)).toContain('14:30:15');
      expect(formatFullTimestamp(null)).toBe('Thời gian không xác định');
    });
  });
});
