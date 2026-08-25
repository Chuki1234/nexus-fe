import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DirectCallCoordinatorService } from './direct-call-coordinator.service';
import { DirectCallStore } from './direct-call.store';
import { DirectCallsApiService } from '../api/direct-calls-api.service';
import { DirectCallMediaService } from './direct-call-media.service';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { VoiceRoomService } from '../../features/voice/services/voice-room.service';
import { Subject } from 'rxjs';

describe('DirectCallCoordinatorService', () => {
  let service: DirectCallCoordinatorService;
  let mockStore: any;
  let mockApi: any;
  let mockMedia: any;
  let mockSocket: any;
  let mockVoiceRoom: any;

  beforeEach(() => {
    mockStore = {
      activeCall: vi.fn().mockReturnValue(null),
      callState: vi.fn().mockReturnValue('idle'),
      isCallActive: vi.fn().mockReturnValue(false),
      isMediaOwner: vi.fn().mockReturnValue(true),
      showIncomingOverlay: vi.fn().mockReturnValue(false),
      setOutgoingCall: vi.fn(),
      setIncomingCall: vi.fn(),
      setPreflighting: vi.fn(),
      setConnecting: vi.fn(),
      setConnected: vi.fn(),
      setEnded: vi.fn(),
      reset: vi.fn(),
      setError: vi.fn(),
      tickDuration: vi.fn(),
    };

    mockApi = {
      startCall: vi.fn(),
      answerCall: vi.fn(),
      declineCall: vi.fn(),
      cancelCall: vi.fn(),
      endCall: vi.fn(),
      getToken: vi.fn(),
      getActiveCall: vi.fn().mockResolvedValue({ call: null }),
    };

    mockMedia = {
      preflightMedia: vi.fn().mockResolvedValue({ audioOk: true, videoOk: true }),
      startLocalPreview: vi.fn(),
      stopLocalPreview: vi.fn(),
      connectRoom: vi.fn(),
      disconnectRoom: vi.fn(),
    };

    mockSocket = {
      directCallIncoming$: new Subject(),
      directCallRinging$: new Subject(),
      directCallAccepted$: new Subject(),
      directCallConnected$: new Subject(),
      directCallDeclined$: new Subject(),
      directCallCancelled$: new Subject(),
      directCallEnded$: new Subject(),
      directCallMissed$: new Subject(),
      directCallBusy$: new Subject(),
    };

    mockVoiceRoom = {
      isConnected: vi.fn().mockReturnValue(false),
      currentChannelName: vi.fn().mockReturnValue(null),
      leaveRoom: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        DirectCallCoordinatorService,
        { provide: DirectCallStore, useValue: mockStore },
        { provide: DirectCallsApiService, useValue: mockApi },
        { provide: DirectCallMediaService, useValue: mockMedia },
        { provide: ChatSocketService, useValue: mockSocket },
        { provide: VoiceRoomService, useValue: mockVoiceRoom },
      ],
    });

    service = TestBed.inject(DirectCallCoordinatorService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created and have clientSessionId', () => {
    expect(service).toBeTruthy();
    expect(service.clientSessionId).toBeDefined();
  });

  it('startCall preflights media and calls api.startCall', async () => {
    const mockCreatedCall: any = { id: 'call-1', status: 'ringing', initialMode: 'video' };
    mockApi.startCall.mockResolvedValue(mockCreatedCall);

    await service.startCall('conv-1', 'video');

    expect(mockMedia.preflightMedia).toHaveBeenCalledWith('video');
    expect(mockApi.startCall).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      initialMode: 'video',
      clientSessionId: service.clientSessionId,
    });
    expect(mockStore.setOutgoingCall).toHaveBeenCalledWith(mockCreatedCall, true);
    expect(mockMedia.startLocalPreview).toHaveBeenCalled();
  });
});
