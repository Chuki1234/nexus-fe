import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileService } from '../../../../../core/profile/profile.service';
import { MediaDeviceService } from '../../../services/media-device.service';
import { VoicePrejoin } from './voice-prejoin';

describe('VoicePrejoin', () => {
  let component: VoicePrejoin;
  let fixture: ComponentFixture<VoicePrejoin>;
  let mockMediaDevice: {
    audioInputs: ReturnType<typeof signal>;
    videoInputs: ReturnType<typeof signal>;
    selectedAudioInputId: ReturnType<typeof signal>;
    selectedVideoInputId: ReturnType<typeof signal>;
    audioLevel: ReturnType<typeof signal>;
    enumerateDevices: ReturnType<typeof vi.fn>;
    startMicrophoneTest: ReturnType<typeof vi.fn>;
    stopMicrophoneTest: ReturnType<typeof vi.fn>;
    selectAudioInput: ReturnType<typeof vi.fn>;
    selectVideoInput: ReturnType<typeof vi.fn>;
  };
  let mockProfile: { current: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockMediaDevice = {
      audioInputs: signal([]),
      videoInputs: signal([]),
      selectedAudioInputId: signal('default'),
      selectedVideoInputId: signal('default'),
      audioLevel: signal(25),
      enumerateDevices: vi.fn().mockResolvedValue(undefined),
      startMicrophoneTest: vi.fn().mockResolvedValue(undefined),
      stopMicrophoneTest: vi.fn(),
      selectAudioInput: vi.fn(),
      selectVideoInput: vi.fn(),
    };

    mockProfile = {
      current: vi.fn().mockReturnValue({ displayName: 'Minh Tài' }),
    };

    await TestBed.configureTestingModule({
      imports: [VoicePrejoin],
      providers: [
        { provide: MediaDeviceService, useValue: mockMediaDevice },
        { provide: ProfileService, useValue: mockProfile },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VoicePrejoin);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('channelName', 'Kênh thoại chung');
    fixture.detectChanges();
  });

  it('phải được tạo thành công và render tên kênh thoại', () => {
    expect(component).toBeDefined();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Kênh thoại chung');
  });

  it('emit join khi nhấn nút Tham gia phòng', () => {
    const joinSpy = vi.fn();
    component.join.subscribe(joinSpy);

    const joinBtn = fixture.nativeElement.querySelector('button[mat-flat-button]');
    joinBtn?.click();

    expect(joinSpy).toHaveBeenCalledWith({ audio: true, video: false });
  });
});
