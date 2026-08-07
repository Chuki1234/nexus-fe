import { Routes } from '@angular/router';
import { DashboardShell } from '../../layout/dashboard-shell/dashboard-shell';

/**
 * Route con của Dashboard. Tất cả render vào `<router-outlet>` của shell.
 *
 * Thứ tự quan trọng: `@me` phải đứng TRƯỚC `:serverId/:channelId`, nếu không
 * `/channels/@me/mon` sẽ khớp nhầm thành server `@me`, kênh `mon`.
 */
export const dashboardRoutes: Routes = [
  {
    path: '',
    component: DashboardShell,
    children: [
      {
        path: '@me',
        pathMatch: 'full',
        title: 'Bạn bè · Nexus',
        loadComponent: () => import('./friends/friends.page').then((m) => m.FriendsPage),
      },
      {
        path: '@me/:conversationId',
        title: 'Tin nhắn · Nexus',
        loadComponent: () =>
          import('./conversation/conversation.page').then((m) => m.ConversationPage),
      },
      {
        path: ':serverId/:channelId',
        title: 'Nexus',
        loadComponent: () => import('./channel/channel.page').then((m) => m.ChannelPage),
      },
      {
        path: ':serverId',
        pathMatch: 'full',
        title: 'Nexus',
        loadComponent: () => import('./server-home/server-home.page').then((m) => m.ServerHomePage),
      },
      { path: '', pathMatch: 'full', redirectTo: '@me' },
    ],
  },
];
