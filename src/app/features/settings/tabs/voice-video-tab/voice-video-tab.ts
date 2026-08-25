import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService, AppPreferences } from '../../services/user-settings.service';

@Component({
  selector: 'app-voice-video-tab',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voice-video-tab.html',
  styleUrl: './voice-video-tab.css',
})
export class VoiceVideoTab implements OnDestroy {
  protected readonly settingsService = inject(UserSettingsService);

  protected readonly totalBars = 50;
  protected readonly isRecordingPttKey = signal<boolean>(false);
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  // Active green bars computed from live mic level (0-100)
  protected readonly activeBars = computed(() => {
    const level = this.settingsService.micLevel();
    if (!this.settingsService.isTestingMic()) return 0;
    return Math.round((level / 100) * this.totalBars);
  });

  protected readonly barsArray = Array.from({ length: this.totalBars }, (_, i) => i);

  protected readonly cameras = [
    { id: 'default', name: 'FaceTime HD Camera / Integrated Webcam (1080p)' },
    { id: 'cam-2', name: 'Logitech Brio 4K Stream Edition' },
    { id: 'cam-3', name: 'OBS Virtual Camera' },
  ];

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

  ngOnDestroy(): void {
    this.stopPttKeyRecording();
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
    this.settingsService.updatePreference('inputVolume', Number(vol));
  }

  protected setOutputVolume(vol: number): void {
    this.settingsService.updatePreference('outputVolume', Number(vol));
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

  protected toggleMicTest(): void {
    this.settingsService.toggleMicTest();
  }

  protected toggleVideoTest(): void {
    this.settingsService.toggleVideoTest();
  }
}
