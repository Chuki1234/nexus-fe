import { Routes } from '@angular/router';
import { authGuard, profileGuard } from '../../core/auth/auth.guard';

/**
 * Đường dẫn cụ thể (không lồng dưới path rỗng) để router không phải quay lui khi
 * một nhánh lazy khác đã khớp trước — xem cách `authRoutes` được gắn ở app.routes.
 */
export const profileRoutes: Routes = [
  {
    path: 'u/:username',
    canActivate: [authGuard, profileGuard],
    title: 'Hồ sơ · Nexus',
    loadComponent: () => import('./view/profile.page').then((m) => m.ProfilePage),
  },
  // `/settings/profile` đã chuyển sang settings.routes.ts để trang sửa hồ sơ nằm
  // trong khung cài đặt chung (có thanh bên). Đường dẫn giữ nguyên nên mọi link
  // trỏ tới nó vẫn chạy.
];
