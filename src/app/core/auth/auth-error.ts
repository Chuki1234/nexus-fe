import { HttpErrorResponse } from '@angular/common/http';
import { AuthError } from '@supabase/supabase-js';

/**
 * Câu chung cho mọi kiểu đăng nhập hỏng, khớp với backend.
 *
 * Không được tách theo nguyên nhân: một thông báo riêng cho "email chưa xác nhận"
 * hay "tài khoản đã bị khoá" đủ để người ngoài biết địa chỉ đó có tài khoản.
 */
const INVALID_LOGIN = 'Email/tên đăng nhập hoặc mật khẩu không đúng.';

const MESSAGES: Record<string, string> = {
  over_request_rate_limit: 'Bạn đã thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.',
  over_email_send_rate_limit: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi một lát rồi thử lại.',
  same_password: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  weak_password: 'Mật khẩu quá yếu. Hãy chọn mật khẩu dài và khó đoán hơn.',
  // Supabase trả `otp_expired` cho cả mã sai LẪN mã hết hạn (không phân biệt được),
  // nên câu chữ phải phủ cả hai để không gây hiểu nhầm là gõ đúng nhưng trễ giờ.
  otp_expired: 'Mã không đúng hoặc đã hết hạn. Hãy thử lại hoặc bấm gửi lại mã.',
  session_expired: 'Phiên đã hết hạn. Vui lòng thực hiện lại từ đầu.',
  totp_invalid: 'Mã 2FA không đúng hoặc đã hết hạn. Vui lòng thử lại.',
  no_factor: 'Không tìm thấy thiết bị 2FA của tài khoản này.',
  insufficient_aal: 'Cần xác thực 2FA trước khi đổi mật khẩu.',
};

/**
 * Lỗi từ POST /api/auth/login.
 *
 * Chỉ có 3 kết cục hiển thị được: không gọi tới nơi, bị chặn vì thử quá nhiều,
 * và "sai thông tin" — gom mọi nguyên nhân còn lại.
 */
export function toLoginErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Không kết nối được máy chủ. Kiểm tra backend đang chạy rồi thử lại.';
    }
    if (error.status === 429) {
      return 'Bạn đã thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.';
    }
  }
  return INVALID_LOGIN;
}

/**
 * Turns a Supabase auth failure into a message that is safe to show a user.
 *
 * Dùng cho các luồng auth vẫn gọi thẳng Supabase: đăng nhập Google, gửi/xác thực
 * mã, đổi mật khẩu. Đăng nhập bằng mật khẩu đi qua backend nên dùng
 * `toLoginErrorMessage`.
 */
export function toAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    const known = error.code ? MESSAGES[error.code] : undefined;
    if (known) {
      return known;
    }
    // A failed fetch surfaces as an AuthError with no code.
    if (!error.code) {
      return 'Không kết nối được máy chủ. Kiểm tra kết nối mạng rồi thử lại.';
    }
  }
  return 'Không thực hiện được. Vui lòng thử lại.';
}
