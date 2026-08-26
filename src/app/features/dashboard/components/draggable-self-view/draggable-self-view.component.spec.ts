import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DraggableSelfViewComponent } from './draggable-self-view.component';
import { DirectCallStore } from '../../../../core/calls/direct-call.store';
import { DirectCallMediaService } from '../../../../core/calls/direct-call-media.service';

describe('DraggableSelfViewComponent', () => {
  let component: DraggableSelfViewComponent;
  let fixture: ComponentFixture<DraggableSelfViewComponent>;
  let mockStore: any;
  let mockMedia: any;

  beforeEach(async () => {
    mockStore = {
      isVideoMuted: () => false,
      isAudioMuted: () => false,
      selfViewCorner: () => 'bottom-right',
      isSelfViewMirrored: () => true,
      isRemoteVideoAvailable: () => true,
      remoteParticipant: () => ({ displayName: 'Mentor', username: 'mentor' }),
      toggleSelfViewMirror: vi.fn(),
      setSelfViewCorner: vi.fn(),
    };

    mockMedia = {
      attachLocalVideo: vi.fn(),
      attachRemoteVideo: vi.fn(),
      releaseLocalVideo: vi.fn(),
      releaseRemoteVideo: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DraggableSelfViewComponent],
      providers: [
        { provide: DirectCallStore, useValue: mockStore },
        { provide: DirectCallMediaService, useValue: mockMedia },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DraggableSelfViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('attaches local video on init', () => {
    expect(mockMedia.attachLocalVideo).toHaveBeenCalled();
  });

  it('attaches remote video when used as the mini view', () => {
    fixture.componentRef.setInput('source', 'remote');
    fixture.detectChanges();

    expect(mockMedia.attachRemoteVideo).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.corner-label')?.textContent).toContain('Mentor');
  });

  it('emits activate from the swap button', () => {
    const emitted = vi.fn();
    component.activate.subscribe(emitted);

    const button = fixture.nativeElement.querySelector('.overlay-btn--swap') as HTMLButtonElement;
    button.click();

    expect(emitted).toHaveBeenCalledOnce();
  });
});
