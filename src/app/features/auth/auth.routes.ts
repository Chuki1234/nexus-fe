import { Routes } from '@angular/router';
import { completeProfileGuard, guestGuard } from '../../core/auth/auth.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Đăng nhập · Nexus',
    loadComponent: () => import('./login/login').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Tạo tài khoản · Nexus',
    loadComponent: () => import('./register/register').then((m) => m.RegisterPage),
  },
  // Không gắn guestGuard: xác thực mã xong là đã có phiên tạm, guard sẽ đá người
  // dùng về '/' ngay giữa chừng, trước khi họ kịp đặt mật khẩu mới.
  {
    path: 'forgot-password',
    title: 'Quên mật khẩu · Nexus',
    loadComponent: () =>
      import('./forgot-password/forgot-password').then((m) => m.ForgotPasswordPage),
  },
  // Điểm quay về sau khi đăng nhập Google. Không gắn guestGuard: người tới đây
  // vừa đăng nhập xong, guestGuard sẽ đá ngược ra trước khi callback kịp chạy.
  {
    path: 'auth/callback',
    title: 'Đang đăng nhập · Nexus',
    loadComponent: () => import('./callback/callback').then((m) => m.CallbackPage),
  },
  {
    path: 'complete-profile',
    canActivate: [completeProfileGuard],
    title: 'Hoàn tất hồ sơ · Nexus',
    loadComponent: () =>
      import('./complete-profile/complete-profile').then((m) => m.CompleteProfilePage),
  },
  // Không gắn guestGuard: user ở trạng thái AAL1 (đã qua mật khẩu nhưng chưa
  // hoàn tất 2FA). guestGuard sẽ đá về '/' trước khi họ nhập TOTP code.
  {
    path: '2fa',
    title: 'Xác thực hai yếu tố · Nexus',
    loadComponent: () =>
      import('./two-factor-challenge/two-factor-challenge').then(
        (m) => m.TwoFactorChallengePage,
      ),
  },
];
