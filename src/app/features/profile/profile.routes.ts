import { Routes } from '@angular/router';
import { authGuard, profileGuard } from '../../core/auth/auth.guard';

export const profileRoutes: Routes = [
  {
    // Link ngắn `/u/:username` để chia sẻ / sao chép. TRANG hồ sơ riêng đã bỏ —
    // route này chỉ đưa về dashboard rồi mở hồ sơ dạng dialog (xem ProfileRedirect).
    path: 'u/:username',
    canActivate: [authGuard, profileGuard],
    title: 'Hồ sơ · Nexus',
    loadComponent: () => import('./redirect/profile-redirect').then((m) => m.ProfileRedirect),
  },
];
