import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ShellData } from '../../../core/api/shell-data';
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
  const mount = async (id: string, demo = false) => {
    const shell = {
      ...SHELL_STUB,
      demoEnabled: signal(demo).asReadonly(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'dm/:conversationId', component: ConversationPage }]),
        { provide: ShellData, useValue: shell },
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
    expect(harness.routeNativeElement!.querySelector('[data-demo-message]')).toBeFalsy();
  });

  it('demo ON hiển thị timeline DM nhưng không thêm panel Profile', async () => {
    const harness = await mount('ho-be', true);

    expect(harness.routeNativeElement!.querySelectorAll('[data-demo-message]')).toHaveLength(3);
    expect(harness.routeNativeElement!.querySelector('.message-reply')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('.nexus-unread-divider')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('app-context-panel')).toBeNull();
  });

  it('không dựng panel hoặc action hồ sơ thuộc ownership của trang Profile', async () => {
    const harness = await mount('ho-be');

    expect(harness.routeNativeElement!.querySelector('app-context-panel')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('button[aria-expanded]')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('button[aria-label^="Xem hồ sơ"]')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('app-avatar')).toBeTruthy();
  });

  it('id không tồn tại thì báo rõ thay vì màn hình trắng', async () => {
    const harness = await mount('khong-co-that');

    expect(harness.routeNativeElement!.textContent).toContain('Không tìm thấy cuộc trò chuyện');
  });
});
