import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Chữ hiện khi một trường hồ sơ (giới thiệu, nơi ở, liên kết…) đang trống.
 *
 * Trước đây ba nơi hiện hồ sơ (trang `/u/:username`, cửa sổ giữa màn hình, thẻ
 * nổi cạnh chat) mỗi nơi tự viết một kiểu — có nơi mời chủ hồ sơ điền thêm, có
 * nơi im lặng, có nơi hiện cho cả người xem không phải chủ. Gom vào một chỗ để
 * ba nơi không trôi giạt tiếp.
 *
 * Ba trường hợp:
 *  - Chủ hồ sơ xem hồ sơ mình, đang trống → mời điền, có đường dẫn sang trang sửa.
 *  - Người khác xem hồ sơ ai đó đang trống → chữ trung tính, KHÔNG có nút sửa
 *    của người khác (đúng yêu cầu đã chốt trước đó trong dự án).
 *  - `editing`: dùng trong bảng xem trước của chính trang sửa — người xem luôn
 *    là chủ và đang đứng ngay tại chỗ sửa rồi, nên bỏ luôn nút "đi tới trang sửa".
 */
@Component({
  selector: 'app-empty-field',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // display: block — mặc định custom element là inline, khiến margin của nơi
  // gọi (mt-3, mt-1…) không hoạt động như mong đợi. Đã gặp lỗi tương tự với
  // <app-avatar> (xem ghi chú ở avatar.component.ts).
  host: { class: 'block' },
  template: `
    <p [class]="compact() ? 'text-caption text-mute' : 'text-body-sm text-mute'">
      {{ isSelf() ? selfLabel() : otherLabel() }}
      @if (isSelf() && !editing()) {
        <a
          routerLink="/settings/profile"
          [fragment]="focusFragment()"
          class="ml-1 font-semibold text-primary hover:underline"
        >
          {{ ctaLabel() }}
        </a>
      }
    </p>
  `,
})
export class EmptyFieldComponent {
  readonly isSelf = input.required<boolean>();
  readonly selfLabel = input.required<string>();
  readonly otherLabel = input.required<string>();
  readonly ctaLabel = input.required<string>();
  /** Neo vào đúng ô cần điền trên trang sửa — xem `ProfileEditPage.focusFragment()`. */
  readonly focusFragment = input<string | undefined>(undefined);
  /** Cỡ chữ nhỏ hơn cho thẻ nổi cạnh chat, vốn đã chật chỗ. */
  readonly compact = input(false);
  /** Đang ở trong bảng xem trước của chính trang sửa — bỏ nút "đi tới trang sửa". */
  readonly editing = input(false);
}
