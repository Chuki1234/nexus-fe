import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MIN_AGE_YEARS = 13;
export const EARLIEST_BIRTH_YEAR = 1900;

/** Ba ô chọn Ngày / Tháng / Năm. Rỗng nghĩa là người dùng chưa chọn. */
export interface BirthdateParts {
  day: string;
  month: string;
  year: string;
}

/**
 * Ghép ba ô thành `YYYY-MM-DD`, trả `null` nếu thiếu ô hoặc ngày không tồn tại.
 *
 * `new Date('2001-02-30')` không báo lỗi mà tự cuộn sang 02/03, nên phải đối
 * chiếu lại từng thành phần mới loại được 30/02 hay 31/04.
 */
export function toIsoDate({ day, month, year }: BirthdateParts): string | null {
  if (!day || !month || !year) {
    return null;
  }
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const date = new Date(Date.UTC(y, m - 1, d));

  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Validator đặt trên cả nhóm chứ không trên từng ô: "31 tháng 2" chỉ sai khi
 * nhìn cả ba giá trị cùng lúc, không ô nào tự nó sai cả.
 *
 * Dùng `new Date()` nên chỉ an toàn ở trình duyệt — route /register được đánh
 * dấu client-render trong app.routes.server.ts, xem chú thích ở đó.
 */
export const birthdateValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const parts = group.value as BirthdateParts;

  if (!parts.day || !parts.month || !parts.year) {
    return { required: true };
  }
  const iso = toIsoDate(parts);
  if (!iso) {
    return { invalidDate: true };
  }

  const now = new Date();
  const cutoff = Date.UTC(
    now.getUTCFullYear() - MIN_AGE_YEARS,
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return Date.parse(iso) <= cutoff ? null : { tooYoung: true };
};
