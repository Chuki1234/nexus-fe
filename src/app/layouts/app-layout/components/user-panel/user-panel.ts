import { OverlayModule, type ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ProfileService } from '../../../../core/profile/profile.service';
import { ProfileDialogService } from '../../../../features/profile/profile-dialog.service';
import { ProfilePopover } from '../../../../features/profile/components/profile-popover/profile-popover';
import { ProfileStore } from '../../../../features/profile/profile-store';
import { UserSettingsService } from '../../../../features/settings/services/user-settings.service';
import { MediaDeviceService } from '../../../../features/voice/services/media-device.service';
import { VoiceRoomService } from '../../../../features/voice/services/voice-room.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';

/**
 * Khối người dùng ở đáy cột 2: avatar, tên, và các nút mic / tai nghe / cài đặt.
 *
 * Bấm vào avatar/tên mở hồ sơ đầy đủ dạng cửa sổ nổi (ProfileModal), không rời
 * khỏi khung chat; rê chuột vào thì hiện thẻ hồ sơ nhỏ (ProfilePopover). Đăng
 * xuất / Xóa tài khoản đã chuyển hẳn vào màn Cài đặt.
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'min-w-0 self-stretch overflow-hidden flex flex-col',
  },
  templateUrl: './user-panel.html',
  styleUrl: './user-panel.css',
})
export class UserPanel {
  private readonly router = inject(Router);
  private readonly profile = inject(ProfileService);
  private readonly settingsService = inject(UserSettingsService);
  private readonly profileDialog = inject(ProfileDialogService);
  readonly voiceRoom = inject(VoiceRoomService);
  readonly mediaDevices = inject(MediaDeviceService);
  protected readonly store = inject(ProfileStore);

  protected readonly isVoiceConnected = this.voiceRoom.isConnected;
  protected readonly voiceChannelName = this.voiceRoom.currentChannelName;
  protected readonly isTestingMic = this.mediaDevices.isTestingMic;
  protected readonly isMicMuted = this.voiceRoom.isMicMuted;
  protected readonly isDeafened = this.voiceRoom.isDeafened;

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

  protected async toggleTestMic(): Promise<void> {
    if (this.isTestingMic()) {
      this.mediaDevices.stopMicrophoneTest();
    } else {
      await this.mediaDevices.startMicrophoneTest();
    }
  }

  protected disconnectVoice(): void {
    if (this.isTestingMic()) {
      this.mediaDevices.stopMicrophoneTest();
    }
    void this.voiceRoom.leaveRoom();
  }

  protected toggleCamera(): void {
    void this.voiceRoom.toggleCamera();
  }

  protected toggleMic(): void {
    if (this.isVoiceConnected()) {
      void this.voiceRoom.toggleMicrophone();
    }
  }

  protected toggleDeafen(): void {
    if (this.isVoiceConnected()) {
      void this.voiceRoom.toggleDeafen();
    }
  }

  protected onNavigateToActiveVoiceRoom(): void {
    const srvId = this.voiceRoom.currentServerId();
    const chId = this.voiceRoom.currentChannelId();
    if (!chId) return;

    if (srvId && srvId !== '@me') {
      void this.router.navigate(['/channels', srvId, chId]);
    } else {
      void this.router.navigate(['/channels/@me', chId]);
    }
  }

  /**
   * Mở hồ sơ đầy đủ dạng cửa sổ nổi giữa màn hình thay vì điều hướng sang trang
   * `/u/:username`. Đóng thẻ nhỏ đang hover để không còn kẹt sau lớp phủ dialog.
   */
  protected openFullProfile(): void {
    const person = this.store.profile();
    if (!person) return;
    this.popoverOpen.set(false);
    this.profileDialog.open(person.username, person);
  }

  protected openSettings(): void {
    // openUserSettings ép settingsMode = 'user', tránh dính lại chế độ 'server' nếu
    // trước đó modal từng mở qua gear của channel-sidebar (openServerSettings).
    this.settingsService.openUserSettings('account');
  }
}
