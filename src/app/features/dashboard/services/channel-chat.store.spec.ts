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

  const mockUser = {
    id: 'user-1',
    email: 'alice@nexus.test',
    user_metadata: { full_name: 'Alice Nguyễn' },
  };

  beforeEach(() => {
    messageCreated$ = new Subject();
    messageUpdated$ = new Subject();
    messageDeleted$ = new Subject();
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

  describe('compareMessageIds', () => {
    it('so sánh 2 BigInt IDs dạng chuỗi chính xác', () => {
      expect(compareMessageIds('100', '200')).toBe(-1);
      expect(compareMessageIds('200', '100')).toBe(1);
      expect(compareMessageIds('100', '100')).toBe(0);
      expect(compareMessageIds('9007199254740993', '9007199254740992')).toBe(1);
    });
  });

  describe('loadInitial', () => {
    it('tải tin nhắn ban đầu, join socket channel và nạp permissions', async () => {
      await store.loadInitial('server-1', 'chan-1');

      expect(store.channelId()).toBe('chan-1');
      expect(store.serverId()).toBe('server-1');
      expect(store.messages().length).toBe(1);
      expect(store.messages()[0].id).toBe('101');
      expect(store.lastReadMessageId()).toBe('100');
      expect(mockChatSocket.joinChannel).toHaveBeenCalledWith('chan-1');
      expect(store.permissions().canSend).toBe(true);
      expect(store.permissions().canManageMessages).toBe(true);
    });

    it('Generation Guard: hủy bỏ kết quả request cũ khi chuyển channel nhanh', async () => {
      let resolveFirst: any;
      mockMessagesApi.getChannelMessages.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      );

      const p1 = store.loadInitial('server-1', 'chan-old');
      const p2 = store.loadInitial('server-1', 'chan-new');

      await p2;
      expect(store.channelId()).toBe('chan-new');

      // Giải quyết p1 sau đó
      resolveFirst({
        messages: [{ id: '999', channelId: 'chan-old', content: 'Old' }],
        hasMore: false,
      });
      await p1;

      // State vẫn thuộc về chan-new, không bị ghi đè bởi response chan-old
      expect(store.channelId()).toBe('chan-new');
    });
  });

  describe('sendMessage & Optimistic Updates', () => {
    beforeEach(async () => {
      await store.loadInitial('server-1', 'chan-1');
    });

    it('thêm optimistic message vào allMessages và thay thế bằng persisted message khi API thành công', async () => {
      const persistedMessage = {
        id: '102',
        channelId: 'chan-1',
        authorId: 'user-1',
        content: 'Optimistic text',
        clientNonce: 'nonce-123',
        createdAt: '2026-08-24T00:01:00.000Z',
      };

      mockMessagesApi.sendChannelMessage.mockImplementation(async () => {
        // Trong khi đang gọi API, allMessages phải có optimistic message
        expect(store.optimisticMessages().length).toBe(1);
        expect(store.optimisticMessages()[0].status).toBe('sending');
        return persistedMessage;
      });

      const res = await store.sendMessage('Optimistic text');

      expect(res).toEqual(persistedMessage);
      expect(store.optimisticMessages().length).toBe(0);
      expect(store.messages().some((m) => m.id === '102')).toBe(true);
    });

    it('đánh dấu failed khi API gửi tin nhắn lỗi và cho phép retry/cancel', async () => {
      mockMessagesApi.sendChannelMessage.mockRejectedValueOnce(
        new Error('Mất kết nối mạng'),
      );

      await store.sendMessage('Failed text');

      expect(store.optimisticMessages().length).toBe(1);
      const opt = store.optimisticMessages()[0];
      expect(opt.status).toBe('failed');
      expect(opt.errorMessage).toContain('Mất kết nối mạng');

      // Cancel optimistic message
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
