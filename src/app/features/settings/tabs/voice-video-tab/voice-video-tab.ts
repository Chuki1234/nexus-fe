import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService, AppPreferences } from '../../services/user-settings.service';
import { MediaDeviceService } from '../../../voice/services/media-device.service';

@Component({
  selector: 'app-voice-video-tab',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voice-video-tab.html',
  styleUrl: './voice-video-tab.css',
})
export class VoiceVideoTab implements OnInit, OnDestroy {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly mediaDevices = inject(MediaDeviceService);

  protected readonly totalBars = 50;
  protected readonly isRecordingPttKey = signal<boolean>(false);
  protected readonly isTestingVideo = signal<boolean>(false);
  protected readonly videoError = signal<string | null>(null);

  private keydownListener: ((e: KeyboardEvent) => void) | null = null;
  private videoStream: MediaStream | null = null;

  // Active green bars computed from live mic level (0-100) from real hardware
  protected readonly activeBars = computed(() => {
    if (!this.mediaDevices.isTestingMic()) return 0;
    const level = this.mediaDevices.audioLevel();
    return Math.round((level / 100) * this.totalBars);
  });

  protected readonly barsArray = Array.from({ length: this.totalBars }, (_, i) => i);

  protected readonly backgroundEffects: {
    id: AppPreferences['videoBackgroundEffect'];
    label: string;
    icon: string;
  }[] = [
    { id: 'none', label: 'Không hiệu ứng', icon: 'block' },
    { id: 'blur', label: 'Làm mờ nền', icon: 'blur_on' },
    { id: 'cyberpunk', label: 'Nexus Cyberpunk', icon: 'nightlife' },
    { id: 'cozy-room', label: 'Phòng Studio ấm', icon: 'weekend' },
  ];

  async ngOnInit(): Promise<void> {
    // Xin quyền và quét thiết bị phần cứng thực tế của máy
    await this.mediaDevices.requestPermissions(true);
    await this.mediaDevices.enumerateDevices();

    // Đồng bộ mức âm lượng đã lưu
    const prefs = this.settingsService.preferences();
    this.mediaDevices.setInputVolumeLevel(prefs.inputVolume);
    this.mediaDevices.setOutputVolumeLevel(prefs.outputVolume);
  }

  ngOnDestroy(): void {
    this.stopPttKeyRecording();
    this.mediaDevices.stopMicrophoneTest();
    this.stopVideoTest();
  }

  protected onInputDeviceChange(deviceId: string): void {
    this.mediaDevices.selectAudioInput(deviceId);
    this.settingsService.updatePreference('selectedInputDevice', deviceId);
  }

  protected onOutputDeviceChange(deviceId: string): void {
    void this.mediaDevices.selectAudioOutput(deviceId);
    this.settingsService.updatePreference('selectedOutputDevice', deviceId);
  }

  protected onVideoDeviceChange(deviceId: string): void {
    this.mediaDevices.selectVideoInput(deviceId);
    this.settingsService.updatePreference('selectedVideoDevice', deviceId);
    if (this.isTestingVideo()) {
      void this.startVideoTest();
    }
  }

  protected toggleMicTest(): void {
    if (this.mediaDevices.isTestingMic()) {
      this.mediaDevices.stopMicrophoneTest();
    } else {
      // Bắt đầu test mic với loopback để người dùng có thể nghe giọng mình qua loa/tai nghe đã chọn
      void this.mediaDevices.startMicrophoneTest(this.mediaDevices.selectedAudioInputId(), true);
    }
  }

  protected async toggleVideoTest(): Promise<void> {
    if (this.isTestingVideo()) {
      this.stopVideoTest();
    } else {
      await this.startVideoTest();
    }
  }

  private async startVideoTest(): Promise<void> {
    this.stopVideoTest();
    this.videoError.set(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.videoError.set('Trình duyệt không hỗ trợ truy cập camera.');
      return;
    }

    try {
      const vidId = this.mediaDevices.selectedVideoInputId();
      const constraints: MediaStreamConstraints = {
        video: vidId && vidId !== 'default' ? { deviceId: { exact: vidId } } : true,
      };

      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isTestingVideo.set(true);

      setTimeout(() => {
        const videoEl = document.querySelector<HTMLVideoElement>('#settings-video-preview');
        if (videoEl && this.videoStream) {
          videoEl.srcObject = this.videoStream;
          videoEl.play().catch(() => {});
        }
      }, 60);
    } catch (err: unknown) {
      const error = err as Error;
      this.isTestingVideo.set(false);
      this.videoError.set(error?.message || 'Không thể mở camera xem trước.');
    }
  }

  private stopVideoTest(): void {
    this.isTestingVideo.set(false);
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((t) => t.stop());
      this.videoStream = null;
    }
    const videoEl = document.querySelector<HTMLVideoElement>('#settings-video-preview');
    if (videoEl) {
      videoEl.srcObject = null;
    }
  }

  protected startPttKeyRecording(): void {
    if (this.isRecordingPttKey()) {
      this.stopPttKeyRecording();
      return;
    }
    this.isRecordingPttKey.set(true);

    this.keydownListener = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        this.stopPttKeyRecording();
        return;
      }

      let keyName = e.key;
      if (e.code === 'Space') keyName = 'Space';
      else if (e.code === 'CapsLock') keyName = 'Caps Lock';
      else if (e.code.startsWith('Key')) keyName = e.code.replace('Key', '');
      else if (e.code.startsWith('Digit')) keyName = e.code.replace('Digit', '');
      else if (e.key === 'Control') keyName = 'Ctrl';
      else if (e.key === 'Alt') keyName = 'Alt';
      else if (e.key === 'Shift') keyName = 'Shift';
      else if (e.key === 'Meta') keyName = 'Win / Cmd';
      else if (e.key.length === 1) keyName = e.key.toUpperCase();

      this.settingsService.updatePreference('pushToTalkKey', keyName);
      this.stopPttKeyRecording();
    };

    window.addEventListener('keydown', this.keydownListener, { capture: true });
  }

  protected stopPttKeyRecording(): void {
    this.isRecordingPttKey.set(false);
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener, { capture: true });
      this.keydownListener = null;
    }
  }

  protected setInputVolume(vol: number): void {
    const num = Number(vol);
    this.mediaDevices.setInputVolumeLevel(num);
    this.settingsService.updatePreference('inputVolume', num);
  }

  protected setOutputVolume(vol: number): void {
    const num = Number(vol);
    this.mediaDevices.setOutputVolumeLevel(num);
    this.settingsService.updatePreference('outputVolume', num);
  }

  protected setVoiceProcessingMode(mode: AppPreferences['voiceProcessingMode']): void {
    this.settingsService.updatePreference('voiceProcessingMode', mode);
  }

  protected setInputMode(mode: AppPreferences['inputMode']): void {
    this.settingsService.updatePreference('inputMode', mode);
  }

  protected setVoiceSensitivity(val: number): void {
    this.settingsService.updatePreference('voiceSensitivity', Number(val));
  }

  protected setPushToTalkDelay(val: number): void {
    this.settingsService.updatePreference('pushToTalkDelay', Number(val));
  }

  protected setAttenuationPercent(val: number): void {
    this.settingsService.updatePreference('attenuationPercent', Number(val));
  }

  protected setBackgroundEffect(effect: AppPreferences['videoBackgroundEffect']): void {
    this.settingsService.updatePreference('videoBackgroundEffect', effect);
  }
}
