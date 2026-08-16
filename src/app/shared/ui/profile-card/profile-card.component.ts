import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { ProfileCardService } from './profile-card.service';
import { ProfileBodyComponent } from './profile-body.component';

const CARD_WIDTH = 320;
const CARD_MAX_HEIGHT = 520;
/** Khoảng hở giữa thẻ và avatar, và giữa thẻ với mép màn hình. */
const GAP = 8;

/**
 * Ghim theo mép trên (thẻ đổ xuống) hay mép dưới (thẻ mọc lên).
 *
 * Dùng `bottom` khi mọc lên thay vì tính `top = đáy - chiều cao`: chiều cao thật
 * phụ thuộc nội dung (có bio hay không, có mấy cái link) nên phía này không biết
 * trước, mà đo xong rồi đặt lại thì thẻ nhảy một nhịp trước mắt người dùng.
 */
interface CardPosition {
  /** Co lại theo khung nhìn, nên không phải lúc nào cũng bằng `CARD_WIDTH`. */
  width: number;
  left: number;
  top: number | null;
  bottom: number | null;
  maxHeight: number;
}

/**
 * Thẻ hồ sơ nổi khi bấm vào avatar.
 *
 * Dựng MỘT lần ở vỏ ngoài cùng và dùng `position: fixed`, không đặt trong từng
 * danh sách: các cột đều có `overflow-y-auto`, thẻ nằm trong đó sẽ bị cắt mất.
 *
 * Không dùng CSS Anchor Positioning vì hiện chỉ Chromium hỗ trợ; tính toạ độ từ
 * DOMRect chạy được ở mọi trình duyệt.
 *
 * Cuộn hay đổi kích thước cửa sổ thì ĐÓNG thẻ chứ không tính lại vị trí: neo đã
 * trôi đi, mà bám theo nó vừa tốn công vừa dễ lệch.
 */
@Component({
  selector: 'app-profile-card',
  imports: [ProfileBodyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Ba sự kiện này nghe ở document/window nên vẫn nổ cả khi đang mở CỬA SỔ hồ sơ
  // ở giữa màn hình. Cửa sổ đó tự lo Esc của nó, và nó không việc gì phải đóng
  // khi người dùng đổi kích thước cửa sổ trình duyệt — nó có neo đâu mà trôi.
  host: {
    '(document:keydown.escape)': 'closeIfPopover()',
    '(window:scroll)': 'closeIfPopover()',
    '(window:resize)': 'closeIfPopover()',
  },
  template: `
    @if (request(); as request) {
      <!-- Lớp phủ trong suốt bắt cú bấm ra ngoài. Dùng nó thay vì nghe click trên
           document: không phải phân biệt "bấm ra ngoài" với "bấm vào chính thẻ". -->
      <div class="fixed inset-0 z-40" (click)="cards.close()" aria-hidden="true"></div>

      <div
        #card
        role="dialog"
        aria-modal="false"
        [attr.aria-label]="'Hồ sơ của ' + request.member.displayName"
        tabindex="-1"
        class="fixed z-50 overflow-y-auto rounded-md border border-hairline bg-canvas shadow-modal"
        [style.width.px]="position().width"
        [style.max-height.px]="position().maxHeight"
        [style.left.px]="position().left"
        [style.top.px]="position().top"
        [style.bottom.px]="position().bottom"
      >
        <app-profile-body [member]="request.member" />
      </div>
    }
  `,
})
export class ProfileCardComponent {
  protected readonly cards = inject(ProfileCardService);

  /** Chỉ dựng khi lời mở là kiểu popover — kiểu modal do ProfileModalComponent lo. */
  protected readonly request = computed(() => {
    const current = this.cards.request();
    return current?.variant === 'popover' ? current : null;
  });

  private readonly card = viewChild<ElementRef<HTMLElement>>('card');

  /**
   * Ưu tiên đặt bên PHẢI avatar (avatar thường nằm ở cột trái); hết chỗ thì lật
   * sang trái.
   *
   * Theo chiều dọc thì chọn hướng nào còn nhiều chỗ hơn. Avatar trong danh sách
   * tin nhắn nằm trên cao nên thẻ đổ xuống; avatar của chính mình nằm ở thanh
   * dưới đáy nên thẻ mọc lên và mép dưới của nó thẳng hàng với avatar — nếu cứ
   * ghim mép trên rồi kẹp lại thì thẻ trôi lên giữa màn hình, rời hẳn khỏi cái
   * vừa bấm.
   */
  protected readonly position = computed<CardPosition>(() => {
    const anchor = this.request()?.anchor;
    if (!anchor) {
      return { width: CARD_WIDTH, left: 0, top: 0, bottom: null, maxHeight: CARD_MAX_HEIGHT };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Thẻ hẹp lại trên màn hình nhỏ. Không co thì ở bề ngang 320px (iPhone SE)
    // thẻ rộng đúng bằng màn hình, mất cả lề lẫn cái bóng đổ.
    const width = Math.min(CARD_WIDTH, viewportWidth - GAP * 2);

    const fitsRight = viewportWidth - anchor.right >= width + GAP;
    const fitsLeft = anchor.left >= width + GAP;
    const left = Math.round(
      fitsRight
        ? anchor.right + GAP
        : fitsLeft
          ? anchor.left - width - GAP
          : // Không lọt bên nào — màn hình điện thoại. Kẹp vào trong khung nhìn;
            // thẻ sẽ nằm chồng lên neo theo chiều ngang.
            Math.max(GAP, Math.min(anchor.left, viewportWidth - width - GAP)),
    );

    // Mép của neo để ghim thẻ vào. Bình thường thẻ nằm CẠNH neo nên ghim thẳng
    // hàng với nó. Nhưng khi đã chồng theo chiều ngang thì phải né hẳn xuống
    // dưới (hoặc lên trên) neo, không thì thẻ che mất chính cái avatar vừa bấm.
    const overlaps = !fitsRight && !fitsLeft;
    const pinTop = overlaps ? anchor.bottom + GAP : anchor.top;
    const pinBottom = overlaps ? anchor.top - GAP : anchor.bottom;

    // Chỗ còn lại nếu đổ xuống, so với nếu mọc lên. Tổng hai số này luôn ≳ chiều
    // cao khung nhìn, nên bên lớn hơn không bao giờ hẹp tới mức không dùng được.
    const roomBelow = viewportHeight - pinTop - GAP;
    const roomAbove = pinBottom - GAP;

    // maxHeight tính từ toạ độ ĐÃ kẹp chứ không từ neo: neo có thể thò ra ngoài
    // khung nhìn (avatar bị cuộn mất một nửa), lúc đó chỗ trống thật ít hơn chỗ
    // trống tính theo neo và thẻ sẽ tràn qua mép màn hình.
    if (roomBelow >= roomAbove) {
      const top = Math.round(Math.max(GAP, pinTop));
      return {
        width,
        left,
        top,
        bottom: null,
        maxHeight: Math.min(CARD_MAX_HEIGHT, viewportHeight - top - GAP),
      };
    }

    const bottom = Math.round(Math.max(GAP, viewportHeight - pinBottom));
    return {
      width,
      left,
      top: null,
      bottom,
      maxHeight: Math.min(CARD_MAX_HEIGHT, viewportHeight - bottom - GAP),
    };
  });

  constructor() {
    // Đưa tiêu điểm vào thẻ mỗi lần nó hiện ra, để Esc bắt được và trình đọc màn
    // hình đọc nội dung thẻ thay vì vẫn đứng ở avatar phía sau.
    // (`ProfileCardService.close` lo phần trả tiêu điểm về chỗ cũ.)
    //
    // Phải là effect chứ không phải một lần trong constructor: component này sống
    // suốt vòng đời ứng dụng, chỉ phần bên trong `@if` mới được dựng lại. Tín hiệu
    // `card()` cập nhật sau khi render nên effect tự chạy lại đúng lúc.
    effect(() => {
      if (this.request()) {
        this.card()?.nativeElement.focus();
      }
    });
  }

  /**
   * Ba sự kiện ở host nghe trên document/window nên vẫn nổ khi đang mở cửa sổ hồ
   * sơ giữa màn hình. Cửa sổ đó tự lo Esc của nó, và nó không có neo nào để trôi
   * nên không việc gì phải đóng khi đổi kích thước trình duyệt.
   */
  protected closeIfPopover(): void {
    if (this.request()) {
      this.cards.close();
    }
  }
}
