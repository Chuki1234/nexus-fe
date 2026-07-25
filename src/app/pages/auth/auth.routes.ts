import { Routes } from '@angular/router';
import { completeProfileGuard, guestGuard } from '../../core/auth/auth.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Đăng nhập · Nexus',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Tạo tài khoản · Nexus',
    loadComponent: () => import('./register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'phone',
    canActivate: [guestGuard],
    title: 'Đăng nhập bằng SĐT · Nexus',
    loadComponent: () => import('./phone-login/phone-login.page').then((m) => m.PhoneLoginPage),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    title: 'Quên mật khẩu · Nexus',
    loadComponent: () =>
      import('./forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  // Không gắn guestGuard: link email tạo một phiên tạm nên user tới đây đã "đăng
  // nhập" — guestGuard sẽ đá họ về '/' trước khi kịp đặt mật khẩu mới.
  {
    path: 'reset-password',
    title: 'Đặt lại mật khẩu · Nexus',
    loadComponent: () =>
      import('./reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  // Điểm quay về sau khi đăng nhập Google. Không gắn guestGuard: người tới đây
  // vừa đăng nhập xong, guestGuard sẽ đá ngược ra trước khi callback kịp chạy.
  {
    path: 'auth/callback',
    title: 'Đang đăng nhập · Nexus',
    loadComponent: () => import('./callback/callback.page').then((m) => m.CallbackPage),
  },
  {
    path: 'complete-profile',
    canActivate: [completeProfileGuard],
    title: 'Hoàn tất hồ sơ · Nexus',
    loadComponent: () =>
      import('./complete-profile/complete-profile.page').then((m) => m.CompleteProfilePage),
  },
];
