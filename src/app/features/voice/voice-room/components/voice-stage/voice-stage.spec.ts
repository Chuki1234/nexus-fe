import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConversationsApiService } from '../../../../../core/api/conversations-api.service';
import { ProfileService } from '../../../../../core/profile/profile.service';
import { ServerVoiceStatesStore } from '../../../../../core/servers/server-voice-states.store';
import { VoiceParticipantModel, VoiceRoomService } from '../../../services/voice-room.service';
import { ProfileDialogService } from '../../../../profile/profile-dialog.service';
import { VoiceStage } from './voice-stage';

describe('VoiceStage', () => {
  let component: VoiceStage;
  let fixture: ComponentFixture<VoiceStage>;
  let mockParticipants: ReturnType<typeof signal<VoiceParticipantModel[]>>;
  let mockScreenSharer: ReturnType<typeof signal<VoiceParticipantModel | undefined>>;
  let profileDialog: { open: ReturnType<typeof vi.fn> };

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
    profileDialog = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [VoiceStage],
      providers: [
        {
          provide: VoiceRoomService,
          useValue: {
            allParticipants: mockParticipants,
            screenShareParticipant: mockScreenSharer,
            localParticipant: signal(mockParticipants()[0]),
            currentServerId: signal('srv-1'),
            currentChannelId: signal('voice-1'),
            isMicMuted: signal(false),
            isDeafened: signal(false),
            isCameraOn: signal(false),
            isScreenSharing: signal(false),
            isLocalMuted: () => false,
            getUserVolume: () => 100,
            toggleMicrophone: () => {},
            toggleDeafen: () => {},
            toggleLocalMute: () => {},
            toggleCamera: () => {},
            toggleScreenShare: () => {},
            switchScreenShare: () => {},
            leaveRoom: () => {},
            setUserVolume: () => {},
            joinRoom: () => {},
            switchAudioInput: () => {},
            switchVideoInput: () => {},
            switchAudioOutput: () => {},
          },
        },
        {
          provide: ConversationsApiService,
          useValue: { getOrCreateDm: vi.fn().mockResolvedValue({ id: 'dm-1' }) },
        },
        {
          provide: ProfileService,
          useValue: { current: signal({ username: 'minhtai' }) },
        },
        {
          provide: ProfileDialogService,
          useValue: profileDialog,
        },
        {
          provide: ServerVoiceStatesStore,
          useValue: {
            getServerVoiceStates: () => [],
            loadServerVoiceStates: () => Promise.resolve(),
          },
        },
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
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

    const inviteBtn = Array.from(el.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Mời vào phòng thoại'),
    ) as HTMLButtonElement | undefined;
    expect(inviteBtn).toBeDefined();
    inviteBtn?.click();
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

  it('tách riêng ô participant tile và ô stream tile khi có người bật screen share', () => {
    mockParticipants.set([
      {
        identity: 'usr-1',
        name: 'Minh Tài',
        isLocal: true,
        isSpeaking: false,
        isMuted: false,
        isCameraOn: false,
        isScreenSharing: true,
        connectionQuality: 'excellent',
      },
      {
        identity: 'usr-2',
        name: 'Giang',
        isLocal: false,
        isSpeaking: false,
        isMuted: false,
        isCameraOn: false,
        isScreenSharing: false,
        connectionQuality: 'excellent',
      },
    ]);
    fixture.detectChanges();

    const items = component.stageItems();
    // 2 participants + 1 screen share = 3 items
    expect(items.length).toBe(3);
    expect(items.find((it) => it.type === 'screen_share')?.participant.identity).toBe('usr-1');
    expect(component.stageTierClass()).toBe('stage--count-3');
  });

  it('tự động ẩn thanh điều khiển sau 3s không di chuột và hiện lại khi di chuột', () => {
    vi.useFakeTimers();
    component.watchStream('usr-1');
    expect(component.areControlsVisible()).toBe(true);

    // Sau 3 giây không di chuột
    vi.advanceTimersByTime(3000);
    expect(component.areControlsVisible()).toBe(false);

    // Khi di chuột thì hiện lại
    component.onStreamMouseMove();
    expect(component.areControlsVisible()).toBe(true);

    // Khi rời chuột ra ngoài thì ẩn ngay
    component.onStreamMouseLeave();
    expect(component.areControlsVisible()).toBe(false);
    vi.useRealTimers();
  });

  it('mở dialog hồ sơ thay vì điều hướng sang trang hồ sơ', () => {
    (component as any).openParticipantProfile(mockParticipants()[0]);

    expect(profileDialog.open).toHaveBeenCalledWith('minhtai');
  });
});
