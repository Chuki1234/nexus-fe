import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Ba cỡ đang dùng: dòng gợi ý tìm kiếm, thẻ nhỏ, và avatar lớn trên trang hồ sơ. */
export type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-10 text-body-md-strong',
  md: 'size-16 text-display-sm',
  lg: 'size-28 text-display-lg md:size-32',
};

/**
 * Ảnh đại diện tròn, tự lùi về chữ cái đầu khi người dùng chưa đặt ảnh.
 *
 * Dùng `<img>` thường chứ không `NgOptimizedImage`: ảnh do người dùng tải lên,
 * kích thước thật không biết trước (backend không phóng to ảnh nhỏ), mà
 * NgOptimizedImage bắt buộc khai báo width/height cố định.
 */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  /**
   * Thẻ tuỳ biến mặc định là `display: inline`, nghĩa là hộp của nó được tính
   * theo dòng chữ — kèm luôn khoảng trống chân chữ bên dưới đường baseline.
   * Chỗ nào bọc avatar trong một vòng `rounded-full ring-4` thì vòng đó cao hơn
   * ảnh tròn vài pixel và tụt xuống, hiện ra thành hình bầu dục lệch.
   *
   * `inline-flex` cho nó một hộp đúng bằng ảnh bên trong, không dư khoảng nào.
   */
  host: { class: 'inline-flex' },
  template: `
    <!-- Trang trí ở cả hai nhánh (alt rỗng / aria-hidden): tên người dùng luôn
         nằm ngay cạnh avatar dưới dạng chữ, đọc lại lần nữa chỉ gây ồn. -->
    @if (src(); as url) {
      <img
        [src]="url"
        alt=""
        decoding="async"
        [class]="
          'shrink-0 rounded-full border border-hairline-strong bg-canvas-soft object-cover ' +
          sizeClass()
        "
      />
    } @else {
      <span
        aria-hidden="true"
        [class]="
          'flex shrink-0 items-center justify-center rounded-full border border-hairline-strong bg-canvas-soft text-mute ' +
          sizeClass()
        "
      >
        {{ initial() }}
      </span>
    }
  `,
})
export class AvatarComponent {
  readonly src = input<string | null>(null);
  /** Tên hiển thị — dùng cho alt và cho chữ cái khi không có ảnh. */
  readonly name = input.required<string>();
  readonly size = input<AvatarSize>('md');

  protected readonly sizeClass = computed(() => SIZE_CLASSES[this.size()]);
  protected readonly initial = computed(() => this.name().charAt(0).toUpperCase() || '?');
}
