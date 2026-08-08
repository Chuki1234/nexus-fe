import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ConversationSummary } from '../../../../core/api/shell-data';
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
