import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingCallOverlayComponent } from './incoming-call-overlay.component';
import { DirectCallStore } from '../../../../core/calls/direct-call.store';
import { DirectCallCoordinatorService } from '../../../../core/calls/direct-call-coordinator.service';
import type { DirectCallDto } from '../../../../../shared/dto/direct-calls.dto';

describe('IncomingCallOverlayComponent', () => {
  let component: IncomingCallOverlayComponent;
  let fixture: ComponentFixture<IncomingCallOverlayComponent>;
  let mockStore: any;
  let mockCoordinator: any;

  const mockCall: DirectCallDto = {
    id: 'call-1',
    conversationId: 'conv-1',
    caller: { id: 'u1', username: 'caller', displayName: 'Caller Test', avatarUrl: null },
    callee: { id: 'u2', username: 'callee', displayName: 'Callee Test', avatarUrl: null },
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

  beforeEach(async () => {
    mockStore = {
      activeCall: () => mockCall,
      initialMode: () => 'video',
      showIncomingOverlay: () => true,
    };

    mockCoordinator = {
      answerCall: vi.fn(),
      declineCall: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [IncomingCallOverlayComponent],
      providers: [
        { provide: DirectCallStore, useValue: mockStore },
        { provide: DirectCallCoordinatorService, useValue: mockCoordinator },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomingCallOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders caller display name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.caller-name')?.textContent).toContain('Caller Test');
  });

  it('calls coordinator.answerCall when accept clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const acceptBtn = compiled.querySelector('.accept-btn') as HTMLButtonElement;
    acceptBtn.click();
    expect(mockCoordinator.answerCall).toHaveBeenCalled();
  });

  it('calls coordinator.declineCall when decline clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const declineBtn = compiled.querySelector('.decline-btn') as HTMLButtonElement;
    declineBtn.click();
    expect(mockCoordinator.declineCall).toHaveBeenCalled();
  });
});
