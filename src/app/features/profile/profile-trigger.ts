import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  Directive,
  ElementRef,
  DestroyRef,
  inject,
  input,
} from '@angular/core';
import { ProfilePopover } from './components/profile-popover/profile-popover';
import { ProfileLookup } from './profile-lookup';

/**
 * Biến một phần tử bất kỳ (thường là avatar) thành nút mở thẻ hồ sơ nổi.
 *
 * Làm thành directive chứ không phải component bọc ngoài: các avatar nằm rải
 * rác trong khung chat, danh sách thành viên, danh sách bạn bè — mỗi nơi một
 * kiểu markup. Directive gắn thêm được vào chỗ đã có mà không phải viết lại
 * markup của người khác.
 *
 * Tự lo phần trợ năng: phần tử gốc thường là `<app-avatar>` (một `<span>`),
 * không phải nút, nên phải tự thêm `role`/`tabindex` và bắt phím Enter/Space —
 * thiếu thì người dùng bàn phím không bao giờ mở được thẻ.
 */
@Directive({
  selector: '[appProfileTrigger]',
  host: {
    role: 'button',
    tabindex: '0',
    'aria-haspopup': 'dialog',
    class: 'cursor-pointer',
    '(click)': 'open()',
    '(keydown.enter)': 'open()',
    '(keydown.space)': 'openFromKey($event)',
  },
})
export class ProfileTrigger {
  /** Username của người cần xem — khớp `/api/profiles/:username`. */
  readonly appProfileTrigger = input.required<string>();

  private readonly overlay = inject(Overlay);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly lookup = inject(ProfileLookup);

  private overlayRef: OverlayRef | null = null;

  constructor() {
    // Overlay sống ngoài cây component nên Angular không tự dọn — rời trang mà
    // còn thẻ đang mở thì nó kẹt lại giữa màn hình, không cách nào đóng.
    inject(DestroyRef).onDestroy(() => this.close());
  }

  protected open(): void {
    if (this.overlayRef) {
      this.close();
      return;
    }

    const username = this.appProfileTrigger();
    if (!username) {
      return;
    }

    // Qua cache dùng chung: avatar của người này thường đã được tra sẵn để
    // hiện ảnh, nên mở thẻ là có ngay, không phải chờ thêm một vòng mạng.
    const profile = this.lookup.profileFor(username)();
    if (!profile) {
      // Chưa tải xong, hoặc người này chưa có hồ sơ Nexus — im lặng bỏ qua thay
      // vì mở ra một thẻ rỗng khó hiểu.
      return;
    }

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.host)
        .withPush(true)
        .withPositions([
          { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 },
          { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -8 },
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
        ]),
    });

    const ref = this.overlayRef.attach(new ComponentPortal(ProfilePopover));
    ref.setInput('profile', profile);

    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.overlayRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    });
  }

  /** Space cuộn trang nếu không chặn — người dùng bấm mở thẻ mà trang nhảy xuống. */
  protected openFromKey(event: Event): void {
    event.preventDefault();
    this.open();
  }

  private close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }
}
