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
import { ChannelPage } from './channel';

const SHELL_STUB = {
  channelOf: (serverId: string, channelId: string) => {
    if (serverId !== 'itss') {
      return undefined;
    }
    if (channelId === 'do-an') {
      return {
        id: 'do-an',
        name: 'đồ-án',
        type: 'text' as const,
        topic: 'Nexus — tiến độ tuần',
        unread: false,
        mentionCount: 0,
      };
    }
    if (channelId === 'standup') {
      return {
        id: 'standup',
        name: 'Standup',
        type: 'voice' as const,
        topic: null,
        unread: false,
        mentionCount: 0,
      };
    }
    return undefined;
  },
};

describe('ChannelPage', () => {
  const mount = async (path: string, demo = false, uiState: DashboardUiStateName = 'ready') => {
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
        provideRouter([{ path: 'c/:serverId/:channelId', component: ChannelPage }]),
        { provide: ShellData, useValue: shell },
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
    expect(harness.routeNativeElement!.querySelector('[data-demo-message]')).toBeFalsy();
  });

  it('chỉ render timeline Nexus Thread khi người dùng chủ động bật demo', async () => {
    const harness = await mount('itss/do-an', true);

    expect(harness.routeNativeElement!.querySelectorAll('[data-demo-message]')).toHaveLength(3);
    expect(harness.routeNativeElement!.querySelectorAll('app-message-actions')).toHaveLength(3);
    expect(harness.routeNativeElement!.querySelector('.message-reply')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('.nexus-unread-divider')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('.reaction-chip')).toBeTruthy();

    const reply = harness.routeNativeElement!.querySelector(
      'app-message-actions button[aria-label="Trả lời"]',
    ) as HTMLButtonElement;
    reply.click();
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.composer-context')?.textContent).toContain(
      'Trả lời Phan Thế Mon',
    );
  });

  it('kênh thoại KHÔNG có ô soạn tin', async () => {
    const harness = await mount('itss/standup');

    expect(harness.routeNativeElement!.textContent).toContain('Chưa có ai trong kênh thoại này');
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
});
