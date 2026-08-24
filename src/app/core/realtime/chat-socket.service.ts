import { isPlatformBrowser } from '@angular/common';
import {
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import type {
  ClientToServerEvents,
  JoinConversationResponse,
  MessagePayload,
  PresenceSyncPayload,
  PresenceUpdatedPayload,
  ReactionUpdatedPayload,
  ServerToClientEvents,
} from '../../../shared/socket-events';
import { AuthService } from '../auth/auth.service';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

@Injectable({
  providedIn: 'root',
})
export class ChatSocketService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);

  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
    null;

  private currentToken: string | null = null;

  private readonly _connectionStatus = signal<ConnectionStatus>('disconnected');
  readonly connectionStatus = this._connectionStatus.asReadonly();

  /** Cuộc trò chuyện đang active để tự động rejoin sau khi reconnect */
  private activeConversationId: string | null = null;
  /** Kênh máy chủ đang active để tự động rejoin sau khi reconnect */
  private activeChannelId: string | null = null;

  private readonly pendingJoinPromises = new Map<
    string,
    Promise<JoinConversationResponse>
  >();
  private readonly pendingJoinChannelPromises = new Map<
    string,
    Promise<JoinConversationResponse>
  >();

  // Event Subjects
  private readonly messageCreatedSubject = new Subject<{
    message: MessagePayload;
  }>();
  private readonly messageUpdatedSubject = new Subject<{
    message: MessagePayload;
  }>();
  private readonly messageDeletedSubject = new Subject<{
    channelId: string | null;
    conversationId: string | null;
    messageId: string;
  }>();
  private readonly messageReadSubject = new Subject<{
    conversationId?: string | null;
    channelId?: string | null;
    userId: string;
    lastReadMessageId: string;
  }>();
  private readonly typingUpdatedSubject = new Subject<{
    conversationId?: string | null;
    channelId?: string | null;
    userIds: string[];
  }>();
  private readonly joinErrorSubject = new Subject<{
    conversationId?: string;
    channelId?: string;
    error: string;
  }>();
  private readonly reactionUpdatedSubject = new Subject<ReactionUpdatedPayload>();
  private readonly presenceUpdatedSubject = new Subject<PresenceUpdatedPayload>();
  private readonly presenceSyncSubject = new Subject<PresenceSyncPayload>();

  private readonly channelCreatedSubject = new Subject<{ serverId: string; channel: any }>();
  private readonly invitationReceivedSubject = new Subject<{ invitation: any }>();
  private readonly invitationUpdatedSubject = new Subject<{
    invitationId: string;
    serverId: string;
    inviteeId: string;
    status: 'accepted' | 'declined' | 'revoked' | 'expired';
  }>();
  private readonly capabilitiesUpdatedSubject = new Subject<{ serverId: string; capabilities: any }>();
  private readonly serverDeletedSubject = new Subject<{ serverId: string }>();
  private readonly serverMemberLeftSubject = new Subject<{ serverId: string; userId: string }>();

  readonly messageCreated$: Observable<{ message: MessagePayload }> =
    this.messageCreatedSubject.asObservable();
  readonly messageUpdated$: Observable<{ message: MessagePayload }> =
    this.messageUpdatedSubject.asObservable();
  readonly messageDeleted$: Observable<{
    channelId: string | null;
    conversationId: string | null;
    messageId: string;
  }> = this.messageDeletedSubject.asObservable();
  readonly reactionUpdated$: Observable<ReactionUpdatedPayload> =
    this.reactionUpdatedSubject.asObservable();
  readonly messageRead$: Observable<{
    conversationId?: string | null;
    channelId?: string | null;
    userId: string;
    lastReadMessageId: string;
  }> = this.messageReadSubject.asObservable();
  readonly typingUpdated$: Observable<{
    conversationId?: string | null;
    channelId?: string | null;
    userIds: string[];
  }> = this.typingUpdatedSubject.asObservable();
  readonly joinError$: Observable<{
    conversationId?: string;
    channelId?: string;
    error: string;
  }> = this.joinErrorSubject.asObservable();
  readonly presenceUpdated$: Observable<PresenceUpdatedPayload> =
    this.presenceUpdatedSubject.asObservable();
  readonly presenceSync$: Observable<PresenceSyncPayload> =
    this.presenceSyncSubject.asObservable();

  readonly channelCreated$: Observable<{ serverId: string; channel: any }> =
    this.channelCreatedSubject.asObservable();
  readonly invitationReceived$: Observable<{ invitation: any }> =
    this.invitationReceivedSubject.asObservable();
  readonly invitationUpdated$: Observable<{
    invitationId: string;
    serverId: string;
    inviteeId: string;
    status: 'accepted' | 'declined' | 'revoked' | 'expired';
  }> = this.invitationUpdatedSubject.asObservable();
  readonly capabilitiesUpdated$: Observable<{ serverId: string; capabilities: any }> =
    this.capabilitiesUpdatedSubject.asObservable();
  readonly serverDeleted$: Observable<{ serverId: string }> =
    this.serverDeletedSubject.asObservable();
  readonly serverMemberLeft$: Observable<{ serverId: string; userId: string }> =
    this.serverMemberLeftSubject.asObservable();

  private readonly conversationUpdatedSubject = new Subject<{
    conversationId: string;
    senderId: string;
    lastMessageId: string;
    lastMessagePreview: string | null;
    lastMessageAt: string;
    unreadDelta: number;
  }>();
  readonly conversationUpdated$: Observable<{
    conversationId: string;
    senderId: string;
    lastMessageId: string;
    lastMessagePreview: string | null;
    lastMessageAt: string;
    unreadDelta: number;
  }> = this.conversationUpdatedSubject.asObservable();

  constructor() {}

  /**
   * Khởi tạo kết nối Socket.IO tới namespace /chat
   */
  connect(token?: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const tokenFromAuth =
      this.auth && typeof this.auth.accessToken === 'function'
        ? this.auth.accessToken()
        : null;

    const rawToken: string | undefined =
      token || tokenFromAuth || (this.currentToken ?? undefined);

    if (!rawToken) {
      this._connectionStatus.set('disconnected');
      return;
    }

    const authToken = rawToken.startsWith('Bearer ')
      ? rawToken.slice(7).trim()
      : rawToken.trim();

    if (this.socket && this.socket.connected && this.currentToken === authToken) {
      return;
    }

    if (this.socket) {
      if (this.currentToken !== authToken) {
        this.updateToken(authToken);
      } else if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    this.currentToken = authToken;
    this._connectionStatus.set('connecting');

    const socketUrl = `${environment.apiBaseUrl}/chat`;

    this.socket = io(socketUrl, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupSocketListeners();
  }

  /**
   * Đảm bảo socket đã kết nối thành công với Auth Token hợp lệ.
   * Chờ AuthService.whenReady() trước khi đọc token.
   */
  async ensureConnected(customToken?: string, timeoutMs = 8000): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;

    if (!customToken && this.auth && typeof this.auth.whenReady === 'function') {
      await this.auth.whenReady();
    }

    this.connect(customToken);

    if (!this.socket) {
      return false;
    }

    if (this.socket.connected) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(this.socket?.connected ?? false);
        }
      }, timeoutMs);

      const onConnect = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(true);
        }
      };

      const onError = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(false);
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
      };

      this.socket?.once('connect', onConnect);
      this.socket?.once('connect_error', onError);
    });
  }

  /**
   * Cập nhật token mới khi refresh session mà không tạo thêm socket
   */
  updateToken(newToken: string): void {
    const cleanToken = newToken.startsWith('Bearer ')
      ? newToken.slice(7).trim()
      : newToken.trim();
    this.currentToken = cleanToken;
    if (this.socket) {
      this.socket.auth = { token: cleanToken };
      if (!this.socket.connected) {
        this.socket.connect();
      }
    }
  }

  /**
   * Ngắt kết nối và dọn dẹp toàn bộ state khi đăng xuất
   */
  disconnect(): void {
    this.activeConversationId = null;
    this.activeChannelId = null;
    this.currentToken = null;
    this.pendingJoinPromises.clear();
    this.pendingJoinChannelPromises.clear();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this._connectionStatus.set('disconnected');
  }

  /**
   * Tham gia vào phòng conversation để nhận realtime messages (có Timeout & Acknowledgment)
   */
  async joinConversation(
    conversationId: string,
    timeoutMs = 5000,
  ): Promise<JoinConversationResponse> {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, status: 'disconnected' };
    }

    this.activeConversationId = conversationId;

    const existingPromise = this.pendingJoinPromises.get(conversationId);
    if (existingPromise) {
      return existingPromise;
    }

    const joinPromise = (async (): Promise<JoinConversationResponse> => {
      try {
        const isConnected = await this.ensureConnected(undefined, timeoutMs);
        if (!isConnected || !this.socket || !this.socket.connected) {
          return {
            success: false,
            error: 'Socket chưa kết nối, đã đưa vào hàng đợi tự join',
            status: 'disconnected',
          };
        }

        return await new Promise<JoinConversationResponse>((resolve) => {
          let resolved = false;
          const timer = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve({
                success: false,
                error: 'Hết thời gian chờ phản hồi join conversation',
                status: 'timeout',
              });
            }
          }, timeoutMs);

          this.socket?.emit(
            'conversation:join',
            { conversationId },
            (res: JoinConversationResponse) => {
              if (resolved) return;
              resolved = true;
              clearTimeout(timer);

              if (!res?.success) {
                // Chỉ xóa activeConversationId nếu server xác nhận user không có membership (không có quyền/không phải thành viên)
                const isForbidden =
                  res?.error?.toLowerCase().includes('quyền') ||
                  res?.error?.toLowerCase().includes('thành viên') ||
                  res?.error?.toLowerCase().includes('forbidden');

                if (isForbidden && this.activeConversationId === conversationId) {
                  this.activeConversationId = null;
                }
                this.joinErrorSubject.next({
                  conversationId,
                  error: res?.error || 'Không thể tham gia cuộc trò chuyện.',
                });
                resolve({
                  success: false,
                  error: res?.error || 'Không thể tham gia cuộc trò chuyện.',
                  status: isForbidden ? 'rejected' : (res?.status ?? 'rejected'),
                });
                return;
              }

              this.activeConversationId = conversationId;
              resolve({
                success: true,
                status: 'joined',
              });
            },
          );
        });
      } finally {
        this.pendingJoinPromises.delete(conversationId);
      }
    })();

    this.pendingJoinPromises.set(conversationId, joinPromise);
    return joinPromise;
  }

  /**
   * Tham gia vào phòng channel để nhận realtime messages (có Timeout & Acknowledgment)
   */
  async joinChannel(
    channelId: string,
    timeoutMs = 5000,
  ): Promise<JoinConversationResponse> {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, status: 'disconnected' };
    }

    this.activeChannelId = channelId;

    const existingPromise = this.pendingJoinChannelPromises.get(channelId);
    if (existingPromise) {
      return existingPromise;
    }

    const joinPromise = (async (): Promise<JoinConversationResponse> => {
      try {
        const isConnected = await this.ensureConnected(undefined, timeoutMs);
        if (!isConnected || !this.socket || !this.socket.connected) {
          return {
            success: false,
            error: 'Socket chưa kết nối, đã đưa vào hàng đợi tự join',
            status: 'disconnected',
          };
        }

        return await new Promise<JoinConversationResponse>((resolve) => {
          let resolved = false;
          const timer = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve({
                success: false,
                error: 'Hết thời gian chờ phản hồi join channel',
                status: 'timeout',
              });
            }
          }, timeoutMs);

          this.socket?.emit(
            'channel:join',
            { channelId },
            (res: JoinConversationResponse) => {
              if (resolved) return;
              resolved = true;
              clearTimeout(timer);

              if (!res?.success) {
                const isForbidden =
                  res?.error?.toLowerCase().includes('quyền') ||
                  res?.error?.toLowerCase().includes('thành viên') ||
                  res?.error?.toLowerCase().includes('forbidden');

                if (isForbidden && this.activeChannelId === channelId) {
                  this.activeChannelId = null;
                }
                this.joinErrorSubject.next({
                  channelId,
                  error: res?.error || 'Không thể tham gia kênh máy chủ.',
                });
                resolve({
                  success: false,
                  error: res?.error || 'Không thể tham gia kênh máy chủ.',
                  status: isForbidden ? 'rejected' : (res?.status ?? 'rejected'),
                });
                return;
              }

              this.activeChannelId = channelId;
              resolve({
                success: true,
                status: 'joined',
              });
            },
          );
        });
      } finally {
        this.pendingJoinChannelPromises.delete(channelId);
      }
    })();

    this.pendingJoinChannelPromises.set(channelId, joinPromise);
    return joinPromise;
  }

  /**
   * Rời khỏi phòng channel
   */
  leaveChannel(channelId: string): void {
    if (this.activeChannelId === channelId) {
      this.activeChannelId = null;
    }
    this.pendingJoinChannelPromises.delete(channelId);
    if (this.socket && this.socket.connected) {
      this.socket.emit('channel:leave', { channelId });
    }
  }

  /**
   * Rời khỏi phòng conversation
   */
  leaveConversation(conversationId: string): void {
    if (this.activeConversationId === conversationId) {
      this.activeConversationId = null;
    }
    this.pendingJoinPromises.delete(conversationId);
    if (this.socket && this.socket.connected) {
      this.socket.emit('conversation:leave', { conversationId });
    }
  }

  /**
   * Bắt đầu gõ phím (hỗ trợ cả conversationId và channelId)
   */
  startTyping(target: string | { conversationId?: string; channelId?: string }): void {
    if (this.socket && this.socket.connected) {
      if (typeof target === 'string') {
        this.socket.emit('typing:start', { conversationId: target });
      } else {
        this.socket.emit('typing:start', target);
      }
    }
  }

  /**
   * Ngừng gõ phím (hỗ trợ cả conversationId và channelId)
   */
  stopTyping(target: string | { conversationId?: string; channelId?: string }): void {
    if (this.socket && this.socket.connected) {
      if (typeof target === 'string') {
        this.socket.emit('typing:stop', { conversationId: target });
      } else {
        this.socket.emit('typing:stop', target);
      }
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this._connectionStatus.set('connected');
      // Tự động rejoin active conversation / channel nếu có sau khi connect / reconnect thành công
      if (this.activeConversationId) {
        void this.joinConversation(this.activeConversationId);
      }
      if (this.activeChannelId) {
        void this.joinChannel(this.activeChannelId);
      }
    });

    this.socket.on('disconnect', () => {
      this._connectionStatus.set('disconnected');
    });

    this.socket.on('connect_error', async (err: Error) => {
      this._connectionStatus.set('error');

      // Khi connect_error do token/session: chờ AuthService refresh và cập nhật socket.auth
      if (
        err?.message?.includes('Chưa xác thực') ||
        err?.message?.toLowerCase().includes('auth') ||
        err?.message?.toLowerCase().includes('unauthorized')
      ) {
        try {
          if (this.auth && typeof this.auth.whenReady === 'function') {
            await this.auth.whenReady();
            const freshToken = this.auth.accessToken();
            if (freshToken) {
              this.updateToken(freshToken);
            }
          }
        } catch {
          // Bỏ qua lỗi refresh token tạm thời
        }
      }
    });

    this.socket.io?.on?.('reconnect_attempt', () => {
      this._connectionStatus.set('connecting');
    });

    this.socket.on('message:created', (payload) => {
      this.messageCreatedSubject.next(payload);
    });

    this.socket.on('message:updated', (payload) => {
      this.messageUpdatedSubject.next(payload);
    });

    this.socket.on('message:deleted', (payload) => {
      this.messageDeletedSubject.next({
        channelId: payload.channelId ?? null,
        conversationId: payload.conversationId ?? null,
        messageId: payload.messageId,
      });
    });

    this.socket.on('message:reaction-updated', (payload) => {
      this.reactionUpdatedSubject.next(payload);
    });

    this.socket.on('message:read', (payload) => {
      this.messageReadSubject.next({
        conversationId: payload.conversationId ?? null,
        channelId: payload.channelId ?? null,
        userId: payload.userId || payload.readerId || '',
        lastReadMessageId: payload.lastReadMessageId,
      });
    });

    this.socket.on('typing:updated', (payload) => {
      this.typingUpdatedSubject.next({
        conversationId: payload.conversationId ?? null,
        channelId: payload.channelId ?? null,
        userIds: payload.userIds,
      });
    });

    this.socket.on('conversation:updated', (payload) => {
      this.conversationUpdatedSubject.next(payload);
    });

    this.socket.on('presence:updated', (payload) => {
      this.presenceUpdatedSubject.next(payload);
    });

    this.socket.on('presence:sync', (payload) => {
      this.presenceSyncSubject.next(payload);
    });

    this.socket.on('server:channel-created', (payload) => {
      this.channelCreatedSubject.next(payload);
    });

    this.socket.on('server:invitation-received', (payload) => {
      this.invitationReceivedSubject.next(payload);
    });

    this.socket.on('server:invitation-updated', (payload) => {
      this.invitationUpdatedSubject.next(payload);
    });

    this.socket.on('server:capabilities-updated', (payload) => {
      this.capabilitiesUpdatedSubject.next(payload);
    });

    this.socket.on('server:deleted', (payload) => {
      this.serverDeletedSubject.next(payload);
    });

    this.socket.on('server:member-left', (payload) => {
      this.serverMemberLeftSubject.next(payload);
    });
  }

  /**
   * Tham gia phòng máy chủ để nhận sự kiện realtime của server (tạo kênh, cập nhật thành viên)
   */
  joinServer(serverId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        return resolve(false);
      }
      this.socket.emit('server:join', { serverId }, (res: { success: boolean; error?: string }) => {
        resolve(res?.success ?? false);
      });
    });
  }

  /**
   * Rời phòng máy chủ khi chuyển server hoặc bị xóa khỏi server
   */
  leaveServer(serverId: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        return resolve();
      }
      this.socket.emit('server:leave', { serverId }, () => {
        resolve();
      });
    });
  }

  /**
   * Lấy snapshot trạng thái presence hiện tại của toàn bộ bạn bè và DM peers
   */
  getPresenceSnapshot(): Promise<PresenceSyncPayload> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        return resolve({ presences: {} });
      }
      this.socket.emit('presence:get-snapshot', (response: PresenceSyncPayload) => {
        if (response && response.presences) {
          this.presenceSyncSubject.next(response);
          resolve(response);
        } else {
          resolve({ presences: {} });
        }
      });
    });
  }
}

