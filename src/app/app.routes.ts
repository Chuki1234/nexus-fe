import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Trang chủ. Chưa đăng nhập thì `authGuard` đá sang /login kèm returnUrl, nên mở
  // app lên là thấy màn đăng nhập ngay. Đừng đổi thành redirect thẳng sang /login:
  // `guestGuard` đẩy người đã đăng nhập từ /login về '/' nên sẽ thành vòng lặp.
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard],
    title: 'Nexus',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    loadChildren: () => import('./pages/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
