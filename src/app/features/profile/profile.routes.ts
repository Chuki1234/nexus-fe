import { Routes } from '@angular/router';
import { authGuard, profileGuard } from '../../core/auth/auth.guard';

export const profileRoutes: Routes = [
  {
    // Đường dẫn ngắn `/u/:username` để chia sẻ ra ngoài — dài hơn thì người ta
    // ngại dán vào chat.
    path: 'u/:username',
    canActivate: [authGuard, profileGuard],
    title: 'Hồ sơ · Nexus',
    loadComponent: () => import('./view/view').then((m) => m.ProfileViewPage),
  },
];
