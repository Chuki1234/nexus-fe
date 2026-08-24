import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import {
  CANONICAL_SERVER_TEMPLATES,
  formatApiError,
  ServersApiService,
} from './servers-api.service';

describe('ServersApiService', () => {
  let service: ServersApiService;
  let httpTesting: HttpTestingController;
  let mockAuthService: { accessToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuthService = {
      accessToken: vi.fn().mockReturnValue('mock-token-123'),
    };

    TestBed.configureTestingModule({
      providers: [
        ServersApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(ServersApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should get templates from backend API', async () => {
    const promise = service.getTemplates();

    const req = httpTesting.expectOne(`${environment.apiUrl}/server-templates`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token-123');

    req.flush(CANONICAL_SERVER_TEMPLATES);

    const result = await promise;
    expect(result).toEqual(CANONICAL_SERVER_TEMPLATES);
  });

  it('should reject promise when getTemplates API fails instead of silent fallback', async () => {
    const promise = service.getTemplates();

    const req = httpTesting.expectOne(`${environment.apiUrl}/server-templates`);
    req.flush('Error', { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toThrow();
  });

  it('should send POST request with templateId to create server', async () => {
    const mockResponse = {
      server: {
        id: 's-1',
        name: 'Máy chủ mới',
        iconUrl: null,
        unread: false,
        mentionCount: 0,
      },
      channels: [
        {
          id: 'c-1',
          name: 'chung',
          type: 'text' as const,
          topic: null,
          unread: false,
          mentionCount: 0,
        },
      ],
    };

    const promise = service.createServer('  Máy chủ mới  ', 'gaming');

    const req = httpTesting.expectOne(`${environment.apiUrl}/servers`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token-123');
    expect(req.request.body).toEqual({
      name: 'Máy chủ mới',
      templateId: 'gaming',
    });

    req.flush(mockResponse);

    const result = await promise;
    expect(result).toEqual(mockResponse);
  });

  it('should send GET request with Authorization Bearer header to list servers', async () => {
    const mockServers = [
      {
        id: 's-1',
        name: 'Máy chủ 1',
        iconUrl: null,
        unread: false,
        mentionCount: 0,
        channels: [
          {
            id: 'c-1',
            name: 'chung',
            type: 'text' as const,
            topic: null,
            unread: false,
            mentionCount: 0,
          },
        ],
      },
    ];

    const promise = service.listServers();

    const req = httpTesting.expectOne(`${environment.apiUrl}/servers`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token-123');

    req.flush(mockServers);

    const result = await promise;
    expect(result).toEqual(mockServers);
  });

  it('should return empty array if no token is available', async () => {
    mockAuthService.accessToken.mockReturnValue(null);

    const result = await service.listServers();
    expect(result).toEqual([]);
    httpTesting.expectNone(`${environment.apiUrl}/servers`);
  });

  it('should send POST request with channel payload to create channel', async () => {
    const mockChannel = {
      id: 'c-new-1',
      name: 'kênh-mới',
      type: 'text' as const,
      topic: 'Chủ đề',
      unread: false,
      mentionCount: 0,
    };

    const promise = service.createChannel('s-1', '  kênh-mới  ', 'text', '  Chủ đề  ');

    const req = httpTesting.expectOne(`${environment.apiUrl}/servers/s-1/channels`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token-123');
    expect(req.request.body).toEqual({
      name: 'kênh-mới',
      type: 'text',
      topic: 'Chủ đề',
    });

    req.flush(mockChannel);

    const result = await promise;
    expect(result).toEqual(mockChannel);
  });


  describe('formatApiError', () => {
    it('should format status 0 as network or CORS blocked error', () => {
      const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
      expect(formatApiError(error)).toContain('CORS');
    });

    it('should format status 401 as session expired error', () => {
      const error = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
      expect(formatApiError(error)).toContain('hết hạn');
    });

    it('should extract validation message for status 400', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: { message: ['Tên máy chủ phải từ 2 đến 100 ký tự'] },
      });
      expect(formatApiError(error)).toBe('Tên máy chủ phải từ 2 đến 100 ký tự');
    });

    it('should extract migration / db message for status 503 or 500', () => {
      const error = new HttpErrorResponse({
        status: 503,
        error: { message: 'Cơ sở dữ liệu chưa sẵn sàng: RPC create_server_with_template chưa được tạo trên Supabase' },
      });
      expect(formatApiError(error)).toContain('RPC create_server_with_template');
    });
  });
});
