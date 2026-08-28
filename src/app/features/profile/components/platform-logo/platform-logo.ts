import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { AppPlatform } from '../../connected-apps';

/**
 * Logo nền tảng dùng chung cho các bề mặt kết nối tài khoản.
 *
 * SVG được lấy từ WorldVectorLogo nhưng phục vụ qua assets nội bộ để không bị
 * CSP chặn. Material icon cũ chỉ còn là phương án dự phòng nếu asset bị thiếu.
 */
@Component({
  selector: 'app-platform-logo',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!loadFailed()) {
      <img
        [src]="platform().logoUrl"
        alt=""
        referrerpolicy="no-referrer"
        class="block size-full object-contain"
        [style.filter]="platform().logoFilter ?? null"
        (error)="loadFailed.set(true)"
      />
    } @else {
      <mat-icon aria-hidden="true" class="size-full! text-[inherit]! leading-none!">
        {{ platform().icon }}
      </mat-icon>
    }
  `,
  host: {
    'aria-hidden': 'true',
    class: 'block shrink-0',
  },
})
export class PlatformLogo {
  readonly platform = input.required<AppPlatform>();
  protected readonly loadFailed = signal(false);
}
