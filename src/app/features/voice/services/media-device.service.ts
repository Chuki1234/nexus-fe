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

  readonly inputVolume = signal<number>(100);
  readonly outputVolume = signal<number>(100);

  readonly hasMicrophonePermission = signal<boolean>(false);
  readonly hasCameraPermission = signal<boolean>(false);
  readonly permissionError = signal<string | null>(null);

  /** Mức âm lượng mic thời gian thực (0 - 100) dùng cho thước đo trực quan */
  readonly audioLevel = signal<number>(0);
  readonly isTestingMic = signal<boolean>(false);
  readonly isLoopbackEnabled = signal<boolean>(false);

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private inputGainNode: GainNode | null = null;
  private outputGainNode: GainNode | null = null;
  private loopbackAudioEl: HTMLAudioElement | null = null;
  private testStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      void this.enumerateDevices();
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

      // Tự động gán nếu chưa chọn hoặc id không còn tồn tại
      const currentInId = this.selectedAudioInputId();
      if (aInputs.length > 0 && (!currentInId || currentInId === 'default' || !aInputs.some((d) => d.deviceId === currentInId))) {
        this.selectedAudioInputId.set(aInputs[0].deviceId || 'default');
      }

      const currentVidId = this.selectedVideoInputId();
      if (vInputs.length > 0 && (!currentVidId || currentVidId === 'default' || !vInputs.some((d) => d.deviceId === currentVidId))) {
        this.selectedVideoInputId.set(vInputs[0].deviceId || 'default');
      }

      const currentOutId = this.selectedAudioOutputId();
      if (aOutputs.length > 0 && (!currentOutId || currentOutId === 'default' || !aOutputs.some((d) => d.deviceId === currentOutId))) {
        this.selectedAudioOutputId.set(aOutputs[0].deviceId || 'default');
      }
    } catch (err) {
      console.warn('Lỗi khi liệt kê thiết bị media:', err);
    }
  }

  /**
   * Yêu cầu cấp quyền Microphone & Camera từ người dùng để lấy tên thiết bị thực tế.
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
  async startMicrophoneTest(deviceId?: string, withLoopback = false): Promise<void> {
    this.stopMicrophoneTest();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    const targetInputId = deviceId || this.selectedAudioInputId();

    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      };

      if (targetInputId && targetInputId !== 'default') {
        audioConstraints.deviceId = { exact: targetInputId };
      }

      this.testStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      this.hasMicrophonePermission.set(true);
      this.isTestingMic.set(true);
      this.isLoopbackEnabled.set(withLoopback);

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      this.audioContext = new AudioContextClass();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.testStream);
      
      // Node Gain cho Input Volume
      this.inputGainNode = this.audioContext.createGain();
      this.inputGainNode.gain.value = Math.max(0, this.inputVolume() / 100);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;

      source.connect(this.inputGainNode);
      this.inputGainNode.connect(this.analyser);

      // Loopback audio (người dùng nghe lại giọng mình qua thiết bị đầu ra được chọn)
      if (withLoopback) {
        this.outputGainNode = this.audioContext.createGain();
        this.outputGainNode.gain.value = Math.max(0, this.outputVolume() / 100);
        this.inputGainNode.connect(this.outputGainNode);

        // Tạo element audio để route qua setSinkId
        this.loopbackAudioEl = new Audio();
        this.loopbackAudioEl.srcObject = this.testStream;
        this.loopbackAudioEl.volume = Math.min(1, this.outputVolume() / 100);
        
        const outId = this.selectedAudioOutputId();
        if (outId && outId !== 'default' && 'setSinkId' in this.loopbackAudioEl) {
          try {
            await (this.loopbackAudioEl as any).setSinkId(outId);
          } catch {
            // SinkId not supported / fallback
          }
        }
        await this.loopbackAudioEl.play().catch(() => {});
      }

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const checkLevel = () => {
        if (!this.analyser || !this.isTestingMic()) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Chuẩn hoá về thang 0 - 100 với hệ số khuếch đại nhạy
        const level = Math.min(100, Math.round((average / 110) * 100));
        this.audioLevel.set(level);

        this.animationFrameId = requestAnimationFrame(checkLevel);
      };

      checkLevel();
    } catch (err) {
      this.isTestingMic.set(false);
      console.warn('Không thể khởi tạo microphone test:', err);
    }
  }

  /**
   * Dừng test micro và giải phóng AudioContext, stream tracks, loopback.
   */
  stopMicrophoneTest(): void {
    this.isTestingMic.set(false);
    this.isLoopbackEnabled.set(false);

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.loopbackAudioEl) {
      this.loopbackAudioEl.pause();
      this.loopbackAudioEl.srcObject = null;
      this.loopbackAudioEl = null;
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
    this.inputGainNode = null;
    this.outputGainNode = null;
    this.audioLevel.set(0);
  }

  /**
   * Đổi thiết bị đầu vào (Microphone)
   */
  selectAudioInput(deviceId: string): void {
    this.selectedAudioInputId.set(deviceId);
    if (this.isTestingMic()) {
      void this.startMicrophoneTest(deviceId, this.isLoopbackEnabled());
    }
  }

  /**
   * Đổi thiết bị đầu ra (Loa / Tai nghe) và cập nhật SinkId
   */
  async selectAudioOutput(deviceId: string): Promise<void> {
    this.selectedAudioOutputId.set(deviceId);
    if (this.loopbackAudioEl && 'setSinkId' in this.loopbackAudioEl) {
      try {
        await (this.loopbackAudioEl as any).setSinkId(deviceId);
      } catch (err) {
        console.warn('Không thể đổi loa phát ra:', err);
      }
    }
  }

  selectVideoInput(deviceId: string): void {
    this.selectedVideoInputId.set(deviceId);
  }

  setInputVolumeLevel(volumePercent: number): void {
    this.inputVolume.set(volumePercent);
    if (this.inputGainNode) {
      this.inputGainNode.gain.value = Math.max(0, volumePercent / 100);
    }
  }

  setOutputVolumeLevel(volumePercent: number): void {
    this.outputVolume.set(volumePercent);
    if (this.outputGainNode) {
      this.outputGainNode.gain.value = Math.max(0, volumePercent / 100);
    }
    if (this.loopbackAudioEl) {
      this.loopbackAudioEl.volume = Math.min(1, volumePercent / 100);
    }
  }

  /**
   * Hỗ trợ gán thiết bị đầu ra cho bất kỳ thẻ HTMLMediaElement nào
   */
  async applyOutputSink(element: HTMLMediaElement): Promise<void> {
    const outId = this.selectedAudioOutputId();
    if (outId && outId !== 'default' && 'setSinkId' in element) {
      try {
        await (element as any).setSinkId(outId);
      } catch {
        // Fallback
      }
    }
  }

  ngOnDestroy(): void {
    this.stopMicrophoneTest();
  }
}
