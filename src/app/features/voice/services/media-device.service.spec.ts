import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaDeviceService } from './media-device.service';

describe('MediaDeviceService', () => {
  let service: MediaDeviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MediaDeviceService],
    });
    service = TestBed.inject(MediaDeviceService);
  });

  it('phải được khởi tạo thành công', () => {
    expect(service).toBeDefined();
    expect(service.audioLevel()).toBe(0);
    expect(service.hasMicrophonePermission()).toBe(false);
  });

  it('phân loại đúng các loại thiết bị audio/video trong enumerateDevices', async () => {
    const mockDevices: MediaDeviceInfo[] = [
      {
        deviceId: 'mic-1',
        groupId: 'g1',
        kind: 'audioinput',
        label: 'Microphone Built-in',
        toJSON: () => ({}),
      },
      {
        deviceId: 'cam-1',
        groupId: 'g1',
        kind: 'videoinput',
        label: 'HD WebCam',
        toJSON: () => ({}),
      },
      {
        deviceId: 'spk-1',
        groupId: 'g1',
        kind: 'audiooutput',
        label: 'Speakers',
        toJSON: () => ({}),
      },
    ];

    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        enumerateDevices: vi.fn().mockResolvedValue(mockDevices),
        ondevicechange: null,
      },
      configurable: true,
    });

    await service.enumerateDevices();

    expect(service.audioInputs().length).toBe(1);
    expect(service.videoInputs().length).toBe(1);
    expect(service.audioOutputs().length).toBe(1);
    expect(service.selectedAudioInputId()).toBe('mic-1');
  });

  it('xử lý từ chối quyền microphone trả về lỗi có ý nghĩa', async () => {
    const deniedError = new Error('Permission denied');
    deniedError.name = 'NotAllowedError';

    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(deniedError),
      },
      configurable: true,
    });

    const success = await service.requestPermissions();
    expect(success).toBe(false);
    expect(service.hasMicrophonePermission()).toBe(false);
    expect(service.permissionError()).toContain('từ chối quyền truy cập Micro');
  });
});
