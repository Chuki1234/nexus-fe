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
  const mount = async (id: string) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'dm/:conversationId', component: ConversationPage }]),
        { provide: ShellData, useValue: SHELL_STUB },
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
