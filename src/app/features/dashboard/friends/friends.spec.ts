import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ConversationSummary } from '../../../core/conversations/conversation.models';
import { ServerInvitationsStore } from '../../../core/servers/server-invitations.store';
import type { DirectServerInvitationDto } from '../../../../shared/dto/server-invitations.dto';
import {
  DashboardUiState,
  type DashboardBlockingState,
  type DashboardConnectionState,
  type DashboardUiStateName,
} from '../services/dashboard-ui-state';
import { FriendsPage } from './friends';
import { FriendsStore } from './services/friends-store';
import { PresenceService } from '../../../core/presence/presence.service';

describe('FriendsPage', () => {
  const PEOPLE: ConversationSummary[] = [
    {
      id: 'mai',
      name: 'Mai',
      username: null,
      statusMessage: 'Đang học Angular',
      presence: 'online',
      unread: false,
    },
    {
      id: 'nam',
      name: 'Nam',
      username: null,
      statusMessage: null,
      presence: 'offline',
      unread: false,
    },
  ];

  const mount = async (
    people: ConversationSummary[] = [],
    uiState: DashboardUiStateName = 'ready',
    serverInvites: DirectServerInvitationDto[] = [],
  ) => {
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
    const blockedSignal = signal<any[]>([]);
    const loadingBlockedSignal = signal(false);
    const errorSignal = signal<string | null>(null);

    const friendStore = {
      friends: signal(people).asReadonly(),
      incomingRequests: signal([]).asReadonly(),
      outgoingRequests: signal([]).asReadonly(),
      blocked: blockedSignal.asReadonly(),
      loading: signal(false).asReadonly(),
      loadingBlocked: loadingBlockedSignal.asReadonly(),
      sending: signal(false).asReadonly(),
      busyIds: signal<ReadonlySet<string>>(new Set()).asReadonly(),
      error: errorSignal.asReadonly(),
      feedback: signal<string | null>(null).asReadonly(),
      load: vi.fn().mockResolvedValue(undefined),
      loadBlocked: vi.fn().mockResolvedValue(undefined),
      sendFriendRequest: vi.fn().mockResolvedValue(true),
      acceptFriendRequest: vi.fn().mockResolvedValue(undefined),
      declineFriendRequest: vi.fn().mockResolvedValue(undefined),
      cancelFriendRequest: vi.fn().mockResolvedValue(undefined),
      removeFriend: vi.fn().mockResolvedValue(undefined),
      unblockUser: vi.fn().mockResolvedValue(true),
      clearFeedback: vi.fn(),
      _blockedSignal: blockedSignal,
      _loadingBlockedSignal: loadingBlockedSignal,
      _errorSignal: errorSignal,
    };
    const serverInvitationsStore = {
      pendingInvitations: signal(serverInvites),
      pendingCount: signal(serverInvites.length).asReadonly(),
      isLoading: signal(false).asReadonly(),
      error: signal<string | null>(null).asReadonly(),
      hydrateInvitations: vi.fn().mockResolvedValue(undefined),
      acceptInvitation: vi.fn().mockResolvedValue({ success: true, serverId: 's1', alreadyMember: false }),
      declineInvitation: vi.fn().mockResolvedValue({ success: true }),
    };
    const presenceByUser = new Map(people.map((person) => [person.id, person.presence]));
    await TestBed.configureTestingModule({
      imports: [FriendsPage],
      providers: [
        provideRouter([]),
        { provide: FriendsStore, useValue: friendStore },
        { provide: ServerInvitationsStore, useValue: serverInvitationsStore },
        {
          provide: PresenceService,
          useValue: {
            resolvePresence: (userId: string) => presenceByUser.get(userId) ?? 'offline',
            getLastSeenLabel: () => signal(null),
          },
        },
        {
          provide: DashboardUiState,
          useValue: { blockingState, connectionState, clearPreview: async () => true },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(FriendsPage);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  const timKiem = (fixture: { nativeElement: HTMLElement }, tu: string) => {
    const input = fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement;
    input.value = tu;
    input.dispatchEvent(new Event('input'));
  };

  it('tài khoản mới hiển thị danh sách bạn bè rỗng', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.querySelectorAll('app-friend-row').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Danh sách đang trống');
    expect(fixture.nativeElement.querySelector('.friends-content')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('main')?.classList.contains('nexus-scrollbar')).toBe(
      true,
    );
    expect(
      fixture.nativeElement
        .querySelector('app-context-panel aside')
        ?.classList.contains('context-panel--open'),
    ).toBe(false);
  });

  it('lọc theo tên khi gõ vào ô tìm kiếm', async () => {
    const fixture = await mount(PEOPLE);
    timKiem(fixture, 'Mai');
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('app-friend-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Mai');
  });

  it('không ai khớp thì nói rõ đã tìm từ gì', async () => {
    const fixture = await mount();
    timKiem(fixture, 'khong-co-ai-ten-nay');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('khong-co-ai-ten-nay');
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
  });

  it('tab Trực tuyến loại người đang ngoại tuyến', async () => {
    const fixture = await mount(PEOPLE);
    const online = fixture.nativeElement.querySelector('[role=group] button') as HTMLButtonElement;

    const truoc = fixture.nativeElement.querySelectorAll('app-friend-row').length;
    online.click();
    fixture.detectChanges();
    const sau = fixture.nativeElement.querySelectorAll('app-friend-row').length;

    expect(sau).toBeLessThan(truoc);
  });

  it('tab Chờ duyệt của tài khoản mới không có lời mời giả', async () => {
    const fixture = await mount();
    const buttons = fixture.nativeElement.querySelectorAll('[role=group] button');
    (buttons[2] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-friend-request-item')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('Đã xử lý hết');
  });

  it('tab Thêm bạn thay danh sách bằng form', async () => {
    const fixture = await mount();
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('[role=group] button'),
    ) as HTMLButtonElement[];
    const addFriendButton = buttons.find((btn) =>
      btn.textContent?.includes('Thêm bạn'),
    );
    addFriendButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-add-friend-form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[type=search]')).toBeFalsy();
  });

  it('đồng bộ light mode lên phần tử html', async () => {
    const fixture = await mount();
    const themeButton = fixture.nativeElement.querySelector(
      'button[aria-label="Chuyển sang giao diện sáng"]',
    ) as HTMLButtonElement;

    themeButton.click();
    fixture.detectChanges();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('activity panel hỗ trợ co giãn và đóng mở linh hoạt', async () => {
    const fixture = await mount();
    const component = fixture.componentInstance;
    component['contextView'].set('activity');
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('app-context-panel aside') as HTMLElement;
    expect(panel.classList.contains('context-panel--open')).toBe(true);

    // Có nút đóng
    expect(fixture.nativeElement.querySelector('.context-panel__close')).toBeTruthy();

    // Có thanh co giãn
    expect(fixture.nativeElement.querySelector('.pane-resize-handle--member')).toBeTruthy();

    // Nhấn nút đóng thì panel thu gọn
    const closeBtn = fixture.nativeElement.querySelector('.context-panel__close') as HTMLButtonElement;
    closeBtn.click();
    fixture.detectChanges();
    expect(panel.classList.contains('context-panel--open')).toBe(false);
  });

  it('không dựng hồ sơ nhanh thuộc ownership của trang Profile', async () => {
    const fixture = await mount(PEOPLE);
    const component = fixture.componentInstance;
    component['contextView'].set('activity');
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('app-context-panel') as HTMLElement;
    expect(fixture.nativeElement.querySelector('button[aria-label^="Xem hồ sơ nhanh"]')).toBeNull();
    expect(panel.textContent).toContain('Đang hoạt động');
    expect(panel.querySelector('app-member-panel')).toBeNull();
  });

  it('loading thay danh sách bằng skeleton đúng ngữ cảnh', async () => {
    const fixture = await mount(PEOPLE, 'loading');

    expect(fixture.nativeElement.querySelector('[data-dashboard-state="loading"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-skeleton-layout="list"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-friend-row')).toBeNull();
  });

  it('offline chỉ thêm banner và vẫn giữ danh sách đang xem', async () => {
    const fixture = await mount(PEOPLE, 'offline');

    expect(fixture.nativeElement.querySelector('[data-dashboard-state="offline"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('app-friend-row')).toHaveLength(2);
  });

  it('khi chuyển tab thì gọi clearFeedback để không hiển thị lỗi của tab cũ', async () => {
    const fixture = await mount(PEOPLE);
    const friendStore = TestBed.inject(FriendsStore);

    // Chuyển sang tab 'add'
    fixture.componentInstance['tab'].set('add');
    fixture.detectChanges();

    expect(friendStore.clearFeedback).toHaveBeenCalled();
  });

  it('người dùng có thể chủ động bấm nút toggle để mở lại activity panel', async () => {
    const fixture = await mount(PEOPLE);
    const component = fixture.componentInstance;
    component['contextView'].set(null);
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('app-context-panel aside') as HTMLElement;
    expect(panel.classList.contains('context-panel--open')).toBe(false);

    // Bấm nút toggle trên toolbar
    const toggleBtn = fixture.nativeElement.querySelector('button[aria-label="Hiện hoạt động bạn bè"]') as HTMLButtonElement;
    expect(toggleBtn).toBeTruthy();
    toggleBtn.click();
    fixture.detectChanges();

    expect(panel.classList.contains('context-panel--open')).toBe(true);
  });

  it('hiển thị danh sách lời mời máy chủ và xử lý chấp nhận/từ chối trong tab pending', async () => {
    const mockInvite: DirectServerInvitationDto = {
      id: 'inv-123',
      serverId: 'srv-1',
      serverName: 'Nexus Gaming Server',
      serverIconUrl: null,
      inviterId: 'user-1',
      inviterUsername: 'nexus_admin',
      inviterDisplayName: 'Nexus Admin',
      inviterAvatarUrl: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    const fixture = await mount(PEOPLE, 'ready', [mockInvite]);
    const invStore = TestBed.inject(ServerInvitationsStore);

    // Chuyển sang tab 'pending'
    fixture.componentInstance['tab'].set('pending');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Lời mời tham gia máy chủ');
    expect(fixture.nativeElement.textContent).toContain('Nexus Gaming Server');
    expect(fixture.nativeElement.querySelectorAll('app-server-invitation-item').length).toBe(1);

    // Chấp nhận lời mời
    await fixture.componentInstance['onAcceptServerInvite'](mockInvite);
    expect(invStore.acceptInvitation).toHaveBeenCalledWith('inv-123');

    // Từ chối lời mời
    await fixture.componentInstance['onDeclineServerInvite'](mockInvite);
    expect(invStore.declineInvitation).toHaveBeenCalledWith('inv-123');
  });

  it('tab Đã chặn hiển thị danh sách, skeleton khi loading, và retry gọi loadBlocked(true)', async () => {
    const fixture = await mount();
    const store = TestBed.inject(FriendsStore) as any;

    fixture.componentInstance['tab'].set('blocked');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Không có ai bị chặn');

    // 1. Loading state
    store._loadingBlockedSignal.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-dashboard-state')).toBeTruthy();

    store._loadingBlockedSignal.set(false);
    store._blockedSignal.set([
      {
        id: 'blocked-1',
        username: 'spammer',
        displayName: 'Spammer User',
        avatarUrl: null,
        blockedAt: new Date().toISOString(),
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Spammer User');
    expect(fixture.nativeElement.textContent).toContain('Bỏ chặn');

    // 2. Click retry khi có lỗi
    store._errorSignal.set('Lỗi nạp danh sách chặn');
    fixture.detectChanges();

    fixture.componentInstance['onRetry']();
    expect(store.loadBlocked).toHaveBeenCalledWith(true);
  });
});
