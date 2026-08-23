import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ShellData } from '../../../core/api/shell-data';
import { AuthService } from '../../../core/auth/auth.service';
import { ConversationsApiService } from '../../../core/api/conversations-api.service';
import { ActiveChatStore, type ChatUiMessage } from '../services/active-chat.store';
import {
  DashboardUiState,
  type DashboardBlockingState,
  type DashboardConnectionState,
  type DashboardUiStateName,
} from '../services/dashboard-ui-state';
import { ConversationPage } from './conversation';

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
        createdAt: new Date().toISOString(),
        status: 'persisted',
      },
    ]);

    loadingInitialSignal = signal(false);
    loadingMoreSignal = signal(false);
    hasMoreSignal = signal(false);
    errorSignal = signal<string | null>(null);
    typingUserIdsSignal = signal<string[]>([]);

    mockActiveChatStore = {
      allMessages: messagesSignal.asReadonly(),
      loadingInitial: loadingInitialSignal.asReadonly(),
      loadingMore: loadingMoreSignal.asReadonly(),
      hasMore: hasMoreSignal.asReadonly(),
      error: errorSignal.asReadonly(),
      typingUserIds: typingUserIdsSignal.asReadonly(),
      setActiveConversation: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
      loadOlderMessages: vi.fn().mockResolvedValue(undefined),
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

  const mount = async (id: string, demo = false, uiState: DashboardUiStateName = 'ready') => {
    const shell = {
      conversationOf: () => undefined,
      demoEnabled: signal(demo).asReadonly(),
    };
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
        provideRouter([{ path: 'channels/@me/:conversationId', component: ConversationPage }]),
        { provide: ShellData, useValue: shell },
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
    await harness.navigateByUrl(`/channels/@me/${id}`);
    return harness;
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
});
