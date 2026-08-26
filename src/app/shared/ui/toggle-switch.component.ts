import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Công tắc bật/tắt.
 *
 * Dựng trên `<button role="switch">` chứ không phải checkbox tạo kiểu bằng CSS:
 * `aria-checked` trên role switch được trình đọc màn hình đọc là "bật/tắt", đúng
 * với thứ người dùng nhìn thấy, trong khi checkbox bị đọc thành "đã chọn".
 *
 * Nhãn nằm ngoài component (do phía gọi vẽ) nên phải truyền `labelId` để nối
 * bằng `aria-labelledby` — không có nó thì nút này là một ô trống không tên.
 */
@Component({
  selector: 'app-toggle-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.aria-labelledby]="labelId()"
      [attr.aria-describedby]="describedBy()"
      [disabled]="disabled()"
      (click)="checked.set(!checked())"
      class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-pill border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      [class.bg-primary]="checked()"
      [class.bg-hairline-strong]="!checked()"
    >
      <span
        aria-hidden="true"
        class="pointer-events-none inline-block size-5 rounded-full bg-canvas shadow-glow transition-transform"
        [class.translate-x-5]="checked()"
        [class.translate-x-0]="!checked()"
      ></span>
    </button>
  `,
})
export class ToggleSwitchComponent {
  /** Hai chiều: `[(checked)]="signalCuaBan"`. */
  readonly checked = model.required<boolean>();
  /** id của phần tử đang làm nhãn cho công tắc này. */
  readonly labelId = input.required<string>();
  readonly describedBy = input<string | null>(null);
  readonly disabled = input(false);
}
