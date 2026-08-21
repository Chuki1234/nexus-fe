import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { ProfilePopover } from '../../../../features/profile/components/profile-popover/profile-popover';
import { ProfileLookup } from '../../../../features/profile/profile-lookup';
import { ProfileStore } from '../../../../features/profile/profile-store';
import { UserSettingsService } from '../../../../features/settings/services/user-settings.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';

/**
 * Khối người dùng ở đáy cột 2: avatar, tên, và các nút mic / tai nghe / cài đặt.
 */
@Component({
  selector: 'app-user-panel',
  imports: [
    Avatar,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    OverlayModule,
    ProfilePopover,
    RouterLink,
  ],
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
  private readonly settingsService = inject(UserSettingsService);
  protected readonly store = inject(ProfileStore);
  private readonly lookup = inject(ProfileLookup);

  protected readonly micMuted = signal(false);
  protected readonly deafened = signal(false);
  protected readonly signingOut = signal(false);
  /** Thẻ hồ sơ nhỏ đang nổi đè lên hay không. */
  protected readonly popoverOpen = signal(false);

  protected readonly displayName = computed(
    () => this.profile.current()?.displayName ?? this.profile.current()?.username ?? 'Bạn',
  );

  /** Avatar thật, để thanh dưới đáy khớp với ảnh vừa đổi trong cài đặt. */
  protected readonly avatarUrl = computed(() => this.store.profile()?.avatarUrl ?? null);

  constructor() {
    void this.store.ensureLoaded();
  }

  /**
   * Bật/tắt thẻ hồ sơ.
   *
   * Mở NGAY rồi mới tải hồ sơ, không chờ API xong mới mở: chờ thì bấm vào
   * không có gì xảy ra trong vài trăm mili giây và người dùng bấm lần hai.
   * Trong lúc chờ, thẻ hiện khung xám (xem template).
   */
  protected toggleProfileCard(): void {
    const opening = !this.popoverOpen();
    this.popoverOpen.set(opening);
    if (opening) {
      void this.store.ensureLoaded();
    }
  }

  /** Esc đóng thẻ — lớp phủ trong suốt nên người dùng bàn phím cần đường thoát. */
  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.popoverOpen.set(false);
    }
  }

  protected openSettings(): void {
    this.popoverOpen.set(false);
    // openUserSettings ép settingsMode = 'user', tránh dính lại chế độ 'server' nếu
    // trước đó modal từng mở qua gear của channel-sidebar (openServerSettings).
    this.settingsService.openUserSettings('account');
  }

  protected async onSignOut(): Promise<void> {
    this.signingOut.set(true);
    try {
      await this.auth.signOut();
      this.profile.reset();
      // Hồ sơ đã nhớ là của NGƯỜI VỪA ĐĂNG XUẤT — không quên đi thì người đăng
      // nhập tiếp theo trên cùng máy sẽ thấy avatar và tên của người trước.
      this.store.reset();
      // Hồ sơ người khác đã nhớ mang cờ `isSelf` tính theo NGƯỜI ĐANG XEM —
      // giữ lại thì người đăng nhập kế tiếp thấy nút sửa trên hồ sơ người khác.
      this.lookup.reset();
      await this.router.navigateByUrl('/login');
    } finally {
      this.signingOut.set(false);
    }
  }
}
