import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { DeleteAccountDialog } from './delete-account-dialog';

/**
 * Khối người dùng ở đáy cột 2: avatar, tên, và các nút mic / tai nghe / cài đặt.
 */
@Component({
  selector: 'app-user-panel',
  imports: [Avatar, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'm-2 mt-1 min-w-0 self-stretch overflow-hidden rounded-xl bg-canvas p-1.5 shadow-glow',
  },

  templateUrl: './user-panel.html',
  styleUrl: './user-panel.css',
})
export class UserPanel {
  private readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

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

  protected openDeleteAccount(): void {
    const ref = this.dialog.open(DeleteAccountDialog, {
      data: {
        displayName: this.displayName(),
        email: this.auth.user()?.email ?? this.profile.current()?.email ?? '',
      },
      autoFocus: '#delete-account-confirmation',
      restoreFocus: true,
      panelClass: 'nexus-delete-account-dialog',
    });

    ref.afterClosed().subscribe(async (deleted) => {
      if (!deleted) return;
      this.profile.reset();
      await this.router.navigateByUrl('/login');
    });
  }
}
