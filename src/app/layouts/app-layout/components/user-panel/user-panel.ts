import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';

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
  templateUrl: './user-panel.html',
  styleUrl: './user-panel.css',
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
