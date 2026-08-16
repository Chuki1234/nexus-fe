import { Routes } from '@angular/router';
import { channelsRoutes } from './pages/channels/channels.routes';
import { profileRoutes } from './pages/profile/profile.routes';
import { settingsRoutes } from './pages/settings/settings.routes';

export const routes: Routes = [
  // Vào app là vào thẳng màn tin nhắn riêng, giống Discord. Chưa đăng nhập thì
  // `authGuard` của /channels đá sang /login kèm returnUrl.
  //
  // Đừng đổi thành redirect thẳng sang /login: `guestGuard` đẩy người đã đăng
  // nhập từ /login về '/' nên sẽ thành vòng lặp.
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '/channels/@me',
  },
  ...channelsRoutes,
  ...profileRoutes,
  ...settingsRoutes,
  {
    path: '',
    loadChildren: () => import('./pages/auth/auth.routes').then((m) => m.authRoutes),
  },
  // Trỏ thẳng tới đích, KHÔNG qua '' rồi để '' redirect tiếp: chuỗi redirect hai
  // bậc bắc qua path rỗng bị router bỏ dở, navigation dừng lại ở '/' và guard
  // của /channels không bao giờ chạy.
  {
    path: '**',
    redirectTo: '/channels/@me',
  },
];
