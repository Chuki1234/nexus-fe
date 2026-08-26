import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  PRESENCE_COLORS,
  PRESENCE_LABELS,
  PresenceStatus,
} from '../../pages/channels/mock/chat-mock';

/** Ba cỡ đang dùng: cạnh avatar nhỏ trong danh sách, thẻ hồ sơ, và avatar lớn. */
export type PresenceDotSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<PresenceDotSize, string> = {
  sm: 'size-3 border-2',
  md: 'size-4 border-2',
  lg: 'size-6 border-4',
};

/**
 * Chấm trạng thái cạnh avatar, kèm chú thích hiện khi rê chuột.
 *
 * Trước đây mỗi chỗ tự vẽ một cái `<span>` tròn tô màu, và màu là thứ DUY NHẤT
 * nói lên trạng thái — người dùng không có cách nào biết xanh/cam/xám nghĩa là
 * gì. Truyền đạt thông tin chỉ bằng màu cũng là lỗi WCAG 1.4.1.
 *
 * Chú thích chỉ dành cho mắt (`aria-hidden`); trình đọc màn hình lấy nội dung
 * từ `sr-only` bên cạnh, vì chấm này không nhận tiêu điểm được nên không thể
 * dùng cơ chế tooltip thật.
 */
@Component({
  selector: 'app-presence-dot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Không đặt `relative` ở host: nơi gọi thường tự định vị nó bằng `absolute`.
  host: { class: 'inline-flex' },
  template: `
    <span class="group relative inline-flex">
      <span
        aria-hidden="true"
        [class]="'block shrink-0 rounded-full ' + sizeClass() + ' ' + ringClass()"
        [style.background-color]="color()"
      ></span>

      <!-- Mọc LÊN trên: chấm này hay nằm ở đáy avatar, mà avatar lại hay nằm ở
           đáy cột (thanh người dùng), nên mọc xuống là chui ra ngoài màn hình.
           pointer-events-none để nó không chắn cú bấm vào avatar phía dưới. -->
      <span
        aria-hidden="true"
        class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-sm border border-hairline bg-canvas-soft px-2 py-1 text-caption text-ink opacity-0 shadow-modal transition-opacity duration-150 group-hover:opacity-100"
      >
        {{ label() }}
      </span>

      <span class="sr-only">{{ label() }}</span>
    </span>
  `,
})
export class PresenceDotComponent {
  readonly status = input.required<PresenceStatus>();
  readonly size = input<PresenceDotSize>('sm');
  /**
   * Màu viền quanh chấm — phải khớp bề mặt ngay phía sau nó, nếu không chấm
   * trông như bị dán đè lên chứ không phải nằm trong avatar.
   */
  readonly ringClass = input('border-canvas');

  protected readonly color = computed(() => PRESENCE_COLORS[this.status()]);
  protected readonly label = computed(() => PRESENCE_LABELS[this.status()]);
  protected readonly sizeClass = computed(() => SIZE_CLASSES[this.size()]);
}
