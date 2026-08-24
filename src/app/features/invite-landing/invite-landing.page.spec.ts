import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerInvitePreviewDto } from '../../../shared/dto/server-invitations.dto';
import { ServersApiService } from '../../core/api/servers-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ChatSocketService } from '../../core/realtime/chat-socket.service';
import { ServerCapabilitiesService } from '../../core/servers/server-capabilities.service';
import { ServersStore } from '../../core/servers/servers.store';
import { ToastService } from '../../core/toast/toast.service';
import { InviteLandingPage } from './invite-landing.page';

describe('InviteLandingPage', () => {
  let component: InviteLandingPage;
  let serversApiMock: any;
  let authMock: any;
  let serversStore: ServersStore;
  let capabilitiesMock: any;
  let chatSocketMock: any;
  let toastMock: any;
  let routerMock: any;
  let routeMock: any;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.sessionStorage.clear();

    serversApiMock = {
      getInvitePreview: vi.fn(),
      joinByInviteCode: vi.fn(),
      listServers: vi.fn().mockResolvedValue([]),
    };

    authMock = {
      isAuthenticated: vi.fn().mockReturnValue(false),
      accessToken: vi.fn().mockReturnValue(null),
    };

    capabilitiesMock = {
      refresh: vi.fn().mockResolvedValue({}),
    };

    chatSocketMock = {
      joinServer: vi.fn().mockResolvedValue(true),
    };

    toastMock = {
      show: vi.fn(),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    routeMock = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('code-abc'),
        },
      },
    };

    TestBed.configureTestingModule({
      providers: [
        InviteLandingPage,
        ServersStore,
        { provide: ServersApiService, useValue: serversApiMock },
        { provide: AuthService, useValue: authMock },
        { provide: ServerCapabilitiesService, useValue: capabilitiesMock },
        { provide: ChatSocketService, useValue: chatSocketMock },
        { provide: ToastService, useValue: toastMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock },
      ],
    });

    serversStore = TestBed.inject(ServersStore);
    component = TestBed.inject(InviteLandingPage);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads valid preview on init', async () => {
    const previewData: ServerInvitePreviewDto = {
      code: 'code-abc',
      serverId: 'srv-1',
      serverName: 'Awesome Server',
      serverIconUrl: 'http://icon.png',
      memberCount: 25,
      channelId: 'chan-1',
      channelName: 'general',
      inviterDisplayName: 'Alice',
      inviterAvatarUrl: null,
      expiresAt: null,
      maxUses: null,
      uses: 0,
      status: 'valid',
      isExpired: false,
      isMaxUsed: false,
    };

    serversApiMock.getInvitePreview.mockResolvedValue(previewData);

    await component.ngOnInit();

    expect(component.loading()).toBe(false);
    expect(component.preview()).toEqual(previewData);
    expect(component.isNotFound()).toBe(false);
    expect(component.alreadyMember()).toBe(false);
  });

  it('marks isNotFound when preview returns 404', async () => {
    serversApiMock.getInvitePreview.mockRejectedValue({ status: 404 });

    await component.ngOnInit();

    expect(component.loading()).toBe(false);
    expect(component.isNotFound()).toBe(true);
  });

  it('handles onLoginToJoin by saving sanitized returnUrl and navigating to /login', () => {
    component.code.set('code-abc');
    component.onLoginToJoin();

    expect(window.sessionStorage.getItem('nexus_return_url')).toBe('/invite/code-abc');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/invite/code-abc' },
    });
  });

  it('detects alreadyMember when user is logged in and server is in ServersStore', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    serversStore.hydrateServers([
      { id: 'srv-1', name: 'Awesome Server', channels: [] },
    ]);

    component.preview.set({
      code: 'code-abc',
      serverId: 'srv-1',
      serverName: 'Awesome Server',
      serverIconUrl: null,
      memberCount: 1,
      status: 'valid',
      isExpired: false,
      isMaxUsed: false,
      expiresAt: null,
      maxUses: null,
      uses: 0,
    });

    expect(component.alreadyMember()).toBe(true);
  });

  it('joins server, fetches canonical data, upserts store, and navigates to target channel', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    component.code.set('code-abc');
    component.preview.set({
      code: 'code-abc',
      serverId: 'srv-1',
      serverName: 'Awesome Server',
      serverIconUrl: null,
      memberCount: 1,
      status: 'valid',
      isExpired: false,
      isMaxUsed: false,
      expiresAt: null,
      maxUses: null,
      uses: 0,
    });

    serversApiMock.joinByInviteCode.mockResolvedValue({
      success: true,
      serverId: 'srv-1',
      channelId: 'chan-1',
      alreadyMember: false,
    });

    serversApiMock.listServers.mockResolvedValue([
      {
        id: 'srv-1',
        name: 'Awesome Server',
        channels: [{ id: 'chan-1', name: 'general', type: 'text' }],
      },
    ]);

    await component.onJoinServer();

    expect(serversStore.getServer('srv-1')?.name).toBe('Awesome Server');
    expect(capabilitiesMock.refresh).toHaveBeenCalledWith('srv-1');
    expect(chatSocketMock.joinServer).toHaveBeenCalledWith('srv-1');
    expect(toastMock.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
    expect(routerMock.navigate).toHaveBeenCalledWith(['/channels', 'srv-1', 'chan-1']);
  });
});
