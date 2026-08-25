import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CurrentServerCapabilities } from '../../../shared/dto/server-capabilities.dto';
import { AuthService } from '../auth/auth.service';
import { DEFAULT_DENIED_CAPABILITIES, ServerCapabilitiesService } from './server-capabilities.service';

describe('ServerCapabilitiesService', () => {
  let service: ServerCapabilitiesService;
  let httpTesting: HttpTestingController;

  const mockUser = signal<{ id: string } | null>({ id: 'user-1' });

  const authMock = {
    user: mockUser,
    accessToken: () => 'valid-token',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ServerCapabilitiesService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authMock },
      ],
    });

    service = TestBed.inject(ServerCapabilitiesService);
    httpTesting = TestBed.inject(HttpTestingController);
    service.clear();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('returns default denied capabilities when serverId is empty', async () => {
    const caps = await service.load('');
    expect(caps).toEqual(DEFAULT_DENIED_CAPABILITIES);
  });

  it('fetches capabilities from API and updates cache', async () => {
    const mockCaps: CurrentServerCapabilities = {
      isOwner: true,
      canInviteMembers: true,
      canManageServer: true,
      canManageChannels: true,
      canManageRoles: true,
    };

    const promise = service.load('srv-1');

    const req = httpTesting.expectOne(`${environment.apiUrl}/servers/srv-1/capabilities`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-token');
    req.flush(mockCaps);

    const result = await promise;
    expect(result).toEqual(mockCaps);
    expect(service.capabilitiesMap().get('srv-1')).toEqual(mockCaps);
  });

  it('deduplicates concurrent requests for the same serverId', async () => {
    const mockCaps: CurrentServerCapabilities = {
      isOwner: false,
      canInviteMembers: true,
      canManageServer: false,
      canManageChannels: false,
      canManageRoles: false,
    };

    const p1 = service.load('srv-1');
    const p2 = service.load('srv-1');

    const reqs = httpTesting.match(`${environment.apiUrl}/servers/srv-1/capabilities`);
    expect(reqs.length).toBe(1);
    reqs[0].flush(mockCaps);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(mockCaps);
    expect(r2).toEqual(mockCaps);
  });

  it('refresh forces fresh HTTP request bypassing cache', async () => {
    const initialCaps: CurrentServerCapabilities = {
      isOwner: false,
      canInviteMembers: true,
      canManageServer: false,
      canManageChannels: false,
      canManageRoles: false,
    };
    const updatedCaps: CurrentServerCapabilities = {
      ...initialCaps,
      canManageChannels: true,
    };

    // First load
    const p1 = service.load('srv-1');
    httpTesting.expectOne(`${environment.apiUrl}/servers/srv-1/capabilities`).flush(initialCaps);
    await p1;

    // Refresh
    const p2 = service.refresh('srv-1');
    httpTesting.expectOne(`${environment.apiUrl}/servers/srv-1/capabilities`).flush(updatedCaps);
    const refreshed = await p2;

    expect(refreshed).toEqual(updatedCaps);
    expect(service.capabilitiesMap().get('srv-1')).toEqual(updatedCaps);
  });

  it('clears all cached data on clear()', async () => {
    const mockCaps: CurrentServerCapabilities = {
      isOwner: true,
      canInviteMembers: true,
      canManageServer: true,
      canManageChannels: true,
      canManageRoles: true,
    };

    const p = service.load('srv-1');
    httpTesting.expectOne(`${environment.apiUrl}/servers/srv-1/capabilities`).flush(mockCaps);
    await p;

    expect(service.capabilitiesMap().size).toBe(1);

    service.clear();
    expect(service.capabilitiesMap().size).toBe(0);
  });
});
