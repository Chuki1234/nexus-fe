import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ShellData } from '../../../../../core/api/shell-data';
import { ConversationsApiService } from '../../../../../core/api/conversations-api.service';
import { ChatSocketService } from '../../../../../core/realtime/chat-socket.service';
import { ConversationList } from './conversation-list';

describe('ConversationList', () => {
  let mockConversationsApi: { listConversations: any };
  let mockChatSocket: {
    messageCreated$: Subject<any>;
    messageRead$: Subject<any>;
  };

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
      messageCreated$: new Subject<any>(),
      messageRead$: new Subject<any>(),
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

  it('cập nhật unread count realtime khi nhận socket event messageCreated', async () => {
    const fixture = await mount();

    mockChatSocket.messageCreated$.next({
      message: { conversationId: 'conv-1', id: '100' },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('4');
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
});
