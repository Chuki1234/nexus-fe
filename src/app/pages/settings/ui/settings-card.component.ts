import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Thẻ gom một nhóm thiết lập cùng chủ đề, ví dụ "Thông tin tài khoản" hay
 * "Mật khẩu & bảo mật".
 *
 * Tiêu đề là `<h2>` vì `app-settings-section` đã giữ `<h1>` của trang — mỗi
 * trang cài đặt chỉ có một h1, các thẻ bên trong là bậc hai.
 */
@Component({
  selector: 'app-settings-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-xl border border-hairline bg-canvas-soft/50">
      <header class="px-5 pt-5">
        <h2 class="text-body-md-strong font-semibold text-ink-strong">{{ heading() }}</h2>
        @if (description(); as text) {
          <p class="mt-1 text-body-sm text-mute">{{ text }}</p>
        }
      </header>

      <!-- divide chứ không phải viền trên từng hàng: hàng đầu và hàng cuối
           không có đường kẻ thừa chạm vào mép thẻ.

           Tắt được vì thẻ chứa biểu mẫu thì mỗi ô nhập đã có viền riêng — kẻ
           thêm một đường giữa chúng là hai lớp phân cách chồng lên nhau. -->
      <div [class]="divided() ? 'mt-2 divide-y divide-hairline/70 px-5 pb-2' : 'mt-4 px-5 pb-5'">
        <ng-content />
      </div>
    </section>
  `,
})
export class SettingsCardComponent {
  readonly heading = input.required<string>();
  readonly description = input<string | null>(null);
  /** Bật cho thẻ gồm các `app-settings-row`, tắt cho thẻ chứa biểu mẫu. */
  readonly divided = input(true);
}
