import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService } from '../../core/profile/profile.service';
import { Avatar } from '../../ui/avatar/avatar';

/**
 * Khối người dùng ở đáy cột 2: avatar, tên, và các nút mic / tai nghe / cài đặt.
 *
 * Nút mic và tai nghe mới chỉ đổi trạng thái tại chỗ — chưa nối vào LiveKit.
 * Phần đó thuộc phase C2 (xem DASHBOARD_PLAN.md).
 */
@Component({
  selector: 'app-user-panel',
  imports: [Avatar, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-center gap-1 border-t border-hairline bg-canvas px-2 py-2' },
  template: `
    <button
      type="button"
      [matMenuTriggerFor]="userMenu"
      class="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-1 py-1 text-left hover:bg-canvas-soft"
    >
      <app-avatar [name]="displayName()" size="sm" presence="online" ring="canvas" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-body-sm-strong text-ink">{{ displayName() }}</span>
        <span class="block truncate text-caption text-mute">Trực tuyến</span>
      </span>
    </button>

    <mat-menu #userMenu="matMenu">
      <button mat-menu-item type="button" (click)="onSignOut()" [disabled]="signingOut()">
        <mat-icon aria-hidden="true">logout</mat-icon>
        <span>{{ signingOut() ? 'Đang đăng xuất…' : 'Đăng xuất' }}</span>
      </button>
    </mat-menu>

    <button
      mat-icon-button
      type="button"
      [attr.aria-pressed]="micMuted()"
      [matTooltip]="micMuted() ? 'Bật micrô' : 'Tắt micrô'"
      (click)="micMuted.set(!micMuted())"
    >
      <mat-icon>{{ micMuted() ? 'mic_off' : 'mic' }}</mat-icon>
      <span class="sr-only">{{ micMuted() ? 'Bật micrô' : 'Tắt micrô' }}</span>
    </button>

    <button
      mat-icon-button
      type="button"
      [attr.aria-pressed]="deafened()"
      [matTooltip]="deafened() ? 'Bật loa' : 'Tắt loa'"
      (click)="deafened.set(!deafened())"
    >
      <mat-icon>{{ deafened() ? 'headset_off' : 'headset' }}</mat-icon>
      <span class="sr-only">{{ deafened() ? 'Bật loa' : 'Tắt loa' }}</span>
    </button>
  `,
})
export class UserPanel {
  private readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly router = inject(Router);

  protected readonly micMuted = signal(false);
  protected readonly deafened = signal(false);
  protected readonly signingOut = signal(false);

  protected readonly displayName = computed(
    () => this.profile.current()?.displayName ?? this.profile.current()?.username ?? 'Bạn',
  );

  protected async onSignOut(): Promise<void> {
    this.signingOut.set(true);
    try {
      await this.auth.signOut();
      this.profile.reset();
      await this.router.navigateByUrl('/login');
    } finally {
      this.signingOut.set(false);
    }
  }
}
