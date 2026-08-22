import { Injectable, OnDestroy, signal } from '@angular/core';

export interface DeviceSelectionState {
  audioInputId: string;
  videoInputId: string;
  audioOutputId: string;
}

@Injectable({
  providedIn: 'root',
})
export class MediaDeviceService implements OnDestroy {
  readonly audioInputs = signal<MediaDeviceInfo[]>([]);
  readonly videoInputs = signal<MediaDeviceInfo[]>([]);
  readonly audioOutputs = signal<MediaDeviceInfo[]>([]);

  readonly selectedAudioInputId = signal<string>('default');
  readonly selectedVideoInputId = signal<string>('default');
  readonly selectedAudioOutputId = signal<string>('default');

  readonly hasMicrophonePermission = signal<boolean>(false);
  readonly hasCameraPermission = signal<boolean>(false);
  readonly permissionError = signal<string | null>(null);

  /** Mức âm lượng mic thời gian thực (0 - 100) dùng cho thước đo trực quan */
  readonly audioLevel = signal<number>(0);

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private testStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.ondevicechange = () => {
        void this.enumerateDevices();
      };
    }
  }

  async enumerateDevices(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const aInputs = devices.filter((d) => d.kind === 'audioinput');
      const vInputs = devices.filter((d) => d.kind === 'videoinput');
      const aOutputs = devices.filter((d) => d.kind === 'audiooutput');

      this.audioInputs.set(aInputs);
      this.videoInputs.set(vInputs);
      this.audioOutputs.set(aOutputs);

      if (aInputs.length > 0 && (!this.selectedAudioInputId() || this.selectedAudioInputId() === 'default')) {
        this.selectedAudioInputId.set(aInputs[0].deviceId);
      }
      if (vInputs.length > 0 && (!this.selectedVideoInputId() || this.selectedVideoInputId() === 'default')) {
        this.selectedVideoInputId.set(vInputs[0].deviceId);
      }
      if (aOutputs.length > 0 && (!this.selectedAudioOutputId() || this.selectedAudioOutputId() === 'default')) {
        this.selectedAudioOutputId.set(aOutputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Lỗi khi liệt kê thiết bị media:', err);
    }
  }

  /**
   * Yêu cầu cấp quyền Microphone & Camera từ người dùng.
   */
  async requestPermissions(requestVideo = false): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.permissionError.set('Trình duyệt không hỗ trợ WebRTC media devices.');
      return false;
    }

    try {
      this.permissionError.set(null);
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: requestVideo,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.hasMicrophonePermission.set(true);
      if (requestVideo) {
        this.hasCameraPermission.set(true);
      }

      // Đóng ngay stream xin quyền tạm thời để không chiếm camera/mic
      stream.getTracks().forEach((track) => track.stop());
      await this.enumerateDevices();
      return true;
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.permissionError.set('Bạn đã từ chối quyền truy cập Micro hoặc Camera. Vui lòng cấp quyền trong cài đặt trình duyệt.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        this.permissionError.set('Không tìm thấy thiết bị Microphone hoặc Camera nào trên máy tính của bạn.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        this.permissionError.set('Thiết bị đang bị chiếm dụng bởi một ứng dụng khác (Zoom, Teams, v.v.).');
      } else {
        this.permissionError.set(error.message || 'Không thể truy cập thiết bị âm thanh/hình ảnh.');
      }
      return false;
    }
  }

  /**
   * Bắt đầu test Microphone và đo mức âm lượng thời gian thực cho thanh audio level meter.
   */
  async startMicrophoneTest(deviceId?: string): Promise<void> {
    this.stopMicrophoneTest();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      const audioConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : {};

      this.testStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      this.hasMicrophonePermission.set(true);

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      this.audioContext = new AudioContextClass();
      const source = this.audioContext.createMediaStreamSource(this.testStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const checkLevel = () => {
        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Chuẩn hoá về thang 0 - 100 với hệ số nhạy
        const level = Math.min(100, Math.round((average / 128) * 100));
        this.audioLevel.set(level);

        this.animationFrameId = requestAnimationFrame(checkLevel);
      };

      checkLevel();
    } catch (err) {
      console.warn('Không thể khởi tạo microphone test:', err);
    }
  }

  /**
   * Dừng test micro và giải phóng AudioContext, stream tracks.
   */
  stopMicrophoneTest(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.testStream) {
      this.testStream.getTracks().forEach((track) => track.stop());
      this.testStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.audioLevel.set(0);
  }

  selectAudioInput(deviceId: string): void {
    this.selectedAudioInputId.set(deviceId);
    if (this.testStream) {
      void this.startMicrophoneTest(deviceId);
    }
  }

  selectVideoInput(deviceId: string): void {
    this.selectedVideoInputId.set(deviceId);
  }

  selectAudioOutput(deviceId: string): void {
    this.selectedAudioOutputId.set(deviceId);
  }

  ngOnDestroy(): void {
    this.stopMicrophoneTest();
  }
}
