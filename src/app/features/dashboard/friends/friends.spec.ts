import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ConversationSummary } from '../../../core/conversations/conversation.models';
import {
  DashboardUiState,
  type DashboardBlockingState,
  type DashboardConnectionState,
  type DashboardUiStateName,
} from '../services/dashboard-ui-state';
import { FriendsPage } from './friends';
import { FriendsStore } from './services/friends-store';

describe('FriendsPage', () => {
  const PEOPLE: ConversationSummary[] = [
    {
      id: 'mai',
      name: 'Mai',
      statusMessage: 'Đang học Angular',
      presence: 'online',
      unread: false,
    },
    {
      id: 'nam',
      name: 'Nam',
      statusMessage: null,
      presence: 'offline',
      unread: false,
    },
  ];

  const mount = async (
    people: ConversationSummary[] = [],
    uiState: DashboardUiStateName = 'ready',
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
    const friendStore = {
      friends: signal(people).asReadonly(),
      incomingRequests: signal([]).asReadonly(),
      outgoingRequests: signal([]).asReadonly(),
      loading: signal(false).asReadonly(),
      sending: signal(false).asReadonly(),
      busyIds: signal<ReadonlySet<string>>(new Set()).asReadonly(),
      error: signal<string | null>(null).asReadonly(),
      feedback: signal<string | null>(null).asReadonly(),
      load: vi.fn().mockResolvedValue(undefined),
      sendFriendRequest: vi.fn().mockResolvedValue(true),
      acceptFriendRequest: vi.fn().mockResolvedValue(undefined),
      declineFriendRequest: vi.fn().mockResolvedValue(undefined),
      cancelFriendRequest: vi.fn().mockResolvedValue(undefined),
      removeFriend: vi.fn().mockResolvedValue(undefined),
      clearFeedback: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [FriendsPage],
      providers: [
        provideRouter([]),
        { provide: FriendsStore, useValue: friendStore },
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
    ).toBe(true);
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
    const buttons = fixture.nativeElement.querySelectorAll('[role=group] button');
    (buttons[3] as HTMLButtonElement).click();
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

  it('activity panel luôn mở cố định, có thanh co giãn và không có nút đóng X', async () => {
    const fixture = await mount();

    const panel = fixture.nativeElement.querySelector('app-context-panel aside') as HTMLElement;
    expect(panel.classList.contains('context-panel--open')).toBe(true);

    // Không có nút X đóng
    expect(fixture.nativeElement.querySelector('.context-panel__close')).toBeNull();

    // Có thanh co giãn
    expect(fixture.nativeElement.querySelector('.pane-resize-handle--member')).toBeTruthy();
  });

  it('không dựng hồ sơ nhanh thuộc ownership của trang Profile', async () => {
    const fixture = await mount(PEOPLE);

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
});
