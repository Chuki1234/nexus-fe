import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ConversationsApiService } from '../../../../../core/api/conversations-api.service';
import { VoiceParticipantModel, VoiceRoomService } from '../../../services/voice-room.service';
import { ChatSocketService } from '../../../../../core/realtime/chat-socket.service';
import { ServersStore } from '../../../../../core/servers/servers.store';
import { ServerCapabilitiesService } from '../../../../../core/servers/server-capabilities.service';
import { ServerVoiceStatesStore } from '../../../../../core/servers/server-voice-states.store';
import { ProfileService } from '../../../../../core/profile/profile.service';
import { ProfileDialogService } from '../../../../profile/profile-dialog.service';
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
  private readonly voiceStatesStore = inject(ServerVoiceStatesStore);
  private readonly conversationsApi = inject(ConversationsApiService);
  private readonly profile = inject(ProfileService);
  private readonly profileDialog = inject(ProfileDialogService);
  private readonly router = inject(Router);

  readonly inviteClicked = output<void>();

  private hideControlsTimer: ReturnType<typeof setTimeout> | null = null;
  readonly areControlsVisible = signal<boolean>(true);

  protected readonly selectedParticipant = signal<VoiceParticipantModel | null>(null);
  protected readonly contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  protected readonly openingDmIdentity = signal<string | null>(null);
  private readonly mutedSoundboards = signal<Record<string, boolean>>({});

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

  constructor() {
    effect(() => {
      const serverId = this.voiceRoom.currentServerId();
      if (serverId) {
        void this.voiceStatesStore.loadServerVoiceStates(serverId);
      }
    });
  }

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

  onToggleServerDeafen(targetUserId: string, isDeafened: boolean): void {
    const serverId = this.voiceRoom.currentServerId();
    if (!serverId) return;
    this.chatSocket.serverDeafenVoiceMember(serverId, targetUserId, !isDeafened);
  }

  protected profileUsername(participant: VoiceParticipantModel): string | null {
    const localUsername = participant.isLocal ? this.profile.current()?.username : null;
    const voiceState = this.voiceStatesStore
      .getServerVoiceStates(this.voiceRoom.currentServerId() ?? '')
      .find((state) => state.userId === participant.identity);
    return localUsername || voiceState?.username || participant.username || this.usernameFromParticipantName(participant.name);
  }

  protected canOpenProfile(participant: VoiceParticipantModel): boolean {
    return this.profileUsername(participant) !== null;
  }

  protected openParticipantProfile(participant: VoiceParticipantModel): void {
    const username = this.profileUsername(participant);
    if (!username) return;
    this.profileDialog.open(username);
  }

  protected async openParticipantMessage(participant: VoiceParticipantModel): Promise<void> {
    if (participant.isLocal || this.openingDmIdentity()) {
      return;
    }

    this.openingDmIdentity.set(participant.identity);
    try {
      const conversation = await this.conversationsApi.getOrCreateDm(participant.identity);
      await this.router.navigate(['/channels/@me', conversation.id]);
    } catch (err) {
      console.warn('Không mở được tin nhắn riêng từ voice tile:', err);
    } finally {
      this.openingDmIdentity.set(null);
    }
  }

  protected toggleParticipantMute(participant: VoiceParticipantModel): void {
    this.voiceRoom.toggleLocalMute(participant.identity);
  }

  protected isParticipantMutedForMe(participant: VoiceParticipantModel): boolean {
    return !participant.isLocal && this.voiceRoom.isLocalMuted(participant.identity);
  }

  protected toggleSoundboardMute(participant: VoiceParticipantModel): void {
    const id = participant.identity;
    this.mutedSoundboards.update((map) => ({ ...map, [id]: !map[id] }));
  }

  protected isSoundboardMuted(participant: VoiceParticipantModel): boolean {
    return this.mutedSoundboards()[participant.identity] ?? false;
  }

  onVolumeChange(userId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.voiceRoom.setUserVolume(userId, parseFloat(target.value));
    }
  }

  protected onMoveSelfToChannel(targetChannelId: string): void {
    const serverId = this.voiceRoom.currentServerId();
    const currentChannelId = this.voiceRoom.currentChannelId();
    const localIdentity = this.voiceRoom.localParticipant()?.identity;
    if (!serverId || !localIdentity || currentChannelId === targetChannelId) return;

    const targetChannel = this.serversStore.channelsOf(serverId).find((c) => c.id === targetChannelId);
    const targetName = targetChannel?.name || 'Kênh thoại';

    void this.voiceRoom.joinRoom(serverId, targetChannelId, targetName);
    this.chatSocket.moveVoiceMember(serverId, localIdentity, targetChannelId);
    void this.router.navigate(['/channels', serverId, targetChannelId]);
  }

  private usernameFromParticipantName(name: string): string | null {
    const candidate = name.trim();
    return /^[a-zA-Z0-9_.-]{2,32}$/.test(candidate) ? candidate : null;
  }

  ngOnDestroy(): void {
    this.clearHideControlsTimer();
  }
}
