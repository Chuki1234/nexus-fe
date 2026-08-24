import { OverlayModule, type ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../../../core/profile/profile.service';
import { ProfilePopover } from '../../../../features/profile/components/profile-popover/profile-popover';
import { ProfileStore } from '../../../../features/profile/profile-store';
import { UserSettingsService } from '../../../../features/settings/services/user-settings.service';
import { VoiceRoomService } from '../../../../features/voice/services/voice-room.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';

/**
 * Khối người dùng ở đáy cột 2: avatar, tên, và các nút mic / tai nghe / cài đặt.
 *
 * Bấm vào avatar/tên điều hướng sang trang hồ sơ đầy đủ (`/u/:username`); rê chuột
 * vào thì hiện thẻ hồ sơ nhỏ (ProfilePopover của Dược). Đăng xuất / Xóa tài khoản
 * đã chuyển hẳn vào màn Cài đặt.
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
    class: 'm-2 mt-1 min-w-0 self-stretch overflow-hidden rounded-xl bg-canvas p-2 shadow-glow flex flex-col',
  },
  templateUrl: './user-panel.html',
  styleUrl: './user-panel.css',
})
export class UserPanel {
  private readonly profile = inject(ProfileService);
  private readonly settingsService = inject(UserSettingsService);
  readonly voiceRoom = inject(VoiceRoomService);
  protected readonly store = inject(ProfileStore);

  protected readonly isVoiceConnected = this.voiceRoom.isConnected;
  protected readonly voiceChannelName = this.voiceRoom.currentChannelName;
  protected readonly isCameraOn = this.voiceRoom.isCameraOn;
  protected readonly isScreenSharing = this.voiceRoom.isScreenSharing;

  protected readonly micMuted = signal(false);
  protected readonly deafened = signal(false);

  /** Thẻ hồ sơ nổi đè lên khi rê chuột vào khối người dùng. */
  protected readonly popoverOpen = signal(false);
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Thẻ bung LÊN TRÊN: khối này nằm sát đáy cột, mở xuống dưới là ra ngoài màn
   * hình. Dự phòng mở xuống chỉ dùng khi cửa sổ quá thấp để chứa thẻ ở trên.
   */
  protected readonly popoverPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
  ];

  protected readonly displayName = computed(
    () => this.profile.current()?.displayName ?? this.profile.current()?.username ?? 'Bạn',
  );

  /** Username để điều hướng sang trang hồ sơ đầy đủ. */
  protected readonly username = computed(
    () => this.store.profile()?.username ?? this.profile.current()?.username ?? null,
  );

  /** Avatar thật, để thanh dưới đáy khớp với ảnh vừa đổi trong cài đặt. */
  protected readonly avatarUrl = computed(() => this.store.profile()?.avatarUrl ?? null);

  constructor() {
    void this.store.ensureLoaded();
  }

  /**
   * Rê chuột vào → mở thẻ NGAY rồi mới tải hồ sơ, không chờ API xong: chờ thì
   * người dùng thấy trống một nhịp. Trong lúc chờ, thẻ hiện khung xám.
   */
  protected openCard(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.popoverOpen.set(true);
    void this.store.ensureLoaded();
  }

  /**
   * Rời chuột → đóng thẻ sau một nhịp ngắn, để kịp di chuột từ khối sang thẻ mà
   * thẻ không biến mất giữa chừng.
   */
  protected scheduleClose(): void {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => this.popoverOpen.set(false), 160);
  }

  protected disconnectVoice(): void {
    void this.voiceRoom.leaveRoom();
  }

  protected toggleCamera(): void {
    void this.voiceRoom.toggleCamera();
  }

  protected toggleScreenShare(): void {
    void this.voiceRoom.toggleScreenShare();
  }

  protected openSettings(): void {
    // openUserSettings ép settingsMode = 'user', tránh dính lại chế độ 'server' nếu
    // trước đó modal từng mở qua gear của channel-sidebar (openServerSettings).
    this.settingsService.openUserSettings('account');
  }
}
