import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { MessagesApiService } from './messages-api.service';

describe('MessagesApiService', () => {
  let service: MessagesApiService;
  let httpMock: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let authMock: { accessToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    httpMock = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    authMock = {
      accessToken: vi.fn().mockReturnValue('mock-token'),
    };

    TestBed.configureTestingModule({
      providers: [
        MessagesApiService,
        { provide: HttpClient, useValue: httpMock },
        { provide: AuthService, useValue: authMock },
      ],
    });

    service = TestBed.inject(MessagesApiService);
  });

  it('gọi GET /api/conversations/:id/messages với cursor pagination params', async () => {
    httpMock.get.mockReturnValue(of({ messages: [], hasMore: false }));

    await service.getMessages('conv-1', { limit: 30, before: '1000' });

    expect(httpMock.get).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations/conv-1/messages',
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
      }),
    );
  });

  it('gọi POST /api/conversations/:id/messages để gửi tin nhắn', async () => {
    const mockCreated = { id: '101', content: 'hello' };
    httpMock.post.mockReturnValue(of(mockCreated));

    const res = await service.sendMessage('conv-1', {
      content: 'hello',
      clientNonce: 'nonce-123',
    });

    expect(httpMock.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations/conv-1/messages',
      { content: 'hello', clientNonce: 'nonce-123' },
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
      }),
    );
    expect(res).toEqual(mockCreated);
  });

  it('gửi file đính kèm bằng multipart FormData khi có files', async () => {
    const mockCreated = {
      id: '102',
      content: 'attached',
      attachments: [{ id: 'a1', filename: 'test.png' }],
    };
    httpMock.post.mockReturnValue(of(mockCreated));

    const dummyFile = new File(['123'], 'test.png', { type: 'image/png' });
    const res = await service.sendMessage('conv-1', {
      content: 'attached',
      files: [dummyFile],
    });

    expect(httpMock.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations/conv-1/messages',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
      }),
    );
    expect(res).toEqual(mockCreated);
  });

  it('gọi PATCH /api/messages/:id để sửa tin nhắn', async () => {
    httpMock.patch.mockReturnValue(of({ id: '101', content: 'edited' }));

    const res = await service.editMessage('101', { content: 'edited' });

    expect(httpMock.patch).toHaveBeenCalledWith(
      'http://localhost:3000/api/messages/101',
      { content: 'edited' },
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
      }),
    );
    expect(res.content).toBe('edited');
  });

  it('gọi DELETE /api/messages/:id để xoá tin nhắn', async () => {
    httpMock.delete.mockReturnValue(of({ id: '101', deleted: true }));

    const res = await service.deleteMessage('101');

    expect(httpMock.delete).toHaveBeenCalledWith(
      'http://localhost:3000/api/messages/101',
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
      }),
    );
    expect(res.deleted).toBe(true);
  });

  it('gọi POST /api/conversations/:id/read với messageId dạng string', async () => {
    httpMock.post.mockReturnValue(of({ success: true, updated: true, lastReadMessageId: '101' }));

    const res = await service.markAsRead('conv-1', '101');

    expect(httpMock.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations/conv-1/read',
      { messageId: '101' },
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
      }),
    );
    expect(res.success).toBe(true);
  });

  it('gọi GET /api/conversations/:id/attachments/:attId/signed-url để lấy signed URL mới', async () => {
    httpMock.get.mockReturnValue(of({ signedUrl: 'https://storage.supabase.co/signed/new.png' }));

    const res = await service.getAttachmentSignedUrl('conv-1', 'att-1');

    expect(httpMock.get).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations/conv-1/attachments/att-1/signed-url',
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
      }),
    );
    expect(res.signedUrl).toBe('https://storage.supabase.co/signed/new.png');
  });
});
