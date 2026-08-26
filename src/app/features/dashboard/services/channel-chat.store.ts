import {
  computed,
  inject,
  Injectable,
  OnDestroy,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import {
  AttachmentResponseDto,
  MessageAuthorDto,
  MessageResponseDto,
  MessagesApiService,
  ReactionSummaryDto,
} from '../../../core/api/messages-api.service';
import { ServersApiService } from '../../../core/api/servers-api.service';
import { ChatSocketService } from '../../../core/realtime/chat-socket.service';
import { extractErrorMessage } from '../../../core/utils/error.util';
import { compareMessageOrder } from '../../../core/utils/safe-message-comparator';
export { compareMessageOrder as compareMessageIds } from '../../../core/utils/safe-message-comparator';
import type { MessagePayload } from '../../../../shared/socket-events';
import { GiphyMediaDto } from '../../../../shared/dto/messages.dto';

export interface OptimisticChannelMessage {
  clientNonce: string;
  channelId: string;
  content: string | null;
  replyToId?: string;
  status: 'sending' | 'failed';
  attachments?: AttachmentResponseDto[];
  files?: File[];
  externalMedia?: GiphyMediaDto | null;
  errorMessage?: string;
  createdAt: string;
  optimisticSeq?: number;
}

export interface ChannelChatUiMessage {
  id: string;
  channelId: string | null;
  conversationId: string | null;
  authorId: string | null;
  author?: MessageAuthorDto;
  type: 'default' | 'system_join' | 'system_leave';
  content: string | null;
  replyToId: string | null;
  clientNonce: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  isForwarded: boolean;
  externalMedia: GiphyMediaDto | null;
  attachments?: AttachmentResponseDto[];
  reactions?: ReactionSummaryDto[];
  createdAt: string;
  status: 'persisted' | 'sending' | 'failed';
  errorMessage?: string;
}

export interface ChannelEffectivePermissions {
  canView: boolean;
  canSend: boolean;
  canAttach: boolean;
  canManageMessages: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ChannelChatStore implements OnDestroy {
  private readonly messagesApi = inject(MessagesApiService);
  private readonly serversApi = inject(ServersApiService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly auth = inject(AuthService);

  private readonly subs = new Subscription();

  /** Thế hệ request hiện tại để huỷ bỏ response cũ đến muộn */
  private currentGeneration = 0;

  /** Buffer lưu tạm các realtime events đến trong lúc REST getMessages đang fetch */
  private bufferedRealtimeMessages: MessagePayload[] = [];
  private isReconciling = false;
  private optimisticSeqCounter = 0;

  // State Signals
  private readonly _serverId = signal<string | null>(null);
  private readonly _channelId = signal<string | null>(null);
  private readonly _messages = signal<MessageResponseDto[]>([]);
  private readonly _optimisticMessages = signal<OptimisticChannelMessage[]>([]);
  private readonly _lastReadMessageId = signal<string | null>(null);
  private readonly _typingUserIds = signal<string[]>([]);
  private readonly _hasMore = signal<boolean>(false);
  private readonly _nextCursor = signal<string | undefined>(undefined);
  private readonly _loadingInitial = signal<boolean>(false);
  private readonly _loadingMore = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _chatError = signal<{
    status?: number;
    message: string;
    type: '401' | '403' | '404' | '5xx' | 'network' | 'unknown';
  } | null>(null);
  private readonly _paginationError = signal<string | null>(null);
  private readonly _permissions = signal<ChannelEffectivePermissions>({
    canView: true,
    canSend: true,
    canAttach: true,
    canManageMessages: false,
  });

  // Readonly Selectors
  readonly serverId = this._serverId.asReadonly();
  readonly channelId = this._channelId.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly optimisticMessages = this._optimisticMessages.asReadonly();
  readonly lastReadMessageId = this._lastReadMessageId.asReadonly();
  readonly typingUserIds = this._typingUserIds.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly nextCursor = this._nextCursor.asReadonly();
  readonly loadingInitial = this._loadingInitial.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly chatError = this._chatError.asReadonly();
  readonly paginationError = this._paginationError.asReadonly();
  readonly permissions = this._permissions.asReadonly();

  /**
   * Danh sách toàn bộ tin nhắn UI kết hợp giữa persisted và optimistic messages,
   * được sắp xếp bằng compareMessageOrder an toàn.
   */
  readonly allMessages = computed<ChannelChatUiMessage[]>(() => {
    const persisted = this._messages();
    const persistedNonces = new Set(
      persisted.map((m) => m.clientNonce).filter((n): n is string => Boolean(n)),
    );

    const currentUser = this.auth.user();
    const currentAuthor: MessageAuthorDto | undefined = currentUser
      ? {
          id: currentUser.id,
          username: currentUser.email?.split('@')[0] || 'me',
          displayName: currentUser.user_metadata?.['full_name'] || currentUser.email?.split('@')[0] || 'Me',
          avatarUrl: currentUser.user_metadata?.['avatar_url'] || null,
        }
      : undefined;

    const optimistic: ChannelChatUiMessage[] = this._optimisticMessages()
      .filter((opt) => !persistedNonces.has(opt.clientNonce))
      .map((opt) => ({
        id: `opt-${opt.clientNonce}`,
        channelId: opt.channelId,
        conversationId: null,
        authorId: currentUser?.id ?? null,
        author: currentAuthor,
        type: 'default',
        content: opt.content,
        replyToId: opt.replyToId ?? null,
        clientNonce: opt.clientNonce,
        editedAt: null,
        deletedAt: null,
        isForwarded: false,
        externalMedia: opt.externalMedia ?? null,
        attachments: opt.attachments,
        reactions: [],
        createdAt: opt.createdAt,
        status: opt.status,
        errorMessage: opt.errorMessage,
      }));

    const persistedUi: ChannelChatUiMessage[] = persisted.map((m) => ({
      ...m,
      externalMedia: m.externalMedia ?? null,
      status: 'persisted',
    }));

    return [...persistedUi, ...optimistic].sort((a, b) => compareMessageOrder(a, b));
  });

  constructor() {
    this.setupSocketSubscriptions();
  }

  /**
   * Cleanup nguyên tử toàn bộ trạng thái của store theo đúng thứ tự:
   * a. capture activeChannelId;
   * b. currentGeneration++;
   * c. isReconciling = false và clear buffer;
   * d. leaveChannel(activeChannelId);
   * e. reset signals;
   */
  clear(): void {
    const activeChannelId = this._channelId();
    this.currentGeneration++;
    this.isReconciling = false;
    this.bufferedRealtimeMessages = [];

    if (activeChannelId) {
      this.chatSocket.leaveChannel(activeChannelId);
    }

    this._serverId.set(null);
    this._channelId.set(null);
    this._messages.set([]);
    this._optimisticMessages.set([]);
    this._lastReadMessageId.set(null);
    this._typingUserIds.set([]);
    this._hasMore.set(false);
    this._nextCursor.set(undefined);
    this._loadingInitial.set(false);
    this._loadingMore.set(false);
    this._error.set(null);
    this._chatError.set(null);
    this._paginationError.set(null);
  }

  ngOnDestroy(): void {
    this.clear();
    this.subs.unsubscribe();
  }

  /**
   * Join–Fetch–Reconciliation Sequence:
   * 1. Tăng generation counter (hủy buffer cũ).
   * 2. Bắt đầu buffer realtime messages & updates.
   * 3. Join socket room.
   * 4. Gọi REST getChannelMessages({ limit: 50 }).
   * 5. Merge REST history + Buffered realtime events.
   * 6. Deduplicate theo message.id và clientNonce.
   * 7. Sắp xếp bằng compareMessageOrder.
   * 8. Render vào _messages signal rồi mới hoàn tất loading.
   */
  async loadInitial(serverId: string, channelId: string): Promise<void> {
    const generation = ++this.currentGeneration;
    this.isReconciling = true;
    this.bufferedRealtimeMessages = [];

    // Rời khỏi channel cũ nếu khác channel
    const oldChannelId = this._channelId();
    if (oldChannelId && oldChannelId !== channelId) {
      this.chatSocket.leaveChannel(oldChannelId);
    }

    this._serverId.set(serverId);
    this._channelId.set(channelId);
    this._messages.set([]);
    this._optimisticMessages.set([]);
    this._lastReadMessageId.set(null);
    this._typingUserIds.set([]);
    this._hasMore.set(false);
    this._nextCursor.set(undefined);
    this._loadingInitial.set(true);
    this._error.set(null);
    this._chatError.set(null);
    this._paginationError.set(null);

    // Tính toán quyền và join socket song song
    void this.refreshPermissions(serverId, channelId);
    void this.chatSocket.joinChannel(channelId);

    try {
      const response = await this.messagesApi.getChannelMessages(channelId, { limit: 50 });

      // Nếu đã chuyển sang request thế hệ mới hơn -> huỷ kết quả này
      if (generation !== this.currentGeneration) {
        return;
      }

      // Merge REST messages + Buffered realtime messages
      const combinedMap = new Map<string, MessageResponseDto>();
      for (const m of response.messages || []) {
        combinedMap.set(m.id, m);
      }
      for (const b of this.bufferedRealtimeMessages) {
        combinedMap.set(b.id, b as MessageResponseDto);
      }

      const mergedMessages = Array.from(combinedMap.values()).sort((a, b) => compareMessageOrder(a, b));

      this._messages.set(mergedMessages);
      this._hasMore.set(response.hasMore);
      this._nextCursor.set(response.nextCursor);
      this._lastReadMessageId.set(response.lastReadMessageId ?? null);
      this.isReconciling = false;
      this.bufferedRealtimeMessages = [];
      this._loadingInitial.set(false);
    } catch (err: any) {
      if (generation !== this.currentGeneration) return;
      this.isReconciling = false;
      this.bufferedRealtimeMessages = [];
      this._loadingInitial.set(false);

      const status = err?.status ?? err?.statusCode;
      const message = extractErrorMessage(err, 'Không thể tải tin nhắn kênh.');

      let type: '401' | '403' | '404' | '5xx' | 'network' | 'unknown' = 'unknown';
      if (status === 401) type = '401';
      else if (status === 403) type = '403';
      else if (status === 404) type = '404';
      else if (status >= 500) type = '5xx';
      else if (status === 0 || !navigator.onLine) type = 'network';

      this._error.set(message);
      this._chatError.set({ status, message, type });
    }
  }

  /**
   * Tải thêm tin nhắn cũ hơn (Cursor Pagination).
   */
  async loadMore(): Promise<void> {
    const channelId = this._channelId();
    const cursor = this._nextCursor();
    if (!channelId || !cursor || this._loadingMore() || !this._hasMore()) {
      return;
    }

    this._loadingMore.set(true);
    this._paginationError.set(null);
    const generation = this.currentGeneration;

    try {
      const response = await this.messagesApi.getChannelMessages(channelId, {
        limit: 50,
        before: cursor,
      });

      if (generation !== this.currentGeneration) return;

      const current = this._messages();
      const existingIds = new Set(current.map((m) => m.id));
      const newUnique = response.messages.filter((m) => !existingIds.has(m.id));

      const merged = [...newUnique, ...current].sort((a, b) => compareMessageOrder(a, b));

      this._messages.set(merged);
      this._hasMore.set(response.hasMore);
      this._nextCursor.set(response.nextCursor);
      this._loadingMore.set(false);
    } catch (err: any) {
      if (generation !== this.currentGeneration) return;
      this._loadingMore.set(false);
      this._paginationError.set(extractErrorMessage(err, 'Không thể tải thêm tin nhắn.'));
    }
  }

  /**
   * Cập nhật quyền hiệu lực của người dùng trên channel.
   */
  async refreshPermissions(serverId: string, channelId: string): Promise<void> {
    try {
      const caps = await this.serversApi.getCapabilities(serverId);
      if (caps.isOwner) {
        this._permissions.set({
          canView: true,
          canSend: true,
          canAttach: true,
          canManageMessages: true,
        });
        return;
      }
      this._permissions.set({
        canView: true,
        canSend: true,
        canAttach: true,
        canManageMessages: caps.canManageChannels,
      });
    } catch {
      // Giữ mặc định
    }
  }

  /**
   * Gửi tin nhắn mới vào kênh máy chủ (Optimistic Update).
   */
  async sendMessage(
    payloadOrContent?:
      | string
      | {
          content?: string;
          replyToId?: string;
          files?: File[];
          attachments?: any[];
          externalMedia?: GiphyMediaDto;
        },
    files?: File[],
    replyToId?: string,
  ): Promise<MessageResponseDto | null> {
    const channelId = this._channelId();
    if (!channelId) return null;

    let content: string | undefined;
    let replyId: string | undefined;
    let actualFiles: File[] | undefined;
    let externalMedia: GiphyMediaDto | undefined;

    if (typeof payloadOrContent === 'string') {
      content = payloadOrContent.trim();
      actualFiles = files;
      replyId = replyToId;
    } else if (payloadOrContent) {
      content = payloadOrContent.content?.trim();
      replyId = payloadOrContent.replyToId || replyToId;
      actualFiles = payloadOrContent.files || files;
      externalMedia = payloadOrContent.externalMedia;
    }

    if (!content && (!actualFiles || actualFiles.length === 0) && !externalMedia) {
      return null;
    }

    const clientNonce = crypto.randomUUID();
    const optimisticSeq = ++this.optimisticSeqCounter;

    const optimisticAttachments: AttachmentResponseDto[] = (actualFiles || []).map((file) => ({
      id: `opt-att-${crypto.randomUUID()}`,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      width: null,
      height: null,
      signedUrl: URL.createObjectURL(file),
      isAvailable: true,
    }));

    const optMsg: OptimisticChannelMessage = {
      clientNonce,
      channelId,
      content: content || null,
      replyToId: replyId,
      status: 'sending',
      attachments: optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
      files: actualFiles,
      externalMedia: externalMedia || null,
      createdAt: new Date().toISOString(),
      optimisticSeq,
    };

    this._optimisticMessages.update((curr) => [...curr, optMsg]);

    try {
      const persisted = await this.messagesApi.sendChannelMessage(channelId, {
        content: optMsg.content || undefined,
        clientNonce,
        replyToId: replyId,
        files: actualFiles,
        externalMedia,
      });

      // Thay thế optimistic message bằng persisted message
      this._optimisticMessages.update((curr) => curr.filter((m) => m.clientNonce !== clientNonce));
      this.upsertPersistedMessage(persisted);

      return persisted;
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err, 'Không thể gửi tin nhắn.');
      this._optimisticMessages.update((curr) =>
        curr.map((m) => (m.clientNonce === clientNonce ? { ...m, status: 'failed', errorMessage } : m)),
      );
      return null;
    }
  }

  /**
   * Thử gửi lại tin nhắn bị lỗi.
   */
  async retrySendMessage(clientNonce: string): Promise<void> {
    const opt = this._optimisticMessages().find((m) => m.clientNonce === clientNonce);
    if (!opt) return;

    this._optimisticMessages.update((curr) =>
      curr.map((m) => (m.clientNonce === clientNonce ? { ...m, status: 'sending', errorMessage: undefined } : m)),
    );

    try {
      const persisted = await this.messagesApi.sendChannelMessage(opt.channelId, {
        content: opt.content || undefined,
        clientNonce: opt.clientNonce,
        replyToId: opt.replyToId,
        files: opt.files,
        externalMedia: opt.externalMedia || undefined,
      });

      this._optimisticMessages.update((curr) => curr.filter((m) => m.clientNonce !== clientNonce));
      this.upsertPersistedMessage(persisted);
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err, 'Thử gửi lại thất bại.');
      this._optimisticMessages.update((curr) =>
        curr.map((m) => (m.clientNonce === clientNonce ? { ...m, status: 'failed', errorMessage } : m)),
      );
    }
  }

  /**
   * Huỷ bỏ optimistic message bị lỗi.
   */
  cancelOptimisticMessage(clientNonce: string): void {
    this._optimisticMessages.update((curr) => curr.filter((m) => m.clientNonce !== clientNonce));
  }

  /**
   * Chỉnh sửa tin nhắn.
   */
  async editMessage(messageId: string, content: string): Promise<void> {
    const updated = await this.messagesApi.editMessage(messageId, { content });
    this.upsertPersistedMessage(updated);
  }

  /**
   * Ẩn tin nhắn chỉ ở phía người dùng (Hide for Me) với Optimistic Update và Rollback cục bộ.
   */
  async hideMessage(messageId: string): Promise<void> {
    const list = this._messages();
    const targetIdx = list.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    const originalMsg = list[targetIdx];

    // 1. Optimistic removal
    this._messages.update((curr) => curr.filter((m) => m.id !== messageId));

    // 2. Gọi REST API
    try {
      await this.messagesApi.hideMessage(messageId);
    } catch (err: unknown) {
      // 3. Rollback: Chèn lại message vào đúng vị trí canonical
      this._messages.update((curr) => {
        if (curr.some((m) => m.id === originalMsg.id)) return curr;
        return [...curr, originalMsg].sort((a, b) => compareMessageOrder(a, b));
      });
      const errorMsg = extractErrorMessage(err, 'Lỗi khi ẩn tin nhắn.');
      this._error.set(errorMsg);
      throw err;
    }
  }

  /**
   * Thu hồi tin nhắn đối với mọi người trong kênh (Recall for Everyone) với Optimistic Update và Rollback cục bộ.
   */
  async recallMessage(messageId: string): Promise<void> {
    const list = this._messages();
    const targetIdx = list.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    const originalMsg = list[targetIdx];

    // 1. Optimistic redact
    const recalledMsg: MessageResponseDto = {
      ...originalMsg,
      content: null,
      deletedAt: new Date().toISOString(),
      attachments: [],
      reactions: [],
      externalMedia: null,
    };

    this._messages.update((curr) =>
      curr.map((m) => (m.id === messageId ? recalledMsg : m)),
    );

    // 2. Gọi REST API
    try {
      await this.messagesApi.recallMessage(messageId);
    } catch (err: unknown) {
      // 3. Rollback nguyên trạng
      this._messages.update((curr) =>
        curr.map((m) => (m.id === messageId ? originalMsg : m)),
      );
      const errorMsg = extractErrorMessage(err, 'Lỗi khi thu hồi tin nhắn.');
      this._error.set(errorMsg);
      throw err;
    }
  }

  /**
   * Xóa / Thu hồi tin nhắn (hỗ trợ scope: 'for_me' | 'everyone').
   */
  async deleteMessage(
    messageId: string,
    scope: 'for_me' | 'everyone' = 'for_me',
  ): Promise<void> {
    if (scope === 'for_me') {
      return this.hideMessage(messageId);
    }
    if (scope === 'everyone') {
      return this.recallMessage(messageId);
    }
  }

  /**
   * Thêm hoặc bỏ reaction (Optimistic).
   */
  async setReaction(messageId: string, emoji: string, reacted: boolean): Promise<void> {
    const channelId = this._channelId();
    if (!channelId) return;

    const currentUser = this.auth.user();
    if (!currentUser) return;

    // Optimistic reaction update
    this._messages.update((curr) =>
      curr.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = [...(m.reactions || [])];
        const idx = reactions.findIndex((r) => r.emoji === emoji);

        if (reacted) {
          if (idx >= 0) {
            reactions[idx] = {
              ...reactions[idx],
              count: reactions[idx].count + (reactions[idx].reactedByMe ? 0 : 1),
              reactedByMe: true,
            };
          } else {
            reactions.push({ emoji, count: 1, reactedByMe: true });
          }
        } else {
          if (idx >= 0) {
            const nextCount = reactions[idx].count - (reactions[idx].reactedByMe ? 1 : 0);
            if (nextCount <= 0) {
              reactions.splice(idx, 1);
            } else {
              reactions[idx] = { ...reactions[idx], count: nextCount, reactedByMe: false };
            }
          }
        }

        return { ...m, reactions };
      }),
    );

    try {
      const res = await this.messagesApi.setChannelReaction(channelId, messageId, {
        emoji,
        reacted,
      });

      this._messages.update((curr) =>
        curr.map((m) => (m.id === messageId ? { ...m, reactions: res.reactions } : m)),
      );
    } catch {
      // Revert if error
    }
  }

  /**
   * Đánh dấu đã đọc tin nhắn trong channel (Monotonic).
   */
  async markAsRead(messageId: string): Promise<void> {
    const channelId = this._channelId();
    if (!channelId) return;

    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    const currentLastRead = this._lastReadMessageId();
    if (currentLastRead && compareMessageOrder({ id: messageId }, { id: currentLastRead }) <= 0) {
      return;
    }

    this._lastReadMessageId.set(messageId);

    try {
      await this.messagesApi.markChannelAsRead(channelId, messageId);
    } catch {
      // Silent error
    }
  }

  startTyping(): void {
    const channelId = this._channelId();
    if (channelId) {
      this.chatSocket.startTyping({ channelId });
    }
  }

  stopTyping(): void {
    const channelId = this._channelId();
    if (channelId) {
      this.chatSocket.stopTyping({ channelId });
    }
  }

  private upsertPersistedMessage(msg: MessageResponseDto): void {
    this._messages.update((curr) => {
      const idx = curr.findIndex((m) => m.id === msg.id);
      if (idx >= 0) {
        const next = [...curr];
        next[idx] = msg;
        return next.sort((a, b) => compareMessageOrder(a, b));
      }
      return [...curr, msg].sort((a, b) => compareMessageOrder(a, b));
    });
  }

  private setupSocketSubscriptions(): void {
    // 1. Message created
    this.subs.add(
      this.chatSocket.messageCreated$.subscribe(({ message }) => {
        const activeChan = this._channelId();
        if (!activeChan || message.channelId !== activeChan) return;

        if (this.isReconciling) {
          this.bufferedRealtimeMessages.push(message);
          return;
        }

        // Xóa optimistic message tương ứng nếu có clientNonce
        if (message.clientNonce) {
          this._optimisticMessages.update((curr) =>
            curr.filter((m) => m.clientNonce !== message.clientNonce),
          );
        }

        this.upsertPersistedMessage(message as MessageResponseDto);
      }),
    );

    // 2. Message updated
    this.subs.add(
      this.chatSocket.messageUpdated$.subscribe(({ message }) => {
        const activeChan = this._channelId();
        if (!activeChan || message.channelId !== activeChan) return;

        this.upsertPersistedMessage(message as MessageResponseDto);
      }),
    );

    // 3. Message deleted (Thu hồi cho mọi người)
    this.subs.add(
      this.chatSocket.messageDeleted$.subscribe(({ channelId, messageId }) => {
        const activeChan = this._channelId();
        if (!activeChan || (channelId && channelId !== activeChan)) return;

        this._messages.update((curr) =>
          curr.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  content: null,
                  reactions: [],
                  attachments: [],
                  externalMedia: null,
                  deletedAt: new Date().toISOString(),
                }
              : m,
          ),
        );
      }),
    );

    // 3b. Message hidden for user (Ẩn tin nhắn ở phía tôi)
    if (this.chatSocket.messageHiddenForUser$) {
      this.subs.add(
        this.chatSocket.messageHiddenForUser$.subscribe(({ channelId, messageId }) => {
          const activeChan = this._channelId();
          if (!activeChan || (channelId && channelId !== activeChan)) return;

          this._messages.update((curr) => curr.filter((m) => m.id !== messageId));
        }),
      );
    }

    // 4. Reaction updated
    this.subs.add(
      this.chatSocket.reactionUpdated$.subscribe((payload) => {
        const activeChan = this._channelId();
        if (!activeChan || payload.channelId !== activeChan) return;

        this._messages.update((curr) =>
          curr.map((m) => {
            if (m.id !== payload.messageId) return m;
            return {
              ...m,
              reactions: payload.reactions as ReactionSummaryDto[],
            };
          }),
        );
      }),
    );

    // 5. Typing updated
    this.subs.add(
      this.chatSocket.typingUpdated$.subscribe((payload) => {
        const activeChan = this._channelId();
        if (!activeChan || payload.channelId !== activeChan) return;

        const myId = this.auth.user()?.id;
        const others = payload.userIds.filter((uid) => uid !== myId);
        this._typingUserIds.set(others);
      }),
    );

    // 6. Message read
    this.subs.add(
      this.chatSocket.messageRead$.subscribe((payload) => {
        const activeChan = this._channelId();
        if (!activeChan || payload.channelId !== activeChan) return;

        const current = this._lastReadMessageId();
        if (!current || compareMessageOrder({ id: payload.lastReadMessageId }, { id: current }) > 0) {
          this._lastReadMessageId.set(payload.lastReadMessageId);
        }
      }),
    );
  }
}
