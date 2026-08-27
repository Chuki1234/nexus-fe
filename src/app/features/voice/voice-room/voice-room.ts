import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import type { ChannelSummary } from '../../../core/servers/server.models';
import { ServersStore } from '../../../core/servers/servers.store';
import { InviteChannelDialog } from '../../../layouts/app-layout/components/channel-sidebar/components/invite-channel-dialog/invite-channel-dialog';
import { ChannelSettingsModal } from '../../settings/modals/channel-settings-modal/channel-settings-modal';
import { VoiceRoomService } from '../services/voice-room.service';
import { VoiceChatDrawer } from './components/voice-chat-drawer/voice-chat-drawer';
import { VoiceControls } from './components/voice-controls/voice-controls';
import { VoicePrejoin } from './components/voice-prejoin/voice-prejoin';
import { VoiceStage } from './components/voice-stage/voice-stage';

@Component({
  selector: 'app-voice-room',
  imports: [
    VoiceStage,
    VoiceControls,
    VoicePrejoin,
    VoiceChatDrawer,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voice-room.html',
  styleUrl: './voice-room.css',
  host: {
    class: 'flex size-full min-h-0 flex-1 flex-col overflow-hidden bg-canvas relative',
  },
})
export class VoiceRoom implements OnInit {
  readonly voiceRoom = inject(VoiceRoomService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly serversStore = inject(ServersStore);

  readonly channel = input.required<ChannelSummary>();
  readonly serverId = input.required<string>();

  readonly isChatOpen = this.voiceRoom.isChatDrawerOpen;

  protected readonly connectionStatus = this.voiceRoom.connectionStatus;
  protected readonly formattedDuration = this.voiceRoom.formattedDuration;
  protected readonly errorMessage = this.voiceRoom.errorMessage;

  protected readonly isCurrentChannelActive = computed(
    () =>
      this.voiceRoom.currentChannelId() === this.channel().id &&
      (this.connectionStatus() === 'connected' || this.connectionStatus() === 'reconnecting'),
  );

  protected readonly serverName = computed(() => {
    const s = this.serversStore.servers().find((srv) => srv.id === this.serverId());
    return s?.name ?? 'Máy chủ';
  });

  ngOnInit(): void {
    if (this.route.snapshot.queryParams['chat'] === 'open') {
      this.voiceRoom.openChatDrawer();
    }
  }

  protected toggleChat(): void {
    this.voiceRoom.toggleChatDrawer();
  }

  protected openInviteDialog(): void {
    this.dialog.open(InviteChannelDialog, {
      data: {
        serverId: this.serverId(),
        serverName: this.serverName(),
        channelName: this.channel().name,
        channelId: this.channel().id,
      },
      panelClass: 'nexus-dialog-overlay',
      autoFocus: false,
    });
  }

  protected openSettingsModal(): void {
    this.dialog.open(ChannelSettingsModal, {
      data: {
        serverId: this.serverId(),
        channel: this.channel(),
      },
      panelClass: 'nexus-dialog-overlay',
      maxWidth: '92vw',
      maxHeight: '88vh',
      autoFocus: false,
    });
  }

  protected joinVoice(options?: { audio?: boolean; video?: boolean }): void {
    void this.voiceRoom.joinRoom(this.serverId(), this.channel().id, this.channel().name, options);
  }

  protected openPrejoin(): void {
    this.voiceRoom.openPrejoin(this.serverId(), this.channel().id, this.channel().name);
  }

  protected onJoinFromPrejoin(options: { audio: boolean; video: boolean }): void {
    this.joinVoice(options);
  }
}
