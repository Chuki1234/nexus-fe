import { Routes } from '@angular/router';
import { authGuard, landingGuard, profileGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Route gốc là trang landing công khai. Người đã đăng nhập được `landingGuard`
  // đưa thẳng vào /channels/@me; khách xem trang giới thiệu.
  {
    path: '',
    pathMatch: 'full',
    canActivate: [landingGuard],
    title: 'Nexus · Không gian cộng đồng thời gian thực',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },

  {
    path: 'channels',
    canActivate: [authGuard, profileGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
  },

  {
    path: '',
    loadChildren: () => import('./features/profile/profile.routes').then((m) => m.profileRoutes),
  },

  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

  {
    path: 'invite/:code',
    title: 'Lời mời tham gia máy chủ · Nexus',
    loadComponent: () =>
      import('./features/invite-landing/invite-landing.page').then((m) => m.InviteLandingPage),
  },

  // Trỏ thẳng tới Dashboard chứ không về '': Angular chỉ áp một lần chuyển hướng
  // mỗi lần khớp route, nên '**' → '' → '/channels/@me' sẽ dừng lại ở '' và cho
  // ra màn hình trắng.
  { path: '**', redirectTo: '/channels/@me' },
];
