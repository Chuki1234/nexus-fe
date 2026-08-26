import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Khung chuẩn cho một mục cài đặt: tiêu đề, mô tả, rồi nội dung.
 *
 * Tiêu đề luôn là `<h1>` vì mỗi mục chiếm trọn vùng nội dung của trang cài đặt —
 * thanh bên là điều hướng, không phải nội dung. Nhờ vậy mỗi màn hình có đúng một
 * h1 và các `<h2>` bên trong nội dung không bị nhảy bậc.
 */
@Component({
  selector: 'app-settings-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <header class="mb-8">
        <h1 class="text-display-md text-ink-strong">{{ heading() }}</h1>
        @if (subheading(); as text) {
          <p class="mt-2 text-body-md text-body">{{ text }}</p>
        }
        @if (mocked()) {
          <p
            class="mt-4 inline-flex items-center gap-2 rounded-pill border border-hairline px-3 py-1 text-caption text-mute"
          >
            <span aria-hidden="true" class="size-2 shrink-0 rounded-full bg-hairline-strong"></span>
            {{ mockedLabel() }}
          </p>
        }
      </header>

      <ng-content />
    </section>
  `,
})
export class SettingsSectionComponent {
  readonly heading = input.required<string>();
  readonly subheading = input<string | null>(null);
  /**
   * Đánh dấu mục chưa nối backend. Hiện một nhãn nhỏ để người xem bản mẫu không
   * tưởng nhầm là thay đổi ở đây đã được lưu ở đâu đó.
   */
  readonly mocked = input(false);
  readonly mockedLabel = input('');
}
