import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { io } from 'socket.io-client';
import { AuthService } from '../auth/auth.service';
import { ChatSocketService } from './chat-socket.service';

vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}));

describe('ChatSocketService', () => {
  let service: ChatSocketService;
  let authMock: { isAuthenticated: any; accessToken: any };
  let mockSocket: any;

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    mockSocket = {
      connected: true,
      auth: { token: 'jwt-token-123' },
      on: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
    };

    vi.mocked(io).mockReturnValue(mockSocket);

    authMock = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      accessToken: vi.fn().mockReturnValue('jwt-token-123'),
    };

    TestBed.configureTestingModule({
      providers: [
        ChatSocketService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authMock },
      ],
    });

    service = TestBed.inject(ChatSocketService);
  });

  afterEach(() => {
    service?.disconnect();
  });

  it('khởi tạo kết nối Socket.IO với namespace /chat và auth credential', () => {
    service.connect('jwt-token-123');

    expect(io).toHaveBeenCalledWith(
      'http://localhost:3000/chat',
      expect.objectContaining({
        auth: { token: 'jwt-token-123' },
      }),
    );
  });

  it('token refresh cập nhật auth token mà không tạo thêm socket instance', () => {
    vi.mocked(io).mockClear();
    service.connect('jwt-token-old');
    expect(io).toHaveBeenCalledTimes(1);

    service.updateToken('jwt-token-new');
    expect(mockSocket.auth).toEqual({ token: 'jwt-token-new' });
    expect(io).toHaveBeenCalledTimes(1);
  });

  it('logout dọn dẹp listeners, ngắt kết nối và xóa activeConversationId', () => {
    service.connect('jwt-token-123');
    void service.joinConversation('conv-100');

    service.disconnect();

    expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(service.connectionStatus()).toBe('disconnected');

    // Sau khi reconnect không tự động rejoin room của tài khoản cũ
    mockSocket.emit.mockClear();
    service.connect('jwt-token-new-user');
    const connectCallback = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect',
    )?.[1];
    connectCallback?.();

    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      'conversation:join',
      expect.objectContaining({ conversationId: 'conv-100' }),
      expect.any(Function),
    );
  });

  it('gửi conversation:join và nhận acknowledgment thành công', async () => {
    mockSocket.emit.mockImplementation((event: string, payload: any, cb: any) => {
      if (event === 'conversation:join') {
        cb({ success: true, status: 'joined' });
      }
    });

    service.connect('jwt-token-123');
    const res = await service.joinConversation('conv-100');

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'conversation:join',
      { conversationId: 'conv-100' },
      expect.any(Function),
    );
    expect(res.success).toBe(true);
    expect(res.status).toBe('joined');
  });

  it('gửi conversation:leave khi gọi leaveConversation', () => {
    service.connect('jwt-token-123');
    service.leaveConversation('conv-100');

    expect(mockSocket.emit).toHaveBeenCalledWith('conversation:leave', {
      conversationId: 'conv-100',
    });
  });

  it('gửi typing:start và typing:stop', () => {
    service.connect('jwt-token-123');
    service.startTyping('conv-100');
    service.stopTyping('conv-100');

    expect(mockSocket.emit).toHaveBeenCalledWith('typing:start', {
      conversationId: 'conv-100',
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('typing:stop', {
      conversationId: 'conv-100',
    });
  });

  it('phát tán joinError$ và xóa activeConversationId khi join bị từ chối (không tự rejoin khi reconnect)', async () => {
    mockSocket.emit.mockImplementation((event: string, payload: any, cb: any) => {
      if (event === 'conversation:join') {
        cb({ success: false, error: 'Bạn không phải là thành viên', status: 'rejected' });
      }
    });

    service.connect('jwt-token-123');

    const errorPromise = new Promise<{ conversationId: string; error: string }>(
      (resolve) => {
        service.joinError$.subscribe((err) => resolve(err));
      },
    );

    const res = await service.joinConversation('conv-forbidden');
    const err = await errorPromise;

    expect(res.success).toBe(false);
    expect(res.status).toBe('rejected');
    expect(err.conversationId).toBe('conv-forbidden');
    expect(err.error).toBe('Bạn không phải là thành viên');

    // Sau khi reconnect không tự động rejoin room bị từ chối
    mockSocket.emit.mockClear();
    const connectCallback = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect',
    )?.[1];
    connectCallback?.();

    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      'conversation:join',
      expect.objectContaining({ conversationId: 'conv-forbidden' }),
      expect.any(Function),
    );
  });

  it('xử lý timeout khi join conversation không nhận được ack từ server', async () => {
    mockSocket.emit.mockImplementation(() => {
      // Server không gọi callback
    });

    service.connect('jwt-token-123');
    const res = await service.joinConversation('conv-slow', 50); // 50ms timeout for test

    expect(res.success).toBe(false);
    expect(res.status).toBe('timeout');
    expect(res.error).toBe('Hết thời gian chờ phản hồi join conversation');
  });

  it('trả về trạng thái disconnected khi socket chưa kết nối', async () => {
    mockSocket.connected = false;

    service.connect('jwt-token-123');
    const res = await service.joinConversation('conv-offline');

    expect(res.success).toBe(false);
    expect(res.status).toBe('disconnected');
  });

  it('phát tán sự kiện messageCreated$ khi socket nhận message:created', async () => {
    service.connect('jwt-token-123');

    const messageCallback = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'message:created',
    )?.[1];

    expect(messageCallback).toBeDefined();

    const sampleMessage = {
      id: '101',
      content: 'realtime message',
      conversationId: 'conv-100',
      channelId: null,
      authorId: 'user-1',
      type: 'default' as const,
      replyToId: null,
      clientNonce: null,
      editedAt: null,
      deletedAt: null,
      createdAt: '2026-08-22T10:00:00Z',
    };

    const eventPromise = new Promise<{ message: any }>((resolve) => {
      service.messageCreated$.subscribe((data) => resolve(data));
    });

    messageCallback({ message: sampleMessage });

    const received = await eventPromise;
    expect(received.message).toEqual(sampleMessage);
  });
});
