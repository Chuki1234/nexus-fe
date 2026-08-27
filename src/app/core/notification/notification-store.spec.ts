import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { ActiveChatStore } from '../../features/dashboard/services/active-chat.store';
import { AuthService } from '../auth/auth.service';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { ServersStore } from '../servers/servers.store';
import { NotificationStore } from './notification-store';

describe('NotificationStore — server unread badge', () => {
  const createStore = () => {
    const unreadUpdate$ = new Subject<any>();
    const messageRead$ = new Subject<any>();
    const conversationUpdated$ = new Subject<any>();
    const conversationDeleted$ = new Subject<any>();
    const activeChannelId = signal<string | null>(null);
    const channelsByServer = signal({
      'server-1': [
        {
          id: 'channel-1',
          name: 'general',
          type: 'text',
          topic: null,
          unread: false,
          mentionCount: 0,
        },
        {
          id: 'channel-2',
          name: 'voice-room',
          type: 'voice',
          topic: null,
          unread: false,
          mentionCount: 0,
        },
      ],
    });

    TestBed.configureTestingModule({
      providers: [
        NotificationStore,
        {
          provide: ChatSocketService,
          useValue: {
            unreadUpdate$,
            messageRead$,
            conversationUpdated$,
            conversationDeleted$,
          },
        },
        { provide: AuthService, useValue: { user: () => ({ id: 'me' }) } },
        {
          provide: ServersStore,
          useValue: { activeChannelId, channelsByServer },
        },
        {
          provide: ActiveChatStore,
          useValue: { conversationId: signal<string | null>(null) },
        },
      ],
    });

    return {
      store: TestBed.inject(NotificationStore),
      unreadUpdate$,
      messageRead$,
      activeChannelId,
    };
  };

  it('tăng badge server khi đang ở Bạn bè hoặc không mở kênh server', () => {
    const { store, unreadUpdate$ } = createStore();

    unreadUpdate$.next({
      serverId: 'server-1',
      channelId: 'channel-1',
      unreadCount: 1,
      mentionCount: 0,
      authorId: 'other-user',
    });

    expect(store.serverUnreadCount('server-1')).toBe(1);
    expect(store.serverHasUnread('server-1')).toBe(true);
  });

  it('vẫn tăng badge cho kênh khác khi đang xem một kênh trong server', () => {
    const { store, unreadUpdate$, activeChannelId } = createStore();
    activeChannelId.set('channel-2');

    unreadUpdate$.next({
      serverId: 'server-1',
      channelId: 'channel-1',
      unreadCount: 2,
      mentionCount: 0,
      authorId: 'other-user',
    });

    expect(store.serverUnreadCount('server-1')).toBe(2);
    expect(store.channelUnreadCount('channel-1')).toBe(2);
  });

  it('hiển thị unread trên đúng kênh thoại khi chat trong phòng thoại có tin mới', () => {
    const { store, unreadUpdate$, activeChannelId } = createStore();
    activeChannelId.set('channel-1');

    unreadUpdate$.next({
      serverId: 'server-1',
      channelId: 'channel-2',
      unreadCount: 1,
      mentionCount: 0,
      authorId: 'other-user',
    });

    expect(store.channelUnreadCount('channel-1')).toBe(0);
    expect(store.channelUnreadCount('channel-2')).toBe(1);
    expect(store.serverUnreadCount('server-1')).toBe(1);
  });

  it('không tăng badge cho đúng kênh đang mở hoặc tin do chính mình gửi', () => {
    const { store, unreadUpdate$, activeChannelId } = createStore();
    activeChannelId.set('channel-1');

    unreadUpdate$.next({
      serverId: 'server-1',
      channelId: 'channel-1',
      unreadCount: 1,
      mentionCount: 0,
      authorId: 'other-user',
    });
    unreadUpdate$.next({
      serverId: 'server-1',
      channelId: 'channel-2',
      unreadCount: 1,
      mentionCount: 0,
      authorId: 'me',
    });

    expect(store.serverUnreadCount('server-1')).toBe(0);
  });

  it('không đếm đôi một tin vừa unread vừa mention và reset đúng kênh đã đọc', () => {
    const { store, unreadUpdate$, messageRead$ } = createStore();

    unreadUpdate$.next({
      serverId: 'server-1',
      channelId: 'channel-1',
      unreadCount: 1,
      mentionCount: 1,
      authorId: 'other-user',
    });
    expect(store.serverUnreadCount('server-1')).toBe(1);
    expect(store.channelUnreadCount('channel-1')).toBe(1);

    messageRead$.next({ channelId: 'channel-1' });
    expect(store.serverUnreadCount('server-1')).toBe(0);
    expect(store.channelUnreadCount('channel-1')).toBe(0);
    expect(store.serverHasUnread('server-1')).toBe(false);
  });
});
