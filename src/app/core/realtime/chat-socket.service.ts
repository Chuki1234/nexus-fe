import { isPlatformBrowser } from '@angular/common';
import { inject, InjectionToken, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import type {
  ClientToServerEvents,
  JoinConversationResponse,
  MessagePayload,
  NotificationPayload,
  PresenceSyncPayload,
  PresenceUpdatedPayload,
  ReactionUpdatedPayload,
  ServerToClientEvents,
  UserBlockCreatedPayload,
  UserBlockRemovedPayload,
  RelationshipInvalidatedPayload,
  VoiceMemberState,
  VoiceServerStatesSyncPayload,
  VoiceStateUpdatePayload,
} from '../../../shared/socket-events';
import type { DirectCallDto } from '../../../shared/dto/direct-calls.dto';
import type { ServerMemberDto } from '../../../shared/dto/server-members.dto';
import { AuthService } from '../auth/auth.service';
import type { ServerChannelStructure } from '../servers/server.models';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface RoomRegistration {
  refCount: number;
  state: 'idle' | 'joining' | 'joined' | 'failed';
  joinPromise: Promise<JoinConversationResponse> | null;
}

interface ServerRoomRegistration {
  refCount: number;
  state: 'idle' | 'joining' | 'joined' | 'failed';
  joinPromise: Promise<boolean> | null;
}

interface LocalVoiceState {
  serverId: string;
  channelId: string | null;
  isMuted?: boolean;
  isDeafened?: boolean;
  isCameraOn?: boolean;
  isScreenSharing?: boolean;
}

export const CHAT_SOCKET_FACTORY = new InjectionToken<typeof io>('CHAT_SOCKET_FACTORY', {
  providedIn: 'root',
  factory: () => io,
});

@Injectable({
  providedIn: 'root',
})
export class ChatSocketService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);

  private readonly socketFactory = inject(CHAT_SOCKET_FACTORY);
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  private currentToken: string | null = null;

  private readonly _connectionStatus = signal<ConnectionStatus>('disconnected');
  readonly connectionStatus = this._connectionStatus.asReadonly();

  /** Ref-counted Multi-Room Registries */
  private readonly conversationRooms = new Map<string, RoomRegistration>();
  private readonly channelRooms = new Map<string, RoomRegistration>();
  private readonly serverRooms = new Map<string, ServerRoomRegistration>();
  /** Trạng thái voice mong muốn của local user, dùng để reconcile sau Socket.IO reconnect. */
  private readonly localVoiceStates = new Map<string, LocalVoiceState>();

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
  private readonly messageHiddenForUserSubject = new Subject<{
    channelId: string | null;
    conversationId: string | null;
    messageId: string;
    userId: string;
    hiddenAt: string;
  }>();
  private readonly messageReadSubject = new Subject<{
    conversationId?: string | null;
    channelId?: string | null;
    userId: string;
    lastReadMessageId: string;
  }>();
  private readonly unreadUpdateSubject = new Subject<{
    channelId: string | null;
    conversationId: string | null;
    serverId: string | null;
    unreadCount: number;
    mentionCount: number;
    authorId: string | null;
    messageId: string | null;
  }>();
  private readonly notificationNewSubject = new Subject<NotificationPayload>();

  private readonly typingUpdatedSubject = new Subject<{
    conversationId?: string | null;
    channelId?: string | null;
    userIds: string[];
  }>();
  private readonly joinErrorSubject = new Subject<{
    conversationId?: string;
    channelId?: string;
    serverId?: string;
    error: string;
  }>();
  private readonly reactionUpdatedSubject = new Subject<ReactionUpdatedPayload>();
  private readonly messagePinUpdatedSubject = new Subject<{
    channelId: string | null;
    conversationId: string | null;
    message: MessagePayload;
    pinned: boolean;
  }>();
  private readonly presenceUpdatedSubject = new Subject<PresenceUpdatedPayload>();
  private readonly presenceSyncSubject = new Subject<PresenceSyncPayload>();

  private readonly channelsInvalidatedSubject = new Subject<{ serverId: string }>();
  private readonly channelStructureUpdatedSubject = new Subject<{
    serverId: string;
    structure: ServerChannelStructure;
    updatedBy: string;
  }>();
  private readonly channelCreatedSubject = new Subject<{ serverId: string; channel: any }>();
  private readonly invitationReceivedSubject = new Subject<{ invitation: any }>();
  private readonly invitationUpdatedSubject = new Subject<{
    invitationId: string;
    serverId: string;
    inviteeId: string;
    status: 'accepted' | 'declined' | 'revoked' | 'expired';
  }>();
  private readonly capabilitiesUpdatedSubject = new Subject<{
    serverId: string;
    capabilities: any;
  }>();
  private readonly serverDeletedSubject = new Subject<{ serverId: string }>();
  private readonly serverMemberLeftSubject = new Subject<{ serverId: string; userId: string }>();
  private readonly serverMemberJoinedSubject = new Subject<{
    serverId: string;
    userId: string;
    role?: string;
    member?: ServerMemberDto;
  }>();
  private readonly serverMemberRoleUpdatedSubject = new Subject<{
    serverId: string;
    userId: string;
    roleId: string;
    action: 'added' | 'removed';
  }>();
  private readonly voiceStateUpdatedSubject = new Subject<VoiceStateUpdatePayload>();
  private readonly voiceServerStatesSyncSubject = new Subject<VoiceServerStatesSyncPayload>();
  private readonly voiceForceMoveSubject = new Subject<{
    serverId: string;
    channelId: string;
    channelName: string;
  }>();
  private readonly voiceForceDisconnectSubject = new Subject<{
    serverId: string;
    channelId?: string;
  }>();
  private readonly voiceForceMuteSubject = new Subject<{
    serverId: string;
    isMuted: boolean;
  }>();

  // Direct Call Signaling Subjects
  private readonly directCallIncomingSubject = new Subject<DirectCallDto>();
  private readonly directCallRingingSubject = new Subject<DirectCallDto>();
  private readonly directCallAcceptedSubject = new Subject<DirectCallDto>();
  private readonly directCallConnectedSubject = new Subject<{
    callId: string;
    connectedAt: string;
  }>();
  private readonly directCallDeclinedSubject = new Subject<DirectCallDto>();
  private readonly directCallCancelledSubject = new Subject<DirectCallDto>();
  private readonly directCallEndedSubject = new Subject<DirectCallDto>();
  private readonly directCallMissedSubject = new Subject<DirectCallDto>();
  private readonly directCallBusySubject = new Subject<{
    conversationId: string;
    calleeId: string;
  }>();
  private readonly directCallStateSyncSubject = new Subject<DirectCallDto | null>();

  // Block & Relationship Invalidation Subjects
  private readonly userBlockCreatedSubject = new Subject<UserBlockCreatedPayload>();
  private readonly userBlockRemovedSubject = new Subject<UserBlockRemovedPayload>();
  private readonly relationshipInvalidatedSubject = new Subject<RelationshipInvalidatedPayload>();

  readonly userBlockCreated$: Observable<UserBlockCreatedPayload> =
    this.userBlockCreatedSubject.asObservable();
  readonly userBlockRemoved$: Observable<UserBlockRemovedPayload> =
    this.userBlockRemovedSubject.asObservable();
  readonly relationshipInvalidated$: Observable<RelationshipInvalidatedPayload> =
    this.relationshipInvalidatedSubject.asObservable();

  readonly messageCreated$: Observable<{ message: MessagePayload }> =
    this.messageCreatedSubject.asObservable();
  readonly messageUpdated$: Observable<{ message: MessagePayload }> =
    this.messageUpdatedSubject.asObservable();
  readonly messageDeleted$: Observable<{
    channelId: string | null;
    conversationId: string | null;
    messageId: string;
  }> = this.messageDeletedSubject.asObservable();
  readonly messageHiddenForUser$: Observable<{
    channelId: string | null;
    conversationId: string | null;
    messageId: string;
    userId: string;
    hiddenAt: string;
  }> = this.messageHiddenForUserSubject.asObservable();
  readonly reactionUpdated$: Observable<ReactionUpdatedPayload> =
    this.reactionUpdatedSubject.asObservable();
  readonly messagePinUpdated$: Observable<{
    channelId: string | null;
    conversationId: string | null;
    message: MessagePayload;
    pinned: boolean;
  }> = this.messagePinUpdatedSubject.asObservable();
  readonly messageRead$: Observable<{
    conversationId?: string | null;
    channelId?: string | null;
    userId: string;
    lastReadMessageId: string;
  }> = this.messageReadSubject.asObservable();
  readonly unreadUpdate$: Observable<{
    channelId: string | null;
    conversationId: string | null;
    serverId: string | null;
    unreadCount: number;
    mentionCount: number;
    authorId: string | null;
    messageId: string | null;
  }> = this.unreadUpdateSubject.asObservable();
  readonly notificationNew$: Observable<NotificationPayload> =
    this.notificationNewSubject.asObservable();

  readonly typingUpdated$: Observable<{
    conversationId?: string | null;
    channelId?: string | null;
    userIds: string[];
  }> = this.typingUpdatedSubject.asObservable();
  readonly joinError$: Observable<{
    conversationId?: string;
    channelId?: string;
    serverId?: string;
    error: string;
  }> = this.joinErrorSubject.asObservable();
  readonly presenceUpdated$: Observable<PresenceUpdatedPayload> =
    this.presenceUpdatedSubject.asObservable();
  readonly presenceSync$: Observable<PresenceSyncPayload> = this.presenceSyncSubject.asObservable();

  readonly channelsInvalidated$: Observable<{ serverId: string }> =
    this.channelsInvalidatedSubject.asObservable();
  readonly channelStructureUpdated$: Observable<{
    serverId: string;
    structure: ServerChannelStructure;
    updatedBy: string;
  }> = this.channelStructureUpdatedSubject.asObservable();
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
  readonly serverMemberJoined$: Observable<{
    serverId: string;
    userId: string;
    role?: string;
    member?: ServerMemberDto;
  }> = this.serverMemberJoinedSubject.asObservable();
  readonly serverMemberRoleUpdated$: Observable<{
    serverId: string;
    userId: string;
    roleId: string;
    action: 'added' | 'removed';
  }> = this.serverMemberRoleUpdatedSubject.asObservable();

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

  private readonly conversationDeletedSubject = new Subject<{
    conversationId: string;
    friendId?: string;
  }>();
  readonly conversationDeleted$: Observable<{
    conversationId: string;
    friendId?: string;
  }> = this.conversationDeletedSubject.asObservable();

  readonly directCallIncoming$: Observable<DirectCallDto> =
    this.directCallIncomingSubject.asObservable();
  readonly directCallRinging$: Observable<DirectCallDto> =
    this.directCallRingingSubject.asObservable();
  readonly directCallAccepted$: Observable<DirectCallDto> =
    this.directCallAcceptedSubject.asObservable();
  readonly directCallConnected$: Observable<{ callId: string; connectedAt: string }> =
    this.directCallConnectedSubject.asObservable();
  readonly directCallDeclined$: Observable<DirectCallDto> =
    this.directCallDeclinedSubject.asObservable();
  readonly directCallCancelled$: Observable<DirectCallDto> =
    this.directCallCancelledSubject.asObservable();
  readonly directCallEnded$: Observable<DirectCallDto> = this.directCallEndedSubject.asObservable();
  readonly directCallMissed$: Observable<DirectCallDto> =
    this.directCallMissedSubject.asObservable();
  readonly directCallBusy$: Observable<{ conversationId: string; calleeId: string }> =
    this.directCallBusySubject.asObservable();
  readonly directCallStateSync$: Observable<DirectCallDto | null> =
    this.directCallStateSyncSubject.asObservable();

  readonly voiceStateUpdated$: Observable<VoiceStateUpdatePayload> =
    this.voiceStateUpdatedSubject.asObservable();
  readonly voiceServerStatesSync$: Observable<VoiceServerStatesSyncPayload> =
    this.voiceServerStatesSyncSubject.asObservable();
  readonly voiceForceMove$: Observable<{
    serverId: string;
    channelId: string;
    channelName: string;
  }> = this.voiceForceMoveSubject.asObservable();
  readonly voiceForceDisconnect$: Observable<{
    serverId: string;
    channelId?: string;
  }> = this.voiceForceDisconnectSubject.asObservable();
  readonly voiceForceMute$: Observable<{
    serverId: string;
    isMuted: boolean;
  }> = this.voiceForceMuteSubject.asObservable();

  constructor() {}

  /**
   * Khởi tạo kết nối Socket.IO tới namespace /chat
   */
  connect(token?: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const tokenFromAuth =
      this.auth && typeof this.auth.accessToken === 'function' ? this.auth.accessToken() : null;

    const rawToken: string | undefined = token || tokenFromAuth || (this.currentToken ?? undefined);

    if (!rawToken) {
      this._connectionStatus.set('disconnected');
      return;
    }

    const authToken = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();

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

    this.socket = this.socketFactory(socketUrl, {
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

  updateToken(newToken: string): void {
    const cleanToken = newToken.startsWith('Bearer ') ? newToken.slice(7).trim() : newToken.trim();
    this.currentToken = cleanToken;
    if (this.socket) {
      this.socket.auth = { token: cleanToken };
      if (!this.socket.connected) {
        this.socket.connect();
      }
    }
  }

  /**
   * Ngắt kết nối và dọn dẹp toàn bộ registry khi đăng xuất
   */
  disconnect(): void {
    this.conversationRooms.clear();
    this.channelRooms.clear();
    this.serverRooms.clear();
    this.localVoiceStates.clear();
    this.currentToken = null;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this._connectionStatus.set('disconnected');
  }

  // ---------------------------------------------------------------------------
  // Multi-Room Registry: Conversations
  // ---------------------------------------------------------------------------

  async joinConversation(
    conversationId: string,
    timeoutMs = 5000,
  ): Promise<JoinConversationResponse> {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, status: 'disconnected' };
    }

    let reg = this.conversationRooms.get(conversationId);
    if (!reg) {
      reg = { refCount: 0, state: 'idle', joinPromise: null };
      this.conversationRooms.set(conversationId, reg);
    }

    reg.refCount++;

    if (reg.state === 'joined' && this.socket?.connected) {
      return { success: true, status: 'joined' };
    }

    if (reg.joinPromise) {
      return reg.joinPromise;
    }

    reg.state = 'joining';
    reg.joinPromise = (async (): Promise<JoinConversationResponse> => {
      try {
        const isConnected = await this.ensureConnected(undefined, timeoutMs);
        if (!isConnected || !this.socket || !this.socket.connected) {
          reg.state = 'idle';
          return {
            success: false,
            error: 'Socket chưa kết nối',
            status: 'disconnected',
          };
        }

        return await new Promise<JoinConversationResponse>((resolve) => {
          let resolved = false;
          const timer = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              reg.state = 'failed';
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
                reg.state = 'failed';
                const isForbidden =
                  res?.status === 'rejected' ||
                  res?.error?.toLowerCase().includes('không có quyền') ||
                  res?.error?.toLowerCase().includes('bị cấm') ||
                  res?.error?.toLowerCase().includes('forbidden');
                if (isForbidden) {
                  this.conversationRooms.delete(conversationId);
                  this.joinErrorSubject.next({
                    conversationId,
                    error: res?.error || 'Không thể tham gia cuộc trò chuyện.',
                  });
                }
                resolve({
                  success: false,
                  error: res?.error || 'Không thể tham gia cuộc trò chuyện.',
                  status: res?.status ?? 'rejected',
                });
                return;
              }

              reg.state = 'joined';
              resolve({
                success: true,
                status: 'joined',
              });
            },
          );
        });
      } catch (err: any) {
        reg.state = 'failed';
        return {
          success: false,
          error: err.message || 'Lỗi kết nối join conversation',
          status: 'timeout',
        };
      } finally {
        reg.joinPromise = null;
      }
    })();

    return reg.joinPromise;
  }

  leaveConversation(conversationId: string): void {
    const reg = this.conversationRooms.get(conversationId);
    if (reg) {
      reg.refCount--;
      if (reg.refCount <= 0) {
        this.conversationRooms.delete(conversationId);
        if (this.socket && this.socket.connected) {
          this.socket.emit('conversation:leave', { conversationId });
        }
      }
    } else {
      if (this.socket && this.socket.connected) {
        this.socket.emit('conversation:leave', { conversationId });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Multi-Room Registry: Channels
  // ---------------------------------------------------------------------------

  async joinChannel(channelId: string, timeoutMs = 5000): Promise<JoinConversationResponse> {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, status: 'disconnected' };
    }

    let reg = this.channelRooms.get(channelId);
    if (!reg) {
      reg = { refCount: 0, state: 'idle', joinPromise: null };
      this.channelRooms.set(channelId, reg);
    }

    reg.refCount++;

    if (reg.state === 'joined' && this.socket?.connected) {
      return { success: true, status: 'joined' };
    }

    if (reg.joinPromise) {
      return reg.joinPromise;
    }

    reg.state = 'joining';
    reg.joinPromise = (async (): Promise<JoinConversationResponse> => {
      try {
        const isConnected = await this.ensureConnected(undefined, timeoutMs);
        if (!isConnected || !this.socket || !this.socket.connected) {
          reg.state = 'idle';
          return {
            success: false,
            error: 'Socket chưa kết nối',
            status: 'disconnected',
          };
        }

        return await new Promise<JoinConversationResponse>((resolve) => {
          let resolved = false;
          const timer = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              reg.state = 'failed';
              resolve({
                success: false,
                error: 'Hết thời gian chờ phản hồi join channel',
                status: 'timeout',
              });
            }
          }, timeoutMs);

          this.socket?.emit('channel:join', { channelId }, (res: JoinConversationResponse) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);

            if (!res?.success) {
              reg.state = 'failed';
              const isForbidden =
                res?.status === 'rejected' ||
                res?.error?.toLowerCase().includes('không có quyền') ||
                res?.error?.toLowerCase().includes('bị cấm') ||
                res?.error?.toLowerCase().includes('forbidden');
              if (isForbidden) {
                this.channelRooms.delete(channelId);
                this.joinErrorSubject.next({
                  channelId,
                  error: res?.error || 'Không thể tham gia kênh máy chủ.',
                });
              }
              resolve({
                success: false,
                error: res?.error || 'Không thể tham gia kênh máy chủ.',
                status: res?.status ?? 'rejected',
              });
              return;
            }

            reg.state = 'joined';
            resolve({
              success: true,
              status: 'joined',
            });
          });
        });
      } catch (err: any) {
        reg.state = 'failed';
        return {
          success: false,
          error: err.message || 'Lỗi kết nối join channel',
          status: 'timeout',
        };
      } finally {
        reg.joinPromise = null;
      }
    })();

    return reg.joinPromise;
  }

  leaveChannel(channelId: string): void {
    const reg = this.channelRooms.get(channelId);
    if (reg) {
      reg.refCount--;
      if (reg.refCount <= 0) {
        this.channelRooms.delete(channelId);
        if (this.socket && this.socket.connected) {
          this.socket.emit('channel:leave', { channelId });
        }
      }
    } else {
      if (this.socket && this.socket.connected) {
        this.socket.emit('channel:leave', { channelId });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Multi-Room Registry: Server Rooms
  // ---------------------------------------------------------------------------

  async joinServer(serverId: string, timeoutMs = 5000): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;

    let reg = this.serverRooms.get(serverId);
    if (!reg) {
      reg = { refCount: 0, state: 'idle', joinPromise: null };
      this.serverRooms.set(serverId, reg);
    }

    reg.refCount++;

    if (reg.state === 'joined' && this.socket?.connected) {
      return true;
    }

    return this.ensureServerRoomJoined(serverId, reg, timeoutMs);
  }

  private async ensureServerRoomJoined(
    serverId: string,
    reg: ServerRoomRegistration,
    timeoutMs = 5000,
  ): Promise<boolean> {
    if (reg.state === 'joined' && this.socket?.connected) return true;
    if (reg.state === 'joining' && reg.joinPromise) return reg.joinPromise;

    reg.state = 'joining';
    reg.joinPromise = (async () => {
      try {
        const isConnected = await this.ensureConnected(undefined, timeoutMs);
        if (!isConnected || !this.socket || !this.socket.connected) {
          reg.state = 'idle';
          return false;
        }

        return await new Promise<boolean>((resolve) => {
          this.socket?.emit(
            'server:join',
            { serverId },
            (res: { success: boolean; error?: string }) => {
              if (res?.success) {
                reg.state = 'joined';
                this.reconcileVoiceState(serverId);
                this.refreshServerVoiceStates(serverId);
                resolve(true);
              } else {
                reg.state = 'failed';
                resolve(false);
              }
            },
          );
        });
      } catch {
        reg.state = 'failed';
        return false;
      } finally {
        reg.joinPromise = null;
      }
    })();

    return reg.joinPromise;
  }

  leaveServer(serverId: string): Promise<void> {
    const reg = this.serverRooms.get(serverId);
    if (reg) {
      reg.refCount--;
      if (reg.refCount <= 0) {
        this.serverRooms.delete(serverId);
        this.localVoiceStates.delete(serverId);
        if (this.socket && this.socket.connected) {
          this.socket.emit('server:leave', { serverId });
        }
      }
    }
    return Promise.resolve();
  }

  // ---------------------------------------------------------------------------
  // Typing Indicators
  // ---------------------------------------------------------------------------

  startTyping(target: string | { conversationId?: string; channelId?: string }): void {
    if (this.socket && this.socket.connected) {
      if (typeof target === 'string') {
        this.socket.emit('typing:start', { conversationId: target });
      } else {
        this.socket.emit('typing:start', target);
      }
    }
  }

  stopTyping(target: string | { conversationId?: string; channelId?: string }): void {
    if (this.socket && this.socket.connected) {
      if (typeof target === 'string') {
        this.socket.emit('typing:stop', { conversationId: target });
      } else {
        this.socket.emit('typing:stop', target);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Presence Activity Indicator
  // ---------------------------------------------------------------------------

  emitActivity(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('presence:activity');
    }
  }

  // ---------------------------------------------------------------------------
  // Socket Listeners & Reconnect Rejoining
  // ---------------------------------------------------------------------------

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this._connectionStatus.set('connected');

      // Tự động rejoin toàn bộ server rooms đang đăng ký
      for (const serverId of this.serverRooms.keys()) {
        const reg = this.serverRooms.get(serverId);
        if (reg) {
          reg.state = 'idle';
          reg.joinPromise = null;
          void this.ensureServerRoomJoined(serverId, reg);
        }
      }

      // Tự động rejoin toàn bộ channel rooms đang đăng ký
      for (const channelId of this.channelRooms.keys()) {
        const reg = this.channelRooms.get(channelId);
        if (reg) {
          reg.state = 'idle';
          reg.joinPromise = null;
          void this.joinChannel(channelId);
        }
      }

      // Tự động rejoin toàn bộ conversation rooms đang đăng ký
      for (const convId of this.conversationRooms.keys()) {
        const reg = this.conversationRooms.get(convId);
        if (reg) {
          reg.state = 'idle';
          reg.joinPromise = null;
          void this.joinConversation(convId);
        }
      }
    });

    this.socket.on('disconnect', () => {
      this._connectionStatus.set('disconnected');
    });

    this.socket.on('connect_error', async (err: Error) => {
      this._connectionStatus.set('error');

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
          // Bỏ qua lỗi refresh
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

    this.socket.on('message:hidden-for-user', (payload) => {
      this.messageHiddenForUserSubject.next({
        channelId: payload.channelId ?? null,
        conversationId: payload.conversationId ?? null,
        messageId: payload.messageId,
        userId: payload.userId,
        hiddenAt: payload.hiddenAt,
      });
    });

    this.socket.on('message:reaction-updated', (payload) => {
      this.reactionUpdatedSubject.next(payload);
    });

    this.socket.on('message:pin-updated', (payload) => {
      this.messagePinUpdatedSubject.next({
        channelId: payload.channelId ?? null,
        conversationId: payload.conversationId ?? null,
        message: payload.message,
        pinned: payload.pinned,
      });
    });

    this.socket.on('message:read', (payload) => {
      this.messageReadSubject.next({
        conversationId: payload.conversationId ?? null,
        channelId: payload.channelId ?? null,
        userId: payload.userId || payload.readerId || '',
        lastReadMessageId: payload.lastReadMessageId,
      });
    });

    this.socket.on('unread:update', (payload) => {
      this.unreadUpdateSubject.next({
        channelId: payload.channelId ?? null,
        conversationId: payload.conversationId ?? null,
        serverId: payload.serverId ?? null,
        unreadCount: payload.unreadCount ?? 0,
        mentionCount: payload.mentionCount ?? 0,
        authorId: payload.authorId ?? null,
        messageId: payload.messageId ?? null,
      });
    });

    this.socket.on('notification:new', (payload) => {
      if (payload?.notification) {
        this.notificationNewSubject.next(payload.notification);
      }
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

    this.socket.on('conversation:deleted', (payload) => {
      this.conversationDeletedSubject.next(payload);
    });

    this.socket.on('user:block-created', (payload) => {
      this.userBlockCreatedSubject.next(payload);
    });

    this.socket.on('user:block-removed', (payload) => {
      this.userBlockRemovedSubject.next(payload);
    });

    this.socket.on('relationship:invalidated', (payload) => {
      this.relationshipInvalidatedSubject.next(payload);
    });

    this.socket.on('presence:updated', (payload) => {
      this.presenceUpdatedSubject.next(payload);
    });

    this.socket.on('presence:sync', (payload) => {
      this.presenceSyncSubject.next(payload);
    });

    this.socket.on('server:channels-invalidated', (payload) => {
      this.channelsInvalidatedSubject.next(payload);
    });

    this.socket.on('server:channel-structure-updated', (payload) => {
      this.channelStructureUpdatedSubject.next(payload);
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

    this.socket.on('server:member-joined', (payload) => {
      this.serverMemberJoinedSubject.next(payload);
    });

    this.socket.on('server:member-role-updated', (payload) => {
      this.serverMemberRoleUpdatedSubject.next(payload);
    });

    // Direct Call Signaling
    this.socket.on('direct-call:incoming', (payload) => {
      this.directCallIncomingSubject.next(payload);
    });
    this.socket.on('direct-call:ringing', (payload) => {
      this.directCallRingingSubject.next(payload);
    });
    this.socket.on('direct-call:accepted', (payload) => {
      this.directCallAcceptedSubject.next(payload);
    });
    this.socket.on('direct-call:connected', (payload) => {
      this.directCallConnectedSubject.next(payload);
    });
    this.socket.on('direct-call:declined', (payload) => {
      this.directCallDeclinedSubject.next(payload);
    });
    this.socket.on('direct-call:cancelled', (payload) => {
      this.directCallCancelledSubject.next(payload);
    });
    this.socket.on('direct-call:ended', (payload) => {
      this.directCallEndedSubject.next(payload);
    });
    this.socket.on('direct-call:missed', (payload) => {
      this.directCallMissedSubject.next(payload);
    });
    this.socket.on('direct-call:busy', (payload) => {
      this.directCallBusySubject.next(payload);
    });
    this.socket.on('direct-call:state-sync', (payload) => {
      this.directCallStateSyncSubject.next(payload);
    });

    // Server Voice States
    this.socket.on('voice:state-updated', (payload) => {
      this.voiceStateUpdatedSubject.next(payload);
    });
    this.socket.on('voice:server-states-sync', (payload) => {
      this.voiceServerStatesSyncSubject.next(payload);
    });
    this.socket.on('voice:force-move', (payload) => {
      this.voiceForceMoveSubject.next(payload);
    });
    this.socket.on('voice:force-disconnect', (payload) => {
      this.voiceForceDisconnectSubject.next(payload);
    });
    this.socket.on('voice:force-mute', (payload) => {
      this.voiceForceMuteSubject.next(payload);
    });
  }

  updateVoiceState(payload: LocalVoiceState): void {
    if (payload.channelId) {
      this.localVoiceStates.set(payload.serverId, payload);
    } else {
      this.localVoiceStates.delete(payload.serverId);
    }

    if (this.socket && this.socket.connected) {
      this.socket.emit('voice:state-update', payload);
    }
  }

  private reconcileVoiceState(serverId: string): void {
    const state = this.localVoiceStates.get(serverId);
    if (state && this.socket?.connected) {
      this.socket.emit('voice:state-update', state);
    }
  }

  private refreshServerVoiceStates(serverId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('voice:get-server-states', { serverId }, (payload) => {
      if (payload?.serverId === serverId) {
        this.voiceServerStatesSyncSubject.next(payload);
      }
    });
  }

  moveVoiceMember(serverId: string, targetUserId: string, targetChannelId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('voice:move-member', { serverId, targetUserId, targetChannelId });
    }
  }

  kickVoiceMember(serverId: string, targetUserId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('voice:kick-member', { serverId, targetUserId });
    }
  }

  serverMuteVoiceMember(serverId: string, targetUserId: string, isMuted: boolean): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('voice:server-mute-member', { serverId, targetUserId, isMuted });
    }
  }

  getServerVoiceStates(serverId: string): Promise<VoiceServerStatesSyncPayload> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        return resolve({ serverId, states: [] });
      }
      this.socket.emit(
        'voice:get-server-states',
        { serverId },
        (response: VoiceServerStatesSyncPayload) => {
          if (response && response.states) {
            this.voiceServerStatesSyncSubject.next(response);
            resolve(response);
          } else {
            resolve({ serverId, states: [] });
          }
        },
      );
    });
  }

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
