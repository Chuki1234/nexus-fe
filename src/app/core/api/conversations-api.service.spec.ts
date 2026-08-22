import { HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { ConversationsApiService } from './conversations-api.service';

describe('ConversationsApiService', () => {
  let service: ConversationsApiService;
  let httpMock: { get: any; post: any };
  let authMock: { accessToken: any };

  beforeEach(() => {
    httpMock = {
      get: vi.fn(),
      post: vi.fn(),
    };

    authMock = {
      accessToken: vi.fn().mockReturnValue('mock-jwt-token'),
    };

    TestBed.configureTestingModule({
      providers: [
        ConversationsApiService,
        { provide: HttpClient, useValue: httpMock },
        { provide: AuthService, useValue: authMock },
      ],
    });

    service = TestBed.inject(ConversationsApiService);
  });

  it('gọi POST /api/conversations/dm với recipientId và auth header', async () => {
    const mockResponse = {
      id: 'conv-123',
      type: 'dm',
      name: null,
      iconUrl: null,
      unreadCount: 0,
      createdAt: '2026-08-22T10:00:00Z',
    };

    httpMock.post.mockReturnValue(of(mockResponse));

    const res = await service.getOrCreateDm('user-recipient-456');

    expect(httpMock.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations/dm',
      { recipientId: 'user-recipient-456' },
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
      }),
    );
    expect(res).toEqual(mockResponse);
  });

  it('gọi GET /api/conversations để lấy danh sách cuộc trò chuyện', async () => {
    const mockList = [{ id: 'conv-1' }, { id: 'conv-2' }];
    httpMock.get.mockReturnValue(of(mockList));

    const res = await service.listConversations();

    expect(httpMock.get).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations',
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
      }),
    );
    expect(res.length).toBe(2);
  });

  it('gọi GET /api/conversations/:id để lấy chi tiết', async () => {
    const mockDetail = { id: 'conv-100', type: 'dm' };
    httpMock.get.mockReturnValue(of(mockDetail));

    const res = await service.getConversation('conv-100');

    expect(httpMock.get).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations/conv-100',
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
      }),
    );
    expect(res).toEqual(mockDetail);
  });

  it('ném lỗi nếu chưa đăng nhập (không có access token)', () => {
    authMock.accessToken.mockReturnValue(null);

    expect(() => service.listConversations()).toThrow(
      'Bạn cần đăng nhập',
    );
  });
});
