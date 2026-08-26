import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
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

  const mount = async (query = '') => {
    await TestBed.configureTestingModule({
      imports: [ConversationList],
      providers: [
        provideRouter([]),
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
});
