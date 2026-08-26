import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MessagesApiService } from '../../../core/api/messages-api.service';
import { ServersApiService } from '../../../core/api/servers-api.service';
import { ChatSocketService } from '../../../core/realtime/chat-socket.service';
import { ChannelChatStore, compareMessageIds } from './channel-chat.store';

describe('ChannelChatStore', () => {
  let store: ChannelChatStore;
  let mockMessagesApi: any;
  let mockServersApi: any;
  let mockChatSocket: any;
  let mockAuth: any;

  let messageCreated$: Subject<any>;
  let messageUpdated$: Subject<any>;
  let messageDeleted$: Subject<any>;
  let reactionUpdated$: Subject<any>;
  let typingUpdated$: Subject<any>;
  let messageRead$: Subject<any>;
  let messageHiddenForUser$: Subject<any>;

  const mockUser = {
    id: 'user-1',
    email: 'alice@nexus.test',
    user_metadata: { full_name: 'Alice Nguyễn' },
  };

  beforeEach(() => {
    messageCreated$ = new Subject();
    messageUpdated$ = new Subject();
    messageDeleted$ = new Subject();
    messageHiddenForUser$ = new Subject();
    reactionUpdated$ = new Subject();
    typingUpdated$ = new Subject();
    messageRead$ = new Subject();

    mockMessagesApi = {
      getChannelMessages: vi.fn().mockResolvedValue({
        messages: [
          {
            id: '101',
            channelId: 'chan-1',
            conversationId: null,
            authorId: 'user-2',
            author: { id: 'user-2', username: 'bob', displayName: 'Bob' },
            type: 'default',
            content: 'Hello channel!',
            replyToId: null,
            clientNonce: null,
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            attachments: [],
            reactions: [],
            createdAt: '2026-08-24T00:00:00.000Z',
          },
        ],
        hasMore: false,
        nextCursor: undefined,
        lastReadMessageId: '100',
      }),
      sendChannelMessage: vi.fn(),
      editMessage: vi.fn(),
      deleteMessage: vi.fn(),
      hideMessage: vi.fn().mockResolvedValue({ id: '101', hidden: true, scope: 'for_me' }),
      recallMessage: vi.fn().mockResolvedValue({ id: '101', deleted: true, scope: 'everyone' }),
      setChannelReaction: vi.fn(),
      markChannelAsRead: vi.fn(),
    };

    mockServersApi = {
      getCapabilities: vi.fn().mockResolvedValue({
        isOwner: true,
        canManageChannels: true,
        canManageRoles: true,
        canInviteMembers: true,
      }),
    };

    mockChatSocket = {
      messageCreated$,
      messageUpdated$,
      messageDeleted$,
      messageHiddenForUser$,
      reactionUpdated$,
      typingUpdated$,
      messageRead$,
      joinChannel: vi.fn().mockResolvedValue({ success: true, status: 'joined' }),
      leaveChannel: vi.fn(),
      startTyping: vi.fn(),
      stopTyping: vi.fn(),
    };

    mockAuth = {
      user: vi.fn().mockReturnValue(mockUser),
    };

    TestBed.configureTestingModule({
      providers: [
        ChannelChatStore,
        { provide: MessagesApiService, useValue: mockMessagesApi },
        { provide: ServersApiService, useValue: mockServersApi },
        { provide: ChatSocketService, useValue: mockChatSocket },
        { provide: AuthService, useValue: mockAuth },
      ],
    });

    store = TestBed.inject(ChannelChatStore);
  });

  afterEach(() => {
    store.ngOnDestroy();
  });

  describe('Initial Load & Reconciliation', () => {
    it('gọi joinChannel và REST getChannelMessages khi loadInitial', async () => {
      await store.loadInitial('server-1', 'chan-1');

      expect(mockChatSocket.joinChannel).toHaveBeenCalledWith('chan-1');
      expect(mockMessagesApi.getChannelMessages).toHaveBeenCalledWith('chan-1', { limit: 50 });
      expect(store.messages().length).toBe(1);
      expect(store.messages()[0].id).toBe('101');
      expect(store.loadingInitial()).toBe(false);
    });

    it('merge và deduplicate tin nhắn realtime đến trong lúc REST đang fetch', async () => {
      let resolveRest: (val: any) => void = () => {};
      const restPromise = new Promise((resolve) => {
        resolveRest = resolve;
      });
      mockMessagesApi.getChannelMessages.mockReturnValue(restPromise);

      const loadPromise = store.loadInitial('server-1', 'chan-1');

      // Trong lúc fetch REST, nhận realtime message mới
      messageCreated$.next({
        message: {
          id: '102',
          channelId: 'chan-1',
          authorId: 'user-2',
          content: 'Buffered message',
          createdAt: '2026-08-24T00:01:00.000Z',
        },
      });

      // REST trả về kết quả chứa tin 101 và tin 102 (trùng lặp)
      resolveRest({
        messages: [
          {
            id: '101',
            channelId: 'chan-1',
            authorId: 'user-2',
            content: 'Hello channel!',
            createdAt: '2026-08-24T00:00:00.000Z',
          },
          {
            id: '102',
            channelId: 'chan-1',
            authorId: 'user-2',
            content: 'Buffered message',
            createdAt: '2026-08-24T00:01:00.000Z',
          },
        ],
        hasMore: false,
      });

      await loadPromise;

      // Không bị trùng lặp tin 102
      expect(store.messages().length).toBe(2);
      expect(store.messages().map((m) => m.id)).toEqual(['101', '102']);
    });

    it('đóng drawer/component khi loadInitial đang pending: response cũ không ghi state, leaveChannel gọi đúng 1 lần, room không bị leak', async () => {
      let resolveRest: (val: any) => void = () => {};
      const pendingRestPromise = new Promise((resolve) => {
        resolveRest = resolve;
      });
      mockMessagesApi.getChannelMessages.mockReturnValue(pendingRestPromise);

      // Bắt đầu loadInitial
      const loadPromise = store.loadInitial('server-1', 'chan-pending');
      expect(mockChatSocket.joinChannel).toHaveBeenCalledWith('chan-pending');

      // Người dùng đóng drawer ngay lập tức
      store.ngOnDestroy();

      // leaveChannel phải được gọi đúng 1 lần cho chan-pending
      expect(mockChatSocket.leaveChannel).toHaveBeenCalledTimes(1);
      expect(mockChatSocket.leaveChannel).toHaveBeenCalledWith('chan-pending');

      // Sau đó REST response cũ mới trả về muộn
      resolveRest({
        messages: [
          {
            id: '999',
            channelId: 'chan-pending',
            authorId: 'user-2',
            content: 'Stale message',
            createdAt: '2026-08-24T00:00:00.000Z',
          },
        ],
        hasMore: false,
      });

      await loadPromise;

      // State phải sạch hoàn toàn, không bị stale response ghi đè
      expect(store.messages().length).toBe(0);
      expect(store.loadingInitial()).toBe(false);
      expect(store.allMessages().length).toBe(0);
    });
  });

  describe('Optimistic UI & Retry/Cancel', () => {
    beforeEach(async () => {
      await store.loadInitial('server-1', 'chan-1');
    });

    it('tạo optimistic message ngay lập tức khi sendMessage', async () => {
      let resolveSend: (val?: any) => void = () => {};
      mockMessagesApi.sendChannelMessage.mockReturnValue(
        new Promise<any>((resolve) => {
          resolveSend = resolve;
        }),
      );

      const sendPromise = store.sendMessage('Optimistic content');

      expect(store.optimisticMessages().length).toBe(1);
      const opt = store.optimisticMessages()[0];
      expect(opt.content).toBe('Optimistic content');
      expect(opt.status).toBe('sending');

      resolveSend({ id: 'msg-real-1' });
      await sendPromise;
    });

    it('hủy optimistic message khi cancelOptimisticMessage', async () => {
      mockMessagesApi.sendChannelMessage.mockReturnValue(new Promise(() => {})); // pending forever
      void store.sendMessage('To be cancelled');

      const opt = store.optimisticMessages()[0];
      store.cancelOptimisticMessage(opt.clientNonce);
      expect(store.optimisticMessages().length).toBe(0);
    });
  });

  describe('Realtime Socket Events', () => {
    beforeEach(async () => {
      await store.loadInitial('server-1', 'chan-1');
    });

    it('nhận messageCreated$ và thêm vào danh sách tin nhắn', () => {
      const newMsg = {
        id: '103',
        channelId: 'chan-1',
        authorId: 'user-2',
        content: 'Realtime incoming!',
        createdAt: '2026-08-24T00:02:00.000Z',
      };

      messageCreated$.next({ message: newMsg });

      expect(store.messages().some((m) => m.id === '103')).toBe(true);
    });

    it('nhận messageDeleted$ và đánh dấu deletedAt', () => {
      messageDeleted$.next({ channelId: 'chan-1', messageId: '101' });

      const msg = store.messages().find((m) => m.id === '101');
      expect(msg?.deletedAt).toBeTruthy();
      expect(msg?.content).toBeNull();
      expect(msg?.attachments).toEqual([]);
      expect(msg?.reactions).toEqual([]);
    });

    it('nhận messageHiddenForUser$ và ẩn tin nhắn khỏi danh sách hiển thị của user', () => {
      expect(store.messages().some((m) => m.id === '101')).toBe(true);

      messageHiddenForUser$.next({
        channelId: 'chan-1',
        messageId: '101',
        userId: 'user-1',
        hiddenAt: new Date().toISOString(),
      });

      expect(store.messages().some((m) => m.id === '101')).toBe(false);
    });

    it('hideMessage: ẩn optimistic và gọi API hideMessage', async () => {
      await store.hideMessage('101');

      expect(mockMessagesApi.hideMessage).toHaveBeenCalledWith('101');
      expect(store.messages().some((m) => m.id === '101')).toBe(false);
    });

    it('hideMessage thất bại: rollback lại message tại đúng vị trí', async () => {
      mockMessagesApi.hideMessage.mockRejectedValueOnce(new Error('Lỗi server'));

      await expect(store.hideMessage('101')).rejects.toThrow('Lỗi server');

      const target = store.messages().find((m) => m.id === '101');
      expect(target?.id).toBe('101');
      expect(target?.content).toBe('Hello channel!');
    });

    it('recallMessage: redact optimistic và gọi API recallMessage', async () => {
      await store.recallMessage('101');

      expect(mockMessagesApi.recallMessage).toHaveBeenCalledWith('101');
      const target = store.messages().find((m) => m.id === '101');
      expect(target?.content).toBeNull();
      expect(target?.deletedAt).toBeTruthy();
    });

    it('recallMessage thất bại: rollback lại nguyên trạng', async () => {
      mockMessagesApi.recallMessage.mockRejectedValueOnce(new Error('Lỗi server khi recall'));

      await expect(store.recallMessage('101')).rejects.toThrow('Lỗi server khi recall');

      const target = store.messages().find((m) => m.id === '101');
      expect(target?.content).toBe('Hello channel!');
      expect(target?.deletedAt).toBeNull();
    });

    it('nhận reactionUpdated$ và cập nhật reactions của message', () => {
      reactionUpdated$.next({
        channelId: 'chan-1',
        messageId: '101',
        reactions: [{ emoji: '🔥', count: 3, reactedByMe: false }],
      });

      const msg = store.messages().find((m) => m.id === '101');
      expect(msg?.reactions).toEqual([{ emoji: '🔥', count: 3, reactedByMe: false }]);
    });

    it('nhận typingUpdated$ và lọc bỏ bản thân', () => {
      typingUpdated$.next({
        channelId: 'chan-1',
        userIds: ['user-1', 'user-2'], // user-1 là myId
      });

      expect(store.typingUserIds()).toEqual(['user-2']);
    });
  });

  describe('markAsRead (Monotonic)', () => {
    beforeEach(async () => {
      await store.loadInitial('server-1', 'chan-1');
    });

    it('chỉ cập nhật lastReadMessageId nếu messageId lớn hơn giá trị hiện tại', async () => {
      await store.markAsRead('105');
      expect(store.lastReadMessageId()).toBe('105');
      expect(mockMessagesApi.markChannelAsRead).toHaveBeenCalledWith('chan-1', '105');

      mockMessagesApi.markChannelAsRead.mockClear();

      // Gọi với messageId nhỏ hơn -> không cập nhật
      await store.markAsRead('102');
      expect(store.lastReadMessageId()).toBe('105');
      expect(mockMessagesApi.markChannelAsRead).not.toHaveBeenCalled();
    });
  });
});
