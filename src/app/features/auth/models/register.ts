import type { RegisterRequest, RegisterResponse } from '../../../../shared/dto/auth';

export { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../../shared/dto/auth';

/**
 * Nới hơn regex chuẩn một bậc — CỐ Ý không dùng `USERNAME_PATTERN` của `shared/`.
 *
 * Bản chuẩn chỉ nhận chữ thường (khớp CHECK trong Postgres). Ở ô nhập thì cho gõ
 * chữ hoa rồi tự hạ về chữ thường lúc gửi đi, thay vì báo lỗi vào mặt người đang gõ.
 */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,32}$/;

/** Thân request của POST /api/auth/register. */
export type RegisterPayload = RegisterRequest;

export type RegisteredUser = RegisterResponse;
