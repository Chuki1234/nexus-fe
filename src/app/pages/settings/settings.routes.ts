import { Routes } from '@angular/router';
import { authGuard, profileGuard } from '../../core/auth/auth.guard';

/**
 * Mọi trang cài đặt nằm dưới một shell chung (thanh bên + vùng nội dung).
 *
 * Guard đặt ở route cha nên chạy một lần cho cả cây, thay vì lặp lại ở từng mục.
 *
 * `/settings/profile` giữ nguyên đường dẫn cũ vì trang hồ sơ đang trỏ tới đó;
 * đổi đi sẽ làm hỏng nút "Chỉnh sửa hồ sơ" đã có.
 */
export const settingsRoutes: Routes = [
  {
    path: 'settings',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./settings-shell.page').then((m) => m.SettingsShellPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'account' },

      // ── Người dùng ─────────────────────────────────────────────────────
      {
        path: 'account',
        title: 'Tài khoản · Nexus',
        loadComponent: () => import('./user/account.page').then((m) => m.AccountPage),
      },
      {
        path: 'profile',
        title: 'Chỉnh sửa hồ sơ · Nexus',
        loadComponent: () =>
          import('../profile/edit/profile-edit.page').then((m) => m.ProfileEditPage),
      },
      {
        path: 'appearance',
        title: 'Giao diện · Nexus',
        loadComponent: () => import('./user/appearance.page').then((m) => m.AppearancePage),
      },
      {
        path: 'language',
        title: 'Ngôn ngữ · Nexus',
        loadComponent: () => import('./user/language.page').then((m) => m.LanguagePage),
      },
      {
        path: 'notifications',
        title: 'Thông báo · Nexus',
        loadComponent: () => import('./user/notifications.page').then((m) => m.NotificationsPage),
      },
      {
        path: 'security',
        title: 'Bảo mật · Nexus',
        loadComponent: () => import('./user/security.page').then((m) => m.SecurityPage),
      },

      // ── Máy chủ ────────────────────────────────────────────────────────
      // `scope` cho RolesPage biết đang ở phạm vi nào để lọc tập quyền.
      {
        path: 'server/:serverId',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },
          {
            path: 'overview',
            title: 'Máy chủ · Nexus',
            loadComponent: () =>
              import('./server/server-overview.page').then((m) => m.ServerOverviewPage),
          },
          {
            path: 'access',
            title: 'Quyền truy cập máy chủ · Nexus',
            loadComponent: () =>
              import('./server/server-access.page').then((m) => m.ServerAccessPage),
          },
          {
            path: 'roles',
            title: 'Phân quyền máy chủ · Nexus',
            data: { scope: 'server' },
            loadComponent: () => import('./shared/roles.page').then((m) => m.RolesPage),
          },
          {
            path: 'invites',
            title: 'Lời mời máy chủ · Nexus',
            loadComponent: () => import('./shared/invites.page').then((m) => m.InvitesPage),
          },
        ],
      },

      // ── Kênh ───────────────────────────────────────────────────────────
      {
        path: 'channel/:channelId',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },
          {
            path: 'overview',
            title: 'Kênh · Nexus',
            loadComponent: () =>
              import('./channel/channel-overview.page').then((m) => m.ChannelOverviewPage),
          },
          {
            path: 'access',
            title: 'Quyền truy cập kênh · Nexus',
            loadComponent: () =>
              import('./channel/channel-access.page').then((m) => m.ChannelAccessPage),
          },
          {
            path: 'roles',
            title: 'Phân quyền kênh · Nexus',
            data: { scope: 'channel' },
            loadComponent: () => import('./shared/roles.page').then((m) => m.RolesPage),
          },
          {
            path: 'invites',
            title: 'Lời mời kênh · Nexus',
            loadComponent: () => import('./shared/invites.page').then((m) => m.InvitesPage),
          },
        ],
      },
    ],
  },
];
