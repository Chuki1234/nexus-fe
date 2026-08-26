import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VoiceChatDrawer } from './voice-chat-drawer';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ChannelChatStore, type ChannelChatUiMessage } from '../../../../dashboard/services/channel-chat.store';
import type { ChannelSummary } from '../../../../../core/servers/server.models';
import { ConversationsApiService } from '../../../../../core/api/conversations-api.service';
import { MessagesApiService } from '../../../../../core/api/messages-api.service';
import { ServersApiService } from '../../../../../core/api/servers-api.service';
import { ServersStore } from '../../../../../core/servers/servers.store';
import { FriendsStore } from '../../../../dashboard/friends/services/friends-store';

describe('VoiceChatDrawer', () => {
  let fixture: ComponentFixture<VoiceChatDrawer>;
  let component: VoiceChatDrawer;

  const mockMessagesSignal = signal<ChannelChatUiMessage[]>([]);
  const mockLoadingInitialSignal = signal<boolean>(false);
  const mockLoadingMoreSignal = signal<boolean>(false);
  const mockChatErrorSignal = signal<string | null>(null);
  const mockTypingUserIdsSignal = signal<string[]>([]);
  const mockPermissionsSignal = signal<{ canSend: boolean; canAttach: boolean; canView: boolean; canManageMessages: boolean }>({
    canView: true,
    canSend: true,
    canAttach: true,
    canManageMessages: true,
  });

  const mockChannelChatStore = {
    allMessages: mockMessagesSignal.asReadonly(),
    loadingInitial: mockLoadingInitialSignal.asReadonly(),
    loadingMore: mockLoadingMoreSignal.asReadonly(),
    hasMore: signal(false).asReadonly(),
    chatError: mockChatErrorSignal.asReadonly(),
    typingUserIds: mockTypingUserIdsSignal.asReadonly(),
    permissions: mockPermissionsSignal.asReadonly(),
    lastReadMessageId: signal('msg-1').asReadonly(),
    loadInitial: vi.fn().mockResolvedValue(undefined),
    loadMore: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    editMessage: vi.fn().mockResolvedValue(undefined),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    setReaction: vi.fn().mockResolvedValue(undefined),
    startTyping: vi.fn(),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    retrySendMessage: vi.fn(),
    cancelOptimisticMessage: vi.fn(),
    clear: vi.fn(),
  };

  const mockAuthService = {
    user: signal({ id: 'user-1', username: 'testuser', displayName: 'Test User' }),
  };

  const dummyChannel: ChannelSummary = {
    id: 'vc-1',
    name: 'General Voice',
    type: 'voice',
    unread: false,
    topic: '',
    mentionCount: 0,
  };

  beforeEach(async () => {
    mockMessagesSignal.set([]);
    mockLoadingInitialSignal.set(false);
    mockChatErrorSignal.set(null);
    mockTypingUserIdsSignal.set([]);
    mockPermissionsSignal.set({ canView: true, canSend: true, canAttach: true, canManageMessages: true });
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [VoiceChatDrawer],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConversationsApiService, useValue: { listConversations: vi.fn().mockResolvedValue([]) } },
        { provide: MessagesApiService, useValue: { forwardChannelMessage: vi.fn().mockResolvedValue({}) } },
        { provide: ServersApiService, useValue: { listChannels: vi.fn().mockResolvedValue([]) } },
        { provide: ServersStore, useValue: { servers: signal([]), channelsOf: vi.fn().mockReturnValue([]) } },
        { provide: FriendsStore, useValue: { friends: signal([]) } },
      ],
    })
      .overrideComponent(VoiceChatDrawer, {
        set: {
          providers: [
            { provide: ChannelChatStore, useValue: mockChannelChatStore },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(VoiceChatDrawer);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('serverId', 'server-1');
    fixture.componentRef.setInput('channel', dummyChannel);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('khởi tạo và gọi loadInitial với serverId và channelId', () => {
    fixture.detectChanges();
    expect(mockChannelChatStore.loadInitial).toHaveBeenCalledWith('server-1', 'vc-1');
  });

  it('bọc toàn bộ intro và message list trong #messageContent wrapper để ResizeObserver bắt trọn layout', () => {
    mockMessagesSignal.set([
      {
        id: 'msg-1',
        conversationId: null,
        channelId: 'vc-1',
        authorId: 'user-2',
        author: { id: 'user-2', username: 'bob', displayName: 'Bob', avatarUrl: null },
        type: 'default',
        content: 'Xin chào trong kênh thoại!',
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
    fixture.detectChanges();

    const wrapper = (fixture.nativeElement as HTMLElement).querySelector('div.flex.flex-col.gap-4');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.querySelector('.intro-card')).toBeTruthy();
    expect(wrapper?.textContent).toContain('Xin chào trong kênh thoại!');
  });

  it('gửi tin nhắn qua ChannelChatStore.sendMessage từ composer', async () => {
    fixture.detectChanges();

    await component['onSendMessage']({ content: 'Tin nhắn test', files: [] });

    expect(mockChannelChatStore.sendMessage).toHaveBeenCalledWith({
      content: 'Tin nhắn test',
      files: [],
      replyToId: undefined,
      externalMedia: undefined,
    });
  });

  it('phát sự kiện closed khi bấm nút đóng', () => {
    fixture.detectChanges();
    const closeSpy = vi.fn();
    component.closed.subscribe(closeSpy);

    const closeBtn = (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Đóng trò chuyện thoại"]');
    (closeBtn as HTMLButtonElement)?.click();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('ở đáy -> nút Đi tới tin nhắn mới nhất không tồn tại trong DOM', () => {
    fixture.detectChanges();
    const scrollDownBtn = (fixture.nativeElement as HTMLElement).querySelector('button[aria-label*="Đi tới"]');
    expect(scrollDownBtn).toBeNull();
  });

  it('khi showScrollDownButton bật -> hiển thị nút cuộn, bấm nút gọi scrollToLatest và markAsRead đúng một lần', () => {
    mockMessagesSignal.set([
      {
        id: 'msg-voice-99',
        conversationId: null,
        channelId: 'vc-1',
        authorId: 'user-2',
        author: { id: 'user-2', username: 'bob', displayName: 'Bob', avatarUrl: null },
        type: 'default',
        content: 'Tin nhắn mới',
        replyToId: null,
        clientNonce: 'nonce-99',
        editedAt: null,
        deletedAt: null,
        isForwarded: false,
        externalMedia: null,
        createdAt: new Date().toISOString(),
        status: 'persisted',
      },
    ]);
    fixture.detectChanges();

    component.scrollController.showScrollDownButton.set(true);
    component.scrollController.unreadCount.set(3);
    fixture.detectChanges();

    const scrollDownBtn = (fixture.nativeElement as HTMLElement).querySelector('button[aria-label*="Đi tới"]') as HTMLButtonElement;
    expect(scrollDownBtn).toBeTruthy();
    expect(scrollDownBtn.getAttribute('aria-label')).toBe('Đi tới 3 tin nhắn mới nhất');
    expect(scrollDownBtn.textContent).toContain('3');

    // Bấm nút: gọi component.scrollToLatest, controller.scrollToLatest và channelChat.markAsRead đúng 1 lần
    const scrollSpy = vi.spyOn(component.scrollController, 'scrollToLatest');
    scrollDownBtn.click();

    expect(scrollSpy).toHaveBeenCalledWith('smooth');
    expect(mockChannelChatStore.markAsRead).toHaveBeenCalledTimes(1);
    expect(mockChannelChatStore.markAsRead).toHaveBeenCalledWith('msg-voice-99');
  });

  it('hỗ trợ reaction, reply, forward và delete tương tự kênh văn bản', async () => {
    mockMessagesSignal.set([
      {
        id: 'msg-v-1',
        conversationId: null,
        channelId: 'vc-1',
        authorId: 'user-1',
        author: { id: 'user-1', username: 'testuser', displayName: 'Test User', avatarUrl: null },
        type: 'default',
        content: 'Tin nhắn test reactions',
        replyToId: null,
        clientNonce: 'nonce-v-1',
        editedAt: null,
        deletedAt: null,
        isForwarded: false,
        externalMedia: null,
        reactions: [{ emoji: '❤️', count: 1, reactedByMe: true }],
        createdAt: new Date().toISOString(),
        status: 'persisted',
      },
    ]);
    fixture.detectChanges();

    // Toggle reaction
    await component['onToggleReaction']('msg-v-1', '❤️');
    expect(mockChannelChatStore.setReaction).toHaveBeenCalledWith('msg-v-1', '❤️', false);

    // Forward action opens forward modal
    component['onAction']({
      kind: 'forward',
      messageId: 'msg-v-1',
      icon: 'forward_to_inbox',
      label: 'Chuyển tiếp',
      description: 'Chuyển tiếp tin nhắn',
    });
    expect(component.forwardModalMessage()?.id).toBe('msg-v-1');

    // Reply action sets composer context
    component['onAction']({
      kind: 'reply',
      messageId: 'msg-v-1',
      icon: 'reply',
      label: 'Đang trả lời',
      description: 'Trả lời tin nhắn',
    });
    expect(component.composerContext()?.kind).toBe('reply');
  });
});
