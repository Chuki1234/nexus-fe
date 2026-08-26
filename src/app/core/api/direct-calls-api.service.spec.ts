import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DirectCallsApiService } from './direct-calls-api.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

describe('DirectCallsApiService', () => {
  let service: DirectCallsApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DirectCallsApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            accessToken: () => 'mock-jwt-token',
          },
        },
      ],
    });

    service = TestBed.inject(DirectCallsApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('startCall sends POST request with auth header', async () => {
    const promise = service.startCall({
      conversationId: 'conv-1',
      initialMode: 'video',
      clientSessionId: 'sess-1',
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/direct-calls`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');

    req.flush({ id: 'call-1', status: 'ringing' });
    const result = await promise;
    expect(result.id).toBe('call-1');
  });

  it('answerCall sends POST request to /answer', async () => {
    const promise = service.answerCall('call-1', { clientSessionId: 'sess-1' });

    const req = httpTesting.expectOne(`${environment.apiUrl}/direct-calls/call-1/answer`);
    expect(req.request.method).toBe('POST');

    req.flush({ call: { id: 'call-1', status: 'accepted' }, shouldJoinMedia: true });
    const result = await promise;
    expect(result.shouldJoinMedia).toBe(true);
  });
});
