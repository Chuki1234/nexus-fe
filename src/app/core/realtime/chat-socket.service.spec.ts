import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { CHAT_SOCKET_FACTORY, ChatSocketService } from './chat-socket.service';

const io = vi.fn();

describe('ChatSocketService', () => {
  let service: ChatSocketService;
  const authMock = {
    isAuthenticated: vi.fn().mockReturnValue(true),
    accessToken: vi.fn().mockReturnValue('jwt-token-123'),
    session: vi.fn().mockReturnValue(null),
    whenReady: vi.fn().mockResolvedValue(undefined),
  };
  let mockSocket: any;

  function createFreshMockSocket() {
    return {
      connected: true,
      auth: { token: 'jwt-token-123' },
      io: { on: vi.fn() },
      on: vi.fn(),
      once: vi.fn((event: string, cb: () => void) => {
        if (event === 'connect') cb();
      }),
      off: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
    };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    mockSocket = createFreshMockSocket();
    vi.mocked(io).mockImplementation(() => mockSocket);

    authMock.isAuthenticated.mockReturnValue(true);
    authMock.accessToken.mockReturnValue('jwt-token-123');
    authMock.session.mockReturnValue(null);
    authMock.whenReady.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        ChatSocketService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CHAT_SOCKET_FACTORY, useValue: io },
        { provide: AuthService, useValue: authMock },
      ],
    });

    service = TestBed.inject(ChatSocketService);
    service.disconnect();
    vi.mocked(io).mockClear();
  });

  afterEach(() => {
    service?.disconnect();
    TestBed.resetTestingModule();
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

    const errorPromise = new Promise<any>(
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
    const res = await service.joinConversation('conv-slow', 50);

    expect(res.success).toBe(false);
    expect(res.status).toBe('timeout');
    expect(res.error).toBe('Hết thời gian chờ phản hồi join conversation');
  });

  it('không xóa activeConversationId khi lỗi join là lỗi tạm thời (không phải forbidden/membership)', async () => {
    mockSocket.emit.mockImplementation((event: string, payload: any, cb: any) => {
      if (event === 'conversation:join') {
        cb({ success: false, error: 'Database connection error' });
      }
    });

    service.connect('jwt-token-123');
    const res = await service.joinConversation('conv-temp-error');

    expect(res.success).toBe(false);

    // Khi reconnect, vì không phải lỗi membership/quyền nên socket vẫn tự động rejoin
    mockSocket.emit.mockClear();
    const connectCallback = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect',
    )?.[1];
    connectCallback?.();
    await new Promise((res) => setTimeout(res, 10));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'conversation:join',
      expect.objectContaining({ conversationId: 'conv-temp-error' }),
      expect.any(Function),
    );
  });

  it('khi connect_error do "Chưa xác thực", tự động chờ auth.whenReady và cập nhật token mới vào socket.auth', async () => {
    authMock.accessToken.mockReturnValue('jwt-token-fresh-after-refresh');

    service.connect('jwt-token-expired');

    const connectErrorCallback = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect_error',
    )?.[1];

    expect(connectErrorCallback).toBeDefined();
    await connectErrorCallback(new Error('Chưa xác thực'));

    expect(authMock.whenReady).toHaveBeenCalled();
    expect(mockSocket.auth).toEqual({ token: 'jwt-token-fresh-after-refresh' });
  });

  it('trả về trạng thái disconnected khi socket chưa kết nối', async () => {
    mockSocket.connected = false;
    mockSocket.once.mockImplementation(() => undefined);

    const res = await service.joinConversation('conv-offline', 20);

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

    const emittedPromise = new Promise<{ message: any }>((resolve) => {
      service.messageCreated$.subscribe((payload) => resolve(payload));
    });

    messageCallback({ message: sampleMessage });
    const received = await emittedPromise;

    expect(received.message).toEqual(sampleMessage);
  });

  it('ensureConnected chờ auth.whenReady() trước khi kết nối socket', async () => {
    let authReadyResolved = false;
    authMock.whenReady = vi.fn().mockImplementation(() => {
      authReadyResolved = true;
      authMock.accessToken.mockReturnValue('jwt-token-restored');
      return Promise.resolve();
    });

    const connected = await service.ensureConnected();

    expect(authMock.whenReady).toHaveBeenCalled();
    expect(authReadyResolved).toBe(true);
    expect(connected).toBe(true);
    expect(io).toHaveBeenCalledWith(
      'http://localhost:3000/chat',
      expect.objectContaining({
        auth: { token: 'jwt-token-restored' },
      }),
    );
  });

  it('reconnect_attempt cập nhật connectionStatus thành connecting', () => {
    service.connect('jwt-token-123');

    const reconnectCallback = mockSocket.io.on.mock.calls.find(
      (call: any[]) => call[0] === 'reconnect_attempt',
    )?.[1];

    expect(reconnectCallback).toBeDefined();
    reconnectCallback();

    expect(service.connectionStatus()).toBe('connecting');
  });

  it('phát tán conversationUpdated$ khi socket nhận conversation:updated', async () => {
    service.connect('jwt-token-123');

    const callback = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'conversation:updated',
    )?.[1];

    expect(callback).toBeDefined();

    const payload = {
      conversationId: 'conv-200',
      senderId: 'user-sender',
      lastMessageId: '500',
      lastMessagePreview: 'Hello from user-room!',
      lastMessageAt: '2026-08-23T05:00:00Z',
      unreadDelta: 1,
    };

    const promise = new Promise<any>((resolve) => {
      service.conversationUpdated$.subscribe((p) => resolve(p));
    });

    callback(payload);
    const received = await promise;

    expect(received).toEqual(payload);
  });

  it('phát tán conversationDeleted$ khi socket nhận conversation:deleted', async () => {
    service.connect('jwt-token-123');

    const callback = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'conversation:deleted',
    )?.[1];

    expect(callback).toBeDefined();

    const payload = {
      conversationId: 'conv-200',
      friendId: 'user-friend-123',
    };

    const promise = new Promise<any>((resolve) => {
      service.conversationDeleted$.subscribe((p) => resolve(p));
    });

    callback(payload);
    const received = await promise;

    expect(received).toEqual(payload);
  });

  it('presence:updated và presence:sync phát tán qua observable và getPresenceSnapshot emit request', async () => {
    service.connect('jwt-token-123');

    const onCalls = mockSocket.on.mock.calls;
    const updatedCb = onCalls.find(([evt]: any) => evt === 'presence:updated')?.[1];
    const syncCb = onCalls.find(([evt]: any) => evt === 'presence:sync')?.[1];

    expect(updatedCb).toBeDefined();
    expect(syncCb).toBeDefined();

    const updatedPayload = {
      userId: 'u-1',
      status: 'online' as const,
      statusMessage: 'Coding...',
      customStatus: null,
      lastSeenAt: '2026-08-22T10:00:00Z',
    };

    const promiseUpdated = new Promise<any>((resolve) => {
      service.presenceUpdated$.subscribe((p) => resolve(p));
    });
    updatedCb(updatedPayload);
    const recUpdated = await promiseUpdated;
    expect(recUpdated).toEqual(updatedPayload);

    const syncPayload = {
      presences: {
        'u-1': updatedPayload,
      },
    };

    const promiseSync = new Promise<any>((resolve) => {
      service.presenceSync$.subscribe((p) => resolve(p));
    });
    syncCb(syncPayload);
    const recSync = await promiseSync;
    expect(recSync).toEqual(syncPayload);

    // Test getPresenceSnapshot
    mockSocket.emit.mockImplementation((event: string, cb: any) => {
      if (event === 'presence:get-snapshot') {
        cb(syncPayload);
      }
    });

    const snapshot = await service.getPresenceSnapshot();
    expect(snapshot).toEqual(syncPayload);
    expect(mockSocket.emit).toHaveBeenCalledWith('presence:get-snapshot', expect.any(Function));
  });

  it('tham gia và rời phòng máy chủ realtime với joinServer và leaveServer', async () => {
    mockSocket.emit.mockImplementation((event: string, payload: any, cb: any) => {
      if (event === 'server:join') {
        cb({ success: true });
      }
      if (event === 'server:leave') {
        cb?.();
      }
    });

    service.connect('jwt-token-123');
    const joined = await service.joinServer('srv-100');
    expect(joined).toBe(true);
    await service.leaveServer('srv-100');
    expect(mockSocket.emit).toHaveBeenCalledWith('server:leave', { serverId: 'srv-100' });
  });

  it('phát tán sự kiện serverDeleted$ khi nhận server:deleted', async () => {
    service.connect('jwt-token-123');

    const callback = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'server:deleted',
    )?.[1];

    expect(callback).toBeDefined();

    const promise = new Promise<any>((resolve) => {
      service.serverDeleted$.subscribe((payload) => resolve(payload));
    });

    callback({ serverId: 'srv-deleted-1' });
    const received = await promise;

    expect(received).toEqual({ serverId: 'srv-deleted-1' });
  });

  it('phát tán sự kiện serverMemberLeft$ khi nhận server:member-left', async () => {
    service.connect('jwt-token-123');

    const callback = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'server:member-left',
    )?.[1];

    expect(callback).toBeDefined();

    const promise = new Promise<any>((resolve) => {
      service.serverMemberLeft$.subscribe((payload) => resolve(payload));
    });

    callback({ serverId: 'srv-100', userId: 'user-left-1' });
    const received = await promise;

    expect(received).toEqual({ serverId: 'srv-100', userId: 'user-left-1' });
  });

  describe('Regression: Bảo toàn context this khi gọi AuthService.accessToken', () => {
    it('ensureConnected đọc accessToken từ AuthService thật có phụ thuộc this.currentSession mà không ném TypeError', async () => {
      class RealLikeAuthService {
        private sessionState: { access_token: string } | null = {
          access_token: 'Bearer real-jwt-session-token-456',
        };

        currentSession() {
          if (!this) {
            throw new TypeError("Cannot read properties of undefined (reading 'currentSession')");
          }
          return this.sessionState;
        }

        whenReady(): Promise<void> {
          return Promise.resolve();
        }

        accessToken(): string | null {
          if (!this) {
            throw new TypeError("Cannot read properties of undefined (reading 'currentSession')");
          }
          return this.currentSession()?.access_token ?? null;
        }
      }

      const realAuth = new RealLikeAuthService();
      authMock.accessToken.mockImplementation(() => realAuth.accessToken());
      authMock.whenReady.mockImplementation(() => realAuth.whenReady());

      const connected = await service.ensureConnected();

      expect(connected).toBe(true);
      expect(io).toHaveBeenCalledWith(
        'http://localhost:3000/chat',
        expect.objectContaining({
          auth: { token: 'real-jwt-session-token-456' },
        }),
      );
    });
  });

  it('phát sự kiện invitationReceived$ và invitationUpdated$', () => {
    service.connect('jwt-123');

    let receivedPayload: any;
    service.invitationReceived$.subscribe((p) => {
      receivedPayload = p;
    });

    let updatedPayload: any;
    service.invitationUpdated$.subscribe((p) => {
      updatedPayload = p;
    });

    const invReceivedCall = mockSocket.on.mock.calls.find(
      ([event]: [string]) => event === 'server:invitation-received',
    );
    expect(invReceivedCall).toBeDefined();
    invReceivedCall[1]({ invitation: { id: 'inv-1' } });
    expect(receivedPayload).toEqual({ invitation: { id: 'inv-1' } });

    const invUpdatedCall = mockSocket.on.mock.calls.find(
      ([event]: [string]) => event === 'server:invitation-updated',
    );
    expect(invUpdatedCall).toBeDefined();
    invUpdatedCall[1]({ invitationId: 'inv-1', status: 'accepted' });
    expect(updatedPayload).toEqual({ invitationId: 'inv-1', status: 'accepted' });
  });
});
