import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectServerInvitationDto } from '../../../shared/dto/server-invitations.dto';
import { ServersApiService } from '../api/servers-api.service';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { ToastService } from '../toast/toast.service';
import { ServerCapabilitiesService } from './server-capabilities.service';
import { ServerInvitationsStore } from './server-invitations.store';
import { ServersStore } from './servers.store';

describe('ServerInvitationsStore', () => {
  let store: ServerInvitationsStore;
  let serversApiMock: any;
  let serversStore: ServersStore;
  let capabilitiesMock: any;
  let chatSocketMock: any;
  let toastMock: any;
  let routerMock: any;
  let invitationReceived$: Subject<any>;
  let invitationUpdated$: Subject<any>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    invitationReceived$ = new Subject<any>();
    invitationUpdated$ = new Subject<any>();

    serversApiMock = {
      listPendingInvitations: vi.fn().mockResolvedValue([]),
      acceptInvitation: vi.fn().mockResolvedValue({ success: true, serverId: 'srv-100', alreadyMember: false }),
      declineInvitation: vi.fn().mockResolvedValue({ success: true }),
      listServers: vi.fn().mockResolvedValue([]),
    };

    capabilitiesMock = {
      refresh: vi.fn().mockResolvedValue({ isOwner: false, canInviteMembers: true }),
    };

    chatSocketMock = {
      invitationReceived$: invitationReceived$.asObservable(),
      invitationUpdated$: invitationUpdated$.asObservable(),
      joinServer: vi.fn().mockResolvedValue(true),
    };

    toastMock = {
      show: vi.fn(),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ServerInvitationsStore,
        ServersStore,
        { provide: ServersApiService, useValue: serversApiMock },
        { provide: ServerCapabilitiesService, useValue: capabilitiesMock },
        { provide: ChatSocketService, useValue: chatSocketMock },
        { provide: ToastService, useValue: toastMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    serversStore = TestBed.inject(ServersStore);
    store = TestBed.inject(ServerInvitationsStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('hydrates pending invitations from REST API and filters out expired ones', async () => {
    const validInv: DirectServerInvitationDto = {
      id: 'inv-1',
      serverId: 'srv-1',
      serverName: 'Server 1',
      serverIconUrl: null,
      inviterId: 'u-1',
      inviterDisplayName: 'Alice',
      inviterUsername: 'alice',
      inviterAvatarUrl: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    const expiredInv: DirectServerInvitationDto = {
      id: 'inv-2',
      serverId: 'srv-2',
      serverName: 'Server 2',
      serverIconUrl: null,
      inviterId: 'u-2',
      inviterDisplayName: 'Bob',
      inviterUsername: 'bob',
      inviterAvatarUrl: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 10000).toISOString(),
    };

    serversApiMock.listPendingInvitations.mockResolvedValue([validInv, expiredInv]);

    await store.hydrateInvitations();

    expect(store.pendingInvitations().length).toBe(1);
    expect(store.pendingInvitations()[0].id).toBe('inv-1');
    expect(store.pendingCount()).toBe(1);
  });

  it('adds invitation from socket and shows toast notification', () => {
    const sampleInv: DirectServerInvitationDto = {
      id: 'inv-sock',
      serverId: 'srv-sock',
      serverName: 'Realtime Server',
      serverIconUrl: null,
      inviterId: 'u-sock',
      inviterDisplayName: 'Charlie',
      inviterUsername: 'charlie',
      inviterAvatarUrl: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    invitationReceived$.next({ invitation: sampleInv });

    expect(store.pendingInvitations().length).toBe(1);
    expect(store.pendingInvitations()[0].id).toBe('inv-sock');
    expect(toastMock.show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Charlie'),
        action: 'Xem lời mời',
      }),
    );
  });

  it('removes invitation when socket emits invitation-updated event', () => {
    const sampleInv: DirectServerInvitationDto = {
      id: 'inv-update',
      serverId: 'srv-update',
      serverName: 'Test Server',
      serverIconUrl: null,
      inviterId: 'u-1',
      inviterDisplayName: 'Dave',
      inviterUsername: 'dave',
      inviterAvatarUrl: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    store.addInvitation(sampleInv);
    expect(store.pendingCount()).toBe(1);

    invitationUpdated$.next({ invitationId: 'inv-update', status: 'accepted' });
    expect(store.pendingCount()).toBe(0);
  });

  it('accepts direct invitation, fetches canonical servers from REST, and upserts ServersStore', async () => {
    const sampleInv: DirectServerInvitationDto = {
      id: 'inv-acc',
      serverId: 'srv-acc',
      serverName: 'New Joined Server',
      serverIconUrl: 'http://icon.png',
      inviterId: 'u-1',
      inviterDisplayName: 'Eve',
      inviterUsername: 'eve',
      inviterAvatarUrl: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    store.addInvitation(sampleInv);

    serversApiMock.acceptInvitation.mockResolvedValue({
      success: true,
      serverId: 'srv-acc',
      alreadyMember: false,
    });

    serversApiMock.listServers.mockResolvedValue([
      {
        id: 'srv-acc',
        name: 'New Joined Server',
        iconUrl: 'http://icon.png',
        channels: [{ id: 'chan-1', name: 'general', type: 'text', topic: null, unread: false, mentionCount: 0 }],
      },
    ]);

    const res = await store.acceptInvitation('inv-acc');

    expect(res.success).toBe(true);
    expect(store.pendingCount()).toBe(0);
    expect(serversStore.getServer('srv-acc')?.name).toBe('New Joined Server');
    expect(serversStore.getChannels('srv-acc').length).toBe(1);
    expect(capabilitiesMock.refresh).toHaveBeenCalledWith('srv-acc');
    expect(chatSocketMock.joinServer).toHaveBeenCalledWith('srv-acc');
  });

  it('declines invitation and removes it from pending list', async () => {
    const sampleInv: DirectServerInvitationDto = {
      id: 'inv-dec',
      serverId: 'srv-dec',
      serverName: 'Decline Server',
      serverIconUrl: null,
      inviterId: 'u-1',
      inviterDisplayName: 'Eve',
      inviterUsername: 'eve',
      inviterAvatarUrl: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    store.addInvitation(sampleInv);
    expect(store.pendingCount()).toBe(1);

    await store.declineInvitation('inv-dec');
    expect(store.pendingCount()).toBe(0);
  });
});
