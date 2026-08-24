import { OverlayModule, type ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProfileService } from '../../../../core/profile/profile.service';
import { ProfilePopover } from '../../../../features/profile/components/profile-popover/profile-popover';
import { ProfileStore } from '../../../../features/profile/profile-store';
import { UserSettingsService } from '../../../../features/settings/services/user-settings.service';
import { VoiceRoomService } from '../../../../features/voice/services/voice-room.service';
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
  private readonly profile = inject(ProfileService);
  private readonly settingsService = inject(UserSettingsService);
  private readonly voiceRoom = inject(VoiceRoomService);
  protected readonly store = inject(ProfileStore);

  protected readonly isVoiceConnected = this.voiceRoom.isConnected;
  protected readonly voiceChannelName = this.voiceRoom.currentChannelName;
  protected readonly isScreenSharing = this.voiceRoom.isScreenSharing;
  protected readonly isCameraOn = this.voiceRoom.isCameraOn;

  /**
   * Thẻ bung LÊN TRÊN: khối này nằm sát đáy cột, mở xuống dưới là ra ngoài màn
   * hình. Dự phòng mở xuống chỉ dùng khi cửa sổ quá thấp để chứa thẻ ở trên.
   */
  protected readonly popoverPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
  ];

  protected readonly micMuted = signal(false);
  protected readonly deafened = signal(false);
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

  protected disconnectVoice(): void {
    void this.voiceRoom.leaveRoom();
  }

  protected toggleScreenShare(): void {
    void this.voiceRoom.toggleScreenShare();
  }

  protected toggleCamera(): void {
    void this.voiceRoom.toggleCamera();
  }
}
