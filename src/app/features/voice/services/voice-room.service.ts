import { Injectable, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  ConnectionQuality,
  ConnectionState,
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
  TrackPublication,
} from 'livekit-client';
import { VoiceApiService } from '../../../core/api/voice-api.service';
import { ProfileService } from '../../../core/profile/profile.service';
import { ChatSocketService } from '../../../core/realtime/chat-socket.service';
import { UserSettingsService } from '../../settings/services/user-settings.service';
import { MediaDeviceService } from './media-device.service';

export type VoiceConnectionStatus =
  | 'idle'
  | 'requesting-permission'
  | 'previewing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface VoiceParticipantModel {
  identity: string;
  name: string;
  avatarUrl?: string | null;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
  videoPublication?: TrackPublication | null;
  screenSharePublication?: TrackPublication | null;
}

@Injectable({
  providedIn: 'root',
})
export class VoiceRoomService implements OnDestroy {
  private readonly voiceApi = inject(VoiceApiService);
  private readonly profile = inject(ProfileService);
  private readonly mediaDevices = inject(MediaDeviceService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly userSettings = inject(UserSettingsService);

  private room: Room | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private isTestingMicActive = false;
  private wasMutedBeforeTest = false;
  private isPttPressed = false;
  private pttReleaseTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly socketSubs = new Subscription();

  private localAudioContext: AudioContext | null = null;
  private localAudioAnalyser: AnalyserNode | null = null;
  private localVadStream: MediaStream | null = null;
  private localVadAnimFrame: number | null = null;
  private isLocalSpeakingInstant = false;
  private localSpeakingTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly connectionStatus = signal<VoiceConnectionStatus>('idle');
  readonly currentServerId = signal<string | null>(null);
  readonly currentChannelId = signal<string | null>(null);
  readonly currentChannelName = signal<string | null>(null);
  readonly callDurationSeconds = signal<number>(0);
  readonly errorMessage = signal<string | null>(null);
  readonly microphoneReady = signal(false);

  readonly localParticipant = signal<VoiceParticipantModel | null>(null);
  readonly remoteParticipants = signal<VoiceParticipantModel[]>([]);

  /** Quản lý âm lượng cục bộ từng thành viên (0% - 200%) và tắt tiếng cục bộ (Local Mute) */
  readonly localUserVolumes = signal<Record<string, number>>({});
  readonly localUserMutes = signal<Record<string, boolean>>({});

  readonly allParticipants = computed(() => {
    const local = this.localParticipant();
    const remotes = this.remoteParticipants();
    return local ? [local, ...remotes] : remotes;
  });

  readonly isConnected = computed(() => this.connectionStatus() === 'connected');
  readonly isConnecting = computed(() => this.connectionStatus() === 'connecting');
  readonly isMicMuted = computed(() => this.localParticipant()?.isMuted ?? false);
  readonly isCameraOn = computed(() => this.localParticipant()?.isCameraOn ?? false);
  readonly isScreenSharing = computed(() => this.localParticipant()?.isScreenSharing ?? false);

  readonly screenShareParticipant = computed(() =>
    this.allParticipants().find((p) => p.isScreenSharing && p.screenSharePublication),
  );

  /**
   * Thời lượng gọi định dạng mm:ss hoặc hh:mm:ss
   */
  readonly formattedDuration = computed(() => {
    const total = this.callDurationSeconds();
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  });

  /** Quản lý trạng thái mở Voice Chat Drawer (khung chat văn bản trong phòng thoại) */
  readonly isChatDrawerOpen = signal<boolean>(false);

  constructor() {
    // 1. Lắng nghe lệnh ép chuyển kênh thoại (Force Move từ Chủ Server / Admin)
    if (this.chatSocket?.voiceForceMove$) {
      this.socketSubs.add(
        this.chatSocket.voiceForceMove$.subscribe((payload) => {
          if (this.currentServerId() === payload.serverId && this.currentChannelId() !== payload.channelId) {
            const wasAudio = !this.isMicMuted();
            const wasVideo = this.isCameraOn();
            void this.joinRoom(payload.serverId, payload.channelId, payload.channelName, {
              audio: wasAudio,
              video: wasVideo,
            });
          }
        }),
      );
    }

    // 2. Lắng nghe lệnh ép ngắt kết nối khỏi phòng thoại (Force Disconnect / Kick)
    if (this.chatSocket?.voiceForceDisconnect$) {
      this.socketSubs.add(
        this.chatSocket.voiceForceDisconnect$.subscribe((payload) => {
          if (this.currentServerId() === payload.serverId) {
            void this.leaveRoom();
          }
        }),
      );
    }

    // 3. Lắng nghe lệnh ép tắt mic trên máy chủ (Force Mute)
    if (this.chatSocket?.voiceForceMute$) {
      this.socketSubs.add(
        this.chatSocket.voiceForceMute$.subscribe((payload) => {
          if (this.currentServerId() === payload.serverId && payload.isMuted) {
            if (this.room?.localParticipant?.isMicrophoneEnabled) {
              void this.room.localParticipant.setMicrophoneEnabled(false).then(() => {
                this.stopLocalFastVad();
                this.updateLocalParticipantState();
                this.broadcastVoiceState(this.currentChannelId());
              });
            }
          }
        }),
      );
    }

    effect(() => {
      const isTesting = this.mediaDevices.isTestingMic();
      const status = this.connectionStatus();

      untracked(() => {
        if (status !== 'connected' || !this.room) {
          this.isTestingMicActive = isTesting;
          return;
        }

        // Bắt đầu test mic (Rising edge: false -> true)
        if (isTesting && !this.isTestingMicActive) {
          this.isTestingMicActive = true;
          this.wasMutedBeforeTest = this.isMicMuted();

          // Nếu trước khi test mic đang bật, tạm ngắt để không lọt âm thanh test vào phòng thoại
          if (!this.wasMutedBeforeTest) {
            void this.room.localParticipant.setMicrophoneEnabled(false).then(() => {
              this.updateLocalParticipantState();
              this.broadcastVoiceState(this.currentChannelId());
            });
          }
        }
        // Dừng test mic (Falling edge: true -> false)
        else if (!isTesting && this.isTestingMicActive) {
          this.isTestingMicActive = false;

          // Nếu trước khi test mic đang bật, tự động kết nối và bật lại mic với phòng thoại
          if (!this.wasMutedBeforeTest) {
            void this.room.localParticipant.setMicrophoneEnabled(true).then(() => {
              this.updateLocalParticipantState();
              this.broadcastVoiceState(this.currentChannelId());
            });
          }
        }
      });
    });

    // 4. Lắng nghe phím Push-to-Talk toàn cục (Global Push-to-Talk)
    if (typeof window !== 'undefined') {
      window.addEventListener(
        'keydown',
        (e: KeyboardEvent) => {
          const prefs = this.userSettings.preferences();
          if (prefs.inputMode !== 'push-to-talk') return;
          if (e.repeat) return;

          const target = e.target as HTMLElement | null;
          const isTyping =
            target &&
            (target.tagName === 'INPUT' ||
              target.tagName === 'TEXTAREA' ||
              target.isContentEditable);
          const isModifier = ['Caps Lock', 'Ctrl', 'Alt', 'Shift', 'Tab'].includes(prefs.pushToTalkKey);

          if (isTyping && !isModifier) return;

          if (this.matchesPttKey(e, prefs.pushToTalkKey)) {
            if (this.pttReleaseTimeout) {
              clearTimeout(this.pttReleaseTimeout);
              this.pttReleaseTimeout = null;
            }
            this.isPttPressed = true;
            if (this.isConnected() && this.room) {
              void this.setMicrophoneActive(true);
            }
          }
        },
        { capture: true },
      );

      window.addEventListener(
        'keyup',
        (e: KeyboardEvent) => {
          const prefs = this.userSettings.preferences();
          if (prefs.inputMode !== 'push-to-talk') return;

          if (this.matchesPttKey(e, prefs.pushToTalkKey)) {
            this.isPttPressed = false;
            const delay = prefs.pushToTalkDelay || 0;
            if (delay > 0) {
              this.pttReleaseTimeout = setTimeout(() => {
                if (!this.isPttPressed && this.isConnected() && this.room) {
                  void this.setMicrophoneActive(false);
                }
              }, delay);
            } else {
              if (this.isConnected() && this.room) {
                void this.setMicrophoneActive(false);
              }
            }
          }
        },
        { capture: true },
      );
    }
  }

  private matchesPttKey(event: KeyboardEvent, targetKey: string): boolean {
    if (!targetKey) return false;
    const cleanTarget = targetKey.trim().toLowerCase();
    if (cleanTarget === 'caps lock' || cleanTarget === 'capslock') return event.code === 'CapsLock';
    if (cleanTarget === 'space' || cleanTarget === 'spacebar') return event.code === 'Space';
    if (cleanTarget === 'ctrl' || cleanTarget === 'control') return event.key === 'Control' || event.ctrlKey;
    if (cleanTarget === 'alt') return event.key === 'Alt' || event.altKey;
    if (cleanTarget === 'shift') return event.key === 'Shift' || event.shiftKey;
    if (cleanTarget === 'tab') return event.code === 'Tab';
    if (event.key && event.key.toLowerCase() === cleanTarget) return true;
    if (event.code && event.code.toLowerCase().replace('key', '') === cleanTarget) return true;
    return false;
  }

  /**
   * Đặt trạng thái bật/tắt microphone (dùng cho Push-to-Talk)
   */
  async setMicrophoneActive(enabled: boolean): Promise<void> {
    if (!this.room) return;
    try {
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
      if (enabled) {
        const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micPub?.audioTrack?.mediaStreamTrack) {
          this.startLocalFastVad(micPub.audioTrack.mediaStreamTrack);
        }
      } else {
        this.stopLocalFastVad();
      }
      this.updateLocalParticipantState();
      this.broadcastVoiceState(this.currentChannelId());
    } catch (err) {
      console.warn('Lỗi khi đổi trạng thái microphone:', err);
    }
  }

  /**
   * Điều chỉnh âm lượng cục bộ của một thành viên (0% - 200%).
   */
  setUserVolume(userIdOrIdentity: string, volumePercent: number): void {
    const clamped = Math.max(0, Math.min(200, Math.round(volumePercent)));
    this.localUserVolumes.update((map) => ({ ...map, [userIdOrIdentity]: clamped }));
    this.applyLocalAudioVolume(userIdOrIdentity);
  }

  getUserVolume(userIdOrIdentity: string): number {
    return this.localUserVolumes()[userIdOrIdentity] ?? 100;
  }

  toggleLocalMute(userIdOrIdentity: string): void {
    const current = this.isLocalMuted(userIdOrIdentity);
    this.localUserMutes.update((map) => ({ ...map, [userIdOrIdentity]: !current }));
    this.applyLocalAudioVolume(userIdOrIdentity);
  }

  isLocalMuted(userIdOrIdentity: string): boolean {
    return this.localUserMutes()[userIdOrIdentity] ?? false;
  }

  private applyLocalAudioVolume(userIdOrIdentity: string): void {
    if (typeof document === 'undefined') return;
    const isMuted = this.isLocalMuted(userIdOrIdentity);
    const volume = this.getUserVolume(userIdOrIdentity);
    const effectiveVolume = isMuted ? 0 : Math.min(1, volume / 100);

    const audioEl = document.querySelector<HTMLAudioElement>(
      `[data-voice-participant-audio="${userIdOrIdentity}"]`,
    );
    if (audioEl) {
      audioEl.volume = effectiveVolume;
    }
  }

  toggleChatDrawer(): void {
    this.isChatDrawerOpen.update((open) => !open);
  }

  openChatDrawer(): void {
    this.isChatDrawerOpen.set(true);
  }

  closeChatDrawer(): void {
    this.isChatDrawerOpen.set(false);
  }

  /**
   * Mở giao diện pre-join preview thiết bị.
   */
  openPrejoin(serverId: string, channelId: string, channelName: string): void {
    this.currentServerId.set(serverId);
    this.currentChannelId.set(channelId);
    this.currentChannelName.set(channelName);
    this.connectionStatus.set('previewing');
    void this.mediaDevices.startMicrophoneTest(this.mediaDevices.selectedAudioInputId());
  }

  /**
   * Đóng preview và quay lại trạng thái chưa tham gia.
   */
  closePrejoin(): void {
    this.mediaDevices.stopMicrophoneTest();
    if (this.connectionStatus() === 'previewing') {
      this.connectionStatus.set('idle');
    }
  }

  /**
   * Tham gia vào Voice Room thật thông qua WebRTC LiveKit.
   */
  async joinRoom(
    serverId: string,
    channelId: string,
    channelName: string,
    options?: { audio?: boolean; video?: boolean },
  ): Promise<void> {
    this.mediaDevices.stopMicrophoneTest();
    this.currentServerId.set(serverId);
    this.currentChannelId.set(channelId);
    this.currentChannelName.set(channelName);
    this.connectionStatus.set('connecting');
    this.errorMessage.set(null);

    const enableAudio = options?.audio ?? true;
    const enableVideo = options?.video ?? false;

    try {
      const displayName =
        this.profile.current()?.displayName ?? this.profile.current()?.username ?? 'Nexus Member';

      // 1. Xin token LiveKit từ backend NestJS
      const tokenRes = await this.voiceApi.getVoiceToken(serverId, channelId, displayName);

      // 2. Tạo đối tượng Room của LiveKit
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          deviceId: this.mediaDevices.selectedAudioInputId(),
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
        videoCaptureDefaults: {
          deviceId: this.mediaDevices.selectedVideoInputId(),
          resolution: { width: 1280, height: 720, frameRate: 30 },
        },
      });

      this.setupRoomListeners(this.room);

      // 3. Kết nối WebRTC tới LiveKit Server
      await this.room.connect(tokenRes.serverUrl, tokenRes.participantToken);

      // 4. Bật micro / camera theo options ban đầu và chế độ nhập (Voice Activity vs PTT)
      const isPttMode = this.userSettings.preferences().inputMode === 'push-to-talk';
      if (enableAudio && !isPttMode) {
        const publication = await this.room.localParticipant.setMicrophoneEnabled(true);
        const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
        const micTrack =
          publication?.audioTrack?.mediaStreamTrack ?? micPub?.audioTrack?.mediaStreamTrack;
        if (!micTrack || micTrack.readyState !== 'live') {
          throw new Error(
            'Microphone chưa được LiveKit publish. Hãy kiểm tra quyền micro và thiết bị đầu vào.',
          );
        }
        this.microphoneReady.set(true);
        this.startLocalFastVad(micTrack);
      } else {
        await this.room.localParticipant.setMicrophoneEnabled(false);
        this.microphoneReady.set(false);
      }
      if (enableVideo) {
        await this.room.localParticipant.setCameraEnabled(true);
      }

      this.connectionStatus.set('connected');
      this.startDurationTimer();
      this.updateLocalParticipantState();
      this.syncRemoteParticipants();
      this.broadcastVoiceState(channelId);
    } catch (err: unknown) {
      console.error('Lỗi khi tham gia phòng thoại LiveKit:', err);
      const error = err as Error;
      this.connectionStatus.set('error');
      this.errorMessage.set(error.message || 'Không thể kết nối phòng thoại.');
      this.cleanup();
    }
  }

  /**
   * Rời khỏi phòng thoại và tắt sạch mọi tracks (tắt đèn camera & mic).
   */
  async leaveRoom(): Promise<void> {
    this.cleanup();
    this.connectionStatus.set('disconnected');
    setTimeout(() => {
      if (this.connectionStatus() === 'disconnected') {
        this.connectionStatus.set('idle');
      }
    }, 1500);
  }

  /**
   * Bật / Tắt Microphone của local user.
   */
  async toggleMicrophone(): Promise<void> {
    if (!this.room) return;
    const isMuted = this.isMicMuted();
    try {
      await this.room.localParticipant.setMicrophoneEnabled(isMuted);
      this.wasMutedBeforeTest = !isMuted;
      if (isMuted) {
        const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micPub?.audioTrack?.mediaStreamTrack) {
          this.startLocalFastVad(micPub.audioTrack.mediaStreamTrack);
        }
      } else {
        this.stopLocalFastVad();
      }
      this.updateLocalParticipantState();
      this.broadcastVoiceState(this.currentChannelId());
    } catch (err) {
      console.warn('Lỗi khi bật/tắt microphone:', err);
    }
  }

  /**
   * Bật / Tắt Camera của local user.
   */
  async toggleCamera(): Promise<void> {
    if (!this.room) return;
    const isCamOn = this.isCameraOn();
    try {
      await this.room.localParticipant.setCameraEnabled(!isCamOn);
      this.updateLocalParticipantState();
      this.broadcastVoiceState(this.currentChannelId());
    } catch (err) {
      console.warn('Lỗi khi bật/tắt camera:', err);
    }
  }

  /**
   * Bật / Tắt Chia sẻ màn hình (Screen Share).
   */
  async toggleScreenShare(): Promise<void> {
    if (!this.room) return;
    const isSharing = this.isScreenSharing();
    try {
      await this.room.localParticipant.setScreenShareEnabled(!isSharing, {
        audio: true,
        selfBrowserSurface: 'include',
      });
      this.updateLocalParticipantState();
      this.broadcastVoiceState(this.currentChannelId());
    } catch (err) {
      console.warn('Lỗi khi bật/tắt chia sẻ màn hình:', err);
    }
  }

  /**
   * Đổi cửa sổ / màn hình đang chia sẻ (Screen Share Source).
   */
  async switchScreenShare(): Promise<void> {
    if (!this.room) return;
    try {
      if (this.isScreenSharing()) {
        await this.room.localParticipant.setScreenShareEnabled(false);
      }
      await this.room.localParticipant.setScreenShareEnabled(true, {
        audio: true,
        selfBrowserSurface: 'include',
      });
      this.updateLocalParticipantState();
      this.broadcastVoiceState(this.currentChannelId());
    } catch (err) {
      console.warn('Lỗi khi đổi màn hình chia sẻ:', err);
      this.updateLocalParticipantState();
      this.broadcastVoiceState(this.currentChannelId());
    }
  }

  /**
   * Đổi thiết bị Microphone khi đang gọi.
   */
  async switchAudioInput(deviceId: string): Promise<void> {
    this.mediaDevices.selectAudioInput(deviceId);
    if (this.room) {
      await this.room.switchActiveDevice('audioinput', deviceId);
      const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (micPub?.audioTrack?.mediaStreamTrack && this.room.localParticipant.isMicrophoneEnabled) {
        this.startLocalFastVad(micPub.audioTrack.mediaStreamTrack);
      }
    }
  }

  /**
   * Đổi thiết bị Camera khi đang gọi.
   */
  async switchVideoInput(deviceId: string): Promise<void> {
    this.mediaDevices.selectVideoInput(deviceId);
    if (this.room) {
      await this.room.switchActiveDevice('videoinput', deviceId);
    }
  }

  /**
   * Đổi thiết bị Loa (Audio Output) khi đang gọi.
   */
  async switchAudioOutput(deviceId: string): Promise<void> {
    this.mediaDevices.selectAudioOutput(deviceId);
    if (this.room) {
      await this.room.switchActiveDevice('audiooutput', deviceId);
    }
  }

  private setupRoomListeners(room: Room): void {
    room
      .on(RoomEvent.Connected, () => {
        this.connectionStatus.set('connected');
        this.updateLocalParticipantState();
        this.syncRemoteParticipants();
      })
      .on(RoomEvent.Reconnecting, () => {
        this.connectionStatus.set('reconnecting');
      })
      .on(RoomEvent.Reconnected, () => {
        this.connectionStatus.set('connected');
        this.updateLocalParticipantState();
        this.syncRemoteParticipants();
        this.broadcastVoiceState(this.currentChannelId());
      })
      .on(RoomEvent.Disconnected, () => {
        this.leaveRoom();
      })
      .on(RoomEvent.ParticipantConnected, () => {
        this.syncRemoteParticipants();
      })
      .on(RoomEvent.ParticipantDisconnected, () => {
        this.syncRemoteParticipants();
      })
      .on(RoomEvent.LocalTrackPublished, (pub: LocalTrackPublication) => {
        if (pub.source === Track.Source.Microphone && pub.audioTrack?.mediaStreamTrack) {
          this.microphoneReady.set(pub.audioTrack.mediaStreamTrack.readyState === 'live');
          this.startLocalFastVad(pub.audioTrack.mediaStreamTrack);
        }
        this.updateLocalParticipantState();
      })
      .on(RoomEvent.LocalTrackUnpublished, (pub: LocalTrackPublication) => {
        if (pub.source === Track.Source.Microphone) {
          this.microphoneReady.set(false);
          this.stopLocalFastVad();
        }
        this.updateLocalParticipantState();
      })
      .on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const attachedEl = track.attach();
            attachedEl.setAttribute('data-voice-participant-audio', participant.identity);
            attachedEl.className = 'hidden pointer-events-none fixed -left-[9999px]';
            if (typeof document !== 'undefined' && document.body) {
              document.body.appendChild(attachedEl);
            }
            this.applyLocalAudioVolume(participant.identity);
            void room.startAudio().catch(() => {});
          }
          this.syncRemoteParticipants();
        },
      )
      .on(
        RoomEvent.TrackUnsubscribed,
        (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            track.detach().forEach((el) => el.remove());
          }
          this.syncRemoteParticipants();
        },
      )
      .on(RoomEvent.TrackMuted, () => {
        this.updateLocalParticipantState();
        this.syncRemoteParticipants();
      })
      .on(RoomEvent.TrackUnmuted, () => {
        this.updateLocalParticipantState();
        this.syncRemoteParticipants();
      })
      .on(RoomEvent.ActiveSpeakersChanged, () => {
        this.updateLocalParticipantState();
        this.syncRemoteParticipants();
      })
      .on(RoomEvent.ConnectionQualityChanged, () => {
        this.updateLocalParticipantState();
        this.syncRemoteParticipants();
      });
  }

  private updateLocalParticipantState(): void {
    if (!this.room || !this.room.localParticipant) {
      return;
    }

    const p = this.room.localParticipant;
    const cameraPub = p.getTrackPublication(Track.Source.Camera);
    const screenPub = p.getTrackPublication(Track.Source.ScreenShare);
    const isSpeaking = (this.isLocalSpeakingInstant || p.isSpeaking) && p.isMicrophoneEnabled;

    this.localParticipant.set({
      identity: p.identity,
      name: p.name || 'Bạn',
      isLocal: true,
      isSpeaking,
      isMuted: !p.isMicrophoneEnabled,
      isCameraOn: p.isCameraEnabled,
      isScreenSharing: p.isScreenShareEnabled,
      connectionQuality: this.mapConnectionQuality(p.connectionQuality),
      videoPublication: cameraPub || null,
      screenSharePublication: screenPub || null,
    });
  }

  private syncRemoteParticipants(): void {
    if (!this.room) {
      this.remoteParticipants.set([]);
      return;
    }

    const list: VoiceParticipantModel[] = [];
    this.room.remoteParticipants.forEach((p) => {
      const cameraPub = p.getTrackPublication(Track.Source.Camera);
      const screenPub = p.getTrackPublication(Track.Source.ScreenShare);

      list.push({
        identity: p.identity,
        name: p.name || `Member_${p.identity.slice(0, 5)}`,
        isLocal: false,
        isSpeaking: p.isSpeaking,
        isMuted: !p.isMicrophoneEnabled,
        isCameraOn: p.isCameraEnabled,
        isScreenSharing: p.isScreenShareEnabled,
        connectionQuality: this.mapConnectionQuality(p.connectionQuality),
        videoPublication: cameraPub || null,
        screenSharePublication: screenPub || null,
      });
    });

    this.remoteParticipants.set(list);
  }

  private mapConnectionQuality(q: ConnectionQuality): 'excellent' | 'good' | 'poor' | 'unknown' {
    switch (q) {
      case ConnectionQuality.Excellent:
        return 'excellent';
      case ConnectionQuality.Good:
        return 'good';
      case ConnectionQuality.Poor:
        return 'poor';
      default:
        return 'unknown';
    }
  }

  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.callDurationSeconds.set(0);
    this.timerInterval = setInterval(() => {
      this.callDurationSeconds.update((s) => s + 1);
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.callDurationSeconds.set(0);
  }

  private broadcastVoiceState(channelId: string | null): void {
    const serverId = this.currentServerId();
    if (!serverId) return;
    this.chatSocket.updateVoiceState({
      serverId,
      channelId,
      isMuted: this.isMicMuted(),
      isDeafened: false,
      isCameraOn: this.isCameraOn(),
      isScreenSharing: this.isScreenSharing(),
    });
  }

  private cleanup(): void {
    this.stopDurationTimer();
    this.stopLocalFastVad();
    this.microphoneReady.set(false);
    this.isTestingMicActive = false;
    this.wasMutedBeforeTest = false;

    const serverId = this.currentServerId();
    if (serverId) {
      this.chatSocket.updateVoiceState({
        serverId,
        channelId: null,
      });
    }

    if (typeof document !== 'undefined') {
      const audioEls = document.querySelectorAll('[data-voice-participant-audio]');
      audioEls.forEach((el) => el.remove());
    }

    if (this.room) {
      try {
        this.room.disconnect();
      } catch (err) {
        console.warn('Lỗi khi disconnect room:', err);
      }
      this.room = null;
    }

    this.localParticipant.set(null);
    this.remoteParticipants.set([]);
    this.currentServerId.set(null);
    this.currentChannelId.set(null);
    this.currentChannelName.set(null);
  }

  /**
   * Khởi động Client-side Fast VAD trực tiếp trên local microphone track.
   * Đo volume theo từng frame (16ms) giúp phát hiện giọng nói ngay lập tức (<16ms delay).
   */
  private startLocalFastVad(mediaStreamTrack: MediaStreamTrack): void {
    this.stopLocalFastVad();
    if (typeof window === 'undefined') return;

    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      this.localAudioContext = new AudioContextClass();
      this.localVadStream = new MediaStream([mediaStreamTrack]);
      const source = this.localAudioContext.createMediaStreamSource(this.localVadStream);
      this.localAudioAnalyser = this.localAudioContext.createAnalyser();
      this.localAudioAnalyser.fftSize = 256;
      this.localAudioAnalyser.smoothingTimeConstant = 0.2;
      source.connect(this.localAudioAnalyser);

      const dataArray = new Uint8Array(this.localAudioAnalyser.frequencyBinCount);

      const checkVolume = () => {
        if (!this.localAudioAnalyser) return;
        this.localAudioAnalyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length; // 0..255
        // Ngưỡng nhạy tức thì (avg > 4) khi micro local đang được bật
        const isSpeakingNow = avg > 4 && this.room?.localParticipant?.isMicrophoneEnabled === true;

        if (isSpeakingNow) {
          if (!this.isLocalSpeakingInstant) {
            this.isLocalSpeakingInstant = true;
            this.updateLocalParticipantState();
          }
          if (this.localSpeakingTimeout) {
            clearTimeout(this.localSpeakingTimeout);
            this.localSpeakingTimeout = null;
          }
          // Giữ sáng viền trong 300ms sau khi dứt tiếng để hiệu ứng mượt mà như Discord
          this.localSpeakingTimeout = setTimeout(() => {
            if (this.isLocalSpeakingInstant) {
              this.isLocalSpeakingInstant = false;
              this.updateLocalParticipantState();
            }
          }, 300);
        }

        this.localVadAnimFrame = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('Không thể khởi tạo Fast Local VAD:', err);
    }
  }

  /**
   * Dừng Client-side Fast VAD và giải phóng tài nguyên Web Audio.
   */
  private stopLocalFastVad(): void {
    if (this.localVadAnimFrame) {
      cancelAnimationFrame(this.localVadAnimFrame);
      this.localVadAnimFrame = null;
    }
    if (this.localSpeakingTimeout) {
      clearTimeout(this.localSpeakingTimeout);
      this.localSpeakingTimeout = null;
    }
    if (this.localAudioContext && this.localAudioContext.state !== 'closed') {
      void this.localAudioContext.close();
      this.localAudioContext = null;
    }
    this.localAudioAnalyser = null;
    this.localVadStream = null;
    this.isLocalSpeakingInstant = false;
  }

  ngOnDestroy(): void {
    this.socketSubs.unsubscribe();
    this.cleanup();
  }
}
