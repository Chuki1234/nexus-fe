import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { UserSettingsService } from '../../../../features/settings/services/user-settings.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';

/**
 * Khối người dùng ở đáy cột 2: avatar, tên, và các nút mic / tai nghe / cài đặt.
 */
@Component({
  selector: 'app-user-panel',
  imports: [Avatar, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-center gap-1 border-t border-hairline bg-surface/90 px-2 py-1.5' },
  templateUrl: './user-panel.html',
  styleUrl: './user-panel.css',
})
export class UserPanel {
  private readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly settingsService = inject(UserSettingsService);

  protected readonly micMuted = signal(false);
  protected readonly deafened = signal(false);
  protected readonly signingOut = signal(false);

  protected readonly displayName = computed(
    () => this.profile.current()?.displayName ?? this.profile.current()?.username ?? 'Bạn',
  );

  protected openSettings(): void {
    // openUserSettings ép settingsMode = 'user', tránh dính lại chế độ 'server' nếu
    // trước đó modal từng mở qua gear của channel-sidebar (openServerSettings).
    this.settingsService.openUserSettings('account');
  }

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
