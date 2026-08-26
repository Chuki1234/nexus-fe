import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ServersStore } from '../../../core/servers/servers.store';
import { ChannelChatStore } from '../services/channel-chat.store';
import {
  DashboardUiState,
  type DashboardBlockingState,
  type DashboardConnectionState,
  type DashboardUiStateName,
} from '../services/dashboard-ui-state';
import { ChannelPage } from './channel';

const MOCK_CHANNELS = [
  {
    id: 'do-an',
    name: 'đồ-án',
    type: 'text' as const,
    topic: 'Nexus — tiến độ tuần',
    unread: false,
    mentionCount: 0,
  },
  {
    id: 'standup',
    name: 'Standup',
    type: 'voice' as const,
    topic: null,
    unread: false,
    mentionCount: 0,
  },
];

describe('ChannelPage', () => {
  const mount = async (path: string, _demo = false, uiState: DashboardUiStateName = 'ready') => {
    const serversStore = {
      serverOf: () => ({ id: 'itss', name: 'ITSS Lab', iconUrl: null, unread: false, mentionCount: 0 }),
      channelsOf: () => MOCK_CHANNELS,
      setActive: () => {},
      ensureHydrated: async () => {},
    };

    const channelChatMock = {
      allMessages: signal([
        {
          id: '1001',
          channelId: 'do-an',
          conversationId: null,
          authorId: 'user-1',
          author: { id: 'user-1', username: 'mon', displayName: 'Phan Thế Mon', avatarUrl: null },
          type: 'default' as const,
          content: 'Hello World',
          replyToId: null,
          clientNonce: 'n1',
          editedAt: null,
          deletedAt: null,
          isForwarded: false,
          externalMedia: null,
          attachments: [],
          reactions: [{ emoji: '👍', count: 1, reactedByMe: true }],
          createdAt: new Date().toISOString(),
          status: 'persisted' as const,
        },
      ]).asReadonly(),
      permissions: signal({ canView: true, canSend: true, canAttach: true, canManageMessages: true }).asReadonly(),
      typingUserIds: signal([]).asReadonly(),
      loadingInitial: signal(false).asReadonly(),
      loadingMore: signal(false).asReadonly(),
      hasMore: signal(false).asReadonly(),
      chatError: signal(null).asReadonly(),
      lastReadMessageId: signal('1000').asReadonly(),
      loadInitial: async () => {},
      loadMore: async () => {},
      sendMessage: async () => {},
      editMessage: async () => {},
      deleteMessage: async () => {},
      setReaction: async () => {},
      startTyping: () => {},
      markAsRead: async () => {},
      retrySendMessage: async () => {},
      cancelOptimisticMessage: () => {},
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
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'c/:serverId/:channelId', component: ChannelPage }]),
        { provide: ServersStore, useValue: serversStore },
        { provide: ChannelChatStore, useValue: channelChatMock },
        {
          provide: DashboardUiState,
          useValue: { blockingState, connectionState, clearPreview: async () => true },
        },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/c/${path}`);
    return harness;
  };

  it('kênh chữ có ô soạn tin', async () => {
    const harness = await mount('itss/do-an');

    expect(harness.routeNativeElement!.textContent).toContain('đồ-án');
    expect(harness.routeNativeElement!.querySelector('app-message-composer')).toBeTruthy();
    expect(
      harness.routeNativeElement!.querySelector('[data-chat-wallpaper="doodle"]'),
    ).toBeTruthy();
    expect(
      harness
        .routeNativeElement!.querySelector('.chat-history')
        ?.classList.contains('nexus-scrollbar'),
    ).toBe(true);
    expect(harness.routeNativeElement!.querySelector('.chat-intro')).toBeTruthy();
    const chatStage = harness.routeNativeElement!.querySelector('.chat-stage');
    expect(chatStage?.classList.contains('justify-start')).toBe(true);
    expect(chatStage?.classList.contains('justify-end')).toBe(false);
  });

  it('render tin nhắn và reaction chip từ ChannelChatStore', async () => {
    const harness = await mount('itss/do-an');

    expect(harness.routeNativeElement!.textContent).toContain('Hello World');
    expect(harness.routeNativeElement!.querySelector('.reaction-chip')).toBeTruthy();
  });

  it('kênh thoại KHÔNG có ô soạn tin và dựng VoiceRoom', async () => {
    const harness = await mount('itss/standup');

    expect(harness.routeNativeElement!.querySelector('app-voice-room')).toBeTruthy();
    expect(harness.routeNativeElement!.textContent).toContain('Tham Gia Thoại');
    expect(harness.routeNativeElement!.querySelector('app-message-composer')).toBeFalsy();
    expect(harness.routeNativeElement!.querySelector('[data-chat-wallpaper]')).toBeFalsy();
  });

  it('kênh không tồn tại thì báo rõ', async () => {
    const harness = await mount('itss/khong-co-that');

    expect(harness.routeNativeElement!.textContent).toContain('Không tìm thấy kênh này');
  });

  it('panel thành viên đóng mặc định rồi mở bằng toolbar mà không dựng member giả', async () => {
    const harness = await mount('itss/do-an');
    const trigger = harness.routeNativeElement!.querySelector(
      'button[aria-expanded]',
    ) as HTMLButtonElement;
    const panel = harness.routeNativeElement!.querySelector(
      'app-context-panel aside',
    ) as HTMLElement;

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.classList.contains('context-panel--open')).toBe(false);

    trigger.click();
    harness.detectChanges();

    expect(panel.classList.contains('context-panel--open')).toBe(true);
    expect(panel.textContent).toContain('Chưa có dữ liệu thành viên');
    expect(panel.querySelector('app-avatar')).toBeFalsy();
  });

  it('error chặn timeline và ô soạn tin', async () => {
    const harness = await mount('itss/do-an', false, 'error');

    expect(
      harness.routeNativeElement!.querySelector('[data-dashboard-state="error"]'),
    ).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('app-message-composer')).toBeNull();
  });

  it('reconnecting giữ nguyên kênh đang xem và chỉ thêm banner', async () => {
    const harness = await mount('itss/do-an', false, 'reconnecting');

    expect(
      harness.routeNativeElement!.querySelector('[data-dashboard-state="reconnecting"]'),
    ).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('app-message-composer')).toBeTruthy();
  });

  it('nút Đi tới tin nhắn mới nhất hiển thị khi showScrollDownButton bật và gọi scrollToLatest khi click', async () => {
    const harness = await mount('itss/do-an');
    const component = harness.fixture.debugElement.query(
      (debugEl) => debugEl.componentInstance instanceof ChannelPage,
    ).componentInstance as ChannelPage;

    // Ban đầu ở đáy: nút không render
    expect(harness.routeNativeElement!.querySelector('button[aria-label*="Đi tới"]')).toBeNull();

    // Bật showScrollDownButton & unreadCount = 5
    component.scrollController.showScrollDownButton.set(true);
    component.scrollController.unreadCount.set(5);
    harness.detectChanges();

    const scrollBtn = harness.routeNativeElement!.querySelector('button[aria-label*="Đi tới"]') as HTMLButtonElement;
    expect(scrollBtn).toBeTruthy();
    expect(scrollBtn.getAttribute('aria-label')).toBe('Đi tới 5 tin nhắn mới nhất');
    expect(scrollBtn.textContent).toContain('5');

    const scrollSpy = vi.spyOn(component.scrollController, 'scrollToLatest');
    scrollBtn.click();
    expect(scrollSpy).toHaveBeenCalled();
  });

  it('hỗ trợ inline message editor: onAction kind edit mở editor và saveInlineEdit cập nhật tin nhắn', async () => {
    const harness = await mount('itss/do-an');
    const component = harness.fixture.debugElement.query(
      (debugEl) => debugEl.componentInstance instanceof ChannelPage,
    ).componentInstance as ChannelPage;

    const editSpy = vi.spyOn(component.channelChat, 'editMessage').mockResolvedValue({} as any);

    // Kích hoạt edit action
    component['onAction']({
      kind: 'edit',
      messageId: '1001',
      icon: 'edit_note',
      label: 'Chỉnh sửa',
      description: 'Chỉnh sửa tin nhắn',
    });

    expect(component.editingMessageId()).toBe('1001');
    expect(component['composerContext']()).toBeNull();

    // Lưu edit
    await component['saveInlineEdit']('1001', 'Tin nhắn kênh mới');
    expect(editSpy).toHaveBeenCalledWith('1001', 'Tin nhắn kênh mới');
    expect(component.editingMessageId()).toBeNull();

    // Thất bại
    editSpy.mockRejectedValueOnce(new Error('Lỗi server'));
    component.editingMessageId.set('1001');
    await component['saveInlineEdit']('1001', 'Tin lỗi');
    expect(component.editingMessageId()).toBe('1001');
    expect(component.editingError()).toBe('Lỗi server');
  });
});
