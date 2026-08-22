import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VoiceRoomService } from '../../../services/voice-room.service';
import { ParticipantTile } from '../participant-tile/participant-tile';

@Component({
  selector: 'app-voice-stage',
  imports: [ParticipantTile, MatIconModule, MatButtonModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voice-stage.html',
  styleUrl: './voice-stage.css',
  host: {
    class: 'flex size-full min-h-0 flex-1 flex-col overflow-hidden p-4',
  },
})
export class VoiceStage {
  readonly voiceRoom = inject(VoiceRoomService);

  readonly inviteClicked = output<void>();

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

  protected readonly gridClass = computed(() => {
    const count = this.participants().length;
    if (count === 1) {
      return 'grid-cols-1 md:grid-cols-2';
    }
    if (count === 2) {
      return 'grid-cols-1 md:grid-cols-2';
    }
    if (count <= 4) {
      return 'grid-cols-2';
    }
    if (count <= 9) {
      return 'grid-cols-2 lg:grid-cols-3';
    }
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  });

  watchStream(identity: string): void {
    this.focusedParticipantIdentity.set(identity);
  }

  stopWatchingStream(): void {
    this.focusedParticipantIdentity.set(null);
  }

  toggleFullscreen(): void {
    const el = document.getElementById('nexus-voice-stream-container');
    if (!document.fullscreenElement) {
      void el?.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }
}
