import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { DirectCallStore } from './direct-call.store';
import type { DirectCallDto } from '../../../shared/dto/direct-calls.dto';

describe('DirectCallStore', () => {
  let store: DirectCallStore;

  const mockCall: DirectCallDto = {
    id: 'call-1',
    conversationId: 'conv-1',
    caller: { id: 'u1', username: 'caller', displayName: 'Caller', avatarUrl: null },
    callee: { id: 'u2', username: 'callee', displayName: 'Callee', avatarUrl: null },
    initialMode: 'video',
    status: 'ringing',
    livekitRoomName: 'nexus:dm-call:call-1',
    initiatedAt: '2026-08-25T10:00:00Z',
    expiresAt: '2026-08-25T10:00:45Z',
    answeredAt: null,
    connectedAt: null,
    endedAt: null,
    endedBy: null,
    endReason: null,
    version: 1,
    createdAt: '2026-08-25T10:00:00Z',
    updatedAt: '2026-08-25T10:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DirectCallStore],
    });
    store = TestBed.inject(DirectCallStore);
  });

  it('should be created with idle state', () => {
    expect(store.callState()).toBe('idle');
    expect(store.isCallActive()).toBe(false);
  });

  it('setOutgoingCall sets state to outgoing_ringing and role to caller', () => {
    store.setOutgoingCall(mockCall, true);
    expect(store.callState()).toBe('outgoing_ringing');
    expect(store.role()).toBe('caller');
    expect(store.isMediaOwner()).toBe(true);
    expect(store.isCallActive()).toBe(true);
    expect(store.showStage()).toBe(true);
  });

  it('setIncomingCall sets state to incoming_ringing and role to callee', () => {
    store.setIncomingCall(mockCall);
    expect(store.callState()).toBe('incoming_ringing');
    expect(store.role()).toBe('callee');
    expect(store.showIncomingOverlay()).toBe(true);
  });

  it('setConnected updates state and connectedAt', () => {
    store.setOutgoingCall(mockCall, true);
    store.setConnected('2026-08-25T10:00:05Z');
    expect(store.callState()).toBe('connected');
    expect(store.isConnected()).toBe(true);
    expect(store.activeCall()?.connectedAt).toBe('2026-08-25T10:00:05Z');
  });

  it('reset clears active call state', () => {
    store.setOutgoingCall(mockCall, true);
    store.reset();
    expect(store.callState()).toBe('idle');
    expect(store.activeCall()).toBeNull();
  });
});
