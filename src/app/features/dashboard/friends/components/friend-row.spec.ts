import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { ConversationSummary } from '../../../../core/api/shell-data';
import { ConversationsApiService } from '../../../../core/api/conversations-api.service';
import { ShellData } from '../../../../core/api/shell-data';
import { FriendRow } from './friend-row';

const NGUOI: ConversationSummary = {
  id: 'ho-be',
  name: 'ho_be',
  statusMessage: 'shut the fckup',
  presence: 'dnd',
  unread: false,
};

@Component({
  imports: [FriendRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <app-friend-row [person]="person()" /> `,
})
class Host {
  readonly person = signal<ConversationSummary>(NGUOI);
}

describe('FriendRow', () => {
  let mockConversationsApi: { getOrCreateDm: any };
  let mockShell: { demoEnabled: any };
  let router: Router;

  beforeEach(() => {
    mockConversationsApi = {
      getOrCreateDm: vi.fn().mockResolvedValue({
        id: 'conv-123',
        type: 'dm',
        recipient: { id: 'ho-be', name: 'ho_be' },
        unreadCount: 0,
        createdAt: new Date().toISOString(),
      }),
    };
    mockShell = {
      demoEnabled: vi.fn().mockReturnValue(false),
    };
  });

  const mount = async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([]),
        { provide: ConversationsApiService, useValue: mockConversationsApi },
        { provide: ShellData, useValue: mockShell },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('cả hàng là vùng bấm mở cuộc trò chuyện DM thật', async () => {
    const fixture = await mount();
    const rowBtn = fixture.nativeElement.querySelector(
      'button[aria-label="Nhắn tin cho ho_be"]',
    ) as HTMLButtonElement;

    expect(rowBtn).toBeTruthy();
    expect(rowBtn.textContent).toContain('ho_be');

    rowBtn.click();
    await fixture.whenStable();

    expect(mockConversationsApi.getOrCreateDm).toHaveBeenCalledWith('ho-be');
    expect(router.navigate).toHaveBeenCalledWith(['/channels/@me', 'conv-123']);
  });

  it('click icon chat cũng mở cuộc trò chuyện DM thật', async () => {
    const fixture = await mount();
    const actionBtns = fixture.nativeElement.querySelectorAll(
      'button[aria-label="Nhắn tin cho ho_be"]',
    );
    const chatIconBtn = actionBtns[1] as HTMLButtonElement; // button icon chat bên phải

    expect(chatIconBtn).toBeTruthy();

    chatIconBtn.click();
    await fixture.whenStable();

    expect(mockConversationsApi.getOrCreateDm).toHaveBeenCalledWith('ho-be');
    expect(router.navigate).toHaveBeenCalledWith(['/channels/@me', 'conv-123']);
  });

  it('hiển thị thông báo lỗi và nút Thử lại khi gọi getOrCreateDm thất bại', async () => {
    mockConversationsApi.getOrCreateDm = vi
      .fn()
      .mockRejectedValue(new Error('Lỗi kết nối máy chủ'));

    const fixture = await mount();
    const rowBtn = fixture.nativeElement.querySelector(
      'button[aria-label="Nhắn tin cho ho_be"]',
    ) as HTMLButtonElement;

    rowBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('Lỗi kết nối máy chủ');
    expect(alert.textContent).toContain('Thử lại');

    // Bấm Thử lại sau khi API phục hồi
    mockConversationsApi.getOrCreateDm.mockResolvedValueOnce({
      id: 'conv-retry-ok',
      type: 'dm',
    });

    const retryBtn = alert.querySelector('button') as HTMLButtonElement;
    retryBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/channels/@me', 'conv-retry-ok']);
  });

  it('chống double-click không gọi API lặp nhiều lần', async () => {
    let resolvePromise: (value: any) => void;
    mockConversationsApi.getOrCreateDm = vi.fn().mockReturnValue(
      new Promise((res) => {
        resolvePromise = res;
      }),
    );

    const fixture = await mount();
    const rowBtn = fixture.nativeElement.querySelector(
      'button[aria-label="Nhắn tin cho ho_be"]',
    ) as HTMLButtonElement;

    // Click 2 lần liên tiếp
    rowBtn.click();
    rowBtn.click();

    expect(mockConversationsApi.getOrCreateDm).toHaveBeenCalledTimes(1);

    // Hoàn thành promise
    resolvePromise!({ id: 'conv-123', type: 'dm' });
    await fixture.whenStable();
  });

  it('ở chế độ demo, điều hướng trực tiếp theo ID mock mà không gọi API', async () => {
    mockShell.demoEnabled.mockReturnValue(true);
    const fixture = await mount();
    const rowBtn = fixture.nativeElement.querySelector(
      'button[aria-label="Nhắn tin cho ho_be"]',
    ) as HTMLButtonElement;

    rowBtn.click();
    await fixture.whenStable();

    expect(mockConversationsApi.getOrCreateDm).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/channels/@me', 'ho-be']);
  });

  it('nút ba chấm mở menu đúng người bạn với đủ nhóm tùy chọn', async () => {
    const fixture = await mount();
    const trigger = fixture.nativeElement.querySelector(
      'button[aria-label="Tùy chọn cho ho_be"]',
    ) as HTMLButtonElement;

    expect(trigger.disabled).toBe(false);
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const menu = document.body.querySelector(
      '.nexus-friend-options-menu',
    ) as HTMLElement;
    expect(menu).toBeTruthy();
    expect(menu.textContent).toContain('ho_be');
    expect(menu.textContent).toContain('Bản xem trước · chờ kết nối');
    expect(menu.textContent).toContain('Gọi thoại');
    expect(menu.textContent).toContain('Tắt thông báo');
    expect(menu.textContent).toContain('Xóa khỏi danh sách bạn');
  });

  it('chỉ bật hành động xóa bạn thuộc Phase Friends, các action khác vẫn khóa', async () => {
    const fixture = await mount();
    const trigger = fixture.nativeElement.querySelector(
      'button[aria-label="Tùy chọn cho ho_be"]',
    ) as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const actions = Array.from(
      document.body.querySelectorAll(
        '.nexus-friend-options-menu button[mat-menu-item]',
      ),
    ) as HTMLButtonElement[];
    expect(actions).toHaveLength(6);
    expect(actions.filter((action) => action.disabled)).toHaveLength(5);
    expect(
      actions.find((action) =>
        action.textContent?.includes('Xóa khỏi danh sách bạn'),
      )?.disabled,
    ).toBe(false);
  });

  it('hàng bạn bè dùng state hover/focus tương phản chung', async () => {
    const fixture = await mount();
    const row = fixture.nativeElement.querySelector('article') as HTMLElement;

    expect(row.classList.contains('nexus-interactive-row')).toBe(true);
  });

  const phuDe = (fixture: { nativeElement: HTMLElement }) =>
    fixture.nativeElement.querySelector('.text-caption')?.textContent?.trim();

  it('navigation thất bại hiển thị thông báo lỗi và dọn spinner', async () => {
    const fixture = await mount();
    vi.spyOn(router, 'navigate').mockResolvedValue(false);
    const row = fixture.debugElement.children[0].componentInstance as FriendRow;

    await row.onOpenDm();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('Không thể chuyển đến cuộc trò chuyện.');
    expect(row.openingDm()).toBe(false);
  });

  it('bấm nút x đóng thông báo lỗi', async () => {
    mockConversationsApi.getOrCreateDm.mockRejectedValueOnce(
      new Error('Mạng không ổn định'),
    );
    const fixture = await mount();
    const rowBtn = fixture.nativeElement.querySelector(
      'button[aria-label="Nhắn tin cho ho_be"]',
    ) as HTMLButtonElement;

    rowBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector(
      'button[aria-label="Đóng thông báo lỗi"]',
    ) as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    closeBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('ưu tiên câu trạng thái người dùng tự đặt', async () => {
    const fixture = await mount();

    expect(phuDe(fixture)).toBe('shut the fckup');
  });

  it('không có câu trạng thái thì hiện trạng thái hệ thống', async () => {
    const fixture = await mount();
    fixture.componentInstance.person.set({ ...NGUOI, statusMessage: null });
    fixture.detectChanges();

    expect(phuDe(fixture)).toBe('Không làm phiền');
  });
});
