import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Khung trạng thái rỗng — `ex-empty-state-card` trong design system.
 *
 * Nền `surface`, bo `rounded.md`, đệm `{spacing.3xl}`. Luôn nói thành lời
 * thay vì để vùng trống: "Nexus chưa thấy gì" dễ hiểu hơn một ô trắng.
 */
@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full items-center justify-center p-8' },
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  readonly icon = input.required<string>();
  readonly message = input.required<string>();
  readonly title = input<string | null>(null);
}
