import { Injectable, inject } from '@angular/core';
import {
  ConnectionState,
  LocalAudioTrack,
  LocalVideoTrack,
  RemoteAudioTrack,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteVideoTrack,
  Room,
  RoomEvent,
  Track,
  TrackPublication,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from 'livekit-client';
import { DirectCallStore } from './direct-call.store';
import { MediaDeviceService } from '../../features/voice/services/media-device.service';

export interface PreflightResult {
  audioOk: boolean;
  videoOk: boolean;
  audioError?: string;
  videoError?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DirectCallMediaService {
  private readonly store = inject(DirectCallStore);
  private readonly deviceService = inject(MediaDeviceService);

  private room: Room | null = null;
  private localAudioTrack: LocalAudioTrack | null = null;
  private localVideoTrack: LocalVideoTrack | null = null;
  private localPreviewStream: MediaStream | null = null;

  private remoteVideoTrack: RemoteVideoTrack | null = null;
  private remoteAudioTrack: RemoteAudioTrack | null = null;

  private localVideoEl: HTMLVideoElement | null = null;
  private remoteVideoEl: HTMLVideoElement | null = null;
  private remoteAudioEl: HTMLAudioElement | null = null;

  /**
   * Preflight kiểm tra quyền Microphone và Camera trước khi gửi tín hiệu gọi/chấp nhận
   */
  async preflightMedia(mode: 'audio' | 'video'): Promise<PreflightResult> {
    const result: PreflightResult = {
      audioOk: false,
      videoOk: false,
    };

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        audioOk: false,
        videoOk: false,
        audioError: 'Trình duyệt không hỗ trợ truy cập thiết bị âm thanh/hình ảnh.',
      };
    }

    // 1. Kiểm tra Microphone (Bắt buộc)
    try {
      const audioMicId = this.store.selectedMicId() || undefined;
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: audioMicId ? { deviceId: { exact: audioMicId } } : true,
      });
      // Giải phóng ngay sau khi kiểm tra
      audioStream.getTracks().forEach((t) => t.stop());
      result.audioOk = true;
    } catch (err: any) {
      result.audioOk = false;
      result.audioError =
        err?.name === 'NotAllowedError'
          ? 'Quyền truy cập Microphone bị từ chối.'
          : 'Không tìm thấy Microphone hoặc thiết bị đang bận.';
      return result; // Không có mic thì không thể tiếp tục
    }

    // 2. Nếu là cuộc gọi video, kiểm tra Camera (Có thể fallback sang audio nếu lỗi)
    if (mode === 'video') {
      try {
        const camId = this.store.selectedCameraId() || undefined;
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: camId ? { deviceId: { exact: camId } } : true,
        });
        videoStream.getTracks().forEach((t) => t.stop());
        result.videoOk = true;
      } catch (err: any) {
        result.videoOk = false;
        result.videoError =
          err?.name === 'NotAllowedError'
            ? 'Quyền truy cập Camera bị từ chối (cuộc gọi sẽ tiếp tục ở chế độ thoại).'
            : 'Không tìm thấy Camera (chuyển sang cuộc gọi thoại).';
      }
    }

    return result;
  }

  /**
   * Khởi động local preview stream cho Caller trong lúc đổ chuông (Caller Preflight)
   */
  async startLocalPreview(videoElement?: HTMLVideoElement): Promise<void> {
    if (videoElement) {
      this.localVideoEl = videoElement;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      this.stopLocalPreview();
      const camId = this.store.selectedCameraId() || undefined;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camId ? { deviceId: { exact: camId } } : true,
      });
      this.localPreviewStream = stream;

      if (this.localVideoEl) {
        this.localVideoEl.srcObject = stream;
        await this.localVideoEl.play().catch(() => {});
      }
    } catch {
      // Ignored
    }
  }

  stopLocalPreview(): void {
    if (this.localPreviewStream) {
      this.localPreviewStream.getTracks().forEach((t) => t.stop());
      this.localPreviewStream = null;
    }
    if (this.localVideoEl && !this.localVideoTrack) {
      this.localVideoEl.srcObject = null;
    }
  }

  /**
   * Kết nối vào phòng LiveKit của Direct Call
   */
  async connectRoom(serverUrl: string, token: string): Promise<void> {
    await this.disconnectRoom();
    this.stopLocalPreview();

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
        deviceId: this.store.selectedMicId() || undefined,
      },
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720, frameRate: 30 },
        deviceId: this.store.selectedCameraId() || undefined,
      },
    });

    this.room = room;
    this.setupRoomEvents(room);

    await room.connect(serverUrl, token);

    // Xuất bản local tracks
    await this.publishLocalTracks();

    // Gắn các tracks đã tồn tại nếu đối phương đã vào phòng trước
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (pub.track && !pub.isMuted) {
          if (pub.track.kind === Track.Kind.Video) {
            this.remoteVideoTrack = pub.track as RemoteVideoTrack;
            this.store.setRemoteVideoAvailable(true);
            if (this.remoteVideoEl) {
              pub.track.attach(this.remoteVideoEl);
              this.remoteVideoEl.play().catch(() => {});
            }
          } else if (pub.track.kind === Track.Kind.Audio) {
            this.remoteAudioTrack = pub.track as RemoteAudioTrack;
            this.store.setRemoteAudioAvailable(true);
            if (this.remoteAudioEl) {
              pub.track.attach(this.remoteAudioEl);
            }
          }
        }
      }
    }
  }

  private setupRoomEvents(room: Room): void {
    room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Video) {
          this.remoteVideoTrack = track as RemoteVideoTrack;
          this.store.setRemoteVideoAvailable(!pub.isMuted);
          if (this.remoteVideoEl) {
            track.attach(this.remoteVideoEl);
            this.remoteVideoEl.play().catch(() => {});
          }
        } else if (track.kind === Track.Kind.Audio) {
          this.remoteAudioTrack = track as RemoteAudioTrack;
          this.store.setRemoteAudioAvailable(true);
          if (this.remoteAudioEl) {
            track.attach(this.remoteAudioEl);
          } else {
            const attachedEl = track.attach();
            attachedEl.className = 'hidden';
            document.body.appendChild(attachedEl);
          }
          void room.startAudio().catch(() => {});
        }
      },
    );

    room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video) {
          this.remoteVideoTrack = null;
          this.store.setRemoteVideoAvailable(false);
          if (this.remoteVideoEl) {
            track.detach(this.remoteVideoEl);
          }
        } else if (track.kind === Track.Kind.Audio) {
          this.remoteAudioTrack = null;
          this.store.setRemoteAudioAvailable(false);
          if (this.remoteAudioEl) {
            track.detach(this.remoteAudioEl);
          }
        }
      },
    );

    room.on(RoomEvent.TrackMuted, (pub: TrackPublication) => {
      if (pub.kind === Track.Kind.Video) {
        this.store.setRemoteVideoAvailable(false);
      } else if (pub.kind === Track.Kind.Audio) {
        this.store.setRemoteAudioAvailable(false);
      }
    });

    room.on(RoomEvent.TrackUnmuted, (pub: TrackPublication) => {
      if (pub.kind === Track.Kind.Video) {
        if (pub.track) {
          this.remoteVideoTrack = pub.track as RemoteVideoTrack;
          this.store.setRemoteVideoAvailable(true);
          if (this.remoteVideoEl) {
            pub.track.attach(this.remoteVideoEl);
            this.remoteVideoEl.play().catch(() => {});
          }
        }
      } else if (pub.kind === Track.Kind.Audio) {
        if (pub.track) {
          this.remoteAudioTrack = pub.track as RemoteAudioTrack;
          this.store.setRemoteAudioAvailable(true);
          if (this.remoteAudioEl) {
            pub.track.attach(this.remoteAudioEl);
          }
          void room.startAudio().catch(() => {});
        }
      }
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const myId = room.localParticipant.identity;
      const amISpeaking = speakers.some((s) => s.identity === myId);
      const isRemoteSpeaking = speakers.some((s) => s.identity !== myId);
      this.store.setSpeaking(amISpeaking);
      this.store.setRemoteSpeaking(isRemoteSpeaking);
    });

    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      if (state === ConnectionState.Reconnecting) {
        this.store.setReconnecting();
      } else if (state === ConnectionState.Connected) {
        this.store.setConnected();
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      this.cleanupAllTracks();
    });
  }

  private async publishLocalTracks(): Promise<void> {
    if (!this.room) return;

    // 1. Audio Track
    if (!this.store.isAudioMuted()) {
      try {
        const audioMicId = this.store.selectedMicId() || undefined;
        this.localAudioTrack = await createLocalAudioTrack({
          deviceId: audioMicId,
          echoCancellation: true,
          noiseSuppression: true,
        });
        await this.room.localParticipant.publishTrack(this.localAudioTrack);
      } catch (err: any) {
        console.warn('Không thể xuất bản local audio track:', err);
      }
    }

    // 2. Video Track (nếu initialMode là video và video không bị mute)
    if (this.store.initialMode() === 'video' && !this.store.isVideoMuted()) {
      try {
        const camId = this.store.selectedCameraId() || undefined;
        this.localVideoTrack = await createLocalVideoTrack({
          deviceId: camId,
          resolution: { width: 1280, height: 720, frameRate: 30 },
        });
        await this.room.localParticipant.publishTrack(this.localVideoTrack);
        if (this.localVideoEl) {
          this.localVideoTrack.attach(this.localVideoEl);
        }
      } catch (err: any) {
        console.warn('Không thể xuất bản local video track:', err);
        this.store.setVideoMuted(true);
      }
    }
  }

  /**
   * Bật/Tắt Microphone
   */
  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    this.store.setAudioMuted(!enabled);
    if (!this.room) return;

    if (enabled) {
      if (this.localAudioTrack) {
        await this.localAudioTrack.unmute();
      } else {
        try {
          const micId = this.store.selectedMicId() || undefined;
          this.localAudioTrack = await createLocalAudioTrack({ deviceId: micId });
          await this.room.localParticipant.publishTrack(this.localAudioTrack);
        } catch (err: any) {
          console.warn('Lỗi bật micro:', err);
        }
      }
    } else {
      if (this.localAudioTrack) {
        await this.localAudioTrack.mute();
      }
    }
  }

  /**
   * Bật/Tắt Camera
   */
  async setCameraEnabled(enabled: boolean): Promise<void> {
    this.store.setVideoMuted(!enabled);
    if (!this.room) return;

    if (enabled) {
      if (this.localVideoTrack) {
        await this.localVideoTrack.unmute();
        if (this.localVideoEl) {
          this.localVideoTrack.attach(this.localVideoEl);
          this.localVideoEl.play().catch(() => {});
        }
      } else {
        try {
          const camId = this.store.selectedCameraId() || undefined;
          this.localVideoTrack = await createLocalVideoTrack({
            deviceId: camId,
            resolution: { width: 1280, height: 720, frameRate: 30 },
          });
          await this.room.localParticipant.publishTrack(this.localVideoTrack);
          if (this.localVideoEl) {
            this.localVideoTrack.attach(this.localVideoEl);
            this.localVideoEl.play().catch(() => {});
          }
        } catch (err: any) {
          console.warn('Lỗi bật camera:', err);
          this.store.setVideoMuted(true);
        }
      }
    } else {
      if (this.localVideoTrack) {
        // Tắt hoàn toàn track và stop hardware để đèn camera tắt
        await this.room.localParticipant.unpublishTrack(this.localVideoTrack);
        this.localVideoTrack.stop();
        if (this.localVideoEl) {
          this.localVideoTrack.detach(this.localVideoEl);
        }
        this.localVideoTrack = null;
      }
    }
  }

  /**
   * Chọn thiết bị Audio Output (Loa/Tai nghe)
   */
  async setAudioOutput(deviceId: string): Promise<void> {
    this.store.setSpeakerId(deviceId);
    if (this.remoteAudioEl && typeof (this.remoteAudioEl as any).setSinkId === 'function') {
      try {
        await (this.remoteAudioEl as any).setSinkId(deviceId);
      } catch (err) {
        console.warn('Lỗi đổi audio output sink:', err);
      }
    }
  }

  attachLocalVideo(element: HTMLVideoElement): void {
    this.localVideoEl = element;
    if (this.localVideoTrack) {
      this.localVideoTrack.attach(element);
      element.play().catch(() => {});
    } else if (this.localPreviewStream) {
      element.srcObject = this.localPreviewStream;
      element.play().catch(() => {});
    }
  }

  attachRemoteVideo(element: HTMLVideoElement): void {
    this.remoteVideoEl = element;
    if (this.remoteVideoTrack) {
      this.remoteVideoTrack.attach(element);
      element.play().catch(() => {});
    }
  }

  attachRemoteAudio(element: HTMLAudioElement): void {
    this.remoteAudioEl = element;
    if (this.remoteAudioTrack) {
      this.remoteAudioTrack.attach(element);
    }
  }

  /**
   * Ngắt kết nối phòng và giải phóng triệt để toàn bộ phần cứng Media
   */
  async disconnectRoom(): Promise<void> {
    if (this.room) {
      try {
        await this.room.disconnect();
      } catch {
        // Ignored
      }
      this.room = null;
    }
    this.cleanupAllTracks();
  }

  cleanupAllTracks(): void {
    this.stopLocalPreview();

    if (this.localVideoTrack) {
      try {
        this.localVideoTrack.stop();
        if (this.localVideoEl) {
          this.localVideoTrack.detach(this.localVideoEl);
        }
      } catch {}
      this.localVideoTrack = null;
    }

    if (this.localAudioTrack) {
      try {
        this.localAudioTrack.stop();
      } catch {}
      this.localAudioTrack = null;
    }

    if (this.remoteVideoTrack && this.remoteVideoEl) {
      try {
        this.remoteVideoTrack.detach(this.remoteVideoEl);
      } catch {}
      this.remoteVideoTrack = null;
    }

    if (this.remoteAudioTrack && this.remoteAudioEl) {
      try {
        this.remoteAudioTrack.detach(this.remoteAudioEl);
      } catch {}
      this.remoteAudioTrack = null;
    }

    if (this.localVideoEl) {
      this.localVideoEl.srcObject = null;
    }
    if (this.remoteVideoEl) {
      this.remoteVideoEl.srcObject = null;
    }
    if (this.remoteAudioEl) {
      this.remoteAudioEl.srcObject = null;
    }
  }
}
