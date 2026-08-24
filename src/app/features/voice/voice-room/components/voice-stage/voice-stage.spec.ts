import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { VoiceParticipantModel, VoiceRoomService } from '../../../services/voice-room.service';
import { VoiceStage } from './voice-stage';

describe('VoiceStage', () => {
  let component: VoiceStage;
  let fixture: ComponentFixture<VoiceStage>;
  let mockParticipants: ReturnType<typeof signal<VoiceParticipantModel[]>>;
  let mockScreenSharer: ReturnType<typeof signal<VoiceParticipantModel | undefined>>;

  beforeEach(async () => {
    mockParticipants = signal<VoiceParticipantModel[]>([
      {
        identity: 'usr-1',
        name: 'Minh Tài',
        isLocal: true,
        isSpeaking: false,
        isMuted: false,
        isCameraOn: false,
        isScreenSharing: false,
        connectionQuality: 'excellent',
      },
    ]);
    mockScreenSharer = signal<VoiceParticipantModel | undefined>(undefined);

    await TestBed.configureTestingModule({
      imports: [VoiceStage],
      providers: [
        {
          provide: VoiceRoomService,
          useValue: {
            allParticipants: mockParticipants,
            screenShareParticipant: mockScreenSharer,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceStage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('phải được tạo thành công', () => {
    expect(component).toBeDefined();
  });

  it('hiển thị companion tile khi chỉ có 1 người trong phòng và phát sự kiện inviteClicked', () => {
    let inviteEmitted = false;
    component.inviteClicked.subscribe(() => {
      inviteEmitted = true;
    });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bạn đang ở trong phòng một mình');

    const inviteBtn = el.querySelector('button') as HTMLButtonElement;
    expect(inviteBtn).toBeDefined();
    inviteBtn.click();
    expect(inviteEmitted).toBe(true);
  });

  it('chuyển sang xem stream khi gọi watchStream và quay lại khi stopWatchingStream', () => {
    mockParticipants.set([
      {
        identity: 'usr-1',
        name: 'Minh Tài',
        isLocal: true,
        isSpeaking: false,
        isMuted: false,
        isCameraOn: false,
        isScreenSharing: false,
        connectionQuality: 'excellent',
      },
      {
        identity: 'usr-2',
        name: 'Giang',
        isLocal: false,
        isSpeaking: false,
        isMuted: false,
        isCameraOn: false,
        isScreenSharing: true,
        connectionQuality: 'excellent',
      },
    ]);
    fixture.detectChanges();

    expect(component.focusedParticipantIdentity()).toBeNull();

    component.watchStream('usr-2');
    fixture.detectChanges();

    expect(component.focusedParticipantIdentity()).toBe('usr-2');
    expect(component.isWatchingStream()).toBe(true);

    component.stopWatchingStream();
    fixture.detectChanges();

    expect(component.focusedParticipantIdentity()).toBeNull();
    expect(component.isWatchingStream()).toBe(false);
  });
});
