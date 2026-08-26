import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSocketService } from '../../../core/realtime/chat-socket.service';
import { VoiceApiService } from '../../../core/api/voice-api.service';
import { ProfileService } from '../../../core/profile/profile.service';
import { MediaDeviceService } from './media-device.service';
import { VoiceRoomService } from './voice-room.service';

describe('VoiceRoomService', () => {
  let service: VoiceRoomService;
  let mockVoiceApi: { getVoiceToken: ReturnType<typeof vi.fn> };
  let mockMediaDevice: {
    isTestingMic: ReturnType<typeof signal<boolean>>;
    selectedAudioInputId: ReturnType<typeof vi.fn>;
    selectedVideoInputId: ReturnType<typeof vi.fn>;
    selectedAudioOutputId: ReturnType<typeof vi.fn>;
    startMicrophoneTest: ReturnType<typeof vi.fn>;
    stopMicrophoneTest: ReturnType<typeof vi.fn>;
    selectAudioInput: ReturnType<typeof vi.fn>;
    selectVideoInput: ReturnType<typeof vi.fn>;
    selectAudioOutput: ReturnType<typeof vi.fn>;
  };
  let mockProfile: { current: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockVoiceApi = {
      getVoiceToken: vi.fn().mockResolvedValue({
        serverUrl: 'wss://livekit.example.com',
        participantToken: 'mock-token',
        roomName: 'nexus:srv-1:voice:chn-1',
        participantIdentity: 'user-tai',
        participantName: 'Minh Tài',
      }),
    };

    mockMediaDevice = {
      isTestingMic: signal(false),
      selectedAudioInputId: vi.fn().mockReturnValue('default'),
      selectedVideoInputId: vi.fn().mockReturnValue('default'),
      selectedAudioOutputId: vi.fn().mockReturnValue('default'),
      startMicrophoneTest: vi.fn(),
      stopMicrophoneTest: vi.fn(),
      selectAudioInput: vi.fn(),
      selectVideoInput: vi.fn(),
      selectAudioOutput: vi.fn(),
    };

    mockProfile = {
      current: vi.fn().mockReturnValue({
        displayName: 'Minh Tài',
        username: 'minhtai',
      }),
    };

    const mockChatSocket = {
      updateVoiceState: vi.fn(),
      getServerVoiceStates: vi.fn().mockResolvedValue({ serverId: 'srv-1', states: [] }),
    };

    TestBed.configureTestingModule({
      providers: [
        VoiceRoomService,
        { provide: VoiceApiService, useValue: mockVoiceApi },
        { provide: MediaDeviceService, useValue: mockMediaDevice },
        { provide: ProfileService, useValue: mockProfile },
        { provide: ChatSocketService, useValue: mockChatSocket },
      ],
    });

    service = TestBed.inject(VoiceRoomService);
  });

  it('phải được khởi tạo ở trạng thái idle ban đầu', () => {
    expect(service).toBeDefined();
    expect(service.connectionStatus()).toBe('idle');
    expect(service.allParticipants().length).toBe(0);
    expect(service.formattedDuration()).toBe('00:00');
  });

  it('openPrejoin chuyển connectionStatus thành previewing và kích hoạt mic test', () => {
    service.openPrejoin('srv-1', 'chn-1', 'Kênh thoại chung');
    expect(service.connectionStatus()).toBe('previewing');
    expect(service.currentServerId()).toBe('srv-1');
    expect(service.currentChannelId()).toBe('chn-1');
    expect(service.currentChannelName()).toBe('Kênh thoại chung');
    expect(mockMediaDevice.startMicrophoneTest).toHaveBeenCalled();
  });

  it('closePrejoin dừng mic test và đưa về trạng thái idle', () => {
    service.openPrejoin('srv-1', 'chn-1', 'Kênh thoại');
    service.closePrejoin();
    expect(service.connectionStatus()).toBe('idle');
    expect(mockMediaDevice.stopMicrophoneTest).toHaveBeenCalled();
  });

  it('định dạng thời lượng cuộc gọi chính xác', () => {
    service['callDurationSeconds'].set(65);
    expect(service.formattedDuration()).toBe('01:05');

    service['callDurationSeconds'].set(3665);
    expect(service.formattedDuration()).toBe('1:01:05');
  });

  it('leaveRoom dọn dẹp timer và chuyển trạng thái về disconnected', async () => {
    await service.leaveRoom();
    expect(service.connectionStatus()).toBe('disconnected');
    expect(service.localParticipant()).toBeNull();
    expect(service.remoteParticipants().length).toBe(0);
  });

  it('quản lý trạng thái isChatDrawerOpen qua open/close/toggle', () => {
    expect(service.isChatDrawerOpen()).toBe(false);

    service.openChatDrawer();
    expect(service.isChatDrawerOpen()).toBe(true);

    service.closeChatDrawer();
    expect(service.isChatDrawerOpen()).toBe(false);

    service.toggleChatDrawer();
    expect(service.isChatDrawerOpen()).toBe(true);

    service.toggleChatDrawer();
    expect(service.isChatDrawerOpen()).toBe(false);
  });

  it('switchScreenShare xử lý an toàn khi chưa kết nối phòng', async () => {
    await expect(service.switchScreenShare()).resolves.toBeUndefined();
  });
});
