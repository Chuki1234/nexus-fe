import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { ConversationsApiService } from '../../../core/api/conversations-api.service';
import { ActiveChatStore, type ChatUiMessage } from '../services/active-chat.store';
import {
  DashboardUiState,
  type DashboardBlockingState,
  type DashboardConnectionState,
  type DashboardUiStateName,
} from '../services/dashboard-ui-state';
import { LightboxGalleryService } from '../../../shared/ui/lightbox-gallery/lightbox-gallery.service';
import {
  ConversationPage,
  formatCompactTime,
  formatMessageTimestamp,
  formatDateDividerLabel,
  formatFullTimestamp,
  getLocalDateKey,
  isMessageAfterLastRead,
  isSameCalendarDay,
  parseTimestamp,
} from './conversation';

describe('ConversationPage', () => {
  let mockActiveChatStore: any;
  let mockConversationsApi: any;
  let mockAuthService: any;
  let messagesSignal: any;
  let loadingInitialSignal: any;
  let loadingMoreSignal: any;
  let hasMoreSignal: any;
  let errorSignal: any;
  let typingUserIdsSignal: any;

  beforeEach(() => {
    messagesSignal = signal<ChatUiMessage[]>([
      {
        id: 'msg-1',
        channelId: null,
        conversationId: 'conv-123',
        authorId: 'other-user',
        author: {
          id: 'other-user',
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
        },
        type: 'default',
        content: 'Xin chào từ Alice!',
        replyToId: null,
        clientNonce: 'nonce-1',
        editedAt: null,
        deletedAt: null,
        isForwarded: false,
        externalMedia: null,
        createdAt: new Date().toISOString(),
        status: 'persisted',
      },
    ]);

    loadingInitialSignal = signal(false);
    loadingMoreSignal = signal(false);
    hasMoreSignal = signal(false);
    errorSignal = signal<string | null>(null);
    const chatErrorSignal = signal<any>(null);
    const paginationErrorSignal = signal<string | null>(null);
    typingUserIdsSignal = signal<string[]>([]);

    mockActiveChatStore = {
      allMessages: messagesSignal.asReadonly(),
      loadingInitial: loadingInitialSignal.asReadonly(),
      loadingMore: loadingMoreSignal.asReadonly(),
      hasMore: hasMoreSignal.asReadonly(),
      error: errorSignal.asReadonly(),
      chatError: chatErrorSignal.asReadonly(),
      paginationError: paginationErrorSignal.asReadonly(),
      typingUserIds: typingUserIdsSignal.asReadonly(),
      setActiveConversation: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
      loadOlderMessages: vi.fn().mockResolvedValue(undefined),
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      retryMessage: vi.fn().mockResolvedValue(undefined),
      removeFailedMessage: vi.fn(),
      editMessage: vi.fn().mockResolvedValue(undefined),
      deleteMessage: vi.fn().mockResolvedValue(undefined),
      markAsRead: vi.fn().mockResolvedValue(undefined),
      refreshAttachmentUrl: vi.fn().mockResolvedValue('https://storage.supabase.co/signed/fresh.png'),
      setTyping: vi.fn(),
    };

    mockConversationsApi = {
      getConversation: vi.fn().mockResolvedValue({
        id: 'conv-123',
        type: 'dm',
        recipient: {
          id: 'other-user',
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          statusMessage: 'Đang online',
          presence: 'online',
        },
        unreadCount: 0,
        createdAt: new Date().toISOString(),
      }),
    };

    mockAuthService = {
      user: signal({ id: 'my-user-id', email: 'me@example.com' }).asReadonly(),
    };
  });

  const mount = async (id: string, uiState: DashboardUiStateName = 'ready') => {
    const blockingState = signal<DashboardBlockingState | null>(
      uiState === 'loading' ||
        uiState === 'error' ||
        uiState === 'forbidden' ||
        uiState === 'missing'
        ? uiState
        : null,
    ).asReadonly();
    const connectionState = signal<DashboardConnectionState | null>(
      uiState === 'offline' || uiState === 'reconnecting' ? uiState : null,
    ).asReadonly();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'channels/@me/:conversationId', component: ConversationPage }]),
        { provide: ActiveChatStore, useValue: mockActiveChatStore },
        { provide: ConversationsApiService, useValue: mockConversationsApi },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: DashboardUiState,
          useValue: { blockingState, connectionState, clearPreview: async () => true },
        },
      ],
    });
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(`/channels/@me/${id}`, ConversationPage);
    (harness as any).component = component;
    return harness as RouterTestingHarness & { component: ConversationPage };
  };

  it('gọi setActiveConversation với id từ URL khi vào route', async () => {
    const harness = await mount('conv-123');

    expect(mockActiveChatStore.setActiveConversation).toHaveBeenCalledWith('conv-123');
    expect(mockConversationsApi.getConversation).toHaveBeenCalledWith('conv-123');

    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(harness.routeNativeElement!.textContent).toContain('Alice');
    expect(harness.routeNativeElement!.textContent).toContain('Xin chào từ Alice!');
  });

  it('hiển thị tin nhắn gửi thất bại kèm nút Thử lại và Hủy', async () => {
    messagesSignal.set([
      {
        id: 'opt-fail-1',
        channelId: null,
        conversationId: 'conv-123',
        authorId: 'my-user-id',
        author: { id: 'my-user-id', username: 'me', displayName: 'Me', avatarUrl: null },
        type: 'default',
        content: 'Tin nhắn này bị lỗi mạng',
        replyToId: null,
        clientNonce: 'fail-nonce-123',
        editedAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        status: 'failed',
      },
    ]);

    const harness = await mount('conv-123');
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(harness.routeNativeElement!.textContent).toContain('Tin nhắn này bị lỗi mạng');
    expect(harness.routeNativeElement!.textContent).toContain('Gửi thất bại.');

    const retryBtn = harness.routeNativeElement!.querySelector('button:contains("Thử lại"), button') as HTMLButtonElement;
    expect(harness.routeNativeElement!.textContent).toContain('Thử lại');
    expect(harness.routeNativeElement!.textContent).toContain('Hủy');
  });

  it('hiển thị typing indicator khi có người đang soạn tin', async () => {
    typingUserIdsSignal.set(['other-user']);

    const harness = await mount('conv-123');
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(harness.routeNativeElement!.textContent).toContain('đang soạn tin...');
  });

  it('hiển thị thẻ tệp tạm thời không khả dụng và cho phép tải lại khi signedUrl null', async () => {
    messagesSignal.set([
      {
        id: 'msg-att-unavail',
        channelId: null,
        conversationId: 'conv-123',
        authorId: 'other-user',
        author: { id: 'other-user', username: 'alice', displayName: 'Alice', avatarUrl: null },
        type: 'default',
        content: null,
        replyToId: null,
        clientNonce: null,
        editedAt: null,
        deletedAt: null,
        attachments: [
          {
            id: 'att-null',
            filename: 'broken.png',
            mimeType: 'image/png',
            sizeBytes: 2048,
            width: null,
            height: null,
            signedUrl: null,
            isAvailable: false,
          },
        ],
        createdAt: new Date().toISOString(),
        status: 'persisted',
      },
    ]);

    const harness = await mount('conv-123');
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(harness.routeNativeElement!.textContent).toContain('broken.png');
    expect(harness.routeNativeElement!.textContent).toContain('Tệp tạm thời không khả dụng');

    const refreshBtn = harness.routeNativeElement!.querySelector(
      'button[title="Tải lại liên kết tệp"]',
    ) as HTMLButtonElement;
    expect(refreshBtn).toBeTruthy();

    refreshBtn.click();
    expect(mockActiveChatStore.refreshAttachmentUrl).toHaveBeenCalledWith(
      'msg-att-unavail',
      'att-null',
    );
  });

  it('dọn dẹp store khi component bị destroy', async () => {
    const harness = await mount('conv-123');
    harness.fixture.destroy();

    expect(mockActiveChatStore.clear).toHaveBeenCalled();
  });

  describe('Chống Reactive Loop & Activation Deduplication', () => {
    it('khi store thay đổi loadingInitial: setActiveConversation và getConversation chỉ được gọi đúng 1 lần', async () => {
      const harness = await mount('conv-123');

      expect(mockActiveChatStore.setActiveConversation).toHaveBeenCalledTimes(1);
      expect(mockConversationsApi.getConversation).toHaveBeenCalledTimes(1);

      // Store đổi loadingInitial = true rồi lại false
      loadingInitialSignal.set(true);
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();

      loadingInitialSignal.set(false);
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();

      // Không được kích hoạt thêm lần nào
      expect(mockActiveChatStore.setActiveConversation).toHaveBeenCalledTimes(1);
      expect(mockConversationsApi.getConversation).toHaveBeenCalledTimes(1);
    });

    it('khi currentUser phát lại cùng ID: không gọi lại activation', async () => {
      const harness = await mount('conv-123');

      expect(mockActiveChatStore.setActiveConversation).toHaveBeenCalledTimes(1);
      expect(mockConversationsApi.getConversation).toHaveBeenCalledTimes(1);

      // Auth signal phát lại object mới cùng ID
      mockAuthService.user = signal({ id: 'my-user-id', email: 'me@example.com' }).asReadonly();
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();

      expect(mockActiveChatStore.setActiveConversation).toHaveBeenCalledTimes(1);
      expect(mockConversationsApi.getConversation).toHaveBeenCalledTimes(1);
    });

    it('khi chuyển route từ A sang B: mỗi route chỉ activate đúng 1 lần', async () => {
      const harness = await mount('conv-A');

      expect(mockActiveChatStore.setActiveConversation).toHaveBeenCalledTimes(1);
      expect(mockActiveChatStore.setActiveConversation).toHaveBeenCalledWith('conv-A');

      // Chuyển sang route conv-B
      await harness.navigateByUrl('/channels/@me/conv-B');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      expect(mockActiveChatStore.setActiveConversation).toHaveBeenCalledTimes(2);
      expect(mockActiveChatStore.setActiveConversation).toHaveBeenLastCalledWith('conv-B');
      expect(mockConversationsApi.getConversation).toHaveBeenCalledTimes(2);
      expect(mockConversationsApi.getConversation).toHaveBeenLastCalledWith('conv-B');
    });
  });

  describe('Checkpoint 4: Zero Shell-Data, State Segregation & Error Handling', () => {
    it('1. Live DM không bao giờ render data-demo-message', async () => {
      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      const demoMsg = harness.routeNativeElement!.querySelector('[data-demo-message]');
      expect(demoMsg).toBeNull();
    });

    it('2. Conversation mới (0 tin nhắn) hiển thị đúng chat-intro sạch sẽ, không có tin nhắn giả', async () => {
      messagesSignal.set([]);
      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      expect(harness.routeNativeElement!.textContent).toContain('Kết nối trực tiếp');
      expect(harness.routeNativeElement!.textContent).toContain('Đây là phần mở đầu lịch sử tin nhắn trực tiếp');
      const messagesList = harness.routeNativeElement!.querySelector('.message-list');
      expect(messagesList).toBeNull();
      const demoMsg = harness.routeNativeElement!.querySelector('[data-demo-message]');
      expect(demoMsg).toBeNull();
    });

    it('3. Lỗi 404 Not Found hiển thị đúng UI state với nút quay lại', async () => {
      mockConversationsApi.getConversation.mockRejectedValueOnce({ status: 404 });
      const harness = await mount('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      expect(harness.routeNativeElement!.textContent).toContain('Không tìm thấy cuộc trò chuyện này');
      expect(harness.routeNativeElement!.textContent).toContain('Quay lại Bạn bè');
      const demoMsg = harness.routeNativeElement!.querySelector('[data-demo-message]');
      expect(demoMsg).toBeNull();
    });

    it('4. Lỗi 403 Forbidden hiển thị đúng UI state không có quyền truy cập', async () => {
      mockConversationsApi.getConversation.mockRejectedValueOnce({ status: 403 });
      const harness = await mount('11111111-1111-4111-a111-111111111111');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      expect(harness.routeNativeElement!.textContent).toContain('Không có quyền truy cập');
      expect(harness.routeNativeElement!.textContent).toContain('Quay lại Bạn bè');
    });

    it('5. Lỗi 401 Unauthorized hiển thị đúng UI state phiên đăng nhập hết hạn', async () => {
      mockConversationsApi.getConversation.mockRejectedValueOnce({ status: 401 });
      const harness = await mount('11111111-1111-4111-a111-111111111111');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      expect(harness.routeNativeElement!.textContent).toContain('Phiên đăng nhập hết hạn');
      expect(harness.routeNativeElement!.textContent).toContain('Đăng nhập lại');
    });

    it('6. Lỗi tải tin nhắn (storeError) hiển thị banner và cho phép retryMessages', async () => {
      errorSignal.set('Lỗi kết nối máy chủ tin nhắn.');
      mockActiveChatStore.retryInitialLoad = vi.fn().mockResolvedValue(undefined);

      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      expect(harness.routeNativeElement!.textContent).toContain('Lỗi kết nối máy chủ tin nhắn.');
      const retryBtn = harness.routeNativeElement!.querySelector('button:contains("Thử lại"), button') as HTMLButtonElement;
      expect(retryBtn).toBeTruthy();
    });

    it('7. Hiển thị đúng tin nhắn chuyển tiếp với isForwarded = true', async () => {
      messagesSignal.set([
        {
          id: 'msg-fwd-1',
          channelId: null,
          conversationId: 'conv-123',
          authorId: 'other-user',
          author: { id: 'other-user', username: 'alice', displayName: 'Alice', avatarUrl: null },
          type: 'default',
          content: 'Nội dung được chuyển tiếp',
          replyToId: null,
          clientNonce: 'fwd-nonce-1',
          editedAt: null,
          deletedAt: null,
          isForwarded: true,
          createdAt: new Date().toISOString(),
          status: 'persisted',
        },
      ]);

      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      expect(harness.routeNativeElement!.textContent).toContain('Đã chuyển tiếp');
      expect(harness.routeNativeElement!.textContent).toContain('Nội dung được chuyển tiếp');
    });
  });

  describe('Checkpoint 5: Doodle Background Viewport & Stacking Layer', () => {
    it('gắn data-chat-wallpaper="doodle" trên .chat-viewport cho live conversation', async () => {
      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      const viewport = harness.routeNativeElement!.querySelector('.chat-viewport[data-chat-wallpaper="doodle"]');
      expect(viewport).toBeTruthy();

      const history = viewport!.querySelector('.chat-history');
      expect(history).toBeTruthy();
    });

    it('doodle viewport xuất hiện cả khi conversation rỗng (0 tin nhắn)', async () => {
      messagesSignal.set([]);
      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      const viewport = harness.routeNativeElement!.querySelector('.chat-viewport[data-chat-wallpaper="doodle"]');
      expect(viewport).toBeTruthy();
      expect(harness.routeNativeElement!.querySelector('.chat-intro')).toBeTruthy();
    });
  });

  describe('Checkpoint 6: Redesign Message Stream (Discord + Nexus Hybrid)', () => {
    it('nhóm tin nhắn liên tiếp cùng tác giả trong vòng 5 phút (ẩn avatar, có hover timestamp và sr-only text)', async () => {
      const now = new Date('2026-08-23T10:00:00.000Z');
      const nowPlus2m = new Date('2026-08-23T10:02:00.000Z');

      messagesSignal.set([
        {
          id: 'msg-1',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: 'Tin nhắn thứ nhất',
          replyToId: null,
          clientNonce: 'n-1',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: now.toISOString(),
          status: 'persisted',
        },
        {
          id: 'msg-2',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: 'Tin nhắn thứ hai nối tiếp',
          replyToId: null,
          clientNonce: 'n-2',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: nowPlus2m.toISOString(),
          status: 'persisted',
        },
      ]);

      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      const rows = harness.routeNativeElement!.querySelectorAll('.message-row');
      expect(rows.length).toBe(2);

      // Row 1 là Head
      expect(rows[0].classList.contains('message-row--head')).toBe(true);
      expect(rows[0].classList.contains('message-row--grouped')).toBe(false);
      expect(rows[0].querySelector('app-avatar')).toBeTruthy();
      expect(rows[0].querySelector('.message-header')).toBeTruthy();

      // Row 2 là Grouped (Nối tiếp)
      expect(rows[1].classList.contains('message-row--grouped')).toBe(true);
      expect(rows[1].querySelector('app-avatar')).toBeFalsy();
      expect(rows[1].querySelector('.message-hover-time')).toBeTruthy();
      expect(rows[1].querySelector('.message-header')).toBeFalsy();
      expect(rows[1].querySelector('.sr-only')?.textContent).toContain('Alice lúc');
    });

    it('không nhóm khi khác tác giả hoặc cách nhau > 5 phút', async () => {
      const now = new Date('2026-08-23T10:00:00.000Z');
      const nowPlus6m = new Date('2026-08-23T10:06:00.000Z');

      messagesSignal.set([
        {
          id: 'msg-1',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: 'Tin nhắn 1',
          replyToId: null,
          clientNonce: 'n-1',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: now.toISOString(),
          status: 'persisted',
        },
        {
          id: 'msg-2',
          conversationId: 'conv-123',
          authorId: 'user-bob',
          author: { id: 'user-bob', username: 'bob', displayName: 'Bob' },
          type: 'default',
          content: 'Tin nhắn của người khác',
          replyToId: null,
          clientNonce: 'n-2',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: now.toISOString(),
          status: 'persisted',
        },
        {
          id: 'msg-3',
          conversationId: 'conv-123',
          authorId: 'user-bob',
          author: { id: 'user-bob', username: 'bob', displayName: 'Bob' },
          type: 'default',
          content: 'Tin nhắn sau 6 phút',
          replyToId: null,
          clientNonce: 'n-3',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: nowPlus6m.toISOString(),
          status: 'persisted',
        },
      ]);

      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      const rows = harness.routeNativeElement!.querySelectorAll('.message-row');
      expect(rows.length).toBe(3);

      expect(rows[0].classList.contains('message-row--head')).toBe(true);
      expect(rows[1].classList.contains('message-row--head')).toBe(true);
      expect(rows[2].classList.contains('message-row--head')).toBe(true);
    });

    it('không nhóm tin nhắn reply hoặc forwarded hoặc deleted', async () => {
      const now = new Date('2026-08-23T10:00:00.000Z');
      const nowPlus1m = new Date('2026-08-23T10:01:00.000Z');

      messagesSignal.set([
        {
          id: 'msg-1',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: 'Gốc',
          replyToId: null,
          clientNonce: 'n-1',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: now.toISOString(),
          status: 'persisted',
        },
        {
          id: 'msg-2',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: 'Reply lại',
          replyToId: 'msg-1',
          clientNonce: 'n-2',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: nowPlus1m.toISOString(),
          status: 'persisted',
        },
      ]);

      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      const rows = harness.routeNativeElement!.querySelectorAll('.message-row');
      expect(rows.length).toBe(2);
      expect(rows[1].classList.contains('message-row--head')).toBe(true);
      expect(rows[1].querySelector('.message-reply')).toBeTruthy();
    });

    it('tính toán lại group ở ranh giới khi prepend pagination hoặc realtime append', async () => {
      const t1 = new Date('2026-08-23T10:00:00.000Z');
      const t2 = new Date('2026-08-23T10:02:00.000Z');

      // Ban đầu chỉ có msg-2 (lúc này msg-2 là tin đầu tiên nên là head)
      messagesSignal.set([
        {
          id: 'msg-2',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: 'Msg 2',
          replyToId: null,
          clientNonce: 'n-2',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: t2.toISOString(),
          status: 'persisted',
        },
      ]);

      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      let rows = harness.routeNativeElement!.querySelectorAll('.message-row');
      expect(rows[0].classList.contains('message-row--head')).toBe(true);

      // Prepend msg-1 vào trước
      messagesSignal.set([
        {
          id: 'msg-1',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: 'Msg 1',
          replyToId: null,
          clientNonce: 'n-1',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: t1.toISOString(),
          status: 'persisted',
        },
        {
          id: 'msg-2',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: 'Msg 2',
          replyToId: null,
          clientNonce: 'n-2',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: t2.toISOString(),
          status: 'persisted',
        },
      ]);

      harness.fixture.detectChanges();
      rows = harness.routeNativeElement!.querySelectorAll('.message-row');
      expect(rows.length).toBe(2);

      // msg-1 trở thành head, msg-2 tự động chuyển thành grouped!
      expect(rows[0].classList.contains('message-row--head')).toBe(true);
      expect(rows[1].classList.contains('message-row--grouped')).toBe(true);
    });

    it('tin nhắn non-default hoặc system type phá grouping ngay lập tức', async () => {
      const now = new Date('2026-08-23T10:00:00.000Z');
      const nowPlus1m = new Date('2026-08-23T10:01:00.000Z');

      messagesSignal.set([
        {
          id: 'msg-1',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: 'Tin nhắn 1',
          replyToId: null,
          clientNonce: 'n-1',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: now.toISOString(),
          status: 'persisted',
        },
        {
          id: 'msg-2',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'system' as any,
          content: 'Cuộc gọi nhỡ',
          replyToId: null,
          clientNonce: 'n-2',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: nowPlus1m.toISOString(),
          status: 'persisted',
        },
      ]);

      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      const rows = harness.routeNativeElement!.querySelectorAll('.message-row');
      expect(rows.length).toBe(2);
      expect(rows[0].classList.contains('message-row--head')).toBe(true);
      expect(rows[1].classList.contains('message-row--head')).toBe(true);
    });

    it('render ảnh trực tiếp qua .message-media-img và mở lightbox toàn màn hình', async () => {
      const now = new Date('2026-08-23T10:00:00.000Z');
      messagesSignal.set([
        {
          id: 'msg-img',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: '',
          replyToId: null,
          clientNonce: 'n-img',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: now.toISOString(),
          status: 'persisted',
          attachments: [
            {
              id: 'att-1',
              filename: 'photo.png',
              mimeType: 'image/png',
              sizeBytes: 102400,
              signedUrl: 'https://example.com/photo.png',
              isAvailable: true,
            },
          ],
        },
      ]);

      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      const img = harness.routeNativeElement!.querySelector<HTMLImageElement>('.message-media-img');
      expect(img).toBeTruthy();
      expect(img?.src).toContain('https://example.com/photo.png');

      const lightboxService = TestBed.inject(LightboxGalleryService);

      // Click ảnh để mở fullscreen lightbox
      img?.click();
      harness.fixture.detectChanges();

      expect(lightboxService.isOpen()).toBe(true);

      // Nhấn Escape để đóng lightbox
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      harness.fixture.detectChanges();

      expect(lightboxService.isOpen()).toBe(false);
    });

    it('render file đính kèm dạng compact tile qua .message-file-tile', async () => {
      const now = new Date('2026-08-23T10:00:00.000Z');
      messagesSignal.set([
        {
          id: 'msg-file',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: 'Đây là tài liệu',
          replyToId: null,
          clientNonce: 'n-file',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: now.toISOString(),
          status: 'persisted',
          attachments: [
            {
              id: 'att-2',
              filename: 'report.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 204800,
              signedUrl: 'https://example.com/report.pdf',
              isAvailable: true,
            },
          ],
        },
      ]);

      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      const fileTile = harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.message-file-tile');
      expect(fileTile).toBeTruthy();
      expect(fileTile?.querySelector('.message-file-tile__icon-box')).toBeTruthy();
      expect(fileTile?.querySelector('.message-file-tile__meta')).toBeTruthy();
      expect(fileTile?.querySelector('.message-file-tile__name')?.textContent).toContain('report.pdf');
      expect(fileTile?.querySelector('.message-file-tile__size')?.textContent).toContain('200.0 KB');
      expect(fileTile?.querySelector('.message-file-tile__download-icon')).toBeTruthy();
    });

    it('gán đúng variant presentation và dựng .message-text-surface cho text-only, media-only và file-only', async () => {
      const now = new Date('2026-08-23T10:00:00.000Z');
      messagesSignal.set([
        {
          id: 'msg-text',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: 'hi',
          replyToId: null,
          clientNonce: 'n-1',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: now.toISOString(),
          status: 'persisted',
        },
        {
          id: 'msg-media-only',
          conversationId: 'conv-123',
          authorId: 'user-alice',
          author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
          type: 'default',
          content: '',
          replyToId: null,
          clientNonce: 'n-2',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: now.toISOString(),
          status: 'persisted',
          attachments: [
            {
              id: 'att-img',
              filename: 'meme.gif',
              mimeType: 'image/gif',
              sizeBytes: 102400,
              signedUrl: 'https://example.com/meme.gif',
              isAvailable: true,
            },
          ],
        },
        {
          id: 'msg-file-only',
          conversationId: 'conv-123',
          authorId: 'user-bob',
          author: { id: 'user-bob', username: 'bob', displayName: 'Bob' },
          type: 'default',
          content: '',
          replyToId: null,
          clientNonce: 'n-3',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: now.toISOString(),
          status: 'persisted',
          attachments: [
            {
              id: 'att-doc',
              filename: 'chiSoSI.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 52736,
              signedUrl: 'https://example.com/chiSoSI.pdf',
              isAvailable: true,
            },
          ],
        },
      ]);

      const harness = await mount('conv-123');
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();

      const rows = harness.routeNativeElement!.querySelectorAll('.message-row');
      expect(rows.length).toBe(3);

      // Row 1: text-only có .message-text-surface bao gồm tin ngắn "hi"
      expect(rows[0].classList.contains('message-row--text-only')).toBe(true);
      const textSurface = rows[0].querySelector('.message-text-surface');
      expect(textSurface).toBeTruthy();
      expect(textSurface?.textContent).toContain('hi');

      // Row 2: media-only không có .message-text-surface, render ảnh trực tiếp
      expect(rows[1].classList.contains('message-row--media-only')).toBe(true);
      expect(rows[1].querySelector('.message-text-surface')).toBeFalsy();
      expect(rows[1].querySelector('.message-media-img')).toBeTruthy();

      // Row 3: file-only có tile tệp dạng grid 3 cột với cấu trúc chuẩn
      expect(rows[2].classList.contains('message-row--file-only')).toBe(true);
      const fileTile = rows[2].querySelector('.message-file-tile');
      expect(fileTile).toBeTruthy();
      expect(fileTile?.querySelector('.message-file-tile__name')?.textContent).toContain('chiSoSI.pdf');
      expect(fileTile?.querySelector('.message-file-tile__size')?.textContent).toContain('51.5 KB');
      expect(fileTile?.querySelector('.message-file-tile__download-icon')).toBeTruthy();
    });
  });

  describe('Checkpoint 7 — Date Divider & Time Presentation', () => {
    describe('Pure Date & Time Helper Functions', () => {
      it('parseTimestamp: parse đúng ISO hợp lệ và trả về null cho chuỗi rác/null/undefined', () => {
        expect(parseTimestamp('2026-08-23T10:00:00.000Z')).toBeInstanceOf(Date);
        expect(parseTimestamp(null)).toBeNull();
        expect(parseTimestamp(undefined)).toBeNull();
        expect(parseTimestamp('')).toBeNull();
        expect(parseTimestamp('invalid-date-string')).toBeNull();
      });

      it('getLocalDateKey: trích xuất calendar date YYYY-MM-DD theo local timezone', () => {
        const d = new Date(2026, 7, 23, 14, 30); // 23 tháng 8, 2026 (tháng 7 là August do 0-indexed)
        expect(getLocalDateKey(d)).toBe('2026-08-23');

        const d2 = new Date(2025, 0, 5, 2, 0); // 5 tháng 1, 2025
        expect(getLocalDateKey(d2)).toBe('2025-01-05');
      });

      it('isSameCalendarDay: so sánh chính xác 2 ngày theo local timezone', () => {
        const d1 = new Date(2026, 7, 23, 8, 0);
        const d2 = new Date(2026, 7, 23, 23, 59);
        const d3 = new Date(2026, 7, 24, 0, 1);

        expect(isSameCalendarDay(d1, d2)).toBe(true);
        expect(isSameCalendarDay(d1, d3)).toBe(false);
        expect(isSameCalendarDay(d1, null)).toBe(false);
      });

      it('formatDateDividerLabel: T1 (Hôm nay), T2 (Hôm qua), T3/T4 (Ngày cũ/khác năm)', () => {
        const mockNow = new Date(2026, 7, 23, 12, 0); // Giả lập hôm nay là 23/08/2026

        // Hôm nay
        const todayDate = new Date(2026, 7, 23, 8, 15);
        expect(formatDateDividerLabel(todayDate, mockNow)).toBe('Hôm nay');

        // Hôm qua
        const yesterdayDate = new Date(2026, 7, 22, 22, 30);
        expect(formatDateDividerLabel(yesterdayDate, mockNow)).toBe('Hôm qua');

        // Ngày cũ hơn cùng năm 2026
        const olderDate = new Date(2026, 7, 15, 10, 0);
        expect(formatDateDividerLabel(olderDate, mockNow)).toBe('15 tháng 8, 2026');

        // Khác năm (2025)
        const lastYearDate = new Date(2025, 11, 25, 18, 0);
        expect(formatDateDividerLabel(lastYearDate, mockNow)).toBe('25 tháng 12, 2025');

        // Invalid timestamp
        expect(formatDateDividerLabel('invalid-date', mockNow)).toBe('');
      });

      it('T5: Local Timezone Boundary — Phân biệt chính xác giữa local day và UTC day', () => {
        // Tạo Date theo local time: 23:30 tối và 00:30 sáng hôm sau
        const lateNight = new Date(2026, 7, 23, 23, 30, 0);
        const earlyMorning = new Date(2026, 7, 24, 0, 30, 0);

        // Khác calendar day theo local time dù chỉ cách nhau 1 giờ
        expect(isSameCalendarDay(lateNight, earlyMorning)).toBe(false);
        expect(getLocalDateKey(lateNight)).toBe('2026-08-23');
        expect(getLocalDateKey(earlyMorning)).toBe('2026-08-24');
      });

      it('formatCompactTime & formatFullTimestamp & formatMessageTimestamp: Định dạng giờ và fallback an toàn (T10)', () => {
        const d = new Date(2026, 7, 23, 9, 5, 30);
        expect(formatCompactTime(d)).toBe('09:05');
        expect(formatFullTimestamp(d)).toContain('09:05:30');

        // formatMessageTimestamp: trong ngày hôm nay vs ngày trước đó
        const nowSameDay = new Date(2026, 7, 23, 15, 0, 0);
        expect(formatMessageTimestamp(d, nowSameDay)).toBe('09:05');

        const nowNextDay = new Date(2026, 7, 24, 10, 0, 0); // 24/08/2026 (T2)
        // 23/08/2026 là Chủ Nhật (CN)
        expect(formatMessageTimestamp(d, nowNextDay)).toBe('CN, 23/08/2026 09:05');

        // Fallback khi timestamp invalid
        expect(formatCompactTime(null)).toBe('--:--');
        expect(formatCompactTime('garbage')).toBe('--:--');
        expect(formatMessageTimestamp(null)).toBe('--:--');
        expect(formatMessageTimestamp('garbage')).toBe('--:--');
        expect(formatFullTimestamp(null)).toBe('Thời gian không xác định');
        expect(formatFullTimestamp('garbage')).toBe('Thời gian không xác định');
      });
    });

    describe('Template Rendering & Stream Item Integration', () => {
      it('T1-T4 & T12: Render đúng Date Dividers với nhãn semantic và role separator', async () => {
        const today = new Date();
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 15, 0);
        const older = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 10, 0);

        messagesSignal.set([
          {
            id: 'msg-older',
            conversationId: 'conv-123',
            authorId: 'user-alice',
            author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn cũ 5 ngày trước',
            replyToId: null,
            clientNonce: 'n-older',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: older.toISOString(),
            status: 'persisted',
          },
          {
            id: 'msg-yesterday',
            conversationId: 'conv-123',
            authorId: 'user-bob',
            author: { id: 'user-bob', username: 'bob', displayName: 'Bob' },
            type: 'default',
            content: 'Tin nhắn hôm qua',
            replyToId: null,
            clientNonce: 'n-yesterday',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: yesterday.toISOString(),
            status: 'persisted',
          },
          {
            id: 'msg-today',
            conversationId: 'conv-123',
            authorId: 'user-alice',
            author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn hôm nay',
            replyToId: null,
            clientNonce: 'n-today',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: today.toISOString(),
            status: 'persisted',
          },
        ]);

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const dividers = harness.routeNativeElement!.querySelectorAll<HTMLLIElement>('.chat-date-divider');
        expect(dividers.length).toBe(3);

        // Divider 1: Ngày cũ
        expect(dividers[0].getAttribute('role')).toBe('separator');
        expect(dividers[0].querySelector('.chat-date-divider__badge')?.textContent).toContain(
          formatDateDividerLabel(older),
        );

        // Divider 2: Hôm qua
        expect(dividers[1].querySelector('.chat-date-divider__badge')?.textContent).toBe('Hôm qua');

        // Divider 3: Hôm nay
        expect(dividers[2].querySelector('.chat-date-divider__badge')?.textContent).toBe('Hôm nay');

        // Accessible time attributes trên time elements
        const timeEl = harness.routeNativeElement!.querySelector<HTMLTimeElement>('.message-time');
        expect(timeEl).toBeTruthy();
        expect(timeEl?.getAttribute('datetime')).toBe(older.toISOString());
        expect(timeEl?.getAttribute('aria-label')).toContain('Gửi lúc');
      });

      it('T6: Date boundary bắt buộc phá message grouping (cùng tác giả qua nửa đêm)', async () => {
        // 2 tin nhắn cùng author 'user-alice', gửi cách nhau 2 phút nhưng bước qua ngày mới
        const day1Late = new Date(2026, 7, 20, 23, 59, 0);
        const day2Early = new Date(2026, 7, 21, 0, 1, 0);

        messagesSignal.set([
          {
            id: 'msg-day1',
            conversationId: 'conv-123',
            authorId: 'user-alice',
            author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn cuối ngày 20',
            replyToId: null,
            clientNonce: 'n-1',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: day1Late.toISOString(),
            status: 'persisted',
          },
          {
            id: 'msg-day2',
            conversationId: 'conv-123',
            authorId: 'user-alice',
            author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn đầu ngày 21',
            replyToId: null,
            clientNonce: 'n-2',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: day2Early.toISOString(),
            status: 'persisted',
          },
        ]);

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const dividers = harness.routeNativeElement!.querySelectorAll('.chat-date-divider');
        expect(dividers.length).toBe(2);

        const rows = harness.routeNativeElement!.querySelectorAll('.message-row');
        expect(rows.length).toBe(2);

        // Tin nhắn thứ 2 BẮT BUỘC là Head message (có class message-row--head, không bị grouped)
        expect(rows[0].classList.contains('message-row--head')).toBe(true);
        expect(rows[1].classList.contains('message-row--head')).toBe(true);
        expect(rows[1].classList.contains('message-row--grouped')).toBe(false);

        // Tin nhắn thứ 2 hiển thị avatar và tên tác giả đầy đủ
        expect(rows[1].querySelector('app-avatar')).toBeTruthy();
        expect(rows[1].querySelector('.message-author-name')?.textContent).toContain('Alice');
      });

      it('T7 & T8: Pagination Prepend và Realtime Append giữ vững cấu trúc divider', async () => {
        const today = new Date();
        const todayEarlier = new Date(today.getTime() - 10 * 60 * 1000); // 10 phút trước

        messagesSignal.set([
          {
            id: 'msg-1',
            conversationId: 'conv-123',
            authorId: 'user-alice',
            author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin 1 hôm nay',
            replyToId: null,
            clientNonce: 'n-1',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: todayEarlier.toISOString(),
            status: 'persisted',
          },
        ]);

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        // Ban đầu có 1 divider "Hôm nay"
        let dividers = harness.routeNativeElement!.querySelectorAll('.chat-date-divider');
        expect(dividers.length).toBe(1);
        expect(dividers[0].textContent).toContain('Hôm nay');

        // T8: Realtime append tin nhắn cùng ngày -> KHÔNG sinh divider mới
        const currentMsgs = messagesSignal();
        messagesSignal.set([
          ...currentMsgs,
          {
            id: 'msg-2',
            conversationId: 'conv-123',
            authorId: 'user-bob',
            author: { id: 'user-bob', username: 'bob', displayName: 'Bob' },
            type: 'default',
            content: 'Tin 2 cùng ngày',
            replyToId: null,
            clientNonce: 'n-2',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: today.toISOString(),
            status: 'persisted',
          },
        ]);
        harness.fixture.detectChanges();

        dividers = harness.routeNativeElement!.querySelectorAll('.chat-date-divider');
        expect(dividers.length).toBe(1); // Vẫn duy nhất 1 divider

        // T7: Pagination prepend tin nhắn của ngày hôm qua lên đầu mảng
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 10, 0);
        messagesSignal.set([
          {
            id: 'msg-yesterday',
            conversationId: 'conv-123',
            authorId: 'user-alice',
            author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn cũ được load thêm',
            replyToId: null,
            clientNonce: 'n-old',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: yesterday.toISOString(),
            status: 'persisted',
          },
          ...messagesSignal(),
        ]);
        harness.fixture.detectChanges();

        dividers = harness.routeNativeElement!.querySelectorAll('.chat-date-divider');
        expect(dividers.length).toBe(2); // Thêm divider "Hôm qua" ở đầu
        expect(dividers[0].textContent).toContain('Hôm qua');
        expect(dividers[1].textContent).toContain('Hôm nay');
      });

      it('T9: Optimistic Reconcile sử dụng stable key dựa trên clientNonce', async () => {
        const harness = await mount('conv-123');
        const component = harness.component;
        const now = new Date();

        // 1. Tin nhắn optimistic gửi đi
        messagesSignal.set([
          {
            id: 'temp-opt-1',
            conversationId: 'conv-123',
            authorId: 'user-alice',
            author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn đang gửi...',
            replyToId: null,
            clientNonce: 'nonce-stable-99',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'sending',
          },
        ]);

        let items = component.streamItems();
        expect(items.length).toBe(2); // 1 divider + 1 message
        expect(items[0].kind).toBe('date-divider');
        expect(items[1].kind).toBe('message');
        expect(items[1].key).toBe('msg-nonce-stable-99');

        // 2. Server xác nhận (persisted) và cập nhật ID chính thức
        messagesSignal.set([
          {
            id: 'server-real-id-888',
            conversationId: 'conv-123',
            authorId: 'user-alice',
            author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn đang gửi...',
            replyToId: null,
            clientNonce: 'nonce-stable-99',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'persisted',
          },
        ]);

        items = component.streamItems();
        expect(items.length).toBe(2);
        // Key vẫn giữ nguyên là 'msg-nonce-stable-99' để tránh Angular destroy và recreate DOM
        expect(items[1].key).toBe('msg-nonce-stable-99');
      });

      it('T10: Fallback an toàn khi timestamp bị rỗng hoặc không hợp lệ', async () => {
        messagesSignal.set([
          {
            id: 'msg-corrupt',
            conversationId: 'conv-123',
            authorId: 'user-alice',
            author: { id: 'user-alice', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn có timestamp rác',
            replyToId: null,
            clientNonce: 'n-corrupt',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: 'invalid-iso-string',
            status: 'persisted',
          },
        ]);

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const row = harness.routeNativeElement!.querySelector('.message-row');
        expect(row).toBeTruthy();
        expect(row?.textContent).not.toContain('Invalid Date');

        const timeEl = row?.querySelector('.message-time');
        expect(timeEl?.textContent?.trim()).toBe('--:--');
      });

      it('T11: Chuyển conversation reset sạch sẽ toàn bộ stream items và dividers', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        expect(harness.routeNativeElement!.querySelectorAll('.chat-date-divider').length).toBeGreaterThan(0);

        // Xóa tin nhắn khi chuyển sang phòng chat mới
        messagesSignal.set([]);
        harness.fixture.detectChanges();

        expect(harness.routeNativeElement!.querySelectorAll('.chat-date-divider').length).toBe(0);
        expect(harness.routeNativeElement!.querySelectorAll('.message-row').length).toBe(0);
      });
    });

    describe('Checkpoint 8 — Composer, Smart Scroll, Unread Divider & Responsive UX', () => {
      it('C1: isMessageAfterLastRead so sánh an toàn BigInt string và bỏ qua optimistic ID', () => {
        // Chuỗi BigInt Snowflake
        expect(isMessageAfterLastRead('17873724403710002', '17873724403710001')).toBe(true);
        expect(isMessageAfterLastRead('17873724403710001', '17873724403710002')).toBe(false);
        expect(isMessageAfterLastRead('17873724403710001', '17873724403710001')).toBe(false);

        // Chuỗi độ dài khác nhau (vượt qua giới hạn 2^53 - 1 của Number)
        expect(isMessageAfterLastRead('100000000000000000', '99999999999999999')).toBe(true);

        // Bỏ qua optimistic IDs hoặc non-numeric IDs
        expect(isMessageAfterLastRead('opt-123', '17873724403710001')).toBe(false);
        expect(isMessageAfterLastRead('17873724403710002', 'opt-123')).toBe(false);
        expect(isMessageAfterLastRead(null, '17873724403710001')).toBe(false);
        expect(isMessageAfterLastRead('17873724403710001', null)).toBe(false);
      });

      it('C2: Unread Divider được chèn chính xác ngay trước tin nhắn chưa đọc đầu tiên', async () => {
        mockConversationsApi.getConversation.mockResolvedValueOnce({
          id: 'conv-123',
          type: 'dm',
          recipient: { id: 'other-user', username: 'alice', displayName: 'Alice' },
          lastReadMessageId: '100',
        });

        const now = new Date();
        messagesSignal.set([
          {
            id: '90',
            conversationId: 'conv-123',
            authorId: 'other-user',
            author: { id: 'other-user', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn đã đọc 1',
            replyToId: null,
            clientNonce: 'n-90',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'persisted',
          },
          {
            id: '100',
            conversationId: 'conv-123',
            authorId: 'other-user',
            author: { id: 'other-user', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn đã đọc 2 (lastRead)',
            replyToId: null,
            clientNonce: 'n-100',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'persisted',
          },
          {
            id: '110',
            conversationId: 'conv-123',
            authorId: 'other-user',
            author: { id: 'other-user', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn chưa đọc đầu tiên',
            replyToId: null,
            clientNonce: 'n-110',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'persisted',
          },
        ]);

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;

        const items = component.streamItems();
        const unreadItem = items.find((i: any) => i.kind === 'unread-divider') as any;
        expect(unreadItem).toBeTruthy();
        expect(unreadItem?.label).toBe('Tin nhắn mới');
        expect(unreadItem?.key).toBe('unread-divider-110');

        const unreadEl = harness.routeNativeElement!.querySelector('.nexus-unread-divider');
        expect(unreadEl).toBeTruthy();
        expect(unreadEl?.textContent).toContain('Tin nhắn mới');
      });

      it('C3: Tin nhắn optimistic của chính user không bao giờ trở thành first unread', async () => {
        mockConversationsApi.getConversation.mockResolvedValueOnce({
          id: 'conv-123',
          type: 'dm',
          recipient: { id: 'other-user', username: 'alice', displayName: 'Alice' },
          lastReadMessageId: '100',
        });

        const now = new Date();
        // User hiện tại là 'current-user-123'
        messagesSignal.set([
          {
            id: '90',
            conversationId: 'conv-123',
            authorId: 'other-user',
            author: { id: 'other-user', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin cũ',
            replyToId: null,
            clientNonce: 'n-90',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'persisted',
          },
          {
            id: 'opt-mine-105',
            conversationId: 'conv-123',
            authorId: 'current-user-123',
            author: { id: 'current-user-123', username: 'me', displayName: 'Me' },
            type: 'default',
            content: 'Tin nhắn của chính tôi vừa gửi',
            replyToId: null,
            clientNonce: 'n-mine-105',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'sending',
          },
        ]);

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;
        const items = component.streamItems();
        const unreadItem = items.find((i: any) => i.kind === 'unread-divider');
        expect(unreadItem).toBeUndefined();
      });

      it('C4: Khi đang scrolled-up, nhận tin nhắn mới từ người khác sẽ tăng newMessagesBelowCount và hiện Pill', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;
        // Giả lập user đang cuộn lên xem lịch sử
        const el = component.chatHistoryRef()?.nativeElement;
        if (el) {
          Object.defineProperty(el, 'scrollHeight', { value: 1000, configurable: true });
          Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
          el.scrollTop = 100; // distance = 500 > 120
        }
        component.scrollController.onScroll();
        harness.fixture.detectChanges();

        const now = new Date();
        // Nhận tin nhắn realtime mới từ Alice
        messagesSignal.set([
          ...messagesSignal(),
          {
            id: 'msg-realtime-2',
            conversationId: 'conv-123',
            authorId: 'other-user',
            author: { id: 'other-user', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn realtime mới đến',
            replyToId: null,
            clientNonce: 'nonce-2',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'persisted',
          },
        ]);
        harness.fixture.detectChanges();

        expect(component.newMessagesBelowCount()).toBe(1);
        expect(component.showNewMessagesPill()).toBe(true);

        const pill = harness.routeNativeElement!.querySelector('button[aria-label*="Đi tới"]');
        expect(pill).toBeTruthy();
        expect(pill?.getAttribute('aria-label')).toBe('Đi tới 1 tin nhắn mới nhất');
        expect(pill?.textContent).toContain('1');
      });

      it('C5: Bấm floating pill sẽ cuộn xuống đáy và reset counter về 0', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;
        component.scrollController.isNearBottom.set(false);
        component.scrollController.unreadCount.set(3);
        component.scrollController.showScrollDownButton.set(true);
        component.newMessagesBelowCount.set(3);
        component.showNewMessagesPill.set(true);
        harness.fixture.detectChanges();

        const pill = harness.routeNativeElement!.querySelector('button[aria-label*="Đi tới"]') as HTMLButtonElement;
        expect(pill).toBeTruthy();

        pill.click();
        harness.fixture.detectChanges();

        expect(component.newMessagesBelowCount()).toBe(0);
        expect(component.showNewMessagesPill()).toBe(false);
        expect(component.isNearBottom()).toBe(true);
      });

      it('C6: Jump-to-reply hiển thị toast fallback khi tin nhắn gốc chưa được tải trong DOM', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;
        component.scrollToMessage('missing-message-id-999');
        harness.fixture.detectChanges();

        expect(component.toastMessage()).toBe('Tin nhắn gốc chưa được tải trong lịch sử hiển thị.');
        const toast = harness.routeNativeElement!.querySelector('.conversation-toast-banner');
        expect(toast).toBeTruthy();
        expect(toast?.textContent).toContain('Tin nhắn gốc chưa được tải');
      });

      it('C7: REST / initial data load không tự động đánh dấu đã đọc tin nhắn', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        // Không có lời gọi markAsRead tức thì khi vừa nạp dữ liệu
        expect(mockActiveChatStore.markAsRead).not.toHaveBeenCalled();
      });

      it('C8: Cuộn near-bottom với tab visible kích hoạt markAsRead cho tin persisted mới nhất của người khác, bỏ qua optimistic ID', async () => {
        const now = new Date();
        messagesSignal.set([
          {
            id: '201',
            conversationId: 'conv-123',
            authorId: 'other-user',
            author: { id: 'other-user', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Tin nhắn từ Alice',
            replyToId: null,
            clientNonce: null,
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'persisted',
          },
          {
            id: 'temp-opt-mine-202',
            conversationId: 'conv-123',
            authorId: 'my-user-id',
            author: { id: 'my-user-id', username: 'me', displayName: 'Me' },
            type: 'default',
            content: 'Tin nhắn của chính mình đang gửi',
            replyToId: null,
            clientNonce: 'n-202',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'sending',
          },
        ]);

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;
        // Giả lập sự kiện scroll chạm đáy
        const mockScrollEvent = {
          target: {
            scrollHeight: 1000,
            scrollTop: 600,
            clientHeight: 400, // distanceToBottom = 0 (< 120)
          },
        } as unknown as Event;

        await component.onScroll(mockScrollEvent);

        // Chờ debounce 400ms
        await new Promise((res) => setTimeout(res, 450));

        // Phải gọi markAsRead với ID '201' (tin của Alice), không gọi với 'temp-opt-mine-202'
        expect(mockActiveChatStore.markAsRead).toHaveBeenCalledWith('201');
      });

      it('C9: Tính đơn điệu: Không bao giờ gọi lùi BigInt ID và bỏ qua khi ID cũ hơn hoặc bằng ID đã đọc', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;

        // Gọi với ID 500
        (component as any).scheduleMarkRead('500');
        await new Promise((res) => setTimeout(res, 450));
        expect(mockActiveChatStore.markAsRead).toHaveBeenCalledWith('500');

        mockActiveChatStore.markAsRead.mockClear();

        // Cố tình gọi với ID 400 (< 500)
        (component as any).scheduleMarkRead('400');
        await new Promise((res) => setTimeout(res, 450));
        // Không được gọi vì 400 < 500
        expect(mockActiveChatStore.markAsRead).not.toHaveBeenCalled();

        // Gọi với ID 600 (> 500)
        (component as any).scheduleMarkRead('600');
        await new Promise((res) => setTimeout(res, 450));
        expect(mockActiveChatStore.markAsRead).toHaveBeenCalledWith('600');
      });
    });

    describe('Checkpoint 9: File/Media Download & Safe Linkification', () => {
      it('D1: Linkify an toàn: render thẻ anchor cho URL http/https với target="_blank", rel="noopener noreferrer", break-all', async () => {
        const now = new Date();
        messagesSignal.set([
          {
            id: '901',
            channelId: null,
            conversationId: 'conv-123',
            authorId: 'alice-456',
            author: { id: 'alice-456', username: 'alice', displayName: 'Alice' },
            type: 'default',
            content: 'Truy cập https://nexuscord.app/docs và http://example.com để xem hướng dẫn!',
            replyToId: null,
            clientNonce: 'nonce-d1',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'persisted',
          },
        ]);

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const links = harness.fixture.nativeElement.querySelectorAll('.nexus-chat-link');
        expect(links.length).toBe(2);

        const link1 = links[0] as HTMLAnchorElement;
        expect(link1.getAttribute('target')).toBe('_blank');
        expect(link1.getAttribute('rel')).toBe('noopener noreferrer');
        expect(link1.classList.contains('break-all')).toBe(true);
        expect(link1.textContent).toBe('https://nexuscord.app/docs');

        const link2 = links[1] as HTMLAnchorElement;
        expect(link2.getAttribute('target')).toBe('_blank');
        expect(link2.getAttribute('rel')).toBe('noopener noreferrer');
        expect(link2.textContent).toBe('http://example.com');
      });

      it('D2: Chặn scheme độc hại: javascript:alert(1) và data: render dạng text thuần, không tạo thẻ anchor', async () => {
        const now = new Date();
        messagesSignal.set([
          {
            id: '902',
            channelId: null,
            conversationId: 'conv-123',
            authorId: 'alice-456',
            author: { id: 'alice-456', username: 'Alice' },
            type: 'default',
            content: 'Thử chạy javascript:alert(1) hoặc data:text/html,hack xem sao',
            replyToId: null,
            clientNonce: 'nonce-d2',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'persisted',
          },
        ]);

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const links = harness.fixture.nativeElement.querySelectorAll('.nexus-chat-link');
        expect(links.length).toBe(0);

        const messageBody = harness.fixture.nativeElement.querySelector('.message-body');
        expect(messageBody.textContent).toContain('javascript:alert(1)');
        expect(messageBody.textContent).toContain('data:text/html,hack');
      });

      it('D3: Tải file DOCX/PDF với tên tiếng Việt: downloadAttachment gọi fetch, tạo object URL và revoke sau khi tải', async () => {
        const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/mock-blob-1');
        const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

        const mockBlob = new Blob(['mock content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
          ok: true,
          status: 200,
          blob: () => Promise.resolve(mockBlob),
        } as Response);

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;

        await component.downloadAttachment(
          '903',
          'att-docx-1',
          'https://storage/signed/baocao.docx',
          'Báo cáo Đồ án tốt nghiệp 2026.docx',
        );

        expect(fetchSpy).toHaveBeenCalledWith('https://storage/signed/baocao.docx');
        expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/mock-blob-1');

        fetchSpy.mockRestore();
        createObjectURLSpy.mockRestore();
        revokeObjectURLSpy.mockRestore();
      });

      it('D4: Tự động refresh Signed URL đúng 1 lần khi gặp lỗi 403/hết hạn và tải lại thành công', async () => {
        const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
        let fetchCallCount = 0;
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
          fetchCallCount++;
          if (fetchCallCount === 1) {
            // Lần 1: URL cũ hết hạn trả về 403
            return Promise.resolve({
              ok: false,
              status: 403,
            } as Response);
          }
          // Lần 2: URL mới thành công
          return Promise.resolve({
            ok: true,
            status: 200,
            blob: () => Promise.resolve(mockBlob),
          } as Response);
        });

        mockActiveChatStore.refreshAttachmentUrl.mockResolvedValue('https://storage/signed/fresh-url.pdf');

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;

        await component.downloadAttachment(
          '904',
          'att-pdf-1',
          'https://storage/signed/expired-url.pdf',
          'HuongDan.pdf',
        );

        expect(mockActiveChatStore.refreshAttachmentUrl).toHaveBeenCalledTimes(1);
        expect(mockActiveChatStore.refreshAttachmentUrl).toHaveBeenCalledWith('904', 'att-pdf-1');
        expect(fetchCallCount).toBe(2);

        fetchSpy.mockRestore();
      });

      it('D5: Lightbox mở ảnh và kích hoạt LightboxGalleryService với initialActiveId chính xác', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;
        const lightboxService = TestBed.inject(LightboxGalleryService);
        const openSpy = vi.spyOn(lightboxService, 'open');

        // Mở lightbox với ảnh
        component.openLightbox('https://storage/signed/photo.png', 'Ảnh phong cảnh.png', '905', 'att-img-1');
        harness.fixture.detectChanges();

        expect(component.activeLightbox()).toEqual({
          src: 'https://storage/signed/photo.png',
          alt: 'Ảnh phong cảnh.png',
          messageId: '905',
          attachmentId: 'att-img-1',
        });

        expect(openSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            initialActiveId: { messageId: '905', attachmentId: 'att-img-1' },
          }),
        );
      });

      it('D6: Quản lý trạng thái downloading độc lập cho từng attachmentId', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;

        // Set att-1 đang tải
        component.downloadingAttachmentIds.update((s: ReadonlySet<string>) => new Set(s).add('att-1'));
        expect(component.downloadingAttachmentIds().has('att-1')).toBe(true);
        expect(component.downloadingAttachmentIds().has('att-2')).toBe(false);

        // att-2 tải độc lập không bị chặn bởi att-1
        component.downloadingAttachmentIds.update((s: ReadonlySet<string>) => new Set(s).add('att-2'));
        expect(component.downloadingAttachmentIds().has('att-2')).toBe(true);

        component.downloadingAttachmentIds.update((s: ReadonlySet<string>) => {
          const next = new Set(s);
          next.delete('att-1');
          return next;
        });
        expect(component.downloadingAttachmentIds().has('att-1')).toBe(false);
        expect(component.downloadingAttachmentIds().has('att-2')).toBe(true);
      });

      it('E1: Initial history load với 100+ messages kích hoạt handleInitialRender và không tăng pill', async () => {
        const hundredMsgs = Array.from({ length: 100 }, (_, i) => ({
          id: `msg-${i + 1}`,
          conversationId: 'conv-123',
          authorId: i % 2 === 0 ? 'test-user-id' : 'other-user',
          author: { id: 'user', username: 'u', displayName: 'U' },
          type: 'default' as const,
          content: `Message ${i + 1}`,
          replyToId: null,
          clientNonce: `nonce-${i + 1}`,
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          createdAt: new Date(Date.now() - (100 - i) * 60000).toISOString(),
          status: 'persisted' as const,
        }));
        messagesSignal.set(hundredMsgs);

        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;
        expect(component.scrollController.hasScrolledInitial).toBe(true);
        expect(component.showNewMessagesPill()).toBe(false);
        expect(component.newMessagesBelowCount()).toBe(0);
      });

      it('E2: Chuyển đổi qua lại giữa DM A và DM B kích hoạt generation mới cho scroll controller', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;
        const initialGen = component.scrollController.generation;

        // Giả lập chuyển sang conv-456
        component.scrollController.reset('conv-456');
        expect(component.scrollController.generation).toBeGreaterThan(initialGen);
        expect(component.scrollController.hasScrolledInitial).toBe(false);
      });

      it('E3: DM A đang scroll phía trên -> chuyển DM B -> realtime đến ngay sau initial render của B; B vẫn xử lý đúng vị trí ở đáy', async () => {
        const harness = await mount('conv-A');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;

        // Giả lập user đang cuộn lên ở DM A
        const el = component.chatHistoryRef()?.nativeElement;
        if (el) {
          Object.defineProperty(el, 'scrollHeight', { value: 2000, configurable: true });
          Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
          el.scrollTop = 100; // distance = 1500 > 80
          component.scrollController.onScroll();
        }
        expect(component.scrollController.isUserScrolledUp).toBe(true);

        // Chuyển sang conv-B
        component.scrollController.reset('conv-B');
        expect(component.scrollController.isUserScrolledUp).toBe(false);

        // Render initial messages của conv-B
        const bMsgs = [
          {
            id: 'msg-b-1',
            conversationId: 'conv-B',
            authorId: 'other-user',
            author: { id: 'other-user', username: 'bob', displayName: 'Bob' },
            type: 'default' as const,
            content: 'Hello in B',
            replyToId: null,
            clientNonce: 'nonce-b-1',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: new Date().toISOString(),
            status: 'persisted' as const,
          },
        ];
        messagesSignal.set(bMsgs);
        if (el) {
          Object.defineProperty(el, 'scrollHeight', { value: 600, configurable: true });
          Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
          el.scrollTop = 200; // at bottom (distance = 0)
        }
        component.scrollController.handleInitialRender(
          'conv-B',
          component.scrollController.generation,
        );
        harness.fixture.detectChanges();
        expect(component.scrollController.hasScrolledInitial).toBe(true);

        // Realtime message đến ngay sau initial render của B
        messagesSignal.set([
          ...bMsgs,
          {
            id: 'msg-b-2',
            conversationId: 'conv-B',
            authorId: 'other-user',
            author: { id: 'other-user', username: 'bob', displayName: 'Bob' },
            type: 'default' as const,
            content: 'Realtime in B',
            replyToId: null,
            clientNonce: 'nonce-b-2',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: new Date().toISOString(),
            status: 'persisted' as const,
          },
        ]);
        harness.fixture.detectChanges();

        // Vì B đang ở đáy nên không được tăng pill và không bị dính trạng thái cuộn của A
        expect(component.showNewMessagesPill()).toBe(false);
        expect(component.newMessagesBelowCount()).toBe(0);
      });

      it('E4: Nút Đi tới tin nhắn mới nhất xuất hiện khi showScrollDownButton bật và gọi scrollToLatest khi click', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;

        // Ban đầu ở đáy: nút không có trong DOM
        expect(harness.routeNativeElement!.querySelector('button[aria-label*="Đi tới"]')).toBeNull();

        // Bật showScrollDownButton & unreadCount = 4
        component.scrollController.showScrollDownButton.set(true);
        component.scrollController.unreadCount.set(4);
        harness.fixture.detectChanges();

        const scrollBtn = harness.routeNativeElement!.querySelector('button[aria-label*="Đi tới"]') as HTMLButtonElement;
        expect(scrollBtn).toBeTruthy();
        expect(scrollBtn.getAttribute('aria-label')).toBe('Đi tới 4 tin nhắn mới nhất');
        expect(scrollBtn.textContent).toContain('4');

        const scrollSpy = vi.spyOn(component, 'scrollToLatest');
        scrollBtn.click();
        expect(scrollSpy).toHaveBeenCalled();
      });

      it('E5: onSendMessage không tạo scroll setTimeout timer và dựa hoàn toàn vào canonical reactive pipeline', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;
        const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

        // Gửi tin nhắn
        component.onSendMessage({
          content: 'Hello World canonical scroll',
          files: [],
        });

        // Không được gọi setTimeout nào cho scroll (timer 60ms đã bị xóa hoàn toàn)
        const timer60ms = setTimeoutSpy.mock.calls.find((call) => call[1] === 60);
        expect(timer60ms).toBeUndefined();

        setTimeoutSpy.mockRestore();
      });

      it('E6: Optimistic self-message kích hoạt đúng 1 lần generation-safe scroll; chuyển DM trước khi callback chạy không scroll target mới', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;
        const scrollSpy = vi.spyOn(component.scrollController, 'handleRealtimeAppend');

        // Tạo optimistic self message
        const now = new Date();
        messagesSignal.set([
          ...messagesSignal(),
          {
            id: null,
            conversationId: 'conv-123',
            authorId: 'my-user-id',
            author: { id: 'my-user-id', username: 'tai', displayName: 'Tai' },
            type: 'default' as const,
            content: 'My optimistic message',
            replyToId: null,
            clientNonce: 'nonce-self-1',
            editedAt: null,
            deletedAt: null,
            isForwarded: false,
            createdAt: now.toISOString(),
            status: 'optimistic' as const,
          },
        ]);
        harness.fixture.detectChanges();

        // Kiểm tra handleRealtimeAppend được gọi với isMine: true và targetKey/generation hiện tại
        expect(scrollSpy).toHaveBeenCalledTimes(1);
        expect(scrollSpy).toHaveBeenCalledWith(
          'conv-123',
          component.scrollController.generation,
          expect.objectContaining({ isMine: true }),
        );

        // Chuyển sang conversation khác (conv-456)
        const oldGen = component.scrollController.generation;
        component.scrollController.reset('conv-456');

        // Callback của conv-123 với oldGen chạy sau đó không được cuộn conv-456
        const scrollToBottomSpy = vi.spyOn(component.scrollController, 'scrollToBottom');
        component.scrollController.handleRealtimeAppend('conv-123', oldGen, {
          isMine: true,
          wasNearBottom: true,
        });
        expect(scrollToBottomSpy).not.toHaveBeenCalled();
      });

      it('E7: Các timer hợp lệ (toast, debounce mark-as-read) vẫn hoạt động đúng chuẩn', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();

        const component = harness.component;

        // 1. Toast timer
        component['showToast']('Thông báo thử nghiệm');
        expect(component.toastMessage()).toBe('Thông báo thử nghiệm');

        // 2. Mark read debounce timer
        component['scheduleMarkRead']('100');
        expect(component['latestPendingReadId']).toBe('100');
        expect(component['markReadTimeout']).not.toBeNull();
      });
    });

    describe('Inline Message Editing & 5-Minute Window', () => {
      it('chọn Edit từ MessageActions: mở inline editor với editingMessageId và không đụng tới composer', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();
        const component = harness.component;

        component.onMessageAction({
          kind: 'edit',
          icon: 'edit_note',
          label: 'Chỉnh sửa tin nhắn',
          description: 'Xin chào',
          messageId: 'msg-1',
        });

        expect(component.editingMessageId()).toBe('msg-1');
        expect(component['composerContext']()).toBeNull();
      });

      it('saveInlineEdit thành công: gọi store.editMessage và đóng editor', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();
        const component = harness.component;

        component.editingMessageId.set('msg-1');
        await component.saveInlineEdit('msg-1', 'Nội dung mới');

        expect(mockActiveChatStore.editMessage).toHaveBeenCalledWith('msg-1', 'Nội dung mới');
        expect(component.editingMessageId()).toBeNull();
      });

      it('saveInlineEdit thất bại: giữ editor mở và lưu thông báo lỗi vào editingError', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();
        const component = harness.component;

        mockActiveChatStore.editMessage.mockRejectedValueOnce(new Error('Hết thời gian sửa'));

        component.editingMessageId.set('msg-1');
        await component.saveInlineEdit('msg-1', 'Nội dung mới');

        expect(component.editingMessageId()).toBe('msg-1');
        expect(component.editingError()).toBe('Hết thời gian sửa');
      });

      it('canEdit trả về false khi quá 5 phút', async () => {
        const harness = await mount('conv-123');
        await harness.fixture.whenStable();
        harness.fixture.detectChanges();
        const component = harness.component;

        const oldMsg: ChatUiMessage = {
          id: 'old-1',
          channelId: null,
          conversationId: 'conv-123',
          authorId: 'test-user-id', // current user
          type: 'default',
          content: 'Tin cũ',
          replyToId: null,
          clientNonce: null,
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          externalMedia: null,
          createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
          status: 'persisted',
        };

        expect(component.canEdit(oldMsg)).toBe(false);
      });
    });
  });
});
