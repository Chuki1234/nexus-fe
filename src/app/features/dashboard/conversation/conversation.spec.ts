import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ShellData } from '../../../core/api/shell-data';
import {
  DashboardUiState,
  type DashboardBlockingState,
  type DashboardConnectionState,
  type DashboardUiStateName,
} from '../services/dashboard-ui-state';
import { ConversationPage } from './conversation';

const SHELL_STUB = {
  conversationOf: (id: string) =>
    id === 'ho-be'
      ? {
          id: 'ho-be',
          name: 'ho_be',
          statusMessage: 'Đang thử NexusCord',
          presence: 'online' as const,
          unread: false,
        }
      : undefined,
};

describe('ConversationPage', () => {
  const mount = async (id: string, demo = false, uiState: DashboardUiStateName = 'ready') => {
    const shell = {
      ...SHELL_STUB,
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
        provideRouter([{ path: 'dm/:conversationId', component: ConversationPage }]),
        { provide: ShellData, useValue: shell },
        {
          provide: DashboardUiState,
          useValue: { blockingState, connectionState, clearPreview: async () => true },
        },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/dm/${id}`);
    return harness;
  };

  it('mở đúng cuộc trò chuyện theo id trên URL', async () => {
    const harness = await mount('ho-be');

    expect(harness.routeNativeElement!.textContent).toContain('ho_be');
    expect(harness.routeNativeElement!.textContent).toContain('Đang thử NexusCord');
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
    expect(harness.routeNativeElement!.querySelector('[data-demo-message]')).toBeFalsy();
  });

  it('demo ON hiển thị timeline DM kèm panel hồ sơ bên phải', async () => {
    const harness = await mount('ho-be', true);

    expect(harness.routeNativeElement!.querySelectorAll('[data-demo-message]')).toHaveLength(3);
    expect(harness.routeNativeElement!.querySelectorAll('app-message-actions')).toHaveLength(3);
    expect(harness.routeNativeElement!.querySelector('.message-reply')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('.nexus-unread-divider')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('app-context-panel')).toBeTruthy();

    const ownMessageEdit = harness.routeNativeElement!.querySelectorAll(
      'app-message-actions',
    )[1] as HTMLElement;
    expect(ownMessageEdit).toBeTruthy();
    expect(ownMessageEdit.querySelector('button[aria-label="Thêm thao tác"]')).toBeTruthy();
  });

  /**
   * Test này trước đây khẳng định trang DM KHÔNG có panel hồ sơ — ranh giới
   * giữ chỗ trong lúc trang Profile chưa dựng xong.
   *
   * Giờ Profile đã có `ProfilePanel`, và trang DM chỉ GẮN component đó vào chứ
   * không tự viết lại markup hồ sơ — đúng tinh thần của ranh giới cũ. Phần còn
   * giá trị là: khung chat không được tự dựng avatar/tiểu sử theo kiểu riêng.
   */
  it('gắn panel hồ sơ của feature Profile, không tự dựng markup hồ sơ', async () => {
    const harness = await mount('ho-be');

    expect(harness.routeNativeElement!.querySelector('app-context-panel')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('app-profile-panel')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('app-avatar')).toBeTruthy();
  });

  it('id không tồn tại thì báo rõ thay vì màn hình trắng', async () => {
    const harness = await mount('khong-co-that');

    expect(harness.routeNativeElement!.textContent).toContain('Không tìm thấy cuộc trò chuyện');
  });

  it('forbidden thay toàn bộ cuộc trò chuyện bằng trạng thái quyền truy cập', async () => {
    const harness = await mount('ho-be', false, 'forbidden');

    expect(
      harness.routeNativeElement!.querySelector('[data-dashboard-state="forbidden"]'),
    ).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('app-message-composer')).toBeNull();
  });

  it('offline vẫn giữ nội dung DM đang mở', async () => {
    const harness = await mount('ho-be', false, 'offline');

    expect(
      harness.routeNativeElement!.querySelector('[data-dashboard-state="offline"]'),
    ).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('app-message-composer')).toBeTruthy();
  });
});
