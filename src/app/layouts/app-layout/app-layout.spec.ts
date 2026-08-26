import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ConversationsApiService } from '../../core/api/conversations-api.service';
import { DirectCallsApiService } from '../../core/api/direct-calls-api.service';
import { MessagesApiService } from '../../core/api/messages-api.service';
import { ServersApiService } from '../../core/api/servers-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService } from '../../core/profile/profile.service';
import { ChatSocketService } from '../../core/realtime/chat-socket.service';
import { ServersStore } from '../../core/servers/servers.store';
import { dashboardRoutes } from '../../features/dashboard/dashboard.routes';
import { FriendsStore } from '../../features/dashboard/friends/services/friends-store';
import { DashboardLayoutService } from './services/dashboard-layout.service';

class AuthServiceStub {
  whenReady = () => Promise.resolve();
  isAuthenticated = () => true;
  user = signal({ id: 'u1', email: 'ban@vidu.com' } as any).asReadonly();
  accessToken = () => 'token';
  signOut = () => Promise.resolve();
}

class ProfileServiceStub {
  ensureLoaded = () => Promise.resolve(true);
  current = () => ({
    id: 'u1',
    username: 'minhtai',
    displayName: 'Minh Tài',
    email: 'ban@vidu.com',
    dateOfBirth: '2000-01-01',
  });
  reset = () => undefined;
}

class ConversationsApiServiceStub {
  getOrCreateDm = () => Promise.resolve({ id: 'conv-1', type: 'dm', unreadCount: 0, createdAt: '' });
  listConversations = () => Promise.resolve([]);
  getConversation = (id: string) =>
    id === 'khong-co-that'
      ? Promise.reject(new Error('Not found'))
      : Promise.resolve({ id, type: 'dm', unreadCount: 0, createdAt: '' });
}

class MessagesApiServiceStub {
  getMessages = () => Promise.resolve({ messages: [], hasMore: false });
  sendMessage = () => Promise.resolve({ id: '1', content: '' });
  editMessage = () => Promise.resolve({ id: '1', content: '' });
  deleteMessage = () => Promise.resolve({ id: '1', deleted: true });
  getAttachmentSignedUrl = () => Promise.resolve({ signedUrl: '' });
  markAsRead = () => Promise.resolve({ success: true });
}

class ServersApiServiceStub {
  createServer = () =>
    Promise.resolve({
      server: { id: 's1', name: 'Server 1', iconUrl: null, unread: false, mentionCount: 0 },
      defaultChannel: {
        id: 'c1',
        name: 'chung',
        type: 'text' as const,
        topic: null,
        unread: false,
        mentionCount: 0,
      },
    });
  listServers = () => Promise.resolve([]);
  listPendingInvitations = () => Promise.resolve([]);
}

class FriendsStoreStub {
  friends = signal([]).asReadonly();
  incomingRequests = signal([]).asReadonly();
  outgoingRequests = signal([]).asReadonly();
  loading = signal(false).asReadonly();
  sending = signal(false).asReadonly();
  busyIds = signal<ReadonlySet<string>>(new Set()).asReadonly();
  error = signal<string | null>(null).asReadonly();
  feedback = signal<string | null>(null).asReadonly();
  load = () => Promise.resolve();
  sendRequest = () => Promise.resolve(true);
  acceptRequest = () => Promise.resolve();
  deleteRequest = () => Promise.resolve();
  removeFriend = () => Promise.resolve();
  clearFeedback = () => undefined;
}

import { Subject } from 'rxjs';

class ChatSocketServiceStub {
  connect = vi.fn();
  disconnect = vi.fn();
  emitActivity = vi.fn();
  getServerVoiceStates = vi.fn().mockResolvedValue([]);
  isConnected = signal(true).asReadonly();
  messageCreated$ = new Subject<any>();
  messageUpdated$ = new Subject<any>();
  messageDeleted$ = new Subject<any>();
  messageHiddenForUser$ = new Subject<any>();
  reactionUpdated$ = new Subject<any>();
  presenceSync$ = new Subject<any>();
  userPresenceUpdated$ = new Subject<any>();
  conversationUpdated$ = new Subject<any>();
  conversationDeleted$ = new Subject<any>();
  messageRead$ = new Subject<any>();
  messagePinUpdated$ = new Subject<any>();
  invitationReceived$ = new Subject<any>();
  invitationUpdated$ = new Subject<any>();
  channelsInvalidated$ = new Subject<any>();
  serverDeleted$ = new Subject<any>();
  serverMemberLeft$ = new Subject<any>();
  typingUpdated$ = new Subject<any>();
  channelTypingUpdated$ = new Subject<any>();
  channelMessageCreated$ = new Subject<any>();
  channelMessageUpdated$ = new Subject<any>();
  channelMessageDeleted$ = new Subject<any>();
  channelReactionUpdated$ = new Subject<any>();
  joinError$ = new Subject<any>();
  presenceUpdated$ = new Subject<any>();
  voiceServerStatesSync$ = new Subject<any>();
  voiceStateUpdated$ = new Subject<any>();
  channelCreated$ = new Subject<any>();
  capabilitiesUpdated$ = new Subject<any>();
  channelPinsUpdated$ = new Subject<any>();
  channelMessageRead$ = new Subject<any>();
  channelThreadCreated$ = new Subject<any>();
  channelThreadUpdated$ = new Subject<any>();
  directCallIncoming$ = new Subject<any>();
  directCallRinging$ = new Subject<any>();
  directCallAccepted$ = new Subject<any>();
  directCallConnected$ = new Subject<any>();
  directCallDeclined$ = new Subject<any>();
  directCallCancelled$ = new Subject<any>();
  directCallEnded$ = new Subject<any>();
  directCallMissed$ = new Subject<any>();
  directCallBusy$ = new Subject<any>();
  directCallStateSync$ = new Subject<any>();
  joinChannel = vi.fn().mockResolvedValue({ status: 'joined', success: true });
  leaveChannel = vi.fn().mockResolvedValue(undefined);
  joinConversation = vi.fn().mockResolvedValue({ status: 'joined', success: true });
  leaveConversation = vi.fn().mockResolvedValue(undefined);
  joinServer = vi.fn().mockResolvedValue(undefined);
  leaveServer = vi.fn().mockResolvedValue(undefined);
}

class DirectCallsApiServiceStub {
  startCall = vi.fn().mockResolvedValue({ id: 'call-1', status: 'ringing' });
  answerCall = vi.fn().mockResolvedValue({ call: { id: 'call-1', status: 'accepted' }, shouldJoinMedia: true });
  declineCall = vi.fn().mockResolvedValue({ id: 'call-1', status: 'declined' });
  cancelCall = vi.fn().mockResolvedValue({ id: 'call-1', status: 'cancelled' });
  endCall = vi.fn().mockResolvedValue({ id: 'call-1', status: 'ended' });
  getActiveCall = vi.fn().mockResolvedValue({ call: null });
  getToken = vi.fn().mockResolvedValue({ serverUrl: '', participantToken: '', roomName: '', participantIdentity: '', participantName: '' });
  getHistory = vi.fn().mockResolvedValue([]);
}

import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';

describe('AppLayout', () => {
  let harness: RouterTestingHarness;
  let chatSocketStub: ChatSocketServiceStub;
  let breakpointSubject$: BehaviorSubject<BreakpointState>;

  const text = () => harness.fixture?.nativeElement?.textContent ?? '';
  const query = (selector: string) =>
    harness.fixture?.nativeElement?.querySelector(selector) ?? null;
  const queryAll = (selector: string) =>
    harness.fixture?.nativeElement
      ? Array.from(harness.fixture.nativeElement.querySelectorAll(selector))
      : [];

  beforeEach(async () => {
    document.body.innerHTML = '';
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    chatSocketStub = new ChatSocketServiceStub();
    breakpointSubject$ = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'channels', children: dashboardRoutes }]),
        {
          provide: BreakpointObserver,
          useValue: {
            observe: vi.fn().mockReturnValue(breakpointSubject$.asObservable()),
            isMatched: vi.fn().mockImplementation(() => breakpointSubject$.value.matches),
          },
        },
        { provide: AuthService, useValue: new AuthServiceStub() },
        { provide: ProfileService, useValue: new ProfileServiceStub() },
        { provide: ServersApiService, useValue: new ServersApiServiceStub() },
        { provide: FriendsStore, useValue: new FriendsStoreStub() },
        { provide: ConversationsApiService, useValue: new ConversationsApiServiceStub() },
        { provide: MessagesApiService, useValue: new MessagesApiServiceStub() },
        { provide: ChatSocketService, useValue: chatSocketStub },
        { provide: DirectCallsApiService, useValue: new DirectCallsApiServiceStub() },
      ],
    });
    const layoutService = TestBed.inject(DashboardLayoutService);
    layoutService.updateContainerWidth(1280);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('dựng đủ server rail và sidebar theo cấu trúc hiện có', async () => {
    await harness.navigateByUrl('/channels/@me');

    expect(query('app-server-rail')).toBeTruthy();
    expect(query('app-channel-sidebar')).toBeTruthy();
    expect(query('.dashboard-nav-shell')).toBeTruthy();
    expect(query('.dashboard-workspace')).toBeTruthy();
    expect(query('.dashboard-nav-shell')?.classList.contains('overflow-hidden')).toBe(true);
    expect(query('.dashboard-workspace')?.classList.contains('h-full')).toBe(true);
    expect(query('.dashboard-content')).toBeTruthy();
  });

  it('tài khoản mới có danh sách bạn bè, DM và hoạt động đều rỗng', async () => {
    await harness.navigateByUrl('/channels/@me');

    expect(text()).toContain('Danh sách đang trống');
    expect(text()).toContain('Chưa có cuộc trò chuyện');
    expect(text()).toContain('Hiện khá yên tĩnh');
    expect(queryAll('app-friend-row').length).toBe(0);
    expect(queryAll('[data-server-id]').length).toBe(0);
  });

  it('server rail vẫn có DM, tìm kiếm và thêm server khi dữ liệu rỗng', async () => {
    await harness.navigateByUrl('/channels/@me');

    expect(query('a[href="/channels/@me"]')).toBeTruthy();
    expect(query('[data-action="global-search"]')).toBeTruthy();
    expect(query('button[aria-label="Thêm máy chủ"]')).toBeTruthy();
  });

  it('route cuộc trò chuyện không có dữ liệu báo lỗi rõ ràng', async () => {
    await harness.navigateByUrl('/channels/@me/khong-co-that');

    expect(text()).toContain('Không tìm thấy cuộc trò chuyện này');
  });

  it('route kênh không có dữ liệu không dựng composer hoặc wallpaper giả', async () => {
    await harness.navigateByUrl('/channels/server-chua-tai/kenh-chua-tai');

    expect(text()).toContain('Không tìm thấy kênh này');
    expect(query('app-message-composer')).toBeFalsy();
    expect(query('[data-chat-wallpaper]')).toBeFalsy();
  });

  it('khối người dùng có tên thật cùng mic, loa và settings', async () => {
    await harness.navigateByUrl('/channels/@me');

    expect(query('app-user-panel')?.textContent).toContain('Minh Tài');
    expect(queryAll('app-user-panel button[aria-pressed]').length).toBe(2);
    const settings = query(
      'app-user-panel button.user-panel__control--settings',
    ) as HTMLButtonElement;
    expect(settings).toBeTruthy();
    expect(settings.disabled).toBe(false);
  });

  it('khi tải AppLayout, kết nối chat socket và gán active user trên ServersStore', async () => {
    await harness.navigateByUrl('/channels/@me');
    const serversStore = TestBed.inject(ServersStore);

    expect(chatSocketStub.connect).toHaveBeenCalled();
    expect(serversStore.activeUserId()).toBe('u1');
  });

  it('điều hướng qua lại giữa các route không tạo nhiều kết nối socket trùng lặp', async () => {
    await harness.navigateByUrl('/channels/@me');
    expect(chatSocketStub.connect).toHaveBeenCalledTimes(1);

    await harness.navigateByUrl('/channels/s1/c1');
    await harness.navigateByUrl('/channels/@me');

    // Socket connection là idempotent và chỉ được gọi khởi tạo khi AppLayout mount
    expect(chatSocketStub.connect).toHaveBeenCalledTimes(1);
  });

  it('giữ light mode khi chuyển qua kênh và quay lại trang bạn bè', async () => {
    await harness.navigateByUrl('/channels/@me');
    const themeButton = query(
      'button[aria-label="Chuyển sang giao diện sáng"]',
    ) as HTMLButtonElement;

    themeButton.click();
    TestBed.tick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('nexuscord-theme')).toBe('light');

    await harness.navigateByUrl('/channels/server-chua-tai/kenh-chua-tai');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await harness.navigateByUrl('/channels/@me');
    expect(query('button[aria-label="Chuyển sang giao diện tối"]')).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('hiển thị thanh kéo chia pane với thuộc tính ARIA và hỗ trợ phím mũi tên', async () => {
    await harness.navigateByUrl('/channels/@me');

    const handle = query('.pane-resize-handle--nav') as HTMLElement;
    expect(handle).toBeTruthy();
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-valuenow')).toBe('280');

    // Phím ArrowRight tăng độ rộng 8px
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    TestBed.tick();
    expect(handle.getAttribute('aria-valuenow')).toBe('288');

    // Shift + ArrowLeft giảm độ rộng 32px
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }));
    TestBed.tick();
    expect(handle.getAttribute('aria-valuenow')).toBe('256');

    // Double click reset về 280px
    handle.dispatchEvent(new MouseEvent('dblclick'));
    TestBed.tick();
    expect(handle.getAttribute('aria-valuenow')).toBe('280');
  });

  it('trên tablet/desktop (viewport >= 768px): hiển thị desktop navigation và không render nút hamburger trong DOM', async () => {
    const layoutService = TestBed.inject(DashboardLayoutService);
    layoutService.updateContainerWidth(768);
    breakpointSubject$.next({ matches: false, breakpoints: {} });
    await harness.navigateByUrl('/channels/@me');
    harness.detectChanges();

    expect(query('.dashboard-desktop-nav-shell')).toBeTruthy();
    expect(query('app-server-rail')).toBeTruthy();
    expect(query('app-channel-sidebar')).toBeTruthy();
    expect(query('.pane-resize-handle--nav')).toBeTruthy();
    // Nút hamburger hoàn toàn không tồn tại trong DOM
    expect(query('.dashboard-mobile-menu-trigger')).toBeNull();
    expect(query('mat-sidenav-container.dashboard-mobile-container')).toBeNull();
  });

  it('trên mobile (viewport < 768px): chuyển sang drawer và hiển thị nút hamburger nằm trọn trong workspace', async () => {
    const layoutService = TestBed.inject(DashboardLayoutService);
    layoutService.updateContainerWidth(375);
    breakpointSubject$.next({ matches: true, breakpoints: {} });
    await harness.navigateByUrl('/channels/@me');
    harness.detectChanges();

    // Desktop nav shell không còn trong DOM chính
    expect(query('.dashboard-desktop-nav-shell')).toBeNull();

    // Mobile container và drawer xuất hiện
    expect(query('mat-sidenav-container.dashboard-mobile-container')).toBeTruthy();

    // Nút hamburger nằm trọn bên trong dashboard-workspace
    const workspace = query('.dashboard-workspace') as HTMLElement;
    expect(workspace).toBeTruthy();
    expect(workspace.classList.contains('relative')).toBe(true);

    const hamburger = query('.dashboard-workspace .dashboard-mobile-menu-trigger') as HTMLButtonElement;
    expect(hamburger).toBeTruthy();
    expect(hamburger.getAttribute('type')).toBe('button');
    expect(hamburger.getAttribute('aria-label')).toBe('Mở danh sách kênh');
  });

  it('trên mobile: bấm nút hamburger kích hoạt toggle drawer', async () => {
    const layoutService = TestBed.inject(DashboardLayoutService);
    layoutService.updateContainerWidth(375);
    breakpointSubject$.next({ matches: true, breakpoints: {} });
    await harness.navigateByUrl('/channels/@me');
    harness.detectChanges();

    const hamburger = query('.dashboard-workspace .dashboard-mobile-menu-trigger') as HTMLButtonElement;
    expect(hamburger).toBeTruthy();

    hamburger.click();
    harness.detectChanges();

    const drawer = query('mat-sidenav.dashboard-nav-drawer') as HTMLElement;
    expect(drawer).toBeTruthy();
  });
});
