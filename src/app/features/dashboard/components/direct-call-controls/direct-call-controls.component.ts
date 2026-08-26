import { Component, HostListener, computed, inject, signal } from '@angular/core';
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
      <!-- 1. Microphone Toggle & Device Menu (Unified Split Capsule) -->
      <div class="split-capsule" [class.muted]="store.isAudioMuted()" [class.active]="!store.isAudioMuted()">
        <button
          type="button"
          class="capsule-main-btn"
          (click)="onToggleAudio()"
          [title]="store.isAudioMuted() ? 'Bật Micro' : 'Tắt Micro'"
        >
          <span class="material-icons btn-icon">
            {{ store.isAudioMuted() ? 'mic_off' : 'mic' }}
          </span>
        </button>
        <div class="capsule-divider"></div>
        <button
          type="button"
          class="capsule-chevron-btn"
          [class.open]="showMicMenu()"
          (click)="toggleMicMenu()"
          title="Chọn Microphone"
        >
          <span class="material-icons chevron-icon">expand_less</span>
        </button>

        @if (showMicMenu()) {
          <div class="device-popover" (mouseleave)="showMicMenu.set(false)">
            <div class="popover-header">
              <span class="material-icons popover-header-icon">mic</span>
              <span>Chọn Microphone</span>
            </div>
            <div class="popover-list">
              @for (device of deviceService.audioInputs(); track device.deviceId) {
                <button
                  type="button"
                  class="device-item"
                  [class.selected]="store.selectedMicId() === device.deviceId"
                  (click)="onSelectMic(device.deviceId)"
                >
                  <span class="material-icons check-icon">
                    {{ store.selectedMicId() === device.deviceId ? 'check' : 'radio_button_unchecked' }}
                  </span>
                  <span class="device-label">{{ device.label || 'Microphone ' + ($index + 1) }}</span>
                </button>
              }
            </div>
          </div>
        }
      </div>

      <!-- 2. Camera Toggle & Device Menu (Unified Split Capsule) -->
      <div class="split-capsule" [class.muted]="store.isVideoMuted()" [class.active]="!store.isVideoMuted()">
        <button
          type="button"
          class="capsule-main-btn"
          (click)="onToggleVideo()"
          [title]="store.isVideoMuted() ? 'Bật Camera' : 'Tắt Camera'"
        >
          <span class="material-icons btn-icon">
            {{ store.isVideoMuted() ? 'videocam_off' : 'videocam' }}
          </span>
        </button>
        <div class="capsule-divider"></div>
        <button
          type="button"
          class="capsule-chevron-btn"
          [class.open]="showCamMenu()"
          (click)="toggleCamMenu()"
          title="Chọn Camera"
        >
          <span class="material-icons chevron-icon">expand_less</span>
        </button>

        @if (showCamMenu()) {
          <div class="device-popover" (mouseleave)="showCamMenu.set(false)">
            <div class="popover-header">
              <span class="material-icons popover-header-icon">videocam</span>
              <span>Chọn Camera</span>
            </div>
            <div class="popover-list">
              @for (device of deviceService.videoInputs(); track device.deviceId) {
                <button
                  type="button"
                  class="device-item"
                  [class.selected]="store.selectedCameraId() === device.deviceId"
                  (click)="onSelectCam(device.deviceId)"
                >
                  <span class="material-icons check-icon">
                    {{ store.selectedCameraId() === device.deviceId ? 'check' : 'radio_button_unchecked' }}
                  </span>
                  <span class="device-label">{{ device.label || 'Camera ' + ($index + 1) }}</span>
                </button>
              }
            </div>
          </div>
        }
      </div>

      <!-- 3. Speaker Select Menu -->
      <div class="standalone-group">
        <button
          type="button"
          class="standalone-btn"
          [class.active]="showSpeakerMenu()"
          (click)="toggleSpeakerMenu()"
          title="Chọn thiết bị Loa"
        >
          <span class="material-icons btn-icon">volume_up</span>
        </button>

        @if (showSpeakerMenu()) {
          <div class="device-popover" (mouseleave)="showSpeakerMenu.set(false)">
            <div class="popover-header">
              <span class="material-icons popover-header-icon">volume_up</span>
              <span>Chọn Loa / Tai nghe</span>
            </div>
            <div class="popover-list">
              @for (device of deviceService.audioOutputs(); track device.deviceId) {
                <button
                  type="button"
                  class="device-item"
                  [class.selected]="store.selectedSpeakerId() === device.deviceId"
                  (click)="onSelectSpeaker(device.deviceId)"
                >
                  <span class="material-icons check-icon">
                    {{ store.selectedSpeakerId() === device.deviceId ? 'check' : 'radio_button_unchecked' }}
                  </span>
                  <span class="device-label">{{ device.label || 'Loa ' + ($index + 1) }}</span>
                </button>
              }
            </div>
          </div>
        }
      </div>

      <!-- 4. Fullscreen Window Toggle -->
      <button
        type="button"
        class="standalone-btn"
        [class.active]="isFullscreen()"
        (click)="toggleFullscreen()"
        [title]="isFullscreen() ? 'Thu nhỏ cửa sổ (Esc)' : 'Toàn màn hình'"
      >
        <span class="material-icons btn-icon">
          {{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}
        </span>
      </button>

      <!-- 5. Video Fit Mode Toggle (Cover / Contain) -->
      @if (store.isRemoteVideoAvailable()) {
        <button
          type="button"
          class="standalone-btn"
          (click)="store.toggleRemoteVideoFit()"
          [title]="store.remoteVideoFit() === 'cover' ? 'Xem vừa khung (Contain)' : 'Xem lấp đầy (Cover)'"
        >
          <span class="material-icons btn-icon">
            {{ store.remoteVideoFit() === 'cover' ? 'fit_screen' : 'crop_free' }}
          </span>
        </button>
      }

      <!-- 6. Duration Display (Only when connected) -->
      @if (store.isConnected() && store.activeCall()?.connectedAt) {
        <div class="duration-display">
          <div class="live-pulse-dot"></div>
          <span class="duration-text">{{ formattedDuration() }}</span>
        </div>
      }

      <!-- 7. End Call Button -->
      <button
        type="button"
        class="end-call-btn"
        (click)="onEndCall()"
        title="Kết thúc cuộc gọi"
      >
        <span class="material-icons end-icon">call_end</span>
      </button>
    </nav>
  `,
  styles: [
    `
      .call-controls-bar {
        position: absolute;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.5rem 0.75rem;
        background: rgba(15, 18, 28, 0.82);
        backdrop-filter: blur(28px) saturate(180%);
        -webkit-backdrop-filter: blur(28px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 28px;
        box-shadow:
          0 20px 50px rgba(0, 0, 0, 0.65),
          0 0 0 1px rgba(255, 255, 255, 0.04),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        z-index: 100;
        user-select: none;
        transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 1;
      }

      :host.hidden-controls .call-controls-bar,
      .call-controls-bar.hidden-controls {
        opacity: 0;
        transform: translate(-50%, 20px);
        pointer-events: none;
      }

      /* Split Capsule Buttons for Mic / Camera */
      .split-capsule {
        position: relative;
        display: inline-flex;
        align-items: center;
        height: 44px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 22px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .split-capsule:hover {
        background: rgba(255, 255, 255, 0.13);
        border-color: rgba(255, 255, 255, 0.18);
      }

      .split-capsule.active {
        background: rgba(255, 255, 255, 0.08);
        color: #f3f4f6;
      }

      .split-capsule.muted {
        background: rgba(239, 68, 68, 0.18);
        border-color: rgba(239, 68, 68, 0.35);
        color: #f87171;
      }

      .split-capsule.muted:hover {
        background: rgba(239, 68, 68, 0.28);
        border-color: rgba(239, 68, 68, 0.5);
      }

      .capsule-main-btn {
        height: 100%;
        padding: 0 0.75rem 0 0.875rem;
        background: transparent;
        border: none;
        color: inherit;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 22px 0 0 22px;
        transition: opacity 0.15s ease;
      }

      .capsule-main-btn:hover {
        opacity: 0.85;
      }

      .capsule-divider {
        width: 1px;
        height: 20px;
        background: rgba(255, 255, 255, 0.12);
        flex-shrink: 0;
      }

      .split-capsule.muted .capsule-divider {
        background: rgba(239, 68, 68, 0.3);
      }

      .capsule-chevron-btn {
        height: 100%;
        padding: 0 0.5rem 0 0.375rem;
        background: transparent;
        border: none;
        color: inherit;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 0 22px 22px 0;
        transition: all 0.2s ease;
        opacity: 0.7;
      }

      .capsule-chevron-btn:hover,
      .capsule-chevron-btn.open {
        opacity: 1;
        background: rgba(255, 255, 255, 0.08);
      }

      .chevron-icon {
        font-size: 18px;
        transition: transform 0.2s ease;
      }

      .capsule-chevron-btn.open .chevron-icon {
        transform: rotate(180deg);
      }

      /* Standalone Round Buttons (Speaker, Fit screen) */
      .standalone-group {
        position: relative;
        display: inline-flex;
        align-items: center;
      }

      .standalone-btn {
        width: 44px;
        height: 44px;
        border-radius: 22px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.08);
        color: #f3f4f6;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .standalone-btn:hover,
      .standalone-btn.active {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.2);
        color: #ffffff;
        transform: translateY(-1px);
      }

      .btn-icon {
        font-size: 20px;
      }

      /* Device Selector Popover (Dark Glassmorphism) */
      .device-popover {
        position: absolute;
        bottom: 56px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(20, 24, 38, 0.96);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        padding: 0.625rem;
        min-width: 240px;
        max-width: 320px;
        box-shadow:
          0 16px 40px rgba(0, 0, 0, 0.7),
          0 0 0 1px rgba(255, 255, 255, 0.06);
        z-index: 120;
        animation: popover-fade 0.15s ease-out;
      }

      @keyframes popover-fade {
        from {
          opacity: 0;
          transform: translate(-50%, 6px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }

      .popover-header {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #9ca3af;
        padding: 0.25rem 0.5rem 0.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        margin-bottom: 0.375rem;
      }

      .popover-header-icon {
        font-size: 14px;
        color: #818cf8;
      }

      .popover-list {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        max-height: 200px;
        overflow-y: auto;
      }

      .device-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.625rem;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: #d1d5db;
        font-size: 0.8125rem;
        cursor: pointer;
        text-align: left;
        transition: all 0.15s ease;
      }

      .device-item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }

      .device-item.selected {
        background: rgba(99, 102, 241, 0.2);
        color: #818cf8;
        font-weight: 600;
      }

      .check-icon {
        font-size: 16px;
        color: inherit;
        flex-shrink: 0;
      }

      .device-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Call Duration Indicator */
      .duration-display {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.875rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 20px;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #e5e7eb;
        font-variant-numeric: tabular-nums;
      }

      .live-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 10px #10b981;
        animation: dot-pulse 1.8s infinite;
      }

      @keyframes dot-pulse {
        0%,
        100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.3);
          opacity: 0.7;
        }
      }

      .duration-text {
        letter-spacing: 0.02em;
      }

      /* End Call Button (Bold Glowing Crimson) */
      .end-call-btn {
        width: 48px;
        height: 44px;
        border-radius: 22px;
        border: none;
        background: #ef4444;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow:
          0 4px 16px rgba(239, 68, 68, 0.45),
          0 0 0 1px rgba(255, 255, 255, 0.2) inset;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .end-call-btn:hover {
        background: #dc2626;
        box-shadow:
          0 6px 22px rgba(239, 68, 68, 0.65),
          0 0 0 1px rgba(255, 255, 255, 0.3) inset;
        transform: translateY(-1px) scale(1.05);
      }

      .end-call-btn:active {
        transform: scale(0.96);
      }

      .end-icon {
        font-size: 22px;
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
  readonly isFullscreen = signal<boolean>(false);

  constructor() {
    if (typeof this.deviceService?.enumerateDevices === 'function') {
      void this.deviceService.enumerateDevices();
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen.set(!!document.fullscreenElement);
  }

  toggleFullscreen(): void {
    const stage = (document.querySelector('.direct-call-stage') as HTMLElement) || document.documentElement;
    if (!document.fullscreenElement) {
      if (stage.requestFullscreen) {
        stage.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

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
    void this.deviceService.enumerateDevices();
    this.showMicMenu.update((v) => !v);
    this.showCamMenu.set(false);
    this.showSpeakerMenu.set(false);
  }

  toggleCamMenu(): void {
    void this.deviceService.enumerateDevices();
    this.showCamMenu.update((v) => !v);
    this.showMicMenu.set(false);
    this.showSpeakerMenu.set(false);
  }

  toggleSpeakerMenu(): void {
    void this.deviceService.enumerateDevices();
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
