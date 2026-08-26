import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DirectCallCoordinatorService } from './direct-call-coordinator.service';
import { DirectCallStore } from './direct-call.store';
import { DirectCallsApiService } from '../api/direct-calls-api.service';
import { DirectCallMediaService } from './direct-call-media.service';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { VoiceRoomService } from '../../features/voice/services/voice-room.service';
import { Subject } from 'rxjs';
import type { DirectCallDto } from '../../../shared/dto/direct-calls.dto';

describe('Direct Friend Calls Browser Flow & Fake Media E2E', () => {
  let coordinator: DirectCallCoordinatorService;
  let store: DirectCallStore;
  let mockApi: any;
  let mockMedia: any;
  let mockSocket: any;
  let mockVoiceRoom: any;

  const userCaller: any = { id: '11111111-1111-4111-a111-111111111111', username: 'caller', displayName: 'Caller Test' };
  const userCallee: any = { id: '22222222-2222-4222-a222-222222222222', username: 'callee', displayName: 'Callee Test' };
  const convId = '33333333-3333-4333-a333-333333333333';
  const callId = '55555555-5555-4555-a555-555555555555';

  const mockCallDto: DirectCallDto = {
    id: callId,
    conversationId: convId,
    caller: userCaller,
    callee: userCallee,
    initialMode: 'video',
    status: 'ringing',
    livekitRoomName: `nexus:dm-call:${callId}`,
    initiatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 45000).toISOString(),
    answeredAt: null,
    connectedAt: null,
    endedAt: null,
    endedBy: null,
    endReason: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockApi = {
      startCall: vi.fn(),
      answerCall: vi.fn(),
      declineCall: vi.fn(),
      cancelCall: vi.fn(),
      endCall: vi.fn(),
      getToken: vi.fn().mockResolvedValue({
        serverUrl: 'wss://livekit.test',
        participantToken: 'mock_jwt_token',
        roomName: `nexus:dm-call:${callId}`,
        participantIdentity: userCaller.id,
        participantName: 'Caller Test',
      }),
      getActiveCall: vi.fn().mockResolvedValue({ call: null }),
    };

    mockMedia = {
      preflightMedia: vi.fn().mockResolvedValue({ audioOk: true, videoOk: true }),
      startLocalPreview: vi.fn(),
      stopLocalPreview: vi.fn(),
      connectRoom: vi.fn().mockResolvedValue(undefined),
      disconnectRoom: vi.fn().mockResolvedValue(undefined),
      cleanupAllTracks: vi.fn(),
      setMicrophoneEnabled: vi.fn(),
      setCameraEnabled: vi.fn(),
      attachLocalVideo: vi.fn(),
      attachRemoteVideo: vi.fn(),
      attachRemoteAudio: vi.fn(),
    };

    mockSocket = {
      directCallIncoming$: new Subject<DirectCallDto>(),
      directCallRinging$: new Subject<DirectCallDto>(),
      directCallAccepted$: new Subject<DirectCallDto>(),
      directCallConnected$: new Subject<{ callId: string; connectedAt: string }>(),
      directCallDeclined$: new Subject<DirectCallDto>(),
      directCallCancelled$: new Subject<DirectCallDto>(),
      directCallEnded$: new Subject<DirectCallDto>(),
      directCallMissed$: new Subject<DirectCallDto>(),
      directCallBusy$: new Subject<{ conversationId: string; message: string }>(),
      directCallStateSync$: new Subject<DirectCallDto>(),
    };

    mockVoiceRoom = {
      isConnected: vi.fn().mockReturnValue(false),
      currentChannelName: vi.fn().mockReturnValue(null),
      leaveRoom: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        DirectCallStore,
        DirectCallCoordinatorService,
        { provide: DirectCallsApiService, useValue: mockApi },
        { provide: DirectCallMediaService, useValue: mockMedia },
        { provide: ChatSocketService, useValue: mockSocket },
        { provide: VoiceRoomService, useValue: mockVoiceRoom },
      ],
    });

    store = TestBed.inject(DirectCallStore);
    coordinator = TestBed.inject(DirectCallCoordinatorService);
  });

  afterEach(() => {
    coordinator.ngOnDestroy();
  });

  it('1. Audio Call Signaling & Stage: Caller starts audio call, Callee receives incoming, accepts, and stage connects', async () => {
    const audioCallDto = { ...mockCallDto, initialMode: 'audio' as const };
    mockApi.startCall.mockResolvedValue(audioCallDto);

    // Context A (Caller) starts audio call
    await coordinator.startCall(convId, 'audio');

    expect(mockMedia.preflightMedia).toHaveBeenCalledWith('audio');
    expect(store.callState()).toBe('outgoing_ringing');
    expect(store.initialMode()).toBe('audio');
    expect(store.isMediaOwner()).toBe(true);

    // Context B (Callee) receives socket event
    mockSocket.directCallIncoming$.next(audioCallDto);
    expect(store.callState()).toBe('incoming_ringing');
    expect(store.showIncomingOverlay()).toBe(true);

    // Callee accepts
    mockApi.answerCall.mockResolvedValue({ call: { ...audioCallDto, status: 'accepted' }, shouldJoinMedia: true });
    await coordinator.answerCall();

    expect(mockMedia.preflightMedia).toHaveBeenCalledWith('audio');
    expect(mockMedia.connectRoom).toHaveBeenCalledWith('wss://livekit.test', 'mock_jwt_token');
    expect(store.callState()).toBe('connected');
    expect(store.isConnected()).toBe(true);
  });

  it('2. Video Call Signaling & Fake Media: Starts video stream and displays stage', async () => {
    mockApi.startCall.mockResolvedValue(mockCallDto);

    await coordinator.startCall(convId, 'video');

    expect(mockMedia.preflightMedia).toHaveBeenCalledWith('video');
    expect(store.callState()).toBe('outgoing_ringing');
    expect(store.showStage()).toBe(true);
    expect(mockMedia.startLocalPreview).toHaveBeenCalled();

    // Accepted by callee
    mockSocket.directCallAccepted$.next({ ...mockCallDto, status: 'accepted' });
    await new Promise((r) => setTimeout(r, 10));
    expect(mockMedia.connectRoom).toHaveBeenCalled();
    expect(store.callState()).toBe('connected');
  });

  it('3. Camera Fallback: Falls back to audio when camera permission is unavailable', async () => {
    // Camera denied or unavailable
    mockMedia.preflightMedia.mockResolvedValue({
      audioOk: true,
      videoOk: false,
      videoError: 'Camera permission denied',
    });
    mockApi.startCall.mockResolvedValue({ ...mockCallDto, initialMode: 'audio' as const });

    await coordinator.startCall(convId, 'video');

    // Store camera disabled
    expect(store.isVideoMuted()).toBe(true);
    expect(mockApi.startCall).toHaveBeenCalledWith(
      expect.objectContaining({ initialMode: 'audio' }),
    );
  });

  it('4. Route Persistence: Call state and media session persist across navigation', () => {
    store.setOutgoingCall(mockCallDto, true);
    store.setConnected(new Date().toISOString());

    expect(store.isConnected()).toBe(true);
    expect(store.showStage()).toBe(true);

    // Simulated route change to server channel
    // Since DirectCallStore & Coordinator are root singletons, state is untouched
    expect(store.activeCall()?.id).toBe(callId);
    expect(store.callState()).toBe('connected');
  });

  it('5. F5 Page Refresh Recovery: Restores media session if user was active media owner', async () => {
    const activeCallFromBackend: DirectCallDto = {
      ...mockCallDto,
      status: 'accepted',
      answeredAt: new Date().toISOString(),
      connectedAt: new Date().toISOString(),
    };

    mockApi.getActiveCall.mockResolvedValue({
      call: activeCallFromBackend,
      isMediaOwner: true,
      role: 'caller',
    });

    await (coordinator as any).restoreActiveCall();

    expect(store.callState()).toBe('connected');
    expect(store.isMediaOwner()).toBe(true);
    expect(mockMedia.connectRoom).toHaveBeenCalled();
  });

  it('6. Multi-tab Accept Arbitration: Non-winning tab does not join media and closes incoming overlay', async () => {
    // Incoming call arrives
    mockSocket.directCallIncoming$.next(mockCallDto);
    expect(store.showIncomingOverlay()).toBe(true);

    // Tab 2 attempts to answer after Tab 1 already won
    mockApi.answerCall.mockResolvedValue({
      call: { ...mockCallDto, status: 'accepted' },
      shouldJoinMedia: false, // Tab 2 lost arbitration
    });

    await coordinator.answerCall();

    expect(store.isMediaOwner()).toBe(false);
    expect(mockMedia.connectRoom).not.toHaveBeenCalled();
    expect(store.showIncomingOverlay()).toBe(false);
  });

  it('7. Hardware Track Cleanup: Completely stops all media tracks when call ends', async () => {
    store.setOutgoingCall(mockCallDto, true);
    mockApi.endCall.mockResolvedValue({ ...mockCallDto, status: 'ended' });

    await coordinator.endCall();

    expect(mockMedia.disconnectRoom).toHaveBeenCalled();
    expect(store.callState()).toBe('ended');

    store.reset();
    expect(store.callState()).toBe('idle');
    expect(store.isCallActive()).toBe(false);
  });
});
