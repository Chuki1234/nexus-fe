import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Khung trạng thái rỗng — `ex-empty-state-card` trong design system.
 *
 * Nền `canvas-soft`, bo `rounded.md`, đệm `{spacing.3xl}`. Luôn nói thành lời
 * thay vì để vùng trống: "Nexus chưa thấy gì" dễ hiểu hơn một ô trắng.
 */
@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full items-center justify-center p-8' },
  template: `
    <div class="rounded-md bg-canvas-soft p-8 text-center">
      <mat-icon aria-hidden="true" class="!size-10 !text-4xl text-mute">{{ icon() }}</mat-icon>

      @if (title(); as heading) {
        <h2 class="mt-3 text-display-sm text-ink-strong">{{ heading }}</h2>
      }

      <p class="mt-2 max-w-prose text-body-md text-body">{{ message() }}</p>

      <ng-content />
    </div>
  `,
})
export class EmptyState {
  readonly icon = input.required<string>();
  readonly message = input.required<string>();
  readonly title = input<string | null>(null);
}
