import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DirectCallStore } from '../../../../core/calls/direct-call.store';
import { DirectCallCoordinatorService } from '../../../../core/calls/direct-call-coordinator.service';
import { DirectCallMediaService } from '../../../../core/calls/direct-call-media.service';
import { MediaDeviceService } from '../../../voice/services/media-device.service';

@Component({
  selector: 'app-direct-call-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav
      class="call-controls-bar"
      role="toolbar"
      aria-label="Thanh điều khiển cuộc gọi"
    >
      <!-- 1. Microphone Toggle & Device Menu -->
      <div class="control-group">
        <button
          type="button"
          class="control-btn"
          [ngClass]="{ active: !store.isAudioMuted(), muted: store.isAudioMuted() }"
          (click)="onToggleAudio()"
          [title]="store.isAudioMuted() ? 'Bật Micro' : 'Tắt Micro'"
        >
          <span class="material-icons">
            {{ store.isAudioMuted() ? 'mic_off' : 'mic' }}
          </span>
        </button>
        <button
          type="button"
          class="dropdown-arrow-btn"
          (click)="toggleMicMenu()"
          title="Chọn Microphone"
        >
          <span class="material-icons text-xs">arrow_drop_up</span>
        </button>

        @if (showMicMenu()) {
          <div class="device-popover" (mouseleave)="showMicMenu.set(false)">
            <div class="popover-title">Chọn Micro</div>
            @for (device of deviceService.audioInputs(); track device.deviceId) {
              <button
                type="button"
                class="device-item"
                [class.selected]="store.selectedMicId() === device.deviceId"
                (click)="onSelectMic(device.deviceId)"
              >
                <span class="material-icons text-sm">mic</span>
                <span class="device-label">{{ device.label || 'Microphone ' + ($index + 1) }}</span>
              </button>
            }
          </div>
        }
      </div>

      <!-- 2. Camera Toggle & Device Menu -->
      <div class="control-group">
        <button
          type="button"
          class="control-btn"
          [ngClass]="{ active: !store.isVideoMuted(), muted: store.isVideoMuted() }"
          (click)="onToggleVideo()"
          [title]="store.isVideoMuted() ? 'Bật Camera' : 'Tắt Camera'"
        >
          <span class="material-icons">
            {{ store.isVideoMuted() ? 'videocam_off' : 'videocam' }}
          </span>
        </button>
        <button
          type="button"
          class="dropdown-arrow-btn"
          (click)="toggleCamMenu()"
          title="Chọn Camera"
        >
          <span class="material-icons text-xs">arrow_drop_up</span>
        </button>

        @if (showCamMenu()) {
          <div class="device-popover" (mouseleave)="showCamMenu.set(false)">
            <div class="popover-title">Chọn Camera</div>
            @for (device of deviceService.videoInputs(); track device.deviceId) {
              <button
                type="button"
                class="device-item"
                [class.selected]="store.selectedCameraId() === device.deviceId"
                (click)="onSelectCam(device.deviceId)"
              >
                <span class="material-icons text-sm">videocam</span>
                <span class="device-label">{{ device.label || 'Camera ' + ($index + 1) }}</span>
              </button>
            }
          </div>
        }
      </div>

      <!-- 3. Speaker Select Menu -->
      <div class="control-group">
        <button
          type="button"
          class="control-btn"
          [ngClass]="{ active: !store.isSpeakerMuted() }"
          (click)="toggleSpeakerMenu()"
          title="Chọn thiết bị Loa"
        >
          <span class="material-icons">volume_up</span>
        </button>

        @if (showSpeakerMenu()) {
          <div class="device-popover" (mouseleave)="showSpeakerMenu.set(false)">
            <div class="popover-title">Chọn Loa / Tai nghe</div>
            @for (device of deviceService.audioOutputs(); track device.deviceId) {
              <button
                type="button"
                class="device-item"
                [class.selected]="store.selectedSpeakerId() === device.deviceId"
                (click)="onSelectSpeaker(device.deviceId)"
              >
                <span class="material-icons text-sm">volume_up</span>
                <span class="device-label">{{ device.label || 'Loa ' + ($index + 1) }}</span>
              </button>
            }
          </div>
        }
      </div>

      <!-- 4. Video Fit Mode Toggle (Cover / Contain) -->
      @if (store.isRemoteVideoAvailable()) {
        <button
          type="button"
          class="control-btn"
          (click)="store.toggleRemoteVideoFit()"
          [title]="store.remoteVideoFit() === 'cover' ? 'Chuyển sang Xem vừa khung (Contain)' : 'Chuyển sang Lấp đầy (Cover)'"
        >
          <span class="material-icons">
            {{ store.remoteVideoFit() === 'cover' ? 'fit_screen' : 'fullscreen' }}
          </span>
        </button>
      }

      <!-- 5. Duration Display (Only when connected) -->
      @if (store.isConnected() && store.activeCall()?.connectedAt) {
        <div class="duration-display">
          <div class="live-dot"></div>
          <span>{{ formattedDuration() }}</span>
        </div>
      }

      <!-- 6. End Call Button -->
      <button
        type="button"
        class="end-call-btn"
        (click)="onEndCall()"
        title="Kết thúc cuộc gọi"
      >
        <span class="material-icons">call_end</span>
      </button>
    </nav>
  `,
  styles: [
    `
      .call-controls-bar {
        position: absolute;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.25rem;
        background: rgba(18, 20, 29, 0.88);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 9999px;
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
        z-index: 100;
        user-select: none;
      }

      .control-group {
        position: relative;
        display: flex;
        align-items: center;
      }

      .control-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        color: #f3f4f6;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .control-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.05);
      }

      .control-btn.active {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }

      .control-btn.muted {
        background: rgba(255, 68, 85, 0.25);
        color: #ff4455;
      }

      .dropdown-arrow-btn {
        width: 18px;
        height: 28px;
        background: rgba(255, 255, 255, 0.08);
        border: none;
        border-radius: 0 9999px 9999px 0;
        margin-left: -6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .dropdown-arrow-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }

      .device-popover {
        position: absolute;
        bottom: 56px;
        left: 50%;
        transform: translateX(-50%);
        background: #181b28;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        padding: 0.5rem;
        min-width: 220px;
        max-width: 320px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
        z-index: 120;
      }

      .popover-title {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #9ca3af;
        padding: 0.25rem 0.5rem;
        margin-bottom: 0.25rem;
      }

      .device-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background: transparent;
        border: none;
        border-radius: 6px;
        color: #e5e7eb;
        font-size: 0.8125rem;
        cursor: pointer;
        text-align: left;
        transition: background 0.15s ease;
      }

      .device-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .device-item.selected {
        background: rgba(0, 237, 100, 0.15);
        color: #00ed64;
      }

      .device-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .duration-display {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 9999px;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #d1d5db;
        font-variant-numeric: tabular-nums;
      }

      .live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #00ed64;
        box-shadow: 0 0 8px #00ed64;
      }

      .end-call-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        background: #ff4455;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(255, 68, 85, 0.4);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .end-call-btn:hover {
        background: #ff2238;
        transform: scale(1.08);
      }

      .end-call-btn:active {
        transform: scale(0.95);
      }
    `,
  ],
})
export class DirectCallControlsComponent {
  readonly store = inject(DirectCallStore);
  readonly coordinator = inject(DirectCallCoordinatorService);
  readonly mediaService = inject(DirectCallMediaService);
  readonly deviceService = inject(MediaDeviceService);

  readonly showMicMenu = signal<boolean>(false);
  readonly showCamMenu = signal<boolean>(false);
  readonly showSpeakerMenu = signal<boolean>(false);

  readonly formattedDuration = computed(() => {
    const total = this.store.callDurationSeconds();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  onToggleAudio(): void {
    void this.mediaService.setMicrophoneEnabled(this.store.isAudioMuted());
  }

  onToggleVideo(): void {
    void this.mediaService.setCameraEnabled(this.store.isVideoMuted());
  }

  toggleMicMenu(): void {
    this.showMicMenu.update((v) => !v);
    this.showCamMenu.set(false);
    this.showSpeakerMenu.set(false);
  }

  toggleCamMenu(): void {
    this.showCamMenu.update((v) => !v);
    this.showMicMenu.set(false);
    this.showSpeakerMenu.set(false);
  }

  toggleSpeakerMenu(): void {
    this.showSpeakerMenu.update((v) => !v);
    this.showMicMenu.set(false);
    this.showCamMenu.set(false);
  }

  onSelectMic(id: string): void {
    this.store.setMicId(id);
    this.showMicMenu.set(false);
  }

  onSelectCam(id: string): void {
    this.store.setCameraId(id);
    this.showCamMenu.set(false);
  }

  onSelectSpeaker(id: string): void {
    void this.mediaService.setAudioOutput(id);
    this.showSpeakerMenu.set(false);
  }

  onEndCall(): void {
    if (this.store.callState() === 'outgoing_ringing') {
      void this.coordinator.cancelCall();
    } else {
      void this.coordinator.endCall('hangup');
    }
  }
}
