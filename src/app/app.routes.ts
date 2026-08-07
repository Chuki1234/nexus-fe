import { Routes } from '@angular/router';
import { authGuard, profileGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Đích sau khi đăng nhập. Chưa đăng nhập thì `authGuard` trong /channels đá
  // sang /login kèm returnUrl.
  { path: '', pathMatch: 'full', redirectTo: '/channels/@me' },

  {
    path: 'channels',
    canActivate: [authGuard, profileGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
  },

  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

  // Trỏ thẳng tới Dashboard chứ không về '': Angular chỉ áp một lần chuyển hướng
  // mỗi lần khớp route, nên '**' → '' → '/channels/@me' sẽ dừng lại ở '' và cho
  // ra màn hình trắng.
  { path: '**', redirectTo: '/channels/@me' },
];
