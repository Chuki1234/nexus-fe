import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import {
  MessageResponseDto,
  MessagesApiService,
} from '../../../core/api/messages-api.service';
import { ChatSocketService } from '../../../core/realtime/chat-socket.service';
import { ActiveChatStore } from './active-chat.store';

describe('ActiveChatStore', () => {
  let store: ActiveChatStore;
  let messagesApiMock: {
    getMessages: any;
    sendMessage: any;
    editMessage: any;
    deleteMessage: any;
    hideMessage: any;
    recallMessage: any;
    markAsRead: any;
    getAttachmentSignedUrl: any;
    setReaction: any;
  };
  let chatSocketMock: {
    joinConversation: any;
    leaveConversation: any;
    startTyping: any;
    stopTyping: any;
    messageCreated$: Subject<any>;
    messageUpdated$: Subject<any>;
    messageDeleted$: Subject<any>;
    messageHiddenForUser$: Subject<any>;
    reactionUpdated$: Subject<any>;
    messageRead$: Subject<any>;
    typingUpdated$: Subject<any>;
    joinError$: Subject<any>;
  };
  let authMock: {
    user: any;
  };

  const sampleMessages: MessageResponseDto[] = [
    {
      id: '100',
      channelId: null,
      conversationId: 'conv-1',
      authorId: 'user-1',
      type: 'default',
      content: 'Hello 100',
      replyToId: null,
      clientNonce: null,
      editedAt: null,
      deletedAt: null,
      isForwarded: false,
      externalMedia: null,
      createdAt: '2026-08-22T10:00:00Z',
    },
    {
      id: '105',
      channelId: null,
      conversationId: 'conv-1',
      authorId: 'user-2',
      type: 'default',
      content: 'Hello 105',
      replyToId: null,
      clientNonce: null,
      editedAt: null,
      deletedAt: null,
      isForwarded: false,
      externalMedia: null,
      createdAt: '2026-08-22T10:05:00Z',
    },
  ];

  beforeEach(() => {
    messagesApiMock = {
      getMessages: vi.fn().mockResolvedValue({
        messages: sampleMessages,
        hasMore: true,
        nextCursor: '100',
      }),
      sendMessage: vi.fn(),
      editMessage: vi.fn(),
      deleteMessage: vi.fn(),
      hideMessage: vi.fn().mockResolvedValue({ id: '100', hidden: true, scope: 'for_me' }),
      recallMessage: vi.fn().mockResolvedValue({ id: '100', deleted: true, scope: 'everyone' }),
      markAsRead: vi.fn().mockResolvedValue({ success: true }),
      getAttachmentSignedUrl: vi.fn().mockResolvedValue({
        signedUrl: 'https://storage.supabase.co/signed/fresh-url.png',
      }),
      setReaction: vi.fn().mockResolvedValue({
        messageId: '100',
        conversationId: 'conv-1',
        reactions: [{ emoji: '❤️', count: 1, reactedByMe: true }],
      }),
    };

    chatSocketMock = {
      joinConversation: vi.fn().mockResolvedValue({ success: true }),
      leaveConversation: vi.fn(),
      startTyping: vi.fn(),
      stopTyping: vi.fn(),
      messageCreated$: new Subject(),
      messageUpdated$: new Subject(),
      messageDeleted$: new Subject(),
      messageHiddenForUser$: new Subject(),
      reactionUpdated$: new Subject(),
      messageRead$: new Subject(),
      typingUpdated$: new Subject(),
      joinError$: new Subject(),
    };

    authMock = {
      user: vi.fn().mockReturnValue({
        id: 'user-me',
        user_metadata: { username: 'me', display_name: 'Me' },
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        ActiveChatStore,
        { provide: MessagesApiService, useValue: messagesApiMock },
        { provide: ChatSocketService, useValue: chatSocketMock },
        { provide: AuthService, useValue: authMock },
      ],
    });

    store = TestBed.inject(ActiveChatStore);
  });

  describe('setActiveConversation & Room Lifecycle (Regression Tests)', () => {
    it('chuyển room socket và tải lịch sử tin nhắn ban đầu', async () => {
      await store.setActiveConversation('conv-1');

      expect(chatSocketMock.joinConversation).toHaveBeenCalledWith('conv-1');
      expect(messagesApiMock.getMessages).toHaveBeenCalledWith('conv-1', {
        limit: 50,
      });
      expect(store.messages().length).toBe(2);
      expect(store.hasMore()).toBe(true);
      expect(store.nextCursor()).toBe('100');
    });

    it('leave room cũ khi chuyển sang cuộc trò chuyện mới', async () => {
      await store.setActiveConversation('conv-1');
      await store.setActiveConversation('conv-2');

      expect(chatSocketMock.leaveConversation).toHaveBeenCalledWith('conv-1');
      expect(chatSocketMock.joinConversation).toHaveBeenCalledWith('conv-2');
      expect(store.conversationId()).toBe('conv-2');
    });
  });

  describe('loadOlderMessages (Pagination Regression Tests)', () => {
    it('tải tin nhắn cũ hơn và nối vào đầu danh sách (pagination merge)', async () => {
      await store.setActiveConversation('conv-1');

      const olderMessage: MessageResponseDto = {
        id: '90',
        channelId: null,
        conversationId: 'conv-1',
        authorId: 'user-1',
        type: 'default',
        content: 'Older message 90',
        replyToId: null,
        clientNonce: null,
        editedAt: null,
        deletedAt: null,
        isForwarded: false,
        externalMedia: null,
        createdAt: '2026-08-22T09:00:00Z',
      };

      messagesApiMock.getMessages.mockResolvedValueOnce({
        messages: [olderMessage],
        hasMore: false,
        nextCursor: undefined,
      });

      await store.loadOlderMessages();

      expect(messagesApiMock.getMessages).toHaveBeenCalledWith('conv-1', {
        before: '100',
        limit: 50,
      });
      expect(store.messages().length).toBe(3);
      expect(store.messages()[0].id).toBe('90');
      expect(store.hasMore()).toBe(false);
    });
  });

  describe('sendMessage & Optimistic UI (Regression Tests)', () => {
    it('hiển thị ngay optimistic message, sau đó thay thế bằng kết quả từ API', async () => {
      await store.setActiveConversation('conv-1');

      const createdResponse: MessageResponseDto = {
        id: '110',
        channelId: null,
        conversationId: 'conv-1',
        authorId: 'user-me',
        type: 'default',
        content: 'My new message',
        replyToId: null,
        clientNonce: 'nonce-123',
        editedAt: null,
        deletedAt: null,
        isForwarded: false,
        externalMedia: null,
        createdAt: '2026-08-22T10:10:00Z',
      };

      let resolveApi: (value: any) => void;
      messagesApiMock.sendMessage.mockReturnValue(
        new Promise((resolve) => {
          resolveApi = resolve;
        }),
      );

      const sendPromise = store.sendMessage('My new message');

      // Ngay sau khi gọi, optimistic message phải xuất hiện
      expect(store.optimisticMessages().length).toBe(1);
      expect(store.optimisticMessages()[0].content).toBe('My new message');
      expect(store.optimisticMessages()[0].status).toBe('sending');

      // Khi API phản hồi thành công
      resolveApi!(createdResponse);
      await sendPromise;

      expect(store.optimisticMessages().length).toBe(0);
      expect(store.messages().some((m) => m.id === '110')).toBe(true);
    });

    it('đánh dấu failed khi gửi tin nhắn bị lỗi', async () => {
      await store.setActiveConversation('conv-1');

      messagesApiMock.sendMessage.mockRejectedValue(new Error('Network error'));

      await store.sendMessage('Failed message');

      expect(store.optimisticMessages().length).toBe(1);
      expect(store.optimisticMessages()[0].status).toBe('failed');
    });
  });

  describe('Realtime Socket Events (Regression Tests)', () => {
    it('nhận tin nhắn mới từ socket và chèn vào store nếu đúng conversation', async () => {
      await store.setActiveConversation('conv-1');

      const incomingMessage = {
        id: '120',
        channelId: null,
        conversationId: 'conv-1',
        authorId: 'user-2',
        type: 'default' as const,
        content: 'Incoming from socket',
        replyToId: null,
        clientNonce: null,
        editedAt: null,
        deletedAt: null,
        createdAt: '2026-08-22T10:20:00Z',
      };

      chatSocketMock.messageCreated$.next({ message: incomingMessage });

      expect(store.messages().some((m) => m.id === '120')).toBe(true);
      expect(store.messages()[store.messages().length - 1].content).toBe(
        'Incoming from socket',
      );
    });

    it('bỏ qua tin nhắn mới từ conversation khác', async () => {
      await store.setActiveConversation('conv-1');

      const otherMessage = {
        id: '999',
        channelId: null,
        conversationId: 'conv-OTHER',
        authorId: 'user-3',
        type: 'default' as const,
        content: 'Other conv message',
        replyToId: null,
        clientNonce: null,
        editedAt: null,
        deletedAt: null,
        createdAt: '2026-08-22T10:20:00Z',
      };

      chatSocketMock.messageCreated$.next({ message: otherMessage });

      expect(store.messages().some((m) => m.id === '999')).toBe(false);
    });

    it('cập nhật nội dung khi nhận message:updated', async () => {
      await store.setActiveConversation('conv-1');

      const updated = {
        id: '100',
        channelId: null,
        conversationId: 'conv-1',
        authorId: 'user-1',
        type: 'default' as const,
        content: 'Edited content',
        replyToId: null,
        clientNonce: null,
        editedAt: '2026-08-22T10:05:00Z',
        deletedAt: null,
        createdAt: '2026-08-22T10:00:00Z',
      };

      chatSocketMock.messageUpdated$.next({ message: updated });

      const target = store.messages().find((m) => m.id === '100');
      expect(target?.content).toBe('Edited content');
      expect(target?.editedAt).toBe('2026-08-22T10:05:00Z');
    });

    it('soft delete khi nhận message:deleted', async () => {
      await store.setActiveConversation('conv-1');

      chatSocketMock.messageDeleted$.next({
        conversationId: 'conv-1',
        channelId: null,
        messageId: '100',
      });

      const target = store.messages().find((m) => m.id === '100');
      expect(target?.content).toBeNull();
      expect(target?.deletedAt).toBeDefined();
    });

    it('cập nhật danh sách typing (loại bỏ current user)', async () => {
      await store.setActiveConversation('conv-1');

      chatSocketMock.typingUpdated$.next({
        conversationId: 'conv-1',
        userIds: ['user-other', 'user-me'],
      });

      expect(store.typingUserIds()).toEqual(['user-other']);
    });
  });

  describe('Race Condition & Generation Checks (Hardening Tests)', () => {
    it('đổi từ A sang B khi request A chưa hoàn thành: response A không đè lên state của B', async () => {
      let resolveA: (val: any) => void;
      messagesApiMock.getMessages.mockImplementation((convId: string) => {
        if (convId === 'conv-A') {
          return new Promise((resolve) => {
            resolveA = resolve;
          });
        }
        if (convId === 'conv-B') {
          return Promise.resolve({
            messages: [
              {
                id: '500',
                channelId: null,
                conversationId: 'conv-B',
                authorId: 'user-b',
                type: 'default',
                content: 'Message of B',
                replyToId: null,
                clientNonce: null,
                editedAt: null,
                deletedAt: null,
                createdAt: '2026-08-22T12:00:00Z',
              },
            ],
            hasMore: false,
            nextCursor: undefined,
          });
        }
        return Promise.resolve({ messages: [], hasMore: false });
      });

      // 1. Chuyển sang conv-A (request A đang chạy)
      const promiseA = store.setActiveConversation('conv-A');

      // 2. Người dùng lập tức chuyển sang conv-B
      await store.setActiveConversation('conv-B');
      expect(store.conversationId()).toBe('conv-B');
      expect(store.messages().length).toBe(1);
      expect(store.messages()[0].id).toBe('500');

      // 3. Response của A về sau
      resolveA!({
        messages: [
          {
            id: '100',
            channelId: null,
            conversationId: 'conv-A',
            authorId: 'user-a',
            type: 'default',
            content: 'Message of A',
            replyToId: null,
            clientNonce: null,
            editedAt: null,
            deletedAt: null,
            createdAt: '2026-08-22T10:00:00Z',
          },
        ],
        hasMore: true,
        nextCursor: '100',
      });
      await promiseA;

      // State của conv-B không hề bị ô nhiễm bởi tin nhắn của A
      expect(store.conversationId()).toBe('conv-B');
      expect(store.messages().length).toBe(1);
      expect(store.messages()[0].id).toBe('500');
    });

    it('socket message đến trước khi initial REST response về: merge và deduplicate đúng thứ tự', async () => {
      let resolveInitial: (val: any) => void;
      messagesApiMock.getMessages.mockReturnValue(
        new Promise((resolve) => {
          resolveInitial = resolve;
        }),
      );

      const activePromise = store.setActiveConversation('conv-1');

      // Socket nhận tin nhắn realtime ID 200 trước khi REST kịp phản hồi
      chatSocketMock.messageCreated$.next({
        message: {
          id: '200',
          channelId: null,
          conversationId: 'conv-1',
          authorId: 'user-2',
          type: 'default',
          content: 'Realtime arrived first',
          replyToId: null,
          clientNonce: null,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-08-22T10:20:00Z',
        },
      });

      expect(store.messages().length).toBe(1);
      expect(store.messages()[0].id).toBe('200');

      // Bây giờ REST history ban đầu trả về ID 100, 150
      resolveInitial!({
        messages: [
          {
            id: '100',
            channelId: null,
            conversationId: 'conv-1',
            authorId: 'user-1',
            type: 'default',
            content: 'Old 100',
            replyToId: null,
            clientNonce: null,
            editedAt: null,
            deletedAt: null,
            createdAt: '2026-08-22T10:00:00Z',
          },
          {
            id: '150',
            channelId: null,
            conversationId: 'conv-1',
            authorId: 'user-1',
            type: 'default',
            content: 'Old 150',
            replyToId: null,
            clientNonce: null,
            editedAt: null,
            deletedAt: null,
            createdAt: '2026-08-22T10:15:00Z',
          },
        ],
        hasMore: false,
        nextCursor: undefined,
      });

      await activePromise;

      // Không bị mất tin realtime ID 200 và được sắp xếp đúng thứ tự bigint
      expect(store.messages().length).toBe(3);
      expect(store.messages().map((m) => m.id)).toEqual(['100', '150', '200']);
    });

    it('send response của A về sau khi đã sang B: không chèn vào B', async () => {
      await store.setActiveConversation('conv-A');

      let resolveSend: (val: any) => void;
      messagesApiMock.sendMessage.mockReturnValue(
        new Promise((resolve) => {
          resolveSend = resolve;
        }),
      );

      const sendPromise = store.sendMessage('Message for A');

      // Người dùng chuyển sang conv-B
      await store.setActiveConversation('conv-B');

      // REST send của A thành công sau đó
      resolveSend!({
        id: '999',
        channelId: null,
        conversationId: 'conv-A',
        authorId: 'user-me',
        type: 'default',
        content: 'Message for A',
        replyToId: null,
        clientNonce: 'nonce-a',
        editedAt: null,
        deletedAt: null,
        createdAt: '2026-08-22T10:00:00Z',
      });
      await sendPromise;

      // conv-B không nhận tin nhắn của conv-A
      expect(store.messages().some((m) => m.id === '999')).toBe(false);
    });

    it('pagination của A lỗi sau khi đã sang B: không set lỗi cho B', async () => {
      await store.setActiveConversation('conv-A');

      let rejectPagination: (err: any) => void;
      messagesApiMock.getMessages.mockImplementation((convId: string, query?: any) => {
        if (convId === 'conv-A' && query?.before) {
          return new Promise((_, reject) => {
            rejectPagination = reject;
          });
        }
        return Promise.resolve({ messages: [], hasMore: false });
      });

      const loadOlderPromise = store.loadOlderMessages();

      // Sang conv-B
      await store.setActiveConversation('conv-B');

      // Pagination của A reject sau đó
      rejectPagination!(new Error('Pagination error on A'));
      await loadOlderPromise;

      expect(store.error()).toBeNull();
    });
  });

  describe('Optimistic Rollback & Helpers (Hardening Tests)', () => {
    it('editMessage thất bại: rollback lại nội dung và editedAt snapshot ban đầu và re-throw error', async () => {
      await store.setActiveConversation('conv-1');

      messagesApiMock.editMessage.mockRejectedValue(
        new Error('Lỗi server khi sửa'),
      );

      await expect(
        store.editMessage('100', 'Nội dung sửa thất bại'),
      ).rejects.toThrow('Lỗi server khi sửa');

      const target = store.messages().find((m) => m.id === '100');
      expect(target?.content).toBe('Hello 100');
      expect(target?.editedAt).toBeNull();
      expect(store.error()).toBe('Lỗi server khi sửa');
    });

    it('hideMessage thành công: xoá optimistic và gọi messagesApi.hideMessage', async () => {
      await store.setActiveConversation('conv-1');

      await store.hideMessage('100');

      expect(messagesApiMock.hideMessage).toHaveBeenCalledWith('100');
      const target = store.messages().find((m) => m.id === '100');
      expect(target).toBeUndefined();
    });

    it('hideMessage thất bại: rollback lại message tại đúng vị trí canonical', async () => {
      await store.setActiveConversation('conv-1');

      messagesApiMock.hideMessage.mockRejectedValue(
        new Error('Lỗi server khi ẩn tin nhắn'),
      );

      await expect(store.hideMessage('100')).rejects.toThrow('Lỗi server khi ẩn tin nhắn');

      const target = store.messages().find((m) => m.id === '100');
      expect(target?.id).toBe('100');
      expect(target?.content).toBe('Hello 100');
      expect(store.error()).toBe('Lỗi server khi ẩn tin nhắn');
    });

    it('recallMessage thành công: redact optimistic và gọi messagesApi.recallMessage', async () => {
      await store.setActiveConversation('conv-1');

      await store.recallMessage('100');

      expect(messagesApiMock.recallMessage).toHaveBeenCalledWith('100');
      const target = store.messages().find((m) => m.id === '100');
      expect(target?.content).toBeNull();
      expect(target?.deletedAt).toBeDefined();
      expect(target?.attachments).toEqual([]);
      expect(target?.reactions).toEqual([]);
    });

    it('recallMessage thất bại: rollback lại trạng thái trước khi thu hồi', async () => {
      await store.setActiveConversation('conv-1');

      messagesApiMock.recallMessage.mockRejectedValue(
        new Error('Lỗi server khi thu hồi'),
      );

      await expect(store.recallMessage('100')).rejects.toThrow('Lỗi server khi thu hồi');

      const target = store.messages().find((m) => m.id === '100');
      expect(target?.content).toBe('Hello 100');
      expect(target?.deletedAt).toBeNull();
      expect(store.error()).toBe('Lỗi server khi thu hồi');
    });

    it('nhận socket messageHiddenForUser: tự động xoá tin nhắn bị ẩn trên các tab khác của chính user', async () => {
      await store.setActiveConversation('conv-1');

      expect(store.messages().some((m) => m.id === '100')).toBe(true);

      chatSocketMock.messageHiddenForUser$.next({
        conversationId: 'conv-1',
        channelId: null,
        messageId: '100',
        userId: 'user-me',
        hiddenAt: new Date().toISOString(),
      });

      expect(store.messages().some((m) => m.id === '100')).toBe(false);
    });

    it('retryMessage giữ nguyên clientNonce ban đầu', async () => {
      await store.setActiveConversation('conv-1');

      messagesApiMock.sendMessage.mockRejectedValueOnce(new Error('Network error'));
      await store.sendMessage('Retry me');

      const failedItem = store.optimisticMessages()[0];
      expect(failedItem.status).toBe('failed');
      const originalNonce = failedItem.clientNonce;

      // Khi retry thành công
      messagesApiMock.sendMessage.mockResolvedValueOnce({
        id: '300',
        channelId: null,
        conversationId: 'conv-1',
        authorId: 'user-me',
        type: 'default',
        content: 'Retry me',
        replyToId: null,
        clientNonce: originalNonce,
        editedAt: null,
        deletedAt: null,
        createdAt: '2026-08-22T10:00:00Z',
      });

      await store.retryMessage(originalNonce);

      expect(messagesApiMock.sendMessage).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({
          content: 'Retry me',
          clientNonce: originalNonce,
        }),
      );
      expect(store.optimisticMessages().length).toBe(0);
      expect(store.messages().some((m) => m.id === '300')).toBe(true);
    });

    it('allMessages kết hợp persisted và optimistic messages rõ ràng không bị trùng', async () => {
      await store.setActiveConversation('conv-1');

      messagesApiMock.sendMessage.mockReturnValue(new Promise(() => {}));
      void store.sendMessage('Pending message');

      const all = store.allMessages();
      expect(all.length).toBe(3); // 2 persisted + 1 optimistic
      expect(all.some((m) => m.status === 'persisted' && m.id === '100')).toBe(
        true,
      );
      expect(all.some((m) => m.status === 'sending')).toBe(true);
    });

    it('gửi tin nhắn kèm files: tạo optimistic attachments và gửi REST thành công', async () => {
      await store.setActiveConversation('conv-1');

      const dummyFile = new File(['dummy'], 'photo.png', { type: 'image/png' });
      messagesApiMock.sendMessage.mockResolvedValue({
        id: '400',
        channelId: null,
        conversationId: 'conv-1',
        authorId: 'user-me',
        type: 'default',
        content: 'Check this image',
        replyToId: null,
        clientNonce: 'some-nonce',
        editedAt: null,
        deletedAt: null,
        attachments: [
          {
            id: 'att-1',
            filename: 'photo.png',
            mimeType: 'image/png',
            sizeBytes: 5,
            width: 100,
            height: 100,
            signedUrl: 'https://storage.supabase.co/signed/photo.png',
          },
        ],
        createdAt: '2026-08-22T10:30:00Z',
      });

      await store.sendMessage({
        content: 'Check this image',
        files: [dummyFile],
      });

      expect(messagesApiMock.sendMessage).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({
          content: 'Check this image',
          files: [dummyFile],
        }),
      );
      expect(store.messages().some((m) => m.id === '400')).toBe(true);
      expect(store.messages().find((m) => m.id === '400')?.attachments?.length).toBe(1);
    });

    it('thu hồi URL.revokeObjectURL cho optimistic message khi gửi thành công, khi xoá failed, khi đổi phòng và khi destroy', async () => {
      await store.setActiveConversation('conv-1');

      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const dummyFile = new File(['dummy'], 'photo.png', { type: 'image/png' });
      messagesApiMock.sendMessage.mockResolvedValue({
        id: '401',
        channelId: null,
        conversationId: 'conv-1',
        authorId: 'user-me',
        type: 'default',
        content: 'Check image',
        replyToId: null,
        clientNonce: 'some-nonce-blob',
        editedAt: null,
        deletedAt: null,
        attachments: [],
        createdAt: '2026-08-22T10:30:00Z',
      });

      // 1. Reconcile revoke
      await store.sendMessage({
        content: 'Check image',
        files: [dummyFile],
      });
      expect(revokeSpy).toHaveBeenCalled();

      // 2. Failed message dismiss revoke
      revokeSpy.mockClear();
      messagesApiMock.sendMessage.mockRejectedValueOnce(new Error('Network error'));
      await store.sendMessage({
        content: 'Failed with image',
        files: [dummyFile],
      });
      expect(store.optimisticMessages().length).toBe(1);
      const failedNonce = store.optimisticMessages()[0].clientNonce;
      store.dismissFailedMessage(failedNonce);
      expect(revokeSpy).toHaveBeenCalled();

      // 3. Clear / switch room / destroy revoke
      revokeSpy.mockClear();
      messagesApiMock.sendMessage.mockReturnValue(new Promise(() => {})); // pending
      void store.sendMessage({
        content: 'Pending image',
        files: [dummyFile],
      });
      expect(store.optimisticMessages().length).toBe(1);

      store.clear();
      expect(revokeSpy).toHaveBeenCalled();

      revokeSpy.mockRestore();
    });

    it('tái sử dụng previewUrl từ composer chuyển sang mà không gọi URL.createObjectURL lần 2', async () => {
      await store.setActiveConversation('conv-1');

      const createSpy = vi.spyOn(URL, 'createObjectURL');
      const dummyFile = new File(['dummy'], 'photo.png', { type: 'image/png' });
      const handedUrl = 'blob:http://localhost:4200/handed-preview-uuid';

      messagesApiMock.sendMessage.mockResolvedValue({
        id: '402',
        channelId: null,
        conversationId: 'conv-1',
        authorId: 'user-me',
        type: 'default',
        content: 'Image with handed preview',
        replyToId: null,
        clientNonce: 'some-nonce-handed',
        editedAt: null,
        deletedAt: null,
        attachments: [],
        createdAt: '2026-08-22T10:35:00Z',
      });

      await store.sendMessage({
        content: 'Image with handed preview',
        files: [dummyFile],
        attachments: [{ file: dummyFile, previewUrl: handedUrl }],
      });

      expect(createSpy).not.toHaveBeenCalled();
      createSpy.mockRestore();
    });

    it('refreshAttachmentUrl cập nhật signedUrl mới và isAvailable cho attachment', async () => {
      await store.setActiveConversation('conv-1');

      // Gắn message có attachment
      store['_messages'].set([
        {
          id: '501',
          channelId: null,
          conversationId: 'conv-1',
          authorId: 'user-1',
          type: 'default',
          content: 'File expired',
          replyToId: null,
          clientNonce: null,
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          externalMedia: null,
          attachments: [
            {
              id: 'att-expired',
              filename: 'doc.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 1024,
              width: null,
              height: null,
              signedUrl: null,
              isAvailable: false,
            },
          ],
          createdAt: '2026-08-22T10:00:00Z',
        },
      ]);

      const newUrl = await store.refreshAttachmentUrl('501', 'att-expired');
      expect(newUrl).toBe('https://storage.supabase.co/signed/fresh-url.png');

      const updatedMsg = store.messages().find((m) => m.id === '501');
      expect(updatedMsg?.attachments?.[0].signedUrl).toBe(
        'https://storage.supabase.co/signed/fresh-url.png',
      );
      expect(updatedMsg?.attachments?.[0].isAvailable).toBe(true);
    });
  });

  describe('Read State & Socket Join Error', () => {
    it('messageRead$ cập nhật read receipt theo userId và giữ bigint string', async () => {
      await store.setActiveConversation('conv-1');

      const hugeId = '9007199254740999999';
      chatSocketMock.messageRead$.next({
        conversationId: 'conv-1',
        userId: 'user-2',
        lastReadMessageId: hugeId,
      });

      expect(store.readStates()['user-2']).toBe(hugeId);
    });

    it('joinError$ hiển thị lỗi vào store nếu xảy ra với conversation hiện tại', async () => {
      await store.setActiveConversation('conv-1');

      chatSocketMock.joinError$.next({
        conversationId: 'conv-1',
        error: 'Bạn không có quyền tham gia cuộc trò chuyện này',
      });

      expect(store.error()).toBe(
        'Bạn không có quyền tham gia cuộc trò chuyện này',
      );
    });

    it('joinConversation bị rejected phản ánh lỗi ngay vào store', async () => {
      chatSocketMock.joinConversation.mockResolvedValueOnce({
        success: false,
        error: 'Không có quyền truy cập',
        status: 'rejected',
      });

      await store.setActiveConversation('conv-blocked');

      // Chờ microtask xử lý promise join
      await Promise.resolve();

      expect(store.error()).toBe('Không có quyền truy cập');
    });

    it('bỏ qua message:created của conversation khác', async () => {
      await store.setActiveConversation('conv-1');

      chatSocketMock.messageCreated$.next({
        message: {
          id: '999',
          channelId: null,
          conversationId: 'conv-other',
          authorId: 'user-other',
          type: 'default',
          content: 'Secret from other room',
          replyToId: null,
          clientNonce: null,
          editedAt: null,
          deletedAt: null,
          createdAt: new Date().toISOString(),
        },
      });

      expect(store.messages().some((m) => m.id === '999')).toBe(false);
    });

    it('reconcile tin nhắn qua clientNonce và không nhân đôi tin nhắn khi REST + socket cùng trả về', async () => {
      await store.setActiveConversation('conv-1');

      // Thêm 1 optimistic message
      store['_optimisticMessages'].set([
        {
          clientNonce: 'nonce-123',
          conversationId: 'conv-1',
          content: 'Optimistic text',
          status: 'sending',
          createdAt: new Date().toISOString(),
        },
      ]);

      expect(store.allMessages()).toHaveLength(3); // 2 sample + 1 optimistic

      // Socket nhận message:created khớp clientNonce
      chatSocketMock.messageCreated$.next({
        message: {
          id: '200',
          channelId: null,
          conversationId: 'conv-1',
          authorId: 'user-me',
          author: {
            id: 'user-me',
            username: 'me',
            displayName: 'Me',
            avatarUrl: null,
          },
          type: 'default',
          content: 'Optimistic text',
          replyToId: null,
          clientNonce: 'nonce-123',
          editedAt: null,
          deletedAt: null,
          createdAt: new Date().toISOString(),
        },
      });

      // Optimistic message đã được dọn và thay bằng persisted message
      expect(store.optimisticMessages()).toHaveLength(0);
      expect(store.allMessages().some((m) => m.id === '200')).toBe(true);

      // Nếu socket phát lại message:created trùng id, không bị nhân đôi
      chatSocketMock.messageCreated$.next({
        message: {
          id: '200',
          channelId: null,
          conversationId: 'conv-1',
          authorId: 'user-me',
          type: 'default',
          content: 'Optimistic text',
          replyToId: null,
          clientNonce: 'nonce-123',
          editedAt: null,
          deletedAt: null,
          createdAt: new Date().toISOString(),
        },
      });

      const count200 = store.messages().filter((m) => m.id === '200').length;
      expect(count200).toBe(1);
    });

    it('chuyển conversation gọi leaveConversation với phòng cũ và ngOnDestroy dọn dẹp', async () => {
      await store.setActiveConversation('conv-1');
      expect(chatSocketMock.joinConversation).toHaveBeenCalledWith('conv-1');

      await store.setActiveConversation('conv-2');
      expect(chatSocketMock.leaveConversation).toHaveBeenCalledWith('conv-1');
      expect(chatSocketMock.joinConversation).toHaveBeenCalledWith('conv-2');

      store.ngOnDestroy();
      expect(chatSocketMock.leaveConversation).toHaveBeenCalledWith('conv-2');
    });

    it('khi gọi lại cùng conversationId mà socket disconnected: giữ nguyên messages và chỉ retry joinConversation', async () => {
      messagesApiMock.getMessages.mockResolvedValueOnce({
        messages: [
          {
            id: '101',
            channelId: null,
            conversationId: 'conv-1',
            authorId: 'user-1',
            type: 'default',
            content: 'Loaded message',
            replyToId: null,
            clientNonce: null,
            editedAt: null,
            deletedAt: null,
            createdAt: '2026-08-22T10:00:00Z',
          },
        ],
        hasMore: false,
        nextCursor: undefined,
      });

      chatSocketMock.joinConversation.mockResolvedValueOnce({
        success: false,
        status: 'disconnected',
      });

      await store.setActiveConversation('conv-1');
      expect(store.messages().length).toBe(1);
      expect(store.realtimeStatus()).toBe('disconnected');
      expect(messagesApiMock.getMessages).toHaveBeenCalledTimes(1);

      // Gọi lại cùng conv-1
      chatSocketMock.joinConversation.mockResolvedValueOnce({
        success: true,
        status: 'joined',
      });
      await store.setActiveConversation('conv-1');

      // Tin nhắn vẫn còn nguyên vẹn, không gọi lại REST getMessages
      expect(store.messages().length).toBe(1);
      expect(store.messages()[0].content).toBe('Loaded message');
      expect(messagesApiMock.getMessages).toHaveBeenCalledTimes(1);
      expect(chatSocketMock.joinConversation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Reactions (Desired-State & Realtime)', () => {
    beforeEach(async () => {
      await store.setActiveConversation('conv-1');
    });

    it('optimistic update khi thêm reaction và reconcile với REST response', async () => {
      messagesApiMock.setReaction.mockResolvedValueOnce({
        messageId: '100',
        conversationId: 'conv-1',
        reactions: [{ emoji: '❤️', count: 1, reactedByMe: true }],
      });

      const promise = store.setReaction('100', '❤️', true);

      // Ngay lập tức kiểm tra optimistic update
      const optMsg = store.messages().find((m) => m.id === '100');
      expect(optMsg?.reactions).toEqual([{ emoji: '❤️', count: 1, reactedByMe: true }]);

      await promise;

      // Sau khi REST API hoàn tất
      const reconciledMsg = store.messages().find((m) => m.id === '100');
      expect(reconciledMsg?.reactions).toEqual([{ emoji: '❤️', count: 1, reactedByMe: true }]);
      expect(messagesApiMock.setReaction).toHaveBeenCalledWith(
        'conv-1',
        '100',
        expect.objectContaining({
          emoji: '❤️',
          reacted: true,
          clientMutationId: expect.any(String),
        }),
      );
    });

    it('rollback optimistic update và gán error khi REST API trả về lỗi', async () => {
      messagesApiMock.setReaction.mockRejectedValueOnce(new Error('Network error'));

      await store.setReaction('100', '❤️', true);

      const msg = store.messages().find((m) => m.id === '100');
      expect(msg?.reactions).toEqual([]);
      expect(store.error()).toContain('Network error');
    });

    it('toggleReaction chuyển đổi đúng giữa thêm và bỏ cảm xúc', async () => {
      // Ban đầu chưa có reaction -> toggle sẽ thành reacted: true
      await store.toggleReaction('100', '👍');
      expect(messagesApiMock.setReaction).toHaveBeenCalledWith(
        'conv-1',
        '100',
        expect.objectContaining({ emoji: '👍', reacted: true }),
      );

      // Cập nhật state đã reactedByMe: true
      messagesApiMock.setReaction.mockResolvedValueOnce({
        messageId: '100',
        conversationId: 'conv-1',
        reactions: [],
      });

      // Toggle lần 2 khi đã reacted -> toggle sẽ thành reacted: false
      await store.toggleReaction('100', '❤️');
      expect(messagesApiMock.setReaction).toHaveBeenCalledWith(
        'conv-1',
        '100',
        expect.objectContaining({ emoji: '❤️', reacted: false }),
      );
    });

    it('nhận reactionUpdated$ từ người khác: cập nhật count và bảo toàn reactedByMe của chính mình', async () => {
      // Giả sử tin nhắn 100 đang có reaction ❤️ do chính mình thả
      messagesApiMock.setReaction.mockResolvedValueOnce({
        messageId: '100',
        conversationId: 'conv-1',
        reactions: [{ emoji: '❤️', count: 1, reactedByMe: true }],
      });
      await store.setReaction('100', '❤️', true);

      // Socket broadcast từ user khác thêm reaction ❤️ (count tăng lên 2)
      chatSocketMock.reactionUpdated$.next({
        conversationId: 'conv-1',
        messageId: '100',
        actorUserId: 'user-other',
        emoji: '❤️',
        action: 'added',
        clientMutationId: 'other-mutation-uuid',
        reactions: [{ emoji: '❤️', count: 2 }],
      });

      const updated = store.messages().find((m) => m.id === '100');
      expect(updated?.reactions).toEqual([{ emoji: '❤️', count: 2, reactedByMe: true }]);
    });

    it('deduplicate socket event của chính mutation vừa thực hiện', async () => {
      let capturedMutationId = '';
      messagesApiMock.setReaction.mockImplementationOnce(
        async (_convId: string, _msgId: string, dto: any) => {
          capturedMutationId = dto.clientMutationId;
          return {
            messageId: '100',
            conversationId: 'conv-1',
            clientMutationId: dto.clientMutationId,
            reactions: [{ emoji: '🔥', count: 1, reactedByMe: true }],
          };
        },
      );

      await store.setReaction('100', '🔥', true);

      // Socket phát lại event với chính clientMutationId này
      chatSocketMock.reactionUpdated$.next({
        conversationId: 'conv-1',
        messageId: '100',
        actorUserId: 'user-me',
        emoji: '🔥',
        action: 'added',
        clientMutationId: capturedMutationId,
        reactions: [{ emoji: '🔥', count: 999 }], // Dữ liệu giả lập
      });

      // State không bị đè bởi duplicate socket event
      const msg = store.messages().find((m) => m.id === '100');
      expect(msg?.reactions).toEqual([{ emoji: '🔥', count: 1, reactedByMe: true }]);
    });
  });
});
