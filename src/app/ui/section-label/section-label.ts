import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Nhãn nhóm chữ hoa phía trên một danh sách ("TIN NHẮN TRỰC TIẾP", "KÊNH THOẠI").
 *
 * Dùng token `text-eyebrow` — chữ hoa Inter 600 với tracking 2.52px, kiểu nhãn
 * đặc trưng của brand theo DESIGN-voltagent.md.
 *
 * Chiếu nội dung vào `[slot=action]` để gắn nút bên phải (ví dụ nút "+").
 * Thẻ là `h3` vì nó luôn đứng đầu một nhóm trong cây tiêu đề của trang.
 */
@Component({
  selector: 'app-section-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <h3 class="flex items-center justify-between gap-2 px-2 text-eyebrow text-mute uppercase">
      <span class="truncate">{{ text() }}</span>
      <ng-content select="[slot=action]" />
    </h3>
  `,
})
export class SectionLabel {
  readonly text = input.required<string>();
}
