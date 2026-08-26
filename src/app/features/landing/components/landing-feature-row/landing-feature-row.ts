import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type FeatureVariant = 'channels' | 'realtime' | 'voice' | 'rbac';

export interface FeatureRow {
  readonly variant: FeatureVariant;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly bullets: readonly string[];
  /** true = minh hoạ nằm bên trái, chữ bên phải. */
  readonly reverse: boolean;
  /** id để nav neo tới (tuỳ chọn). */
  readonly anchor?: string;
}

/**
 * Một hàng tính năng: khối chữ + một minh hoạ mock đổi theo `variant`.
 * Xen kẽ trái/phải bằng `reverse` để tạo nhịp giống campsite.
 */
@Component({
  selector: 'app-landing-feature-row',
  imports: [],
  templateUrl: './landing-feature-row.html',
  styleUrl: './landing-feature-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingFeatureRow {
  readonly feature = input.required<FeatureRow>();
}
