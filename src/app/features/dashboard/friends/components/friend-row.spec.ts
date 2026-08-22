import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ConversationSummary } from '../../../../core/api/shell-data';
import { FriendRow } from './friend-row';

const NGUOI: ConversationSummary = {
  id: 'ho-be',
  name: 'ho_be',
  username: null,
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
  const mount = async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('cả hàng là một link tới cuộc trò chuyện', async () => {
    const fixture = await mount();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    // Vùng bấm phải là cả hàng, không chỉ mỗi cái tên.
    expect(link.getAttribute('href')).toBe('/channels/@me/ho-be');
    expect(link.textContent).toContain('ho_be');
  });

  it('có action nhắn tin với nhãn truy cập được', async () => {
    const fixture = await mount();
    const action = fixture.nativeElement.querySelector(
      'a[aria-label="Nhắn tin cho ho_be"]',
    ) as HTMLAnchorElement;

    expect(action.getAttribute('href')).toBe('/channels/@me/ho-be');
    expect(action.classList.contains('nexus-icon-control')).toBe(true);
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

    const menu = document.body.querySelector('.nexus-friend-options-menu') as HTMLElement;
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
      document.body.querySelectorAll('.nexus-friend-options-menu button[mat-menu-item]'),
    ) as HTMLButtonElement[];
    expect(actions).toHaveLength(6);
    expect(actions.filter((action) => action.disabled)).toHaveLength(5);
    expect(
      actions.find((action) => action.textContent?.includes('Xóa khỏi danh sách bạn'))
        ?.disabled,
    ).toBe(false);
  });

  it('avatar nằm trong link DM và không dựng action hồ sơ của team khác', async () => {
    const fixture = await mount();
    const profileAction = fixture.nativeElement.querySelector(
      'button[aria-label="Xem hồ sơ nhanh của ho_be"]',
    );
    const dmLink = fixture.nativeElement.querySelector(
      'a[href="/channels/@me/ho-be"]:not([aria-label])',
    ) as HTMLAnchorElement;

    expect(profileAction).toBeNull();
    expect(dmLink.querySelector('app-avatar')).toBeTruthy();
  });

  it('hàng bạn bè dùng state hover/focus tương phản chung', async () => {
    const fixture = await mount();
    const row = fixture.nativeElement.querySelector('article') as HTMLElement;

    expect(row.classList.contains('nexus-interactive-row')).toBe(true);
  });

  /**
   * Chỉ đọc riêng dòng phụ đề.
   *
   * Không dùng `textContent` của cả hàng: chấm trạng thái trong avatar cũng có
   * nhãn "Không làm phiền" dành cho trình đọc màn hình, nên so khớp cả hàng sẽ
   * luôn thấy nó và test mất ý nghĩa.
   */
  const phuDe = (fixture: { nativeElement: HTMLElement }) =>
    fixture.nativeElement.querySelector('.text-caption')?.textContent?.trim();

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
