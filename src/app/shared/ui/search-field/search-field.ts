import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

let nextId = 0;

/**
 * Ô tìm kiếm trên nền tối — `text-input` trong design system.
 *
 * Bo `rounded.sm` 6px chứ KHÔNG bo tròn hoàn toàn: Discord dùng pill cho ô tìm
 * kiếm, nhưng DESIGN-voltagent.md ghi rõ pill chỉ dành cho thẻ trạng thái inline
 * ("Buttons are tight 6 px rounded rectangles (not pills)").
 *
 * Viền dùng `hairline-strong` chứ không phải `hairline`: đây là thành phần tương
 * tác được, cần đạt tương phản 3:1 theo WCAG 1.4.11.
 */
@Component({
  selector: 'app-search-field',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './search-field.html',
  styleUrl: './search-field.css',
})
export class SearchField {
  readonly placeholder = input.required<string>();
  readonly disabled = input<boolean>(false);
  readonly value = model<string>('');

  protected readonly inputId = `search-${nextId++}`;

  protected readonly hasValue = computed(() => this.value().length > 0);

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
