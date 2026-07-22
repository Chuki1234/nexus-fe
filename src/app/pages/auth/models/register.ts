/**
 * Nới hơn regex của backend một bậc: ở đây cho gõ chữ hoa rồi tự hạ về chữ
 * thường lúc gửi đi, thay vì báo lỗi vào mặt người đang gõ.
 */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,32}$/;

export const PASSWORD_MIN_LENGTH = 8;
export const DISPLAY_NAME_MAX_LENGTH = 32;

/** Thân request của POST /api/auth/register — khớp với `RegisterDto` bên nexus-be. */
export interface RegisterPayload {
  email: string;
  username: string;
  /** Bỏ qua khi người dùng để trống ô "Tên hiển thị". */
  displayName?: string;
  password: string;
  /** Định dạng `YYYY-MM-DD`. */
  birthdate: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
}
