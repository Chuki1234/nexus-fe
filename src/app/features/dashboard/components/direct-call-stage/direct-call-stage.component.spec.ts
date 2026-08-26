import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DirectCallStageComponent } from './direct-call-stage.component';
import { DirectCallStore } from '../../../../core/calls/direct-call.store';
import { DirectCallCoordinatorService } from '../../../../core/calls/direct-call-coordinator.service';
import { DirectCallMediaService } from '../../../../core/calls/direct-call-media.service';
import { MediaDeviceService } from '../../../voice/services/media-device.service';
import { signal } from '@angular/core';

describe('DirectCallStageComponent', () => {
  let component: DirectCallStageComponent;
  let fixture: ComponentFixture<DirectCallStageComponent>;
  let mockStore: any;
  let mockCoordinator: any;
  let mockMedia: any;
  let mockDevice: any;

  beforeEach(async () => {
    mockStore = {
      showStage: () => true,
      remoteParticipant: () => ({ id: 'u2', displayName: 'Friend Name', username: 'friend' }),
      callState: () => 'connected',
      isRemoteVideoAvailable: () => false,
      isRemoteSpeaking: () => false,
      isRemoteCameraOff: () => false,
      isAudioMuted: () => false,
      isVideoMuted: () => false,
      isSpeakerMuted: () => false,
      selectedMicId: () => null,
      selectedCameraId: () => null,
      selectedSpeakerId: () => null,
      selfViewCorner: () => 'bottom-right',
      isSelfViewMirrored: () => true,
      remoteVideoFit: () => 'cover',
      isConnected: () => true,
      activeCall: () => ({ connectedAt: '2026-08-25T10:00:00Z' }),
      callDurationSeconds: () => 45,
    };

    mockCoordinator = {
      endCall: vi.fn(),
      cancelCall: vi.fn(),
    };

    mockMedia = {
      attachRemoteVideo: vi.fn(),
      attachRemoteAudio: vi.fn(),
      attachLocalVideo: vi.fn(),
      setMicrophoneEnabled: vi.fn(),
      setCameraEnabled: vi.fn(),
      setAudioOutput: vi.fn(),
    };

    mockDevice = {
      audioInputs: signal([]),
      videoInputs: signal([]),
      audioOutputs: signal([]),
      enumerateDevices: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [DirectCallStageComponent],
      providers: [
        { provide: DirectCallStore, useValue: mockStore },
        { provide: DirectCallCoordinatorService, useValue: mockCoordinator },
        { provide: DirectCallMediaService, useValue: mockMedia },
        { provide: MediaDeviceService, useValue: mockDevice },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectCallStageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders remote participant name and connected status', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.header-name')?.textContent).toContain('Friend Name');
    expect(compiled.querySelector('.header-status')?.textContent).toContain('Đã kết nối');
  });
});
