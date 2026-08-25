import { Injectable, computed, signal } from '@angular/core';
import type {
  DirectCallDto,
  DirectCallEndReason,
  DirectCallMode,
} from '../../../shared/dto/direct-calls.dto';

export type DirectCallClientState =
  | 'idle'
  | 'outgoing_ringing'
  | 'incoming_ringing'
  | 'preflighting'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended';

export type SelfViewCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const CORNER_STORAGE_KEY = 'nexus_direct_call_corner';

@Injectable({
  providedIn: 'root',
})
export class DirectCallStore {
  // State Signals
  readonly activeCall = signal<DirectCallDto | null>(null);
  readonly role = signal<'caller' | 'callee' | null>(null);
  readonly isMediaOwner = signal<boolean>(false);
  readonly callState = signal<DirectCallClientState>('idle');
  readonly initialMode = signal<DirectCallMode>('audio');

  // Media Controls Signals
  readonly isAudioMuted = signal<boolean>(false);
  readonly isVideoMuted = signal<boolean>(false);
  readonly isSpeakerMuted = signal<boolean>(false);
  readonly selectedMicId = signal<string | null>(null);
  readonly selectedCameraId = signal<string | null>(null);
  readonly selectedSpeakerId = signal<string | null>(null);

  // Layout & UI Signals
  readonly selfViewCorner = signal<SelfViewCorner>(this.loadSavedCorner());
  readonly isSelfViewMirrored = signal<boolean>(true);
  readonly remoteVideoFit = signal<'cover' | 'contain'>('cover');
  readonly networkQuality = signal<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');
  readonly callDurationSeconds = signal<number>(0);
  readonly isSpeaking = signal<boolean>(false);
  readonly isRemoteSpeaking = signal<boolean>(false);
  readonly isRemoteVideoAvailable = signal<boolean>(false);
  readonly isRemoteAudioAvailable = signal<boolean>(false);
  readonly isRemoteCameraOff = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Computed Selectors
  readonly isCallActive = computed(() => this.callState() !== 'idle');
  readonly isRinging = computed(
    () =>
      this.callState() === 'outgoing_ringing' ||
      this.callState() === 'incoming_ringing',
  );
  readonly isConnected = computed(() => this.callState() === 'connected');
  readonly showStage = computed(
    () =>
      this.callState() === 'outgoing_ringing' ||
      this.callState() === 'connecting' ||
      this.callState() === 'connected' ||
      this.callState() === 'reconnecting',
  );
  readonly showIncomingOverlay = computed(
    () => this.callState() === 'incoming_ringing',
  );

  readonly remoteParticipant = computed(() => {
    const call = this.activeCall();
    const currentRole = this.role();
    if (!call || !currentRole) return null;
    return currentRole === 'caller' ? call.callee : call.caller;
  });

  private loadSavedCorner(): SelfViewCorner {
    try {
      const saved = localStorage.getItem(CORNER_STORAGE_KEY) as SelfViewCorner;
      if (
        saved === 'top-left' ||
        saved === 'top-right' ||
        saved === 'bottom-left' ||
        saved === 'bottom-right'
      ) {
        return saved;
      }
    } catch {
      // Ignored
    }
    return 'bottom-right';
  }

  setOutgoingCall(call: DirectCallDto, isMediaOwner: boolean = true) {
    this.activeCall.set(call);
    this.role.set('caller');
    this.isMediaOwner.set(isMediaOwner);
    this.initialMode.set(call.initialMode);
    this.isVideoMuted.set(call.initialMode === 'audio');
    this.callState.set('outgoing_ringing');
    this.callDurationSeconds.set(0);
    this.error.set(null);
  }

  setIncomingCall(call: DirectCallDto) {
    this.activeCall.set(call);
    this.role.set('callee');
    this.isMediaOwner.set(true);
    this.initialMode.set(call.initialMode);
    this.isVideoMuted.set(call.initialMode === 'audio');
    this.callState.set('incoming_ringing');
    this.callDurationSeconds.set(0);
    this.error.set(null);
  }

  setPreflighting() {
    this.callState.set('preflighting');
  }

  setAccepted(call: DirectCallDto) {
    this.activeCall.set(call);
    this.initialMode.set(call.initialMode);
    this.callState.set('connecting');
    this.error.set(null);
  }

  setConnecting() {
    this.callState.set('connecting');
  }

  setConnected(connectedAt?: string) {
    this.callState.set('connected');
    if (connectedAt && this.activeCall()) {
      const updated = { ...this.activeCall()!, connectedAt, status: 'accepted' as const };
      this.activeCall.set(updated);
    }
  }

  setReconnecting() {
    this.callState.set('reconnecting');
  }

  setEnded(endReason?: DirectCallEndReason | string | null) {
    this.callState.set('ended');
    if (this.activeCall()) {
      const updated = {
        ...this.activeCall()!,
        status: 'ended' as const,
        endReason: (endReason as any) || 'hangup',
      };
      this.activeCall.set(updated);
    }
  }

  reset() {
    this.activeCall.set(null);
    this.role.set(null);
    this.isMediaOwner.set(false);
    this.callState.set('idle');
    this.callDurationSeconds.set(0);
    this.isSpeaking.set(false);
    this.isRemoteSpeaking.set(false);
    this.isRemoteVideoAvailable.set(false);
    this.isRemoteAudioAvailable.set(false);
    this.isRemoteCameraOff.set(false);
    this.error.set(null);
  }

  toggleAudio() {
    this.isAudioMuted.update((v) => !v);
  }

  setAudioMuted(muted: boolean) {
    this.isAudioMuted.set(muted);
  }

  toggleVideo() {
    this.isVideoMuted.update((v) => !v);
  }

  setVideoMuted(muted: boolean) {
    this.isVideoMuted.set(muted);
  }

  toggleSpeaker() {
    this.isSpeakerMuted.update((v) => !v);
  }

  setMicId(id: string | null) {
    this.selectedMicId.set(id);
  }

  setCameraId(id: string | null) {
    this.selectedCameraId.set(id);
  }

  setSpeakerId(id: string | null) {
    this.selectedSpeakerId.set(id);
  }

  setSelfViewCorner(corner: SelfViewCorner) {
    this.selfViewCorner.set(corner);
    try {
      localStorage.setItem(CORNER_STORAGE_KEY, corner);
    } catch {
      // Ignored
    }
  }

  toggleSelfViewMirror() {
    this.isSelfViewMirrored.update((v) => !v);
  }

  toggleRemoteVideoFit() {
    this.remoteVideoFit.update((fit) => (fit === 'cover' ? 'contain' : 'cover'));
  }

  setNetworkQuality(quality: 'excellent' | 'good' | 'poor' | 'unknown') {
    this.networkQuality.set(quality);
  }

  setSpeaking(speaking: boolean) {
    this.isSpeaking.set(speaking);
  }

  setRemoteSpeaking(speaking: boolean) {
    this.isRemoteSpeaking.set(speaking);
  }

  setRemoteVideoAvailable(available: boolean) {
    this.isRemoteVideoAvailable.set(available);
    this.isRemoteCameraOff.set(!available);
  }

  setRemoteAudioAvailable(available: boolean) {
    this.isRemoteAudioAvailable.set(available);
  }

  tickDuration() {
    this.callDurationSeconds.update((s) => s + 1);
  }

  setError(err: string | null) {
    this.error.set(err);
  }
}
