import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription, Subject } from 'rxjs';
import { DirectCallStore } from './direct-call.store';
import { DirectCallsApiService } from '../api/direct-calls-api.service';
import { DirectCallMediaService } from './direct-call-media.service';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { VoiceRoomService } from '../../features/voice/services/voice-room.service';
import type { DirectCallDto } from '../../../shared/dto/direct-calls.dto';

const SESSION_STORAGE_KEY = 'nexus_client_session_id';

@Injectable({
  providedIn: 'root',
})
export class DirectCallCoordinatorService implements OnDestroy {
  private readonly store = inject(DirectCallStore);
  private readonly api = inject(DirectCallsApiService);
  private readonly mediaService = inject(DirectCallMediaService);
  private readonly socket = inject(ChatSocketService);
  private readonly voiceRoom = inject(VoiceRoomService);

  readonly tabInstanceId: string = crypto.randomUUID();
  readonly tabStartedAt: number = Date.now();
  private _clientSessionId: string = this.getOrCreateClientSessionId();
  get clientSessionId(): string {
    return this._clientSessionId;
  }

  private subs = new Subscription();
  private destroy$ = new Subject<void>();
  private durationTimer: any = null;
  private autoResetTimer: any = null;

  private sessionArbiterChannel: BroadcastChannel | null = null;
  private isRingtoneLeader = false;
  private audioCtx: AudioContext | null = null;
  private ringtoneInterval: any = null;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this._clientSessionId = this.getOrCreateClientSessionId();
    this.initSessionArbiter();
    this.initBroadcastChannel();
    this.setupSocketSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopRingtone();
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.sessionArbiterChannel) {
      this.sessionArbiterChannel.close();
      this.sessionArbiterChannel = null;
    }
    this.stopDurationTimer();
    if (this.autoResetTimer) {
      clearTimeout(this.autoResetTimer);
    }
  }

  private getOrCreateClientSessionId(): string {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return crypto.randomUUID();
    }
    let sid = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  }

  private isWinningTab(
    otherHasActiveCall: boolean,
    otherStartedAt: number,
    otherTabInstanceId: string
  ): boolean {
    const myHasActiveCall = this.store.isCallActive();
    // Rule 1: Tab đang có cuộc gọi hoạt động luôn thắng
    if (myHasActiveCall && !otherHasActiveCall) return true;
    if (!myHasActiveCall && otherHasActiveCall) return false;

    // Rule 2: Tab khởi tạo trước (startedAt nhỏ hơn) thắng
    if (this.tabStartedAt < otherStartedAt) return true;
    if (this.tabStartedAt > otherStartedAt) return false;

    // Rule 3: Nếu startedAt bằng nhau, so sánh lexicographical tabInstanceId
    return this.tabInstanceId < otherTabInstanceId;
  }

  private initSessionArbiter(): void {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return;
    }
    try {
      this.sessionArbiterChannel = new BroadcastChannel('nexus_tab_session_arbiter');
      this.sessionArbiterChannel.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        // Nếu phát hiện một tab khác đang claim cùng một clientSessionId
        if (
          data.type === 'tab_claim' &&
          data.sessionId === this._clientSessionId &&
          data.tabInstanceId !== this.tabInstanceId
        ) {
          const iWin = this.isWinningTab(
            Boolean(data.hasActiveCall),
            Number(data.startedAt || 0),
            String(data.tabInstanceId || '')
          );

          if (iWin) {
            // Báo cho tab thua biết để nó tự regenerate
            this.sessionArbiterChannel?.postMessage({
              type: 'tab_conflict_resolution',
              claimedSessionId: this._clientSessionId,
              winnerTabInstanceId: this.tabInstanceId,
              loserTabInstanceId: data.tabInstanceId,
            });
          } else {
            // Tab này thua -> regenerate sessionId
            this.regenerateClientSession();
          }
        } else if (
          data.type === 'tab_conflict_resolution' &&
          data.claimedSessionId === this._clientSessionId &&
          data.loserTabInstanceId === this.tabInstanceId
        ) {
          // Tab này nhận lệnh phân xử là tab thua -> regenerate
          this.regenerateClientSession();
        }
      };

      // Phát thông điệp đăng ký tab kèm metadata phân xử
      this.sessionArbiterChannel.postMessage({
        type: 'tab_claim',
        tabInstanceId: this.tabInstanceId,
        startedAt: this.tabStartedAt,
        hasActiveCall: this.store.isCallActive(),
        sessionId: this._clientSessionId,
      });
    } catch {
      // Ignored in environments without BroadcastChannel
    }
  }

  private regenerateClientSession(): void {
    this._clientSessionId = crypto.randomUUID();
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, this._clientSessionId);
    }
    this.sessionArbiterChannel?.postMessage({
      type: 'tab_claim',
      tabInstanceId: this.tabInstanceId,
      startedAt: this.tabStartedAt,
      hasActiveCall: this.store.isCallActive(),
      sessionId: this._clientSessionId,
    });
  }

  private initBroadcastChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('nexus_call_ringtone');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'RINGTONE_CLAIMED') {
            // Tab khác đã nhận quyền phát chuông -> tab này tắt chuông
            if (!this.isRingtoneLeader) {
              this.stopRingtoneAudioOnly();
            }
          }
        };
      } catch {
        // Ignored
      }
    }
  }

  private setupSocketSubscriptions(): void {
    // 1. Incoming Call
    this.subs.add(
      this.socket.directCallIncoming$.subscribe((call) => {
        this.handleIncomingCall(call);
      }),
    );

    // 2. Ringing Call (Caller)
    this.subs.add(
      this.socket.directCallRinging$.subscribe((call) => {
        if (this.store.callState() === 'outgoing_ringing' && this.store.activeCall()?.id === call.id) {
          this.playOutgoingDialtone();
        }
      }),
    );

    // 3. Accepted Call
    this.subs.add(
      this.socket.directCallAccepted$.subscribe((call) => {
        this.handleCallAccepted(call);
      }),
    );

    // 4. Connected Call (Recorded by Webhook)
    this.subs.add(
      this.socket.directCallConnected$.subscribe((payload) => {
        if (this.store.activeCall()?.id === payload.callId) {
          this.store.setConnected(payload.connectedAt);
          this.startDurationTimer();
        }
      }),
    );

    // 5. Terminal States (Declined, Cancelled, Ended, Missed, Busy)
    this.subs.add(
      this.socket.directCallDeclined$.subscribe((call) => {
        this.handleCallTerminated(call, 'declined');
      }),
    );

    this.subs.add(
      this.socket.directCallCancelled$.subscribe((call) => {
        this.handleCallTerminated(call, 'caller_cancelled');
      }),
    );

    this.subs.add(
      this.socket.directCallEnded$.subscribe((call) => {
        this.handleCallTerminated(call, call.endReason || 'hangup');
      }),
    );

    this.subs.add(
      this.socket.directCallMissed$.subscribe((call) => {
        this.handleCallTerminated(call, 'no_answer');
      }),
    );

    this.subs.add(
      this.socket.directCallBusy$.subscribe(() => {
        this.handleBusy();
      }),
    );
  }

  /**
   * Xử lý khi có cuộc gọi đến
   */
  private handleIncomingCall(call: DirectCallDto): void {
    // Nếu đang trong cuộc gọi khác, bỏ qua hoặc báo bận
    if (this.store.isCallActive() && this.store.activeCall()?.id !== call.id) {
      return;
    }

    this.store.setIncomingCall(call);
    this.playIncomingRingtoneWithArbitration();
  }

  /**
   * Phát chuông cuộc gọi đến với cơ chế bầu chọn (Web Locks API hoặc BroadcastChannel)
   */
  private async playIncomingRingtoneWithArbitration(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      try {
        await (navigator as any).locks.request(
          'nexus_incoming_call_ringtone',
          { ifAvailable: true },
          async (lock: any) => {
            if (!lock) {
              // Tab khác đang giữ lock -> không phát tiếng chuông
              return;
            }
            this.isRingtoneLeader = true;
            this.playIncomingToneAudio();
            // Giữ lock cho đến khi cuộc gọi không còn ringing
            while (this.store.callState() === 'incoming_ringing') {
              await new Promise((r) => setTimeout(r, 500));
            }
            this.stopRingtoneAudioOnly();
            this.isRingtoneLeader = false;
          },
        );
        return;
      } catch {
        // Fallback
      }
    }

    // Fallback: BroadcastChannel
    this.isRingtoneLeader = true;
    this.broadcastChannel?.postMessage({ type: 'RINGTONE_CLAIMED' });
    this.playIncomingToneAudio();
  }

  private handleCallAccepted(call: DirectCallDto): void {
    this.stopRingtone();

    // Nếu tab này là media owner (Caller hoặc Callee thắng) -> Xin token và connect LiveKit
    if (this.store.isMediaOwner() && this.store.activeCall()?.id === call.id) {
      this.connectLiveKitSession(call.id);
    } else {
      // Tab phụ: chỉ quan sát
      if (this.store.showIncomingOverlay()) {
        this.store.reset();
      }
    }
  }

  private async connectLiveKitSession(callId: string): Promise<void> {
    this.store.setConnecting();
    try {
      const tokenRes = await this.api.getToken(callId, {
        clientSessionId: this.clientSessionId,
      });

      await this.mediaService.connectRoom(tokenRes.serverUrl, tokenRes.participantToken);
      this.store.setConnected();
    } catch (err: any) {
      console.error('Kết nối LiveKit Direct Call thất bại:', err);
      this.store.setError('Không thể kết nối vào phòng gọi LiveKit.');
      this.endCall('failed');
    }
  }

  private handleCallTerminated(call: DirectCallDto, reason: string): void {
    if (this.store.activeCall()?.id === call.id) {
      this.stopRingtone();
      this.stopDurationTimer();
      this.mediaService.disconnectRoom();
      this.playEndTone();
      this.store.setEnded(reason);
      this.scheduleAutoReset();
    }
  }

  private handleBusy(): void {
    this.stopRingtone();
    this.stopDurationTimer();
    this.mediaService.disconnectRoom();
    this.playEndTone();
    this.store.setError('Người dùng hiện đang bận.');
    this.store.setEnded('busy');
    this.scheduleAutoReset();
  }

  private scheduleAutoReset(delayMs = 2500): void {
    if (this.autoResetTimer) {
      clearTimeout(this.autoResetTimer);
    }
    this.autoResetTimer = setTimeout(() => {
      this.store.reset();
    }, delayMs);
  }

  /**
   * Bắt đầu cuộc gọi 1-1
   */
  async startCall(conversationId: string, mode: 'audio' | 'video'): Promise<void> {
    // 1. Kiểm tra va chạm với Server Voice Channel
    if (this.voiceRoom.isConnected()) {
      const channelName = this.voiceRoom.currentChannelName() || 'Kênh thoại';
      const confirmed = confirm(
        `Bạn đang ở trong kênh thoại "${channelName}". Bạn có muốn rời kênh thoại để tham gia cuộc gọi?`,
      );
      if (!confirmed) {
        return;
      }
      await this.voiceRoom.leaveRoom();
    }

    // 2. Preflight thiết bị
    this.store.setPreflighting();
    const preflight = await this.mediaService.preflightMedia(mode);
    if (!preflight.audioOk) {
      alert(preflight.audioError || 'Không thể truy cập Microphone.');
      this.store.reset();
      return;
    }

    const actualMode: 'audio' | 'video' =
      mode === 'video' && preflight.videoOk ? 'video' : 'audio';

    try {
      const call = await this.api.startCall({
        conversationId,
        initialMode: actualMode,
        clientSessionId: this.clientSessionId,
      });

      this.store.setOutgoingCall(call, true);

      // Nếu là video call, bật local camera preview ngay lúc ringing
      if (actualMode === 'video') {
        void this.mediaService.startLocalPreview();
      }
    } catch (err: any) {
      console.error('Tạo cuộc gọi thất bại:', err);
      const errMsg = err?.error?.message || err?.message || 'Không thể thực hiện cuộc gọi.';
      alert(errMsg);
      this.store.reset();
    }
  }

  /**
   * Chấp nhận cuộc gọi (Callee)
   */
  async answerCall(): Promise<void> {
    const call = this.store.activeCall();
    if (!call) return;

    // 1. Kiểm tra va chạm với Server Voice Channel
    if (this.voiceRoom.isConnected()) {
      const channelName = this.voiceRoom.currentChannelName() || 'Kênh thoại';
      const confirmed = confirm(
        `Bạn đang ở trong kênh thoại "${channelName}". Bạn có muốn rời kênh thoại để tham gia cuộc gọi?`,
      );
      if (!confirmed) {
        return;
      }
      await this.voiceRoom.leaveRoom();
    }

    // 2. Preflight Microphone
    const preflight = await this.mediaService.preflightMedia(call.initialMode);
    if (!preflight.audioOk) {
      alert(preflight.audioError || 'Không thể truy cập Microphone.');
      return;
    }

    this.stopRingtone();

    try {
      const res = await this.api.answerCall(call.id, {
        clientSessionId: this.clientSessionId,
      });

      if (res.shouldJoinMedia) {
        this.store.setOutgoingCall(res.call, true);
        await this.connectLiveKitSession(call.id);
      } else {
        // Tab khác đã nhận
        this.store.reset();
      }
    } catch (err: any) {
      console.error('Chấp nhận cuộc gọi thất bại:', err);
      alert(err?.error?.message || 'Không thể chấp nhận cuộc gọi.');
      this.store.reset();
    }
  }

  /**
   * Từ chối cuộc gọi (Callee)
   */
  async declineCall(): Promise<void> {
    const call = this.store.activeCall();
    this.stopRingtone();
    if (!call) {
      this.store.reset();
      return;
    }

    try {
      await this.api.declineCall(call.id);
    } catch {
      // Ignored
    } finally {
      this.store.reset();
    }
  }

  /**
   * Hủy cuộc gọi đang đổ chuông (Caller)
   */
  async cancelCall(): Promise<void> {
    const call = this.store.activeCall();
    this.stopRingtone();
    this.mediaService.stopLocalPreview();
    if (!call) {
      this.store.reset();
      return;
    }

    try {
      await this.api.cancelCall(call.id);
    } catch {
      // Ignored
    } finally {
      this.store.reset();
    }
  }

  /**
   * Kết thúc cuộc gọi đang diễn ra
   */
  async endCall(reason?: string): Promise<void> {
    const call = this.store.activeCall();
    this.stopRingtone();
    this.stopDurationTimer();
    this.mediaService.disconnectRoom();

    if (call) {
      try {
        await this.api.endCall(call.id, { reason: reason || 'hangup' });
      } catch {
        // Ignored
      }
    }

    this.playEndTone();
    this.store.setEnded(reason || 'hangup');
    this.scheduleAutoReset();
  }

  /**
   * Khôi phục phiên cuộc gọi khi mở app hoặc F5
   */
  async restoreActiveCall(): Promise<void> {
    try {
      const res = await this.api.getActiveCall(this.clientSessionId);
      if (res.call) {
        if (res.role === 'caller') {
          this.store.setOutgoingCall(res.call, res.isMediaOwner ?? false);
        } else {
          if (res.call.status === 'ringing') {
            this.store.setIncomingCall(res.call);
          } else {
            this.store.setOutgoingCall(res.call, res.isMediaOwner ?? false);
          }
        }

        if (res.call.status === 'accepted' && res.isMediaOwner) {
          await this.connectLiveKitSession(res.call.id);
        }
      }
    } catch (err) {
      console.warn('Lỗi khôi phục active direct call:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Duration Timer
  // ---------------------------------------------------------------------------
  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.durationTimer = setInterval(() => {
      this.store.tickDuration();
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Web Audio Synthetic Ringtones
  // ---------------------------------------------------------------------------
  private ensureAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private playIncomingToneAudio(): void {
    try {
      const ctx = this.ensureAudioContext();
      this.stopRingtoneAudioOnly();

      const playToneBeep = () => {
        if (!this.audioCtx || this.audioCtx.state === 'closed') return;
        const now = this.audioCtx.currentTime;

        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.setValueAtTime(0.15, now + 1.2);
        gain.gain.linearRampToValueAtTime(0, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.4);
        osc2.stop(now + 1.4);
      };

      playToneBeep();
      this.ringtoneInterval = setInterval(playToneBeep, 3000);
    } catch {
      // Ignored
    }
  }

  private playOutgoingDialtone(): void {
    try {
      const ctx = this.ensureAudioContext();
      this.stopRingtoneAudioOnly();

      const playDialBeep = () => {
        if (!this.audioCtx || this.audioCtx.state === 'closed') return;
        const now = this.audioCtx.currentTime;

        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 1.5);
        gain.gain.linearRampToValueAtTime(0, now + 1.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.7);
        osc2.stop(now + 1.7);
      };

      playDialBeep();
      this.ringtoneInterval = setInterval(playDialBeep, 4000);
    } catch {
      // Ignored
    }
  }

  private playEndTone(): void {
    try {
      const ctx = this.ensureAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Ignored
    }
  }

  stopRingtone(): void {
    this.stopRingtoneAudioOnly();
    this.isRingtoneLeader = false;
  }

  private stopRingtoneAudioOnly(): void {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}
