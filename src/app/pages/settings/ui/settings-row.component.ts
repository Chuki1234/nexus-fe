import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Một dòng thiết lập: nhãn, giá trị hiện tại, và hành động ở bên phải.
 *
 * Đây là đơn vị lặp lại của cả màn cài đặt. Trước đây trang tài khoản dùng một
 * `<dl>` chỉ có nhãn và giá trị — người dùng đọc được thông tin nhưng không có
 * đường nào để sửa nó ngay tại chỗ, phải tự đoán là đi sang mục "Hồ sơ". Đặt
 * hành động ngay cạnh giá trị thì mỗi dòng tự trả lời được câu "đổi cái này ở
 * đâu".
 *
 * Hành động đưa vào bằng `<ng-content>` chứ không phải input: chỗ thì cần nút,
 * chỗ cần link, chỗ cần công tắc — gói cứng thành một kiểu là sai ngay dòng thứ ba.
 */
@Component({
  selector: 'app-settings-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3.5">
      <div class="min-w-0">
        <p
          [attr.id]="labelId()"
          class="text-caption-strong font-bold uppercase tracking-wider text-mute"
        >
          {{ label() }}
        </p>
        @if (value(); as text) {
          <p class="mt-1 truncate text-body-sm font-medium text-ink">{{ text }}</p>
        } @else if (!hint()) {
          <!-- Dấu gạch chỉ khi dòng này ĐÁNG LẼ có giá trị mà đang trống: ô
               trống trông như tải dở, dấu gạch nói rõ "chưa có gì ở đây".
               Dòng nào chỉ có hint (ví dụ "Đăng xuất") thì không có giá trị nào
               để mà thiếu — thêm dấu gạch vào chỉ tổ khó hiểu. -->
          <p class="mt-1 text-body-sm text-mute">—</p>
        }
        @if (hint(); as text) {
          <p [attr.id]="hintId()" class="mt-1 max-w-prose text-caption text-mute">{{ text }}</p>
        }
      </div>

      <div class="shrink-0">
        <ng-content />
      </div>
    </div>
  `,
})
export class SettingsRowComponent {
  readonly label = input.required<string>();
  /** Giá trị hiện tại. Rỗng/`null` thì hiện dấu gạch. */
  readonly value = input<string | null>(null);
  /** Câu giải thích ngắn dưới giá trị, cho những dòng cần nói thêm. */
  readonly hint = input<string | null>(null);

  /**
   * Id gắn vào nhãn và câu giải thích.
   *
   * Điều khiển đặt trong `<ng-content>` — công tắc bật/tắt chẳng hạn — là một
   * `<button role="switch">` không có chữ bên trong, nên nó phải trỏ
   * `aria-labelledby`/`aria-describedby` vào đúng hai dòng này. Không có id thì
   * trình đọc màn hình đọc cái nút đó thành một công tắc không tên.
   */
  readonly labelId = input<string | null>(null);
  readonly hintId = input<string | null>(null);
}
