import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/auth.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Đăng nhập · Nexus',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
];
