import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { ServerVoiceStatesStore } from './server-voice-states.store';
import type {
  VoiceMemberState,
  VoiceServerStatesSyncPayload,
  VoiceStateUpdatePayload,
} from '../../../shared/socket-events';

describe('ServerVoiceStatesStore', () => {
  let store: ServerVoiceStatesStore;
  let voiceStateUpdatedSubject: Subject<VoiceStateUpdatePayload>;
  let voiceServerStatesSyncSubject: Subject<VoiceServerStatesSyncPayload>;
  let mockChatSocket: {
    voiceStateUpdated$: Subject<VoiceStateUpdatePayload>;
    voiceServerStatesSync$: Subject<VoiceServerStatesSyncPayload>;
    getServerVoiceStates: ReturnType<typeof vi.fn>;
  };

  const sampleState1: VoiceMemberState = {
    userId: 'user-alice',
    channelId: 'chan-voice-1',
    serverId: 'srv-1',
    name: 'Alice',
    username: 'alice',
    displayName: 'Alice',
    avatarUrl: 'https://avatar.url/alice.png',
    isMuted: false,
    isCameraOn: true,
    isScreenSharing: true,
    joinedAt: '2026-08-25T14:00:00.000Z',
  };

  const sampleState2: VoiceMemberState = {
    userId: 'user-bob',
    channelId: 'chan-voice-1',
    serverId: 'srv-1',
    name: 'Bob',
    username: 'bob',
    displayName: 'Bob',
    avatarUrl: null,
    isMuted: true,
    isCameraOn: false,
    isScreenSharing: false,
    joinedAt: '2026-08-25T14:05:00.000Z',
  };

  beforeEach(() => {
    voiceStateUpdatedSubject = new Subject<VoiceStateUpdatePayload>();
    voiceServerStatesSyncSubject = new Subject<VoiceServerStatesSyncPayload>();

    mockChatSocket = {
      voiceStateUpdated$: voiceStateUpdatedSubject,
      voiceServerStatesSync$: voiceServerStatesSyncSubject,
      getServerVoiceStates: vi.fn().mockResolvedValue({
        serverId: 'srv-1',
        states: [sampleState1, sampleState2],
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        ServerVoiceStatesStore,
        { provide: ChatSocketService, useValue: mockChatSocket },
      ],
    });

    store = TestBed.inject(ServerVoiceStatesStore);
  });

  it('khởi tạo với map rỗng ban đầu', () => {
    expect(store).toBeDefined();
    expect(store.getServerVoiceStates('srv-1')).toEqual([]);
    expect(store.getChannelVoiceMembers('srv-1', 'chan-voice-1')).toEqual([]);
  });

  it('xử lý snapshot sync từ voiceServerStatesSync$', () => {
    voiceServerStatesSyncSubject.next({
      serverId: 'srv-1',
      states: [sampleState1, sampleState2],
    });

    const serverStates = store.getServerVoiceStates('srv-1');
    expect(serverStates.length).toBe(2);

    const chanMembers = store.getChannelVoiceMembers('srv-1', 'chan-voice-1');
    expect(chanMembers.length).toBe(2);
    expect(chanMembers[0].name).toBe('Alice');
    expect(chanMembers[0].isScreenSharing).toBe(true);
    expect(chanMembers[1].name).toBe('Bob');
    expect(chanMembers[1].isMuted).toBe(true);
  });

  it('xử lý cập nhật trạng thái thành viên (voice:state-updated)', () => {
    voiceServerStatesSyncSubject.next({
      serverId: 'srv-1',
      states: [sampleState1],
    });

    // Thêm Bob
    voiceStateUpdatedSubject.next({
      serverId: 'srv-1',
      channelId: 'chan-voice-1',
      userId: 'user-bob',
      state: sampleState2,
    });

    expect(store.getServerVoiceStates('srv-1').length).toBe(2);

    // Cập nhật Alice mute mic
    const updatedAlice: VoiceMemberState = {
      ...sampleState1,
      isMuted: true,
      isScreenSharing: false,
    };
    voiceStateUpdatedSubject.next({
      serverId: 'srv-1',
      channelId: 'chan-voice-1',
      userId: 'user-alice',
      state: updatedAlice,
    });

    const members = store.getChannelVoiceMembers('srv-1', 'chan-voice-1');
    expect(members.find((m) => m.userId === 'user-alice')?.isMuted).toBe(true);
    expect(members.find((m) => m.userId === 'user-alice')?.isScreenSharing).toBe(false);
  });

  it('xử lý khi thành viên rời khỏi kênh (state: null)', () => {
    voiceServerStatesSyncSubject.next({
      serverId: 'srv-1',
      states: [sampleState1, sampleState2],
    });

    voiceStateUpdatedSubject.next({
      serverId: 'srv-1',
      channelId: null,
      userId: 'user-alice',
      state: null,
    });

    const remaining = store.getServerVoiceStates('srv-1');
    expect(remaining.length).toBe(1);
    expect(remaining[0].userId).toBe('user-bob');
  });

  it('loadServerVoiceStates gọi getServerVoiceStates trên socket', async () => {
    await store.loadServerVoiceStates('srv-1');
    expect(mockChatSocket.getServerVoiceStates).toHaveBeenCalledWith('srv-1');
    expect(store.getServerVoiceStates('srv-1').length).toBe(2);
  });
});
