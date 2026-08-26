import { Routes } from '@angular/router';
import { authGuard, profileGuard } from '../../core/auth/auth.guard';
import { firstTextChannel } from './mock/chat-mock';

/**
 * Sơ đồ đường dẫn theo kiểu Discord — dễ đoán và chia sẻ được:
 *
 *   /channels/@me                 danh sách tin nhắn riêng
 *   /channels/@me/:dmId           một cuộc trò chuyện riêng
 *   /channels/:serverId           tự vào kênh văn bản đầu tiên
 *   /channels/:serverId/:channelId  một kênh cụ thể
 *
 * `@me` phải khai báo TRƯỚC `:serverId`, nếu không nó bị nuốt thành một serverId
 * tên là "@me".
 */
export const channelsRoutes: Routes = [
  {
    path: 'channels',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./channels-shell.page').then((m) => m.ChannelsShellPage),
    children: [
      {
        path: '@me',
        title: 'Tin nhắn riêng · Nexus',
        loadComponent: () => import('./dm/dm-layout.page').then((m) => m.DmLayoutPage),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./ui/empty-state.page').then((m) => m.ChannelsEmptyPage),
          },
          {
            path: ':dmId',
            loadComponent: () => import('./chat/chat.page').then((m) => m.ChatPage),
          },
        ],
      },
      {
        path: ':serverId',
        loadComponent: () => import('./server/server-layout.page').then((m) => m.ServerLayoutPage),
        children: [
          {
            path: '',
            pathMatch: 'full',
            // redirectTo dạng hàm: kênh mặc định phụ thuộc máy chủ nào đang mở,
            // không viết cứng được thành một chuỗi.
            redirectTo: (route) => {
              const serverId = route.params['serverId'] as string;
              const channel = firstTextChannel(serverId);
              return channel ? `/channels/${serverId}/${channel.id}` : '/channels/@me';
            },
          },
          {
            path: ':channelId',
            loadComponent: () => import('./chat/chat.page').then((m) => m.ChatPage),
          },
        ],
      },
    ],
  },
];
