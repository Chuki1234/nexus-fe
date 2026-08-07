import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Huy hiệu số chưa đọc / lượt nhắc tên.
 *
 * Không hiện gì khi `count` bằng 0 — thẻ rỗng vẫn chiếm chỗ và làm lệch hàng.
 *
 * Đây là một trong hai chỗ được dùng bo tròn hoàn toàn: DESIGN-voltagent.md cho
 * phép `rounded.pill` riêng cho "inline status tag".
 */
@Component({
  selector: 'app-unread-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  templateUrl: './unread-badge.html',
  styleUrl: './unread-badge.css',
})
export class UnreadBadge {
  readonly count = input.required<number>();
  /** Quá ngưỡng thì hiện "99+" thay vì kéo dài huy hiệu. */
  readonly max = input<number>(99);
  readonly label = input<string>('chưa đọc');

  protected readonly display = computed(() => {
    const count = this.count();
    const max = this.max();
    return count > max ? `${max}+` : `${count}`;
  });
}
