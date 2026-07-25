import { AuthError } from '@supabase/supabase-js';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email hoặc mật khẩu không đúng.',
  email_not_confirmed: 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư của bạn.',
  over_request_rate_limit: 'Bạn đã thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.',
  over_email_send_rate_limit: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi một lát rồi thử lại.',
  same_password: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  weak_password: 'Mật khẩu quá yếu. Hãy chọn mật khẩu dài và khó đoán hơn.',
  user_banned: 'Tài khoản này đã bị khoá.',
};

/** Turns a Supabase auth failure into a message that is safe to show a user. */
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
  return 'Đăng nhập không thành công. Vui lòng thử lại.';
}
