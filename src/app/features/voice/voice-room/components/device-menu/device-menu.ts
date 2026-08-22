import { ChangeDetectionStrategy, Component, inject, input, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { MediaDeviceService } from '../../../services/media-device.service';
import { VoiceRoomService } from '../../../services/voice-room.service';

@Component({
  selector: 'app-device-menu',
  imports: [MatIconModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './device-menu.html',
  styleUrl: './device-menu.css',
})
export class DeviceMenu {
  readonly mediaDevices = inject(MediaDeviceService);
  readonly voiceRoom = inject(VoiceRoomService);

  readonly menu = viewChild.required<MatMenu>('menu');

  readonly kind = input.required<'audio' | 'video' | 'output'>();

  protected readonly audioInputs = this.mediaDevices.audioInputs;
  protected readonly videoInputs = this.mediaDevices.videoInputs;
  protected readonly audioOutputs = this.mediaDevices.audioOutputs;

  protected readonly selectedAudioInput = this.mediaDevices.selectedAudioInputId;
  protected readonly selectedVideoInput = this.mediaDevices.selectedVideoInputId;
  protected readonly selectedAudioOutput = this.mediaDevices.selectedAudioOutputId;

  protected selectAudioInput(id: string): void {
    void this.voiceRoom.switchAudioInput(id);
  }

  protected selectVideoInput(id: string): void {
    void this.voiceRoom.switchVideoInput(id);
  }

  protected selectAudioOutput(id: string): void {
    void this.voiceRoom.switchAudioOutput(id);
  }
}
