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
import type { PublicProfile } from '../../../shared';

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
  /** Chặn bấm dồn trong lúc chờ mạng — nếu không sẽ mở chồng nhiều thẻ. */
  private opening = false;
  private destroyed = false;

  constructor() {
    // Overlay sống ngoài cây component nên Angular không tự dọn — rời trang mà
    // còn thẻ đang mở thì nó kẹt lại giữa màn hình, không cách nào đóng.
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.close();
    });
  }

  protected async open(): Promise<void> {
    if (this.overlayRef) {
      this.close();
      return;
    }

    const username = this.appProfileTrigger();
    if (!username || this.opening) {
      return;
    }

    // Qua cache dùng chung: avatar của người này thường đã được tra sẵn để hiện
    // ảnh, nên mở thẻ là có ngay. Chưa có thì CHỜ tải xong — đọc signal ngay
    // lúc bấm sẽ ra `null` vì request còn đang bay, im lặng bỏ qua thì cú bấm
    // đầu tiên vào một người lạ trông như nút hỏng.
    this.opening = true;
    let profile: PublicProfile | null;
    try {
      profile = await this.lookup.ensure(username);
    } finally {
      this.opening = false;
    }

    // Người dùng bấm lần nữa (hoặc rời trang) trong lúc chờ mạng.
    if (this.overlayRef || this.destroyed) {
      return;
    }

    if (!profile) {
      // Không có hồ sơ để hiện thì mở ra một thẻ rỗng còn khó hiểu hơn. Nhưng
      // im lặng hoàn toàn thì không phân biệt được với "tính năng hỏng", nên
      // để lại dấu vết trong console cho người phát triển.
      console.warn(
        `[ProfileTrigger] Không tra được hồ sơ "${username}" nên không mở thẻ. ` +
          `Kiểm tra GET /api/profiles/${username}.`,
      );
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
    // Bấm "Xem hồ sơ đầy đủ" trong thẻ nhỏ mở cửa sổ hồ sơ giữa màn hình — đóng
    // thẻ nhỏ luôn, không thì nó kẹt lại sau lớp phủ của dialog.
    ref.instance.close.subscribe(() => this.close());

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
    void this.open();
  }

  private close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }
}
