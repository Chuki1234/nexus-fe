# Cấu hình đăng nhập Google & SĐT (SMS)

Code đã sẵn sàng, nhưng Google OAuth và SMS OTP **chỉ chạy sau khi bật provider
trong Supabase Dashboard** — phần này không cấu hình được bằng code.

Dự án dùng chung một Supabase project (`ubdgjtjxcytwctsbtpjy`) cho cả FE và BE.

## 1. Đăng nhập Google

1. **Google Cloud Console** → APIs & Services → Credentials → *Create OAuth client ID*
   (loại **Web application**).
   - Authorized redirect URI:
     `https://ubdgjtjxcytwctsbtpjy.supabase.co/auth/v1/callback`
2. **Supabase Dashboard** → Authentication → Providers → **Google** → *Enable*,
   dán **Client ID** và **Client Secret** vừa tạo.
3. **Supabase Dashboard** → Authentication → **URL Configuration**:
   - *Site URL*: `http://localhost:4200`
   - *Redirect URLs*: thêm `http://localhost:4200/auth/callback`
     (và URL production khi deploy).

Luồng trong code: nút "Tiếp tục với Google" → `signInWithOAuth` → Google →
`/auth/callback` → nếu chưa có hồ sơ thì `/complete-profile`, có rồi thì vào `/`.

## 2. Đăng nhập bằng số điện thoại (SMS OTP)

1. **Supabase Dashboard** → Authentication → Providers → **Phone** → *Enable*.
2. Chọn và cấu hình một **SMS provider** (Twilio / MessageBird / Vonage / Textlocal).
   Ví dụ Twilio cần: Account SID, Auth Token, và Messaging Service SID (hoặc số gửi).
   > SMS là dịch vụ **trả phí** của bên thứ ba — Supabase không tự gửi SMS miễn phí.
3. Số điện thoại nhập theo định dạng **E.164**: `+84912345678`.

Luồng trong code: `/phone` → nhập số → `signInWithOtp` (gửi SMS) → nhập mã 6 số →
`verifyOtp` → nếu chưa có hồ sơ thì `/complete-profile`.

## 3. Bảng profiles

Không đổi schema. Vẫn chạy `nexus-be/supabase/profiles.sql` một lần như cũ.
User đăng nhập Google/SĐT sẽ được tạo hồ sơ qua `POST /api/auth/complete-profile`
(backend, có xác thực JWT) khi điền xong trang hoàn tất hồ sơ.

## 4. Backend .env

Không cần biến mới. `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (đã có) đủ để
guard xác thực token và ghi hồ sơ.
