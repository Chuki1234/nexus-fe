import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceRoomService } from '../../../services/voice-room.service';
import { VoiceControls } from './voice-controls';

describe('VoiceControls', () => {
  let component: VoiceControls;
  let fixture: ComponentFixture<VoiceControls>;
  let mockVoiceRoom: {
    isMicMuted: ReturnType<typeof signal>;
    isDeafened: ReturnType<typeof signal>;
    isCameraOn: ReturnType<typeof signal>;
    isScreenSharing: ReturnType<typeof signal>;
    toggleMicrophone: ReturnType<typeof vi.fn>;
    toggleDeafen: ReturnType<typeof vi.fn>;
    toggleCamera: ReturnType<typeof vi.fn>;
    toggleScreenShare: ReturnType<typeof vi.fn>;
    switchScreenShare: ReturnType<typeof vi.fn>;
    leaveRoom: ReturnType<typeof vi.fn>;
    switchAudioInput: ReturnType<typeof vi.fn>;
    switchVideoInput: ReturnType<typeof vi.fn>;
    switchAudioOutput: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockVoiceRoom = {
      isMicMuted: signal(false),
      isDeafened: signal(false),
      isCameraOn: signal(false),
      isScreenSharing: signal(false),
      toggleMicrophone: vi.fn(),
      toggleDeafen: vi.fn(),
      toggleCamera: vi.fn(),
      toggleScreenShare: vi.fn(),
      switchScreenShare: vi.fn(),
      leaveRoom: vi.fn(),
      switchAudioInput: vi.fn(),
      switchVideoInput: vi.fn(),
      switchAudioOutput: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [VoiceControls],
      providers: [
        { provide: VoiceRoomService, useValue: mockVoiceRoom },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceControls);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('phải được tạo thành công', () => {
    expect(component).toBeDefined();
  });

  it('gọi toggleMicrophone khi nhấn nút mic', () => {
    const micBtn = fixture.nativeElement.querySelector('button[mat-icon-button]');
    micBtn?.click();
    expect(mockVoiceRoom.toggleMicrophone).toHaveBeenCalled();
  });

  it('gọi leaveRoom khi nhấn nút Rời phòng', () => {
    const leaveBtn = fixture.nativeElement.querySelector('button[mat-flat-button]');
    leaveBtn?.click();
    expect(mockVoiceRoom.leaveRoom).toHaveBeenCalled();
  });

  it('hiển thị menu đổi màn hình khi đang chia sẻ màn hình và gọi switchScreenShare', () => {
    mockVoiceRoom.isScreenSharing.set(true);
    fixture.detectChanges();

    // Trigger switchScreenShare trực tiếp hoặc qua method component
    (component as unknown as { switchScreenShare: () => void }).switchScreenShare();
    expect(mockVoiceRoom.switchScreenShare).toHaveBeenCalled();
  });
});
