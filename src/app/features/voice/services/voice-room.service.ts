import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import {
  ConnectionQuality,
  ConnectionState,
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  RemoteParticipant,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
  TrackPublication,
} from 'livekit-client';
import { VoiceApiService } from '../../../core/api/voice-api.service';
import { ProfileService } from '../../../core/profile/profile.service';
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

  private room: Room | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  readonly connectionStatus = signal<VoiceConnectionStatus>('idle');
  readonly currentServerId = signal<string | null>(null);
  readonly currentChannelId = signal<string | null>(null);
  readonly currentChannelName = signal<string | null>(null);
  readonly callDurationSeconds = signal<number>(0);
  readonly errorMessage = signal<string | null>(null);

  readonly localParticipant = signal<VoiceParticipantModel | null>(null);
  readonly remoteParticipants = signal<VoiceParticipantModel[]>([]);

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

      // 4. Bật micro / camera theo options ban đầu
      if (enableAudio) {
        await this.room.localParticipant.setMicrophoneEnabled(true);
      }
      if (enableVideo) {
        await this.room.localParticipant.setCameraEnabled(true);
      }

      this.connectionStatus.set('connected');
      this.startDurationTimer();
      this.updateLocalParticipantState();
      this.syncRemoteParticipants();
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
      this.updateLocalParticipantState();
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
    } catch (err) {
      console.warn('Lỗi khi bật/tắt chia sẻ màn hình:', err);
    }
  }

  /**
   * Đổi thiết bị Microphone khi đang gọi.
   */
  async switchAudioInput(deviceId: string): Promise<void> {
    this.mediaDevices.selectAudioInput(deviceId);
    if (this.room) {
      await this.room.switchActiveDevice('audioinput', deviceId);
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
      .on(RoomEvent.TrackSubscribed, () => {
        this.syncRemoteParticipants();
      })
      .on(RoomEvent.TrackUnsubscribed, () => {
        this.syncRemoteParticipants();
      })
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

    this.localParticipant.set({
      identity: p.identity,
      name: p.name || 'Bạn',
      isLocal: true,
      isSpeaking: p.isSpeaking,
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

  private cleanup(): void {
    this.stopDurationTimer();

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

  ngOnDestroy(): void {
    this.cleanup();
  }
}
