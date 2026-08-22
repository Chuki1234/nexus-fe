import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaDeviceService } from '../../../services/media-device.service';
import { VoiceRoomService } from '../../../services/voice-room.service';
import { DeviceMenu } from './device-menu';

describe('DeviceMenu', () => {
  let component: DeviceMenu;
  let fixture: ComponentFixture<DeviceMenu>;
  let mockVoiceRoom: {
    switchAudioInput: ReturnType<typeof vi.fn>;
    switchVideoInput: ReturnType<typeof vi.fn>;
    switchAudioOutput: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockVoiceRoom = {
      switchAudioInput: vi.fn(),
      switchVideoInput: vi.fn(),
      switchAudioOutput: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DeviceMenu],
      providers: [
        { provide: VoiceRoomService, useValue: mockVoiceRoom },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceMenu);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('kind', 'audio');
    fixture.detectChanges();
  });

  it('phải được tạo thành công', () => {
    expect(component).toBeDefined();
  });
});
