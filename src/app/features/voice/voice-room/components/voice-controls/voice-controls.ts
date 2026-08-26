import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VoiceRoomService } from '../../../services/voice-room.service';
import { DeviceMenu } from '../device-menu/device-menu';

@Component({
  selector: 'app-voice-controls',
  imports: [DeviceMenu, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voice-controls.html',
  styleUrl: './voice-controls.css',
  host: {
    class: 'flex items-center justify-center shrink-0 py-3 px-4',
  },
})
export class VoiceControls {
  readonly voiceRoom = inject(VoiceRoomService);

  readonly inviteClicked = output<void>();
  readonly isFullscreen = signal<boolean>(false);

  protected readonly isMicMuted = this.voiceRoom.isMicMuted;
  protected readonly isCameraOn = this.voiceRoom.isCameraOn;
  protected readonly isScreenSharing = this.voiceRoom.isScreenSharing;

  protected toggleMic(): void {
    void this.voiceRoom.toggleMicrophone();
  }

  protected toggleCamera(): void {
    void this.voiceRoom.toggleCamera();
  }

  protected toggleScreenShare(): void {
    void this.voiceRoom.toggleScreenShare();
  }

  protected switchScreenShare(): void {
    void this.voiceRoom.switchScreenShare();
  }

  protected toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().then(() => {
        this.isFullscreen.set(true);
      });
    } else {
      void document.exitFullscreen().then(() => {
        this.isFullscreen.set(false);
      });
    }
  }

  protected leaveRoom(): void {
    void this.voiceRoom.leaveRoom();
  }
}
