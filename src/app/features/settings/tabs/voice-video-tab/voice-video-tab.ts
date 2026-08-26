import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserSettingsService, AppPreferences } from '../../services/user-settings.service';
import { MediaDeviceService } from '../../../voice/services/media-device.service';

@Component({
  selector: 'app-voice-video-tab',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voice-video-tab.html',
  styleUrl: './voice-video-tab.css',
})
export class VoiceVideoTab implements OnInit, OnDestroy {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly mediaDevices = inject(MediaDeviceService);
  private readonly elementRef = inject(ElementRef);

  protected readonly totalBars = 45;
  protected readonly isRecordingPttKey = signal<boolean>(false);
  protected readonly isTestingVideo = signal<boolean>(false);
  protected readonly isCameraStarting = signal<boolean>(false);
  protected readonly videoError = signal<string | null>(null);
  protected readonly videoStats = signal<string>('720p • 30 FPS');

  // Custom dropdown open states
  protected readonly inputDropdownOpen = signal<boolean>(false);
  protected readonly outputDropdownOpen = signal<boolean>(false);
  protected readonly videoDropdownOpen = signal<boolean>(false);

  private keydownListener: ((e: KeyboardEvent) => void) | null = null;
  private videoStream: MediaStream | null = null;

  protected readonly activeBars = computed(() => {
    if (!this.mediaDevices.isTestingMic()) return 0;
    const level = this.mediaDevices.audioLevel();
    return Math.round((level / 100) * this.totalBars);
  });

  protected readonly barsArray = Array.from({ length: this.totalBars }, (_, i) => i);

  protected readonly backgroundEffects: {
    id: AppPreferences['videoBackgroundEffect'];
    label: string;
    description: string;
    icon: string;
  }[] = [
    { id: 'none', label: 'Mặc định', description: 'Hình ảnh gốc tự nhiên', icon: 'block' },
    { id: 'blur', label: 'Làm mờ nền', description: 'Làm mờ sâu hậu cảnh', icon: 'blur' },
    { id: 'cyberpunk', label: 'Cyberpunk', description: 'Ánh sáng neon tương lai', icon: 'cyberpunk' },
    { id: 'cozy-room', label: 'Studio Ấm', description: 'Tông màu vintage ấm áp', icon: 'room' },
  ];

  protected selectedInputLabel = computed(() => {
    const id = this.mediaDevices.selectedAudioInputId();
    const devices = this.mediaDevices.audioInputs();
    if (!devices.length) return 'Cài đặt mặc định của Windows (Microphone Array...)';
    const found = devices.find((d) => d.deviceId === id);
    return found?.label || devices[0]?.label || 'Microphone 1';
  });

  protected selectedOutputLabel = computed(() => {
    const id = this.mediaDevices.selectedAudioOutputId();
    const devices = this.mediaDevices.audioOutputs();
    if (!devices.length) return 'Cài đặt mặc định của Windows (Speakers/Headphones...)';
    const found = devices.find((d) => d.deviceId === id);
    return found?.label || devices[0]?.label || 'Speakers / Headphones 1';
  });

  protected selectedVideoLabel = computed(() => {
    const id = this.mediaDevices.selectedVideoInputId();
    const devices = this.mediaDevices.videoInputs();
    if (!devices.length) return 'Cài đặt mặc định của Windows (Integrated Camera...)';
    const found = devices.find((d) => d.deviceId === id);
    return found?.label || devices[0]?.label || 'Integrated Camera 1';
  });

  /** Filter CSS thời gian thực cho video theo hiệu ứng phông nền đang chọn */
  protected currentVideoFilter = computed(() => {
    const effect = this.settingsService.preferences().videoBackgroundEffect;
    switch (effect) {
      case 'blur':
        return 'blur(5px) contrast(1.05)';
      case 'cyberpunk':
        return 'contrast(1.35) saturate(1.8) hue-rotate(185deg)';
      case 'cozy-room':
        return 'sepia(0.3) saturate(1.3) contrast(1.1) brightness(0.95)';
      case 'none':
      default:
        return 'none';
    }
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeAllDropdowns();
    }
  }

  async ngOnInit(): Promise<void> {
    await this.mediaDevices.requestPermissions(true);
    await this.mediaDevices.enumerateDevices();
    const prefs = this.settingsService.preferences();
    this.mediaDevices.setInputVolumeLevel(prefs.inputVolume);
    this.mediaDevices.setOutputVolumeLevel(prefs.outputVolume);
  }

  ngOnDestroy(): void {
    this.stopPttKeyRecording();
    this.mediaDevices.stopMicrophoneTest();
    this.stopVideoTest();
  }

  protected toggleInputDropdown(): void {
    this.inputDropdownOpen.update((v) => !v);
    this.outputDropdownOpen.set(false);
    this.videoDropdownOpen.set(false);
  }

  protected toggleOutputDropdown(): void {
    this.outputDropdownOpen.update((v) => !v);
    this.inputDropdownOpen.set(false);
    this.videoDropdownOpen.set(false);
  }

  protected toggleVideoDropdown(): void {
    this.videoDropdownOpen.update((v) => !v);
    this.inputDropdownOpen.set(false);
    this.outputDropdownOpen.set(false);
  }

  protected selectInput(deviceId: string): void {
    this.onInputDeviceChange(deviceId);
    this.inputDropdownOpen.set(false);
  }

  protected selectOutput(deviceId: string): void {
    this.onOutputDeviceChange(deviceId);
    this.outputDropdownOpen.set(false);
  }

  protected selectVideo(deviceId: string): void {
    this.onVideoDeviceChange(deviceId);
    this.videoDropdownOpen.set(false);
  }

  protected closeAllDropdowns(): void {
    this.inputDropdownOpen.set(false);
    this.outputDropdownOpen.set(false);
    this.videoDropdownOpen.set(false);
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

  /**
   * Kết nối và truyền trực tiếp luồng hình ảnh từ Camera phần cứng thật của máy tính
   */
  protected async startVideoTest(): Promise<void> {
    this.stopVideoTest();
    this.videoError.set(null);
    this.isCameraStarting.set(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.isCameraStarting.set(false);
      this.videoError.set('Trình duyệt không hỗ trợ truy cập thiết bị Camera.');
      return;
    }

    try {
      const vidId = this.mediaDevices.selectedVideoInputId();
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: vidId && vidId !== 'default' ? { deviceId: { exact: vidId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
      };

      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isTestingVideo.set(true);
      this.isCameraStarting.set(false);

      const track = this.videoStream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        const w = settings.width || 1280;
        const h = settings.height || 720;
        const fps = Math.round(settings.frameRate || 30);
        this.videoStats.set(`${w >= 1920 ? '1080p' : '720p'} (${w}x${h}) • ${fps} FPS`);
      }

      setTimeout(() => {
        const videoEl = document.querySelector<HTMLVideoElement>('#settings-video-preview');
        if (videoEl && this.videoStream) {
          videoEl.srcObject = this.videoStream;
          videoEl.play().catch(() => {});
        }
      }, 50);
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      this.isTestingVideo.set(false);
      this.isCameraStarting.set(false);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.videoError.set('Bạn đã từ chối quyền truy cập Camera. Vui lòng bấm vào biểu tượng ổ khóa cạnh thanh địa chỉ để cho phép.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        this.videoError.set('Không tìm thấy webcam nào được kết nối với máy tính.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        this.videoError.set('Camera đang bị ứng dụng khác chiếm dụng (Zoom, Teams, v.v.). Hãy tắt ứng dụng đó và thử lại.');
      } else {
        this.videoError.set(error.message || 'Không thể mở luồng hình ảnh từ Camera.');
      }
    }
  }

  protected stopVideoTest(): void {
    this.isTestingVideo.set(false);
    this.isCameraStarting.set(false);
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
    if (this.isRecordingPttKey()) { this.stopPttKeyRecording(); return; }
    this.isRecordingPttKey.set(true);
    this.keydownListener = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { this.stopPttKeyRecording(); return; }
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
