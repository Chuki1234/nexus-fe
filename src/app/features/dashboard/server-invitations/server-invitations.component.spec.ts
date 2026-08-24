import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectServerInvitationDto } from '../../../../shared/dto/server-invitations.dto';
import { ServerInvitationsStore } from '../../../core/servers/server-invitations.store';
import { ToastService } from '../../../core/toast/toast.service';
import { ServerInvitationsComponent } from './server-invitations.component';

describe('ServerInvitationsComponent', () => {
  let component: ServerInvitationsComponent;
  let storeMock: any;
  let routerMock: any;
  let toastMock: any;

  const mockInvitation: DirectServerInvitationDto = {
    id: 'inv-123',
    serverId: 'srv-123',
    serverName: 'Guild Nexus',
    serverIconUrl: null,
    inviterId: 'u-1',
    inviterDisplayName: 'Bob',
    inviterUsername: 'bob',
    inviterAvatarUrl: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    storeMock = {
      pendingInvitations: vi.fn().mockReturnValue([mockInvitation]),
      pendingCount: vi.fn().mockReturnValue(1),
      isLoading: vi.fn().mockReturnValue(false),
      hydrateInvitations: vi.fn().mockResolvedValue(undefined),
      acceptInvitation: vi.fn().mockResolvedValue({ success: true, serverId: 'srv-123', alreadyMember: false }),
      declineInvitation: vi.fn().mockResolvedValue({ success: true }),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    toastMock = {
      show: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ServerInvitationsComponent,
        { provide: ServerInvitationsStore, useValue: storeMock },
        { provide: Router, useValue: routerMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    component = TestBed.inject(ServerInvitationsComponent);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('hydrates invitations on init', async () => {
    await component.ngOnInit();
    expect(storeMock.hydrateInvitations).toHaveBeenCalled();
  });

  it('accepts invitation and shows success toast with action', async () => {
    await component.onAccept(mockInvitation);

    expect(storeMock.acceptInvitation).toHaveBeenCalledWith('inv-123');
    expect(toastMock.show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Guild Nexus'),
        action: 'Mở máy chủ',
        type: 'success',
      }),
    );
  });

  it('declines invitation and shows toast', async () => {
    await component.onDecline(mockInvitation);

    expect(storeMock.declineInvitation).toHaveBeenCalledWith('inv-123');
    expect(toastMock.show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Guild Nexus'),
        type: 'info',
      }),
    );
  });

  it('formats remaining expiry properly', () => {
    const futureDate = new Date(Date.now() + 2 * 86400000 + 60000).toISOString();
    expect(component.formatExpiresAt(futureDate)).toContain('2 ngày');

    const pastDate = new Date(Date.now() - 10000).toISOString();
    expect(component.formatExpiresAt(pastDate)).toBe('Đã hết hạn');
  });
});
