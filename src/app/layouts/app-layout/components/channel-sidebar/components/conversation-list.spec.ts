import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { ShellData } from '../../../../../core/api/shell-data';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ConversationsApiService } from '../../../../../core/api/conversations-api.service';
import { ChatSocketService } from '../../../../../core/realtime/chat-socket.service';
import { ActiveChatStore } from '../../../../../features/dashboard/services/active-chat.store';
import { ConversationList } from './conversation-list';

describe('ConversationList', () => {
  let mockConversationsApi: { listConversations: any };
  let mockChatSocket: {
    conversationUpdated$: Subject<any>;
    messageRead$: Subject<any>;
    invitationReceived$: Subject<any>;
    invitationUpdated$: Subject<any>;
    connect: any;
  };
  let mockAuthService: any;
  let mockActiveChatStore: any;
  let activeConversationIdSignal: ReturnType<typeof signal<string | null>>;

  beforeEach(() => {
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
      messageRead$: new Subject<any>(),
      invitationReceived$: new Subject<any>(),
      invitationUpdated$: new Subject<any>(),
      connect: vi.fn(),
    };
    mockAuthService = {
      user: signal({ id: 'my-user-id', email: 'me@example.com' }).asReadonly(),
    };
    activeConversationIdSignal = signal<string | null>(null);
    mockActiveChatStore = {
      conversationId: activeConversationIdSignal.asReadonly(),
    };
  });

  const mount = async (shell: ShellData = new ShellData(), query = '') => {
    await TestBed.configureTestingModule({
      imports: [ConversationList],
      providers: [
        provideRouter([]),
        { provide: ShellData, useValue: shell },
        { provide: ConversationsApiService, useValue: mockConversationsApi },
        { provide: ChatSocketService, useValue: mockChatSocket },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActiveChatStore, useValue: mockActiveChatStore },
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
    expect(fixture.nativeElement.textContent).toContain('Chilling');
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

  it('ở chế độ demo, sử dụng dữ liệu từ ShellData và không gọi API thật', async () => {
    const shell = new ShellData();
    shell.setDemoEnabled(true);
    mockConversationsApi.listConversations.mockClear();

    const fixture = await mount(shell);

    expect(mockConversationsApi.listConversations).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('.conversation-row').length).toBe(
      shell.conversations().length,
    );
  });

  it('cập nhật unread count realtime khi nhận conversation:updated (user-room event)', async () => {
    const fixture = await mount();

    mockChatSocket.conversationUpdated$.next({
      conversationId: 'conv-1',
      senderId: 'user-1',
      lastMessageId: '100',
      lastMessagePreview: 'Hello!',
      lastMessageAt: new Date().toISOString(),
      unreadDelta: 1,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('4');
  });

  it('sender không tự tăng unread khi gửi tin nhắn', async () => {
    const fixture = await mount();

    // Emit conversation:updated với senderId = chính mình
    mockChatSocket.conversationUpdated$.next({
      conversationId: 'conv-1',
      senderId: 'my-user-id',
      lastMessageId: '100',
      lastMessagePreview: 'My own message',
      lastMessageAt: new Date().toISOString(),
      unreadDelta: 1,
    });
    fixture.detectChanges();

    // Unread vẫn là 3 (không tăng)
    expect(fixture.nativeElement.textContent).toContain('3');
  });

  it('conversation đang mở (active) không tăng unread', async () => {
    activeConversationIdSignal.set('conv-1');
    const fixture = await mount();

    mockChatSocket.conversationUpdated$.next({
      conversationId: 'conv-1',
      senderId: 'user-1',
      lastMessageId: '100',
      lastMessagePreview: 'Hello!',
      lastMessageAt: new Date().toISOString(),
      unreadDelta: 1,
    });
    fixture.detectChanges();

    // Unread vẫn là 3 (không tăng vì conv đang mở)
    expect(fixture.nativeElement.textContent).toContain('3');
  });

  it('reset unread count realtime khi nhận socket event messageRead', async () => {
    const fixture = await mount();

    mockChatSocket.messageRead$.next({
      conversationId: 'conv-1',
      userId: 'user-1',
      lastReadMessageId: '100',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-unread-badge')).toBeNull();
  });

  it('conversation chưa có trong list thì gọi reload khi nhận conversation:updated', async () => {
    const fixture = await mount();
    mockConversationsApi.listConversations.mockClear();

    mockChatSocket.conversationUpdated$.next({
      conversationId: 'conv-unknown',
      senderId: 'user-1',
      lastMessageId: '200',
      lastMessagePreview: 'New DM!',
      lastMessageAt: new Date().toISOString(),
      unreadDelta: 1,
    });
    fixture.detectChanges();

    expect(mockConversationsApi.listConversations).toHaveBeenCalled();
  });
});
