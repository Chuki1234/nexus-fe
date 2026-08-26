import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProfileService } from '../../../../../core/profile/profile.service';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { MediaDeviceService } from '../../../services/media-device.service';

@Component({
  selector: 'app-voice-prejoin',
  imports: [Avatar, MatIconModule, MatButtonModule, MatSelectModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voice-prejoin.html',
  styleUrl: './voice-prejoin.css',
  host: {
    class: 'flex size-full items-center justify-center p-4',
  },
})
export class VoicePrejoin implements OnInit, OnDestroy {
  readonly mediaDevices = inject(MediaDeviceService);
  readonly profile = inject(ProfileService);

  readonly channelName = input.required<string>();

  readonly join = output<{ audio: boolean; video: boolean }>();
  readonly cancel = output<void>();

  readonly micEnabled = signal<boolean>(true);
  readonly cameraEnabled = signal<boolean>(false);

  private readonly previewVideo = viewChild<ElementRef<HTMLVideoElement>>('previewVideo');
  private previewStream: MediaStream | null = null;

  protected readonly displayName = this.profile.current()?.displayName || 'Bạn';
  protected readonly avatarUrl = this.profile.current()?.avatarUrl || null;
  protected readonly audioLevel = this.mediaDevices.audioLevel;

  constructor() {
    effect(() => {
      const cam = this.cameraEnabled();
      const videoEl = this.previewVideo()?.nativeElement;
      if (cam) {
        void this.startCameraPreview();
      } else {
        this.stopCameraPreview();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.mediaDevices.enumerateDevices();
    void this.mediaDevices.startMicrophoneTest(this.mediaDevices.selectedAudioInputId());
  }

  private async startCameraPreview(): Promise<void> {
    this.stopCameraPreview();
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    try {
      const deviceId = this.mediaDevices.selectedVideoInputId();
      const constraints: MediaStreamConstraints = {
        video: deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : true,
      };
      this.previewStream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoEl = this.previewVideo()?.nativeElement;
      if (videoEl) {
        videoEl.srcObject = this.previewStream;
      }
    } catch (err) {
      console.warn('Không thể bật camera preview:', err);
    }
  }

  private stopCameraPreview(): void {
    if (this.previewStream) {
      this.previewStream.getTracks().forEach((t) => t.stop());
      this.previewStream = null;
    }
    const videoEl = this.previewVideo()?.nativeElement;
    if (videoEl) {
      videoEl.srcObject = null;
    }
  }

  protected toggleMic(): void {
    const next = !this.micEnabled();
    this.micEnabled.set(next);
    if (next) {
      void this.mediaDevices.startMicrophoneTest(this.mediaDevices.selectedAudioInputId());
    } else {
      this.mediaDevices.stopMicrophoneTest();
    }
  }

  protected toggleCamera(): void {
    this.cameraEnabled.update((c) => !c);
  }

  protected onAudioInputChange(deviceId: string): void {
    this.mediaDevices.selectAudioInput(deviceId);
  }

  protected onVideoInputChange(deviceId: string): void {
    this.mediaDevices.selectVideoInput(deviceId);
    if (this.cameraEnabled()) {
      void this.startCameraPreview();
    }
  }

  protected onJoin(): void {
    this.stopCameraPreview();
    this.mediaDevices.stopMicrophoneTest();
    this.join.emit({
      audio: this.micEnabled(),
      video: this.cameraEnabled(),
    });
  }

  protected onCancel(): void {
    this.stopCameraPreview();
    this.mediaDevices.stopMicrophoneTest();
    this.cancel.emit();
  }

  ngOnDestroy(): void {
    this.stopCameraPreview();
    this.mediaDevices.stopMicrophoneTest();
  }
}
