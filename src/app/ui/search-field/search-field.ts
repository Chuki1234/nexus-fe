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
  template: `
    <div
      class="flex items-center gap-2 rounded-sm border border-hairline-strong bg-canvas px-3 py-2 focus-within:border-primary"
    >
      <mat-icon aria-hidden="true" class="!size-4 !text-base text-mute">search</mat-icon>
      <input
        [id]="inputId"
        type="search"
        [value]="value()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [attr.aria-label]="placeholder()"
        (input)="onInput($event)"
        class="min-w-0 flex-1 bg-transparent text-body-sm text-ink placeholder:text-mute focus:outline-none disabled:cursor-not-allowed"
      />
      @if (value() && !disabled()) {
        <button
          type="button"
          (click)="value.set('')"
          class="rounded-xs text-mute hover:text-ink"
          aria-label="Xoá nội dung tìm kiếm"
        >
          <mat-icon aria-hidden="true" class="!size-4 !text-base">close</mat-icon>
        </button>
      }
    </div>
  `,
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
