import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ConversationsApiService } from '../../../../../core/api/conversations-api.service';
import { ChatSocketService } from '../../../../../core/realtime/chat-socket.service';
import { DirectCallCoordinatorService } from '../../../../../core/calls/direct-call-coordinator.service';
import { UserSettingsService } from '../../../../../features/settings/services/user-settings.service';
import { FriendsStore } from '../../../../../features/dashboard/friends/services/friends-store';
import { ActiveChatStore } from '../../../../../features/dashboard/services/active-chat.store';
import { ConversationList } from './conversation-list';
import { PresenceService } from '../../../../../core/presence/presence.service';

describe('ConversationList', () => {
  let mockConversationsApi: { listConversations: any };
  let mockChatSocket: {
    conversationUpdated$: Subject<any>;
    messageCreated$: Subject<any>;
    conversationDeleted$: Subject<any>;
    messageRead$: Subject<any>;
    invitationReceived$: Subject<any>;
    invitationUpdated$: Subject<any>;
    capabilitiesUpdated$: Subject<any>;
    connect: any;
  };
  let mockAuthService: any;
  let mockActiveChatStore: any;
  let mockDirectCallCoordinator: { startCall: any };
  let mockUserSettingsService: any;
  let mockFriendsStore: any;
  let activeConversationIdSignal: ReturnType<typeof signal<string | null>>;

  beforeEach(() => {
    localStorage.clear();
    mockConversationsApi = {
      listConversations: vi.fn().mockResolvedValue([
        {
          id: 'conv-1',
          type: 'dm',
          recipient: {
            id: 'user-1',
            username: 'alice',
            displayName: 'Alice',
            avatarUrl: null,
            presence: 'online',
            statusMessage: 'Chilling',
          },
          unreadCount: 3,
          createdAt: new Date().toISOString(),
        },
      ]),
    };
    mockChatSocket = {
      conversationUpdated$: new Subject<any>(),
      messageCreated$: new Subject<any>(),
      conversationDeleted$: new Subject<any>(),
      messageRead$: new Subject<any>(),
      invitationReceived$: new Subject<any>(),
      invitationUpdated$: new Subject<any>(),
      capabilitiesUpdated$: new Subject<any>(),
      connect: vi.fn(),
    };
    mockAuthService = {
      user: signal({ id: 'my-user-id', email: 'me@example.com' }).asReadonly(),
      accessToken: signal('fake-token').asReadonly(),
    };
    mockDirectCallCoordinator = {
      startCall: vi.fn().mockResolvedValue(undefined),
    };
    mockUserSettingsService = {
      isFriendMuted: vi.fn().mockReturnValue(false),
      toggleMuteFriend: vi.fn(),
      getFriendNote: vi.fn().mockReturnValue(''),
      setFriendNote: vi.fn(),
      blockUser: vi.fn(),
    };
    mockFriendsStore = {
      incomingRequests: signal([]).asReadonly(),
      removeFriend: vi.fn().mockResolvedValue(undefined),
      blockUser: vi.fn().mockResolvedValue(null),
    };
    activeConversationIdSignal = signal<string | null>(null);
    mockActiveChatStore = {
      conversationId: activeConversationIdSignal.asReadonly(),
    };
  });

  const mount = async (query = '') => {
    await TestBed.configureTestingModule({
      imports: [ConversationList],
      providers: [
        provideRouter([
          { path: 'channels/@me', component: class {} },
          { path: 'channels/@me/:id', component: class {} },
        ]),
        { provide: ConversationsApiService, useValue: mockConversationsApi },
        { provide: ChatSocketService, useValue: mockChatSocket },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActiveChatStore, useValue: mockActiveChatStore },
        { provide: DirectCallCoordinatorService, useValue: mockDirectCallCoordinator },
        { provide: UserSettingsService, useValue: mockUserSettingsService },
        { provide: FriendsStore, useValue: mockFriendsStore },
        {
          provide: PresenceService,
          useValue: { resolvePresence: () => 'online' },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConversationList);
    fixture.componentRef.setInput('query', query);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  };

  it('tải và hiển thị danh sách cuộc trò chuyện thật kèm unread count', async () => {
    const fixture = await mount();

    expect(mockConversationsApi.listConversations).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Alice');
    expect(fixture.nativeElement.textContent).toContain('3'); // Unread count badge
  });

  it('có lối vào trang Bạn bè và section label', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('Bạn bè');
    expect(fixture.nativeElement.textContent).toContain('Tin nhắn trực tiếp');
    expect(
      fixture.nativeElement
        .querySelector('a[href="/channels/@me"]')
        .classList.contains('nexus-nav-item'),
    ).toBe(true);
  });

  it('không có mục thương mại kiểu Discord', async () => {
    const fixture = await mount();
    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('Nitro');
    expect(text).not.toContain('Cửa hàng');
    expect(text).not.toContain('Nhiệm Vụ');
  });

  it('cập nhật unread count realtime khi nhận conversation:updated (user-room event)', async () => {
    const fixture = await mount();

    mockChatSocket.conversationUpdated$.next({
      conversationId: 'conv-1',
      senderId: 'user-1',
      lastMessageId: '100',
      lastMessagePreview: 'Hello!',
      unreadDelta: 1,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('4');
  });

  it('đưa cuộc trò chuyện vừa nhận tin lên đầu danh sách', async () => {
    mockConversationsApi.listConversations.mockResolvedValue([
      {
        id: 'conv-old',
        type: 'dm',
        recipient: { id: 'user-old', username: 'old', displayName: 'Old chat', presence: 'online' },
        unreadCount: 0,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'conv-new',
        type: 'dm',
        recipient: { id: 'user-new', username: 'new', displayName: 'New chat', presence: 'online' },
        unreadCount: 0,
        createdAt: '2026-08-01T00:00:00Z',
      },
    ]);
    const fixture = await mount();

    mockChatSocket.conversationUpdated$.next({
      conversationId: 'conv-old',
      senderId: 'user-old',
      lastMessageAt: '2026-08-27T10:00:00Z',
      unreadDelta: 1,
    });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-conversation-id]');
    expect(rows[0].getAttribute('data-conversation-id')).toBe('conv-old');
  });

  it('chỉ mở để xem không đổi thứ tự; lần gửi đầu tiên trong phiên mới đưa chat lên đầu', async () => {
    mockConversationsApi.listConversations.mockResolvedValue([
      {
        id: 'conv-old',
        type: 'dm',
        recipient: { id: 'user-old', username: 'old', displayName: 'Old chat', presence: 'online' },
        unreadCount: 0,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'conv-new',
        type: 'dm',
        recipient: { id: 'user-new', username: 'new', displayName: 'New chat', presence: 'online' },
        unreadCount: 0,
        createdAt: '2026-08-01T00:00:00Z',
      },
    ]);
    const fixture = await mount();

    fixture.componentInstance['onConversationOpened']('conv-old');
    fixture.detectChanges();
    let rows = fixture.nativeElement.querySelectorAll('[data-conversation-id]');
    expect(rows[0].getAttribute('data-conversation-id')).toBe('conv-new');

    mockChatSocket.messageCreated$.next({
      message: {
        id: '900',
        conversationId: 'conv-old',
        channelId: null,
        authorId: 'my-user-id',
        createdAt: '2099-08-27T11:00:00Z',
      },
    });
    fixture.detectChanges();
    rows = fixture.nativeElement.querySelectorAll('[data-conversation-id]');
    expect(rows[0].getAttribute('data-conversation-id')).toBe('conv-old');
  });

  it('không cập nhật recent activity lần nữa khi gửi nhiều tin trong cùng phiên truy cập', async () => {
    mockConversationsApi.listConversations.mockResolvedValue([
      {
        id: 'conv-old',
        type: 'dm',
        recipient: { id: 'user-old', username: 'old', displayName: 'Old chat', presence: 'online' },
        unreadCount: 0,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'conv-new',
        type: 'dm',
        recipient: { id: 'user-new', username: 'new', displayName: 'New chat', presence: 'online' },
        unreadCount: 0,
        createdAt: '2026-08-01T00:00:00Z',
      },
    ]);
    const fixture = await mount();
    fixture.componentInstance['onConversationOpened']('conv-old');

    mockChatSocket.messageCreated$.next({
      message: {
        id: '901',
        conversationId: 'conv-old',
        authorId: 'my-user-id',
        createdAt: '2099-08-27T10:00:00Z',
      },
    });
    mockChatSocket.conversationUpdated$.next({
      conversationId: 'conv-new',
      senderId: 'user-new',
      lastMessageAt: '2099-08-27T11:00:00Z',
    });
    mockChatSocket.messageCreated$.next({
      message: {
        id: '902',
        conversationId: 'conv-old',
        authorId: 'my-user-id',
        createdAt: '2099-08-27T12:00:00Z',
      },
    });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-conversation-id]');
    expect(rows[0].getAttribute('data-conversation-id')).toBe('conv-new');
  });

  it('tin đến trong DM đang mở không phải unread nên không làm sidebar đổi thứ tự', async () => {
    activeConversationIdSignal.set('conv-old');
    mockConversationsApi.listConversations.mockResolvedValue([
      {
        id: 'conv-old',
        type: 'dm',
        recipient: { id: 'user-old', username: 'old', displayName: 'Old chat', presence: 'online' },
        unreadCount: 0,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'conv-new',
        type: 'dm',
        recipient: { id: 'user-new', username: 'new', displayName: 'New chat', presence: 'online' },
        unreadCount: 0,
        createdAt: '2026-08-01T00:00:00Z',
      },
    ]);
    const fixture = await mount();

    mockChatSocket.conversationUpdated$.next({
      conversationId: 'conv-old',
      senderId: 'user-old',
      lastMessageAt: '2099-08-27T12:00:00Z',
    });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-conversation-id]');
    expect(rows[0].getAttribute('data-conversation-id')).toBe('conv-new');
  });

  it('xóa unread count khi người dùng mở đúng cuộc trò chuyện (activeConversationId khớp)', async () => {
    const fixture = await mount();

    // Giả lập người dùng click mở conv-1
    activeConversationIdSignal.set('conv-1');
    fixture.detectChanges();

    mockChatSocket.conversationUpdated$.next({
      conversationId: 'conv-1',
      senderId: 'user-1',
      lastMessageId: '101',
      lastMessagePreview: 'Another message',
      unreadDelta: 1,
    });
    fixture.detectChanges();

    // unreadCount vẫn là 0 vì người dùng đang ở trong conv-1
    expect(fixture.nativeElement.textContent).not.toContain('4');
  });

  it('reset unread count về 0 khi nhận message:read', async () => {
    const fixture = await mount();

    mockChatSocket.messageRead$.next({
      conversationId: 'conv-1',
      userId: 'my-user-id',
      lastReadMessageId: '100',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('3');
  });

  it('xóa conversation khỏi sidebar khi nhận conversation:deleted realtime', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.textContent).toContain('Alice');

    mockChatSocket.conversationDeleted$.next({
      conversationId: 'conv-1',
      friendId: 'user-1',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Alice');
  });

  it('mở context menu khi chuột phải vào cuộc trò chuyện', async () => {
    const fixture = await mount();

    const row = fixture.nativeElement.querySelector('.conversation-row');
    expect(row).toBeTruthy();

    const event = new MouseEvent('contextmenu', {
      clientX: 200,
      clientY: 300,
      bubbles: true,
      cancelable: true,
    });
    row.dispatchEvent(event);
    fixture.detectChanges();

    expect(fixture.componentInstance['selectedConversation']()?.name).toBe('Alice');
    expect(fixture.componentInstance['contextMenuPosition']()).toEqual({ x: 200, y: 300 });
  });

  it('kích hoạt onRemoveFriend khi gọi removeFriend từ context menu', async () => {
    const fixture = await mount();

    const conv = fixture.componentInstance['conversations']()[0];
    expect(conv).toBeTruthy();

    fixture.componentInstance['onRemoveFriend'](conv);
    expect(mockFriendsStore.removeFriend).toHaveBeenCalledWith('user-1');
  });

  it('kích hoạt onStartAudioCall khi gọi từ context menu', async () => {
    const fixture = await mount();

    const conv = fixture.componentInstance['conversations']()[0];
    fixture.componentInstance['onStartAudioCall'](conv);

    expect(mockDirectCallCoordinator.startCall).toHaveBeenCalledWith('conv-1', 'audio');
  });
});
