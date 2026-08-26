import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VoiceParticipantModel, VoiceRoomService } from '../../../services/voice-room.service';
import { ChatSocketService } from '../../../../../core/realtime/chat-socket.service';
import { ServersStore } from '../../../../../core/servers/servers.store';
import { ServerCapabilitiesService } from '../../../../../core/servers/server-capabilities.service';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { ParticipantTile } from '../participant-tile/participant-tile';
import { VoiceControls } from '../voice-controls/voice-controls';

export interface VoiceStageItem {
  id: string;
  type: 'participant' | 'screen_share';
  participant: VoiceParticipantModel;
}

@Component({
  selector: 'app-voice-stage',
  imports: [
    Avatar,
    ParticipantTile,
    VoiceControls,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voice-stage.html',
  styleUrl: './voice-stage.css',
  host: {
    class: 'flex size-full min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-4',
  },
})
export class VoiceStage implements OnDestroy {
  @ViewChild('stageMemberMenuTrigger') private readonly stageMemberMenuTrigger?: MatMenuTrigger;

  readonly voiceRoom = inject(VoiceRoomService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly serversStore = inject(ServersStore);
  private readonly capabilitiesService = inject(ServerCapabilitiesService);

  readonly inviteClicked = output<void>();

  private hideControlsTimer: ReturnType<typeof setTimeout> | null = null;
  readonly areControlsVisible = signal<boolean>(true);

  protected readonly selectedParticipant = signal<VoiceParticipantModel | null>(null);
  protected readonly contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  protected readonly isOwner = computed(() => {
    const sId = this.voiceRoom.currentServerId();
    if (!sId) return false;
    return this.capabilitiesService.capabilitiesMap().get(sId)?.isOwner ?? false;
  });

  protected readonly otherVoiceChannels = computed(() => {
    const sId = this.voiceRoom.currentServerId();
    const cId = this.voiceRoom.currentChannelId();
    if (!sId) return [];
    return this.serversStore.channelsOf(sId).filter((c) => c.type === 'voice' && c.id !== cId);
  });

  protected readonly participants = this.voiceRoom.allParticipants;

  /** Quản lý identity của người dùng đang được xem stream phóng to */
  readonly focusedParticipantIdentity = signal<string | null>(null);

  protected readonly focusedParticipant = computed(() => {
    const id = this.focusedParticipantIdentity();
    if (!id) return null;
    return this.participants().find((p) => p.identity === id) ?? null;
  });

  readonly isWatchingStream = computed(() => {
    const p = this.focusedParticipant();
    if (!p) return false;
    return !!(p.isScreenSharing || p.screenSharePublication);
  });

  /**
   * Danh sách tất cả các ô trên sân khấu:
   * - Bao gồm Participant Tile (Avatar/Webcam) của từng thành viên
   * - Và Stream Tile (Preview Screen Share) của bất kỳ ai đang bật chia sẻ màn hình
   */
  readonly stageItems = computed<VoiceStageItem[]>(() => {
    const list: VoiceStageItem[] = [];
    const pts = this.participants();

    pts.forEach((p) => {
      // 1. Ô Participant (Webcam / Avatar)
      list.push({
        id: `participant-${p.identity}`,
        type: 'participant',
        participant: p,
      });

      // 2. Ô Screen Share Tile riêng biệt nếu người này đang share screen
      if (p.isScreenSharing || p.screenSharePublication) {
        list.push({
          id: `stream-${p.identity}`,
          type: 'screen_share',
          participant: p,
        });
      }
    });

    return list;
  });

  /**
   * Hiển thị Companion Tile nếu chỉ có đúng 1 người và không có ai bật livestream
   */
  readonly showCompanionTile = computed(() => {
    return this.participants().length === 1 && this.stageItems().length === 1;
  });

  /**
   * Class bố cục linh hoạt theo số lượng ô
   */
  readonly stageTierClass = computed(() => {
    const count = this.stageItems().length + (this.showCompanionTile() ? 1 : 0);
    if (count <= 1) return 'stage--count-1';
    if (count === 2) return 'stage--count-2';
    if (count === 3) return 'stage--count-3';
    if (count === 4) return 'stage--count-4';
    if (count <= 6) return 'stage--count-6';
    if (count <= 9) return 'stage--count-9';
    return 'stage--count-many';
  });

  watchStream(identity: string): void {
    this.focusedParticipantIdentity.set(identity);
    this.onStreamMouseMove();
  }

  stopWatchingStream(): void {
    this.focusedParticipantIdentity.set(null);
    this.clearHideControlsTimer();
    this.areControlsVisible.set(true);
  }

  onStreamMouseMove(): void {
    this.areControlsVisible.set(true);
    this.resetHideControlsTimer();
  }

  onStreamMouseLeave(): void {
    if (this.isAnyMenuOpen()) {
      return;
    }
    this.clearHideControlsTimer();
    this.areControlsVisible.set(false);
  }

  private isAnyMenuOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return !!document.querySelector(
      '.cdk-overlay-container .mat-mdc-menu-panel, .cdk-overlay-container .mat-mdc-dialog-container, .cdk-overlay-container .nexus-device-menu'
    );
  }

  private resetHideControlsTimer(): void {
    this.clearHideControlsTimer();
    this.hideControlsTimer = setTimeout(() => {
      if (this.isAnyMenuOpen()) {
        this.resetHideControlsTimer();
        return;
      }
      this.areControlsVisible.set(false);
    }, 3000);
  }

  private clearHideControlsTimer(): void {
    if (this.hideControlsTimer) {
      clearTimeout(this.hideControlsTimer);
      this.hideControlsTimer = null;
    }
  }

  toggleFullscreen(): void {
    const el = document.getElementById('nexus-voice-stream-container');
    if (!document.fullscreenElement) {
      void el?.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }

  onParticipantContextMenu(event: MouseEvent | KeyboardEvent, participant: VoiceParticipantModel): void {
    event.preventDefault();
    event.stopPropagation();

    let x = 0;
    let y = 0;
    if (event instanceof MouseEvent) {
      x = event.clientX;
      y = event.clientY;
    } else {
      const target = event.target as HTMLElement;
      const rect = target?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    this.selectedParticipant.set(participant);
    this.contextMenuPosition.set({ x, y });
    this.stageMemberMenuTrigger?.openMenu();
  }

  onMoveMember(targetUserId: string, targetChannelId: string): void {
    const serverId = this.voiceRoom.currentServerId();
    if (!serverId) return;
    this.chatSocket.moveVoiceMember(serverId, targetUserId, targetChannelId);
  }

  onKickMember(targetUserId: string): void {
    const serverId = this.voiceRoom.currentServerId();
    if (!serverId) return;
    this.chatSocket.kickVoiceMember(serverId, targetUserId);
  }

  onToggleServerMute(targetUserId: string, isMuted: boolean): void {
    const serverId = this.voiceRoom.currentServerId();
    if (!serverId) return;
    this.chatSocket.serverMuteVoiceMember(serverId, targetUserId, !isMuted);
  }

  onVolumeChange(userId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.voiceRoom.setUserVolume(userId, parseFloat(target.value));
    }
  }

  ngOnDestroy(): void {
    this.clearHideControlsTimer();
  }
}
