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
    conversationId: string;
    userId: string;
    lastReadMessageId: string;
  }>();
  private readonly typingUpdatedSubject = new Subject<{
    conversationId: string;
    userIds: string[];
  }>();
  private readonly joinErrorSubject = new Subject<{
    conversationId: string;
    error: string;
  }>();

  readonly messageCreated$: Observable<{ message: MessagePayload }> =
    this.messageCreatedSubject.asObservable();
  readonly messageUpdated$: Observable<{ message: MessagePayload }> =
    this.messageUpdatedSubject.asObservable();
  readonly messageDeleted$: Observable<{
    channelId: string | null;
    conversationId: string | null;
    messageId: string;
  }> = this.messageDeletedSubject.asObservable();
  readonly messageRead$: Observable<{
    conversationId: string;
    userId: string;
    lastReadMessageId: string;
  }> = this.messageReadSubject.asObservable();
  readonly typingUpdated$: Observable<{
    conversationId: string;
    userIds: string[];
  }> = this.typingUpdatedSubject.asObservable();
  readonly joinError$: Observable<{
    conversationId: string;
    error: string;
  }> = this.joinErrorSubject.asObservable();

  constructor() {}

  /**
   * Khởi tạo kết nối Socket.IO tới namespace /chat
   */
  connect(token?: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const rawAuth = this.auth?.accessToken;
    const tokenFromAuth =
      typeof rawAuth === 'function'
        ? (rawAuth as () => string | null)()
        : (rawAuth as string | null);
    const authToken: string | undefined =
      token || (typeof tokenFromAuth === 'string' ? tokenFromAuth : undefined);
    if (!authToken) {
      this._connectionStatus.set('disconnected');
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
   * Cập nhật token mới khi refresh session mà không tạo thêm socket
   */
  updateToken(newToken: string): void {
    this.currentToken = newToken;
    if (this.socket) {
      this.socket.auth = { token: newToken };
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
    this.currentToken = null;

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
  joinConversation(
    conversationId: string,
    timeoutMs = 5000,
  ): Promise<JoinConversationResponse> {
    if (!this.socket || !this.socket.connected) {
      // Đánh dấu activeConversationId để tự join khi socket kết nối thành công
      this.activeConversationId = conversationId;
      return Promise.resolve({
        success: false,
        error: 'Socket chưa kết nối, đã đưa vào hàng đợi',
        status: 'disconnected',
      });
    }

    return new Promise<JoinConversationResponse>((resolve) => {
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
            // Server từ chối: xóa activeConversationId để reconnect không tự rejoin
            if (this.activeConversationId === conversationId) {
              this.activeConversationId = null;
            }
            this.joinErrorSubject.next({
              conversationId,
              error: res?.error || 'Không thể tham gia cuộc trò chuyện.',
            });
            resolve({
              success: false,
              error: res?.error || 'Không thể tham gia cuộc trò chuyện.',
              status: 'rejected',
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
  }

  /**
   * Rời khỏi phòng conversation
   */
  leaveConversation(conversationId: string): void {
    if (this.activeConversationId === conversationId) {
      this.activeConversationId = null;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('conversation:leave', { conversationId });
    }
  }

  /**
   * Bắt đầu gõ phím trong cuộc trò chuyện
   */
  startTyping(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:start', { conversationId });
    }
  }

  /**
   * Ngừng gõ phím trong cuộc trò chuyện
   */
  stopTyping(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:stop', { conversationId });
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this._connectionStatus.set('connected');
      // Tự động rejoin active conversation nếu có
      if (this.activeConversationId) {
        void this.joinConversation(this.activeConversationId);
      }
    });

    this.socket.on('disconnect', () => {
      this._connectionStatus.set('disconnected');
    });

    this.socket.on('connect_error', () => {
      this._connectionStatus.set('error');
    });

    this.socket.on('message:created', (payload) => {
      this.messageCreatedSubject.next(payload);
    });

    this.socket.on('message:updated', (payload) => {
      this.messageUpdatedSubject.next(payload);
    });

    this.socket.on('message:deleted', (payload) => {
      this.messageDeletedSubject.next(payload);
    });

    this.socket.on('message:read', (payload) => {
      this.messageReadSubject.next(payload);
    });

    this.socket.on('typing:updated', (payload) => {
      this.typingUpdatedSubject.next(payload);
    });
  }
}
