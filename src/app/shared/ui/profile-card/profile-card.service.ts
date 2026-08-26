import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import type { MockMember } from '../../../pages/channels/mock/chat-mock';

/**
 * Hai kiểu hiện hồ sơ, khác nhau ở chỗ người dùng đang hỏi gì:
 *
 *  · `popover` — "người này là ai?" giữa lúc đang đọc chat. Thẻ nhỏ, dính vào
 *    avatar vừa bấm, và KHÔNG chặn phần còn lại: đọc xong là bấm ra ngoài.
 *  · `modal` — "hồ sơ của tôi trông thế nào?" khi bấm avatar của chính mình.
 *    Đây là việc người dùng dừng lại để làm, nên nó chiếm giữa màn hình và
 *    chặn nền phía sau.
 */
export type ProfileCardVariant = 'popover' | 'modal';

export interface ProfileCardRequest {
  member: MockMember;
  variant: ProfileCardVariant;
  /** Vị trí phần tử vừa bấm, để đặt thẻ ngay cạnh nó. `null` với kiểu modal. */
  anchor: DOMRect | null;
  /** Trả tiêu điểm về đây khi đóng — yêu cầu của WCAG 2.4.3. */
  trigger: HTMLElement;
}

/**
 * Trạng thái của thẻ hồ sơ nổi.
 *
 * Chỉ có MỘT thẻ cho cả ứng dụng, dựng ở vỏ ngoài cùng. Nếu để mỗi avatar tự
 * mang một thẻ thì mọi avatar trong danh sách dài đều phải dựng sẵn phần khung
 * ẩn, và thẻ sẽ bị cắt bởi `overflow-y-auto` của cột chứa nó.
 */
@Injectable({ providedIn: 'root' })
export class ProfileCardService {
  private readonly router = inject(Router);

  private readonly state = signal<ProfileCardRequest | null>(null);
  readonly request = this.state.asReadonly();

  constructor() {
    // Trong thẻ có link "Nhắn tin" và "Xem hồ sơ đầy đủ". Bấm vào là điều hướng
    // đi, nhưng thẻ thì `position: fixed` nên nó nổi nguyên đó đè lên trang mới.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.dismiss());
  }

  /** Bấm lại đúng avatar đang mở thì đóng lại, giống mọi popover khác. */
  toggle(member: MockMember, trigger: HTMLElement): void {
    const current = this.state();
    if (current?.member.id === member.id) {
      this.close();
      return;
    }
    this.state.set({
      member,
      variant: 'popover',
      anchor: trigger.getBoundingClientRect(),
      trigger,
    });
  }

  /**
   * Mở hồ sơ ở giữa màn hình. Không có bật/tắt như popover: cửa sổ này phủ kín
   * nút vừa bấm nên không thể bấm lại lần nữa để đóng.
   */
  openModal(member: MockMember, trigger: HTMLElement): void {
    this.state.set({ member, variant: 'modal', anchor: null, trigger });
  }

  /**
   * "Xem hồ sơ" trong thẻ nhỏ: nâng chính nó thành cửa sổ giữa màn hình thay vì
   * điều hướng sang trang hồ sơ.
   *
   * Điều hướng đi thì khung chat phía sau biến mất — mà đó chính là thứ làm cho
   * hồ sơ trông như đang nổi lên trên cuộc trò chuyện. Ở lại đúng chỗ thì chat
   * vẫn nằm sau lớp phủ, giống Discord.
   *
   * Giữ nguyên `trigger` cũ chứ không lấy nút vừa bấm: nút "Xem hồ sơ" nằm
   * trong chính cái thẻ sắp bị gỡ khỏi DOM, trả tiêu điểm về đó là trả về hư không.
   */
  expandOrOpen(member: MockMember, trigger: HTMLElement): void {
    const current = this.state();
    if (current?.member.id === member.id) {
      this.state.set({ ...current, variant: 'modal', anchor: null });
      return;
    }
    this.openModal(member, trigger);
  }

  /** Đóng do người dùng chủ động (Esc, bấm ra ngoài) — trả tiêu điểm về avatar. */
  close(): void {
    const current = this.state();
    this.state.set(null);
    // Trả tiêu điểm sau khi thẻ đã biến mất, nếu không trình duyệt focus vào một
    // phần tử sắp bị gỡ khỏi DOM.
    current?.trigger.focus();
  }

  /**
   * Đóng vì hoàn cảnh đổi (điều hướng), KHÔNG trả tiêu điểm: người dùng vừa sang
   * trang khác, kéo tiêu điểm ngược về một avatar ở trang cũ là cướp mất chỗ họ
   * đang đứng.
   */
  dismiss(): void {
    this.state.set(null);
  }
}
