import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import {
  AttachmentResponseDto,
  MessageAuthorDto,
  MessageResponseDto,
  MessagesApiService,
  ReactionSummaryDto,
} from '../../../core/api/messages-api.service';
import { ChatSocketService } from '../../../core/realtime/chat-socket.service';
import { extractErrorMessage } from '../../../core/utils/error.util';
import { compareMessageOrder } from '../../../core/utils/safe-message-comparator';
import { GiphyMediaDto } from '../../../../shared/dto/messages.dto';

export interface OptimisticMessage {
  clientNonce: string;
  conversationId: string;
  content: string | null;
  replyToId?: string;
  status: 'sending' | 'failed';
  attachments?: AttachmentResponseDto[];
  files?: File[];
  externalMedia?: GiphyMediaDto | null;
  errorMessage?: string;
  createdAt: string;
}

export interface ChatUiMessage {
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

/** So sánh 2 bigint message ID dạng string */
export function compareMessageIds(a: string, b: string): number {
  try {
    const diff = BigInt(a) - BigInt(b);
    return diff < 0n ? -1 : diff > 0n ? 1 : 0;
  } catch {
    return a.localeCompare(b);
  }
}

@Injectable({
  providedIn: 'root',
})
export class ActiveChatStore implements OnDestroy {
  private readonly messagesApi = inject(MessagesApiService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly auth = inject(AuthService);

  private readonly subs = new Subscription();

  /** Thế hệ request hiện tại để huỷ bỏ các response cũ đến muộn */
  private currentGeneration = 0;

  // State Signals
  private readonly _conversationId = signal<string | null>(null);
  private readonly _messages = signal<MessageResponseDto[]>([]);
  private readonly _optimisticMessages = signal<OptimisticMessage[]>([]);
  private readonly _readStates = signal<Record<string, string>>({}); // userId -> lastReadMessageId
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
  private readonly _pinnedMessages = signal<MessageResponseDto[]>([]);

  // Readonly Selectors
  readonly conversationId = this._conversationId.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly optimisticMessages = this._optimisticMessages.asReadonly();
  readonly readStates = this._readStates.asReadonly();
  readonly typingUserIds = this._typingUserIds.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly nextCursor = this._nextCursor.asReadonly();
  readonly loadingInitial = this._loadingInitial.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly chatError = this._chatError.asReadonly();
  readonly paginationError = this._paginationError.asReadonly();
  readonly pinnedMessages = this._pinnedMessages.asReadonly();
  readonly pinnedIds = computed(() => new Set(this._pinnedMessages().map((m) => m.id)));

  /**
   * Danh sách toàn bộ tin nhắn UI kết hợp giữa tin nhắn đã lưu (persisted)
   * và tin nhắn đang gửi / lỗi (optimistic), không bị lặp và đúng thứ tự thời gian.
   */
  readonly allMessages = computed<ChatUiMessage[]>(() => {
    const persisted = this._messages();
    const persistedNonces = new Set(
      persisted.map((m) => m.clientNonce).filter((n): n is string => Boolean(n)),
    );

    const currentUser = this.auth.user();
    const currentAuthor: MessageAuthorDto | undefined = currentUser
      ? {
          id: currentUser.id,
          username:
            (currentUser.user_metadata?.['username'] as string) ||
            currentUser.email?.split('@')[0] ||
            'Me',
          displayName:
            (currentUser.user_metadata?.['display_name'] as string) ||
            (currentUser.user_metadata?.['username'] as string) ||
            'Me',
          avatarUrl: (currentUser.user_metadata?.['avatar_url'] as string) || null,
        }
      : undefined;

    // Loại bỏ optimistic message đã có bản persisted từ REST hoặc Socket
    const activeOptimistic = this._optimisticMessages().filter(
      (opt) => !persistedNonces.has(opt.clientNonce),
    );

    const uiPersisted: ChatUiMessage[] = persisted.map((m) => ({
      ...m,
      externalMedia: m.externalMedia ?? null,
      isForwarded: Boolean(m.isForwarded),
      status: 'persisted',
    }));

    const uiOptimistic: ChatUiMessage[] = activeOptimistic.map((opt) => ({
      id: `opt-${opt.clientNonce}`,
      channelId: null,
      conversationId: opt.conversationId,
      authorId: currentUser?.id ?? null,
      author: currentAuthor,
      type: 'default',
      content: opt.content,
      isForwarded: false,
      externalMedia: opt.externalMedia ?? null,
      replyToId: opt.replyToId ?? null,
      clientNonce: opt.clientNonce,
      editedAt: null,
      deletedAt: null,
      attachments: opt.attachments,
      createdAt: opt.createdAt,
      status: opt.status,
      errorMessage: opt.errorMessage,
    }));

    // Gộp và sắp xếp bằng compareMessageOrder an toàn
    return [...uiPersisted, ...uiOptimistic].sort((a, b) => compareMessageOrder(a, b));
  });

  constructor() {
    this.setupRealtimeSubscriptions();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.revokeOptimisticBlobUrls(this._optimisticMessages());
    const currentId = this._conversationId();
    if (currentId) {
      this.chatSocket.leaveConversation(currentId);
    }
  }

  /**
   * Dọn dẹp trạng thái chat hiện tại và rời room socket
   */
  clear(): void {
    const currentId = this._conversationId();
    if (currentId) {
      this.chatSocket.leaveConversation(currentId);
    }
    this.revokeOptimisticBlobUrls(this._optimisticMessages());
    this.handledMutationIds.clear();
    this.currentGeneration++;
    this._conversationId.set(null);
    this._messages.set([]);
    this._optimisticMessages.set([]);
    this._readStates.set({});
    this._typingUserIds.set([]);
    this._hasMore.set(false);
    this._nextCursor.set(undefined);
    this._loadingInitial.set(false);
    this._loadingMore.set(false);
    this._error.set(null);
    this._chatError.set(null);
    this._paginationError.set(null);
    this._pinnedMessages.set([]);
  }

  // Trạng thái realtime socket riêng biệt (không đè lên REST error)
  private readonly _realtimeStatus = signal<
    'joined' | 'disconnected' | 'connecting' | 'timeout' | 'rejected' | null
  >(null);
  readonly realtimeStatus = this._realtimeStatus.asReadonly();

  /**
   * Thiết lập cuộc trò chuyện đang xem, chuyển room socket và tải lịch sử
   */
  async setActiveConversation(conversationId: string, force = false): Promise<void> {
    const prevId = this._conversationId();

    // Nếu cùng conversation và không ép buộc tải lại toàn bộ
    if (prevId === conversationId && !force) {
      // Nếu socket chưa joined, chỉ kích hoạt ensureConnected/join lại mà KHÔNG xóa tin nhắn hay reload REST
      if (this._realtimeStatus() !== 'joined') {
        this._realtimeStatus.set('connecting');
        const generation = this.currentGeneration;
        this.chatSocket.joinConversation(conversationId).then((joinRes) => {
          if (this._conversationId() === conversationId && this.currentGeneration === generation) {
            if (joinRes.status === 'joined' || joinRes.success) {
              this._realtimeStatus.set('joined');
            } else if (joinRes.status === 'rejected') {
              this._realtimeStatus.set('rejected');
            } else if (joinRes.status === 'timeout') {
              this._realtimeStatus.set('timeout');
            } else {
              this._realtimeStatus.set('disconnected');
            }
          }
        });
      }
      return;
    }

    // Thu hồi các blob preview URLs cũ trước khi chuyển phòng
    this.revokeOptimisticBlobUrls(this._optimisticMessages());

    // 1. Tăng thế hệ để loại bỏ các response cũ đang bay
    this.currentGeneration++;
    const generation = this.currentGeneration;

    // 2. Rời khỏi room cũ nếu có
    if (prevId) {
      this.chatSocket.leaveConversation(prevId);
    }

    // 3. Reset state cho cuộc trò chuyện mới
    this._conversationId.set(conversationId);
    this._messages.set([]);
    this._optimisticMessages.set([]);
    this._readStates.set({});
    this._typingUserIds.set([]);
    this._hasMore.set(false);
    this._nextCursor.set(undefined);
    this._error.set(null);
    this._chatError.set(null);
    this._paginationError.set(null);
    this._pinnedMessages.set([]);
    this._loadingInitial.set(true);
    this._realtimeStatus.set('connecting');

    // 4. Tham gia room socket mới và xử lý kết quả acknowledgment chi tiết
    this.chatSocket.joinConversation(conversationId).then((joinRes) => {
      if (this._conversationId() === conversationId && this.currentGeneration === generation) {
        if (joinRes?.status === 'joined' || joinRes?.success) {
          this._realtimeStatus.set('joined');
        } else if (joinRes?.status === 'rejected') {
          this._realtimeStatus.set('rejected');
          this._error.set(joinRes.error || 'Không có quyền truy cập cuộc trò chuyện.');
        } else if (joinRes?.status === 'timeout') {
          this._realtimeStatus.set('timeout');
        } else {
          this._realtimeStatus.set('disconnected');
        }
      }
    });

    // 5. Tải lịch sử tin nhắn ban đầu qua REST API
    try {
      const res = await this.messagesApi.getMessages(conversationId, {
        limit: 50,
      });

      // Kiểm tra race condition: chỉ apply nếu đúng conversation và đúng generation
      if (this._conversationId() === conversationId && this.currentGeneration === generation) {
        // Hợp nhất với các tin nhắn realtime đã nhận được từ socket trong khi chờ REST
        const existingRealtime = this._messages();
        const mergedMap = new Map<string, MessageResponseDto>();

        for (const m of res.messages) {
          mergedMap.set(m.id, m);
        }
        for (const m of existingRealtime) {
          mergedMap.set(m.id, m);
        }

        const sorted = Array.from(mergedMap.values()).sort((a, b) => compareMessageIds(a.id, b.id));

        this._messages.set(sorted);
        this._hasMore.set(res.hasMore);
        this._nextCursor.set(res.nextCursor);
        void this.loadPins(conversationId, generation).catch(() => {
          // Danh sách ghim là dữ liệu phụ; lỗi của nó không được chặn timeline.
        });
      }
    } catch (err: unknown) {
      if (this._conversationId() === conversationId && this.currentGeneration === generation) {
        const httpStatus = (err as { status?: number })?.status;
        let errType: '401' | '403' | '404' | '5xx' | 'network' | 'unknown' = 'unknown';
        if (httpStatus === 401) errType = '401';
        else if (httpStatus === 403) errType = '403';
        else if (httpStatus === 404) errType = '404';
        else if (httpStatus && httpStatus >= 500) errType = '5xx';
        else errType = 'network';

        const message = extractErrorMessage(err, 'Không thể tải lịch sử tin nhắn cuộc trò chuyện.');
        this._chatError.set({ status: httpStatus, message, type: errType });
        this._error.set(message);
      }
    } finally {
      if (this._conversationId() === conversationId && this.currentGeneration === generation) {
        this._loadingInitial.set(false);
      }
    }
  }

  /**
   * Thử lại việc tải lịch sử tin nhắn cho cuộc trò chuyện hiện tại (chỉ tải lại REST, không join lại socket nếu đã kết nối)
   */
  async retryInitialLoad(): Promise<void> {
    const convId = this._conversationId();
    if (!convId) return;
    const generation = this.currentGeneration;
    this._loadingInitial.set(true);
    this._error.set(null);
    this._chatError.set(null);

    try {
      const res = await this.messagesApi.getMessages(convId, { limit: 50 });
      if (this._conversationId() === convId && this.currentGeneration === generation) {
        const existingRealtime = this._messages();
        const mergedMap = new Map<string, MessageResponseDto>();

        for (const m of res.messages) {
          mergedMap.set(m.id, m);
        }
        for (const m of existingRealtime) {
          mergedMap.set(m.id, m);
        }

        const sorted = Array.from(mergedMap.values()).sort((a, b) => compareMessageIds(a.id, b.id));

        this._messages.set(sorted);
        this._hasMore.set(res.hasMore);
        this._nextCursor.set(res.nextCursor);
      }
    } catch (err: unknown) {
      if (this._conversationId() === convId && this.currentGeneration === generation) {
        const httpStatus = (err as { status?: number })?.status;
        let errType: '401' | '403' | '404' | '5xx' | 'network' | 'unknown' = 'unknown';
        if (httpStatus === 401) errType = '401';
        else if (httpStatus === 403) errType = '403';
        else if (httpStatus === 404) errType = '404';
        else if (httpStatus && httpStatus >= 500) errType = '5xx';
        else errType = 'network';

        const message = extractErrorMessage(err, 'Không thể tải lịch sử tin nhắn cuộc trò chuyện.');
        this._chatError.set({ status: httpStatus, message, type: errType });
        this._error.set(message);
      }
    } finally {
      if (this._conversationId() === convId && this.currentGeneration === generation) {
        this._loadingInitial.set(false);
      }
    }
  }

  /**
   * Tải các tin nhắn cũ hơn khi cuộn lên trên (Cursor Pagination)
   */
  async loadOlderMessages(): Promise<void> {
    const convId = this._conversationId();
    const cursor = this._nextCursor();
    const generation = this.currentGeneration;

    if (!convId || !this._hasMore() || this._loadingMore() || !cursor) {
      return;
    }

    this._loadingMore.set(true);
    this._paginationError.set(null);
    try {
      const res = await this.messagesApi.getMessages(convId, {
        before: cursor,
        limit: 50,
      });

      if (this._conversationId() === convId && this.currentGeneration === generation) {
        const mergedMap = new Map<string, MessageResponseDto>();
        for (const m of res.messages) {
          mergedMap.set(m.id, m);
        }
        for (const m of this._messages()) {
          mergedMap.set(m.id, m);
        }

        const merged = Array.from(mergedMap.values()).sort((a, b) => compareMessageIds(a.id, b.id));

        this._messages.set(merged);
        this._hasMore.set(res.hasMore);
        this._nextCursor.set(res.nextCursor);
      }
    } catch (err: any) {
      if (this._conversationId() === convId && this.currentGeneration === generation) {
        // Chỉ lưu lỗi phân trang, không ghi đè _error của toàn bộ cuộc trò chuyện
        this._paginationError.set(extractErrorMessage(err, 'Không thể tải thêm tin nhắn cũ.'));
      }
    } finally {
      if (this._conversationId() === convId && this.currentGeneration === generation) {
        this._loadingMore.set(false);
      }
    }
  }

  /**
   * Gửi tin nhắn mới với Optimistic UI (hỗ trợ text và files đính kèm)
   */
  async sendMessage(
    payloadOrContent:
      | string
      | {
          content?: string;
          replyToId?: string;
          files?: File[];
          attachments?: { file: File; previewUrl: string | null }[];
          externalMedia?: GiphyMediaDto;
        },
    replyToId?: string,
  ): Promise<void> {
    const convId = this._conversationId();
    if (!convId) return;

    let content: string | undefined;
    let replyId: string | undefined;
    let files: File[] | undefined;
    let passedAttachments: { file: File; previewUrl: string | null }[] | undefined;
    let externalMedia: GiphyMediaDto | undefined;

    if (typeof payloadOrContent === 'string') {
      content = payloadOrContent.trim();
      replyId = replyToId;
    } else {
      content = payloadOrContent.content?.trim();
      replyId = payloadOrContent.replyToId || replyToId;
      files = payloadOrContent.files;
      passedAttachments = payloadOrContent.attachments;
      externalMedia = payloadOrContent.externalMedia;
    }

    if (!content && (!files || files.length === 0) && !externalMedia) {
      return;
    }

    const generation = this.currentGeneration;
    const clientNonce = crypto.randomUUID();

    // Tái sử dụng previewUrl đã tạo từ MessageComposer (nếu có) để chỉ tạo đúng 1 blob URL duy nhất
    const optAttachments: AttachmentResponseDto[] = (files || []).map((f, idx) => {
      const passedPreviewUrl = passedAttachments?.find((p) => p.file === f)?.previewUrl;
      const signedUrl =
        passedPreviewUrl ??
        (/^(image\/|audio\/mpeg$|audio\/mp3$|video\/)/.test(f.type) ||
        /\.(mp3|mp4|m4v|webm|ogv|mov|qt|mkv|avi|mpeg|mpg|3gp|wmv|flv)$/i.test(f.name)
          ? URL.createObjectURL(f)
          : null);

      return {
        id: `opt-att-${clientNonce}-${idx}`,
        filename: f.name,
        mimeType: f.type,
        sizeBytes: f.size,
        width: null,
        height: null,
        signedUrl,
        isAvailable: true,
      };
    });

    const optimistic: OptimisticMessage = {
      clientNonce,
      conversationId: convId,
      content: content || null,
      replyToId: replyId,
      status: 'sending',
      attachments: optAttachments.length > 0 ? optAttachments : undefined,
      files,
      externalMedia: externalMedia || null,
      createdAt: new Date().toISOString(),
    };

    // Thêm vào hàng đợi optimistic
    this._optimisticMessages.update((list) => [...list, optimistic]);

    try {
      const created = await this.messagesApi.sendMessage(convId, {
        content,
        clientNonce,
        replyToId: replyId,
        files,
        externalMedia,
      });

      // Chỉ cập nhật state nếu cuộc trò chuyện vẫn khớp
      if (this._conversationId() === convId && this.currentGeneration === generation) {
        this.reconcileOptimisticMessage(clientNonce, created);
      }
    } catch (err: unknown) {
      if (this._conversationId() === convId && this.currentGeneration === generation) {
        this._optimisticMessages.update((list) =>
          list.map((m) =>
            m.clientNonce === clientNonce
              ? {
                  ...m,
                  status: 'failed',
                  errorMessage: extractErrorMessage(err, 'Gửi tin nhắn thất bại.'),
                }
              : m,
          ),
        );
      }
    }
  }

  /**
   * Thử gửi lại tin nhắn bị lỗi (giữ nguyên clientNonce ban đầu)
   */
  async retryMessage(clientNonce: string): Promise<void> {
    const item = this._optimisticMessages().find((m) => m.clientNonce === clientNonce);
    if (!item) return;

    const convId = item.conversationId;
    const generation = this.currentGeneration;

    // Đổi lại status thành sending
    this._optimisticMessages.update((list) =>
      list.map((m) =>
        m.clientNonce === clientNonce ? { ...m, status: 'sending', errorMessage: undefined } : m,
      ),
    );

    try {
      const created = await this.messagesApi.sendMessage(convId, {
        content: item.content || undefined,
        clientNonce: item.clientNonce,
        replyToId: item.replyToId,
        files: item.files,
        externalMedia: item.externalMedia || undefined,
      });

      if (this._conversationId() === convId && this.currentGeneration === generation) {
        this.reconcileOptimisticMessage(clientNonce, created);
      }
    } catch (err: unknown) {
      if (this._conversationId() === convId && this.currentGeneration === generation) {
        this._optimisticMessages.update((list) =>
          list.map((m) =>
            m.clientNonce === clientNonce
              ? {
                  ...m,
                  status: 'failed',
                  errorMessage: extractErrorMessage(err, 'Gửi lại tin nhắn thất bại.'),
                }
              : m,
          ),
        );
      }
    }
  }

  /**
   * Huỷ bỏ tin nhắn gửi lỗi khỏi hàng đợi
   */
  removeFailedMessage(clientNonce: string): void {
    const list = this._optimisticMessages();
    const matched = list.filter((m) => m.clientNonce === clientNonce);
    this.revokeOptimisticBlobUrls(matched);
    this._optimisticMessages.set(list.filter((m) => m.clientNonce !== clientNonce));
  }

  dismissFailedMessage(clientNonce: string): void {
    this.removeFailedMessage(clientNonce);
  }

  /**
   * Chỉnh sửa tin nhắn với Optimistic Update và Snapshot Rollback khi lỗi
   */
  async editMessage(messageId: string, newContent: string): Promise<MessageResponseDto> {
    const convId = this._conversationId();
    const generation = this.currentGeneration;

    const prevSnapshot = this._messages().find((m) => m.id === messageId);
    if (!prevSnapshot) {
      throw new Error('Không tìm thấy tin nhắn cần chỉnh sửa.');
    }

    // Optimistic update
    this._messages.update((list) =>
      list.map((m) =>
        m.id === messageId ? { ...m, content: newContent, editedAt: new Date().toISOString() } : m,
      ),
    );

    try {
      const updated = await this.messagesApi.editMessage(messageId, {
        content: newContent,
      });

      if (this._conversationId() === convId && this.currentGeneration === generation) {
        this._messages.update((list) => list.map((m) => (m.id === messageId ? updated : m)));
      }
      return updated;
    } catch (err: unknown) {
      if (this._conversationId() === convId && this.currentGeneration === generation) {
        // Rollback lại nội dung ban đầu
        this._messages.update((list) => list.map((m) => (m.id === messageId ? prevSnapshot : m)));
        const errorMsg = extractErrorMessage(err, 'Chỉnh sửa tin nhắn thất bại.');
        this._error.set(errorMsg);
      }
      throw err;
    }
  }

  /**
   * Ẩn tin nhắn chỉ ở phía người dùng (Hide for Me) với Optimistic Update và Rollback cục bộ.
   */
  async hideMessage(messageId: string): Promise<void> {
    const convId = this._conversationId();
    const generation = this.currentGeneration;

    const list = this._messages();
    const targetIdx = list.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    const originalMsg = list[targetIdx];

    // 1. Optimistic removal
    this._messages.update((current) => current.filter((m) => m.id !== messageId));

    // 2. Gọi REST API
    try {
      await this.messagesApi.hideMessage(messageId);
    } catch (err: unknown) {
      if (this._conversationId() === convId && this.currentGeneration === generation) {
        // 3. Rollback: Chèn lại message vào đúng vị trí canonical bằng compareMessageIds
        this._messages.update((current) => {
          if (current.some((m) => m.id === originalMsg.id)) return current;
          return [...current, originalMsg].sort((a, b) => compareMessageIds(a.id, b.id));
        });
        const errorMsg = extractErrorMessage(err, 'Lỗi khi ẩn tin nhắn.');
        this._error.set(errorMsg);
        throw err;
      }
    }
  }

  /**
   * Thu hồi tin nhắn đối với mọi người (Recall for Everyone) với Optimistic Update và Rollback cục bộ.
   */
  async recallMessage(messageId: string): Promise<void> {
    const convId = this._conversationId();
    const generation = this.currentGeneration;

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

    this._messages.update((current) => current.map((m) => (m.id === messageId ? recalledMsg : m)));

    // 2. Gọi REST API
    try {
      await this.messagesApi.recallMessage(messageId);
    } catch (err: unknown) {
      if (this._conversationId() === convId && this.currentGeneration === generation) {
        // 3. Rollback nguyên trạng
        this._messages.update((current) =>
          current.map((m) => (m.id === messageId ? originalMsg : m)),
        );
        const errorMsg = extractErrorMessage(err, 'Lỗi khi thu hồi tin nhắn.');
        this._error.set(errorMsg);
        throw err;
      }
    }
  }

  /**
   * Xoá / Thu hồi tin nhắn theo scope ('for_me' hoặc 'everyone')
   */
  async deleteMessage(messageId: string, scope: 'for_me' | 'everyone' = 'for_me'): Promise<void> {
    if (scope === 'for_me') {
      return this.hideMessage(messageId);
    }
    if (scope === 'everyone') {
      return this.recallMessage(messageId);
    }
  }

  /**
   * Tải lại signed URL cho attachment khi ảnh/tệp trả lỗi 401/403 (URL hết hạn)
   */
  async refreshAttachmentUrl(messageId: string, attachmentId: string): Promise<string | null> {
    const convId = this._conversationId();
    if (!convId) return null;

    try {
      const res = await this.messagesApi.getAttachmentSignedUrl(convId, attachmentId);
      if (res?.signedUrl) {
        this._messages.update((list) =>
          list.map((m) => {
            if (m.id !== messageId || !m.attachments) return m;
            return {
              ...m,
              attachments: m.attachments.map((a) =>
                a.id === attachmentId ? { ...a, signedUrl: res.signedUrl, isAvailable: true } : a,
              ),
            };
          }),
        );
        return res.signedUrl;
      }
      return null;
    } catch (err: unknown) {
      this._error.set(extractErrorMessage(err, 'Lỗi tải lại liên kết tệp đính kèm.'));
      return null;
    }
  }

  /**
   * Đánh dấu đã đọc tin nhắn
   */
  async markAsRead(messageId: string): Promise<void> {
    const convId = this._conversationId();
    const currentUser = this.auth.user();
    if (!convId || !currentUser) return;

    // Cập nhật optimistic cho chính mình
    this._readStates.update((states) => ({
      ...states,
      [currentUser.id]: messageId,
    }));

    try {
      await this.messagesApi.markAsRead(convId, messageId);
    } catch (err: unknown) {
      // Ghi nhận lỗi nhẹ không block UI người dùng
      this.loggerWarn(extractErrorMessage(err, 'Lỗi đánh dấu đã đọc.'));
    }
  }

  private loggerWarn(msg: string): void {
    if (typeof console !== 'undefined') {
      console.warn(`[ActiveChatStore] ${msg}`);
    }
  }

  /**
   * Bật / tắt trạng thái typing của bản thân
   */
  setTyping(isTyping: boolean): void {
    const convId = this._conversationId();
    if (!convId) return;

    if (isTyping) {
      this.chatSocket.startTyping(convId);
    } else {
      this.chatSocket.stopTyping(convId);
    }
  }

  /**
   * Thêm hoặc bỏ reaction cho tin nhắn theo desired state (Idempotent + Optimistic).
   */
  async setReaction(messageId: string, emoji: string, reacted: boolean): Promise<void> {
    const convId = this._conversationId();
    if (!convId) return;

    const message = this._messages().find((m) => m.id === messageId);
    if (!message) return;

    const prevReactions = message.reactions ?? [];
    const clientMutationId = crypto.randomUUID();

    // 1. Optimistic update
    const currentReaction = prevReactions.find((r) => r.emoji === emoji);
    let optimisticReactions: ReactionSummaryDto[];

    if (reacted) {
      if (currentReaction) {
        optimisticReactions = prevReactions.map((r) =>
          r.emoji === emoji
            ? {
                ...r,
                count: r.reactedByMe ? r.count : r.count + 1,
                reactedByMe: true,
              }
            : r,
        );
      } else {
        optimisticReactions = [...prevReactions, { emoji, count: 1, reactedByMe: true }];
      }
    } else {
      if (currentReaction) {
        const newCount = currentReaction.reactedByMe
          ? currentReaction.count - 1
          : currentReaction.count;
        if (newCount <= 0) {
          optimisticReactions = prevReactions.filter((r) => r.emoji !== emoji);
        } else {
          optimisticReactions = prevReactions.map((r) =>
            r.emoji === emoji ? { ...r, count: newCount, reactedByMe: false } : r,
          );
        }
      } else {
        optimisticReactions = prevReactions;
      }
    }

    this._messages.update((list) =>
      list.map((m) => (m.id === messageId ? { ...m, reactions: optimisticReactions } : m)),
    );

    // 2. Gọi REST API
    try {
      const res = await this.messagesApi.setReaction(convId, messageId, {
        emoji,
        reacted,
        clientMutationId,
      });

      if (this._conversationId() === convId) {
        this.handledMutationIds.add(clientMutationId);
        // Reconcile với canonical response từ server
        this._messages.update((list) =>
          list.map((m) => (m.id === messageId ? { ...m, reactions: res.reactions } : m)),
        );
      }
    } catch (err: unknown) {
      if (this._conversationId() === convId) {
        // Rollback nếu API lỗi
        this._messages.update((list) =>
          list.map((m) => (m.id === messageId ? { ...m, reactions: prevReactions } : m)),
        );
        this._error.set(extractErrorMessage(err, 'Bày tỏ cảm xúc thất bại.'));
      }
    }
  }

  /**
   * Chuyển đổi (toggle) trạng thái reaction của người dùng hiện tại
   */
  async toggleReaction(messageId: string, emoji: string): Promise<void> {
    const message = this._messages().find((m) => m.id === messageId);
    if (!message) return;
    const currentReaction = (message.reactions ?? []).find((r) => r.emoji === emoji);
    const currentlyReacted = Boolean(currentReaction?.reactedByMe);
    return this.setReaction(messageId, emoji, !currentlyReacted);
  }

  /** Nạp danh sách ghim của DM mà không chặn luồng tải lịch sử chính. */
  async loadPins(
    conversationId = this._conversationId(),
    generation = this.currentGeneration,
  ): Promise<void> {
    if (!conversationId) return;
    const pins = await this.messagesApi.getConversationPins(conversationId);
    if (this._conversationId() === conversationId && this.currentGeneration === generation) {
      this._pinnedMessages.set(pins);
    }
  }

  async pinMessage(messageId: string): Promise<void> {
    const updated = await this.messagesApi.pinMessage(messageId);
    this.applyPinUpdate(updated, true);
  }

  async unpinMessage(messageId: string): Promise<void> {
    await this.messagesApi.unpinMessage(messageId);
    this.applyPinUpdate({ id: messageId } as MessageResponseDto, false);
  }

  /**
   * Đưa snapshot ghim vào timeline nếu nó nằm ngoài page đang tải. Nhờ đó UI
   * luôn có một DOM target chính xác để cuộn tới thay vì báo "chưa được tải".
   */
  revealPinnedMessage(message: MessageResponseDto): void {
    if (message.conversationId !== this._conversationId()) return;
    this._messages.update((items) => {
      if (items.some((item) => item.id === message.id)) return items;
      return [...items, message].sort((a, b) => compareMessageIds(a.id, b.id));
    });
  }

  private applyPinUpdate(message: MessageResponseDto, pinned: boolean): void {
    this._pinnedMessages.update((current) => {
      const remaining = current.filter((item) => item.id !== message.id);
      return pinned ? [message, ...remaining] : remaining;
    });
  }

  /**
   * Chuyển tiếp tin nhắn sang cuộc trò chuyện đích (idempotent qua clientNonce)
   */
  async forwardMessage(
    messageId: string,
    targetConversationId: string,
  ): Promise<MessageResponseDto> {
    const convId = this._conversationId();
    if (!convId) {
      throw new Error('Chưa chọn cuộc trò chuyện hiện tại.');
    }
    const clientNonce = crypto.randomUUID();
    return this.messagesApi.forwardMessage(convId, messageId, {
      targetConversationId,
      clientNonce,
    });
  }

  // ---------------------------------------------------------------------------
  // Private Helper & Realtime Handlers
  // ---------------------------------------------------------------------------

  private readonly handledMutationIds = new Set<string>();

  private revokeOptimisticBlobUrls(items: OptimisticMessage[]): void {
    for (const opt of items) {
      if (opt.attachments) {
        for (const att of opt.attachments) {
          if (att.signedUrl && att.signedUrl.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(att.signedUrl);
            } catch {
              // Môi trường không hỗ trợ URL.revokeObjectURL
            }
          }
        }
      }
    }
  }

  private reconcileOptimisticMessage(clientNonce: string, created: MessageResponseDto): void {
    const list = this._optimisticMessages();
    const matched = list.filter((m) => m.clientNonce === clientNonce);
    this.revokeOptimisticBlobUrls(matched);

    // Xoá khỏi danh sách optimistic
    this._optimisticMessages.set(list.filter((m) => m.clientNonce !== clientNonce));

    // Chèn vào messages nếu chưa có (chống duplicate)
    this._messages.update((msgs) => {
      const exists = msgs.some((m) => m.id === created.id);
      if (exists) return msgs;
      return [...msgs, created].sort((a, b) => compareMessageIds(a.id, b.id));
    });
  }

  private setupRealtimeSubscriptions(): void {
    // 1. Nhận tin nhắn mới broadcast từ socket
    this.subs.add(
      this.chatSocket.messageCreated$.subscribe(({ message }) => {
        if (message.conversationId !== this._conversationId()) return;

        // Xoá optimistic message tương ứng nếu có clientNonce và revoke blob
        if (message.clientNonce) {
          const list = this._optimisticMessages();
          const matched = list.filter((m) => m.clientNonce === message.clientNonce);
          this.revokeOptimisticBlobUrls(matched);
          this._optimisticMessages.set(list.filter((m) => m.clientNonce !== message.clientNonce));
        }

        // Chèn vào danh sách tin nhắn nếu chưa có
        this._messages.update((list) => {
          if (list.some((m) => m.id === message.id)) return list;

          const formatted: MessageResponseDto = {
            id: message.id,
            channelId: message.channelId,
            conversationId: message.conversationId,
            authorId: message.authorId,
            author: message.author,
            type: message.type,
            content: message.content,
            isForwarded: message.isForwarded,
            externalMedia: message.externalMedia ?? null,
            replyToId: message.replyToId,
            clientNonce: message.clientNonce,
            editedAt: message.editedAt,
            deletedAt: message.deletedAt,
            attachments: message.attachments,
            reactions:
              message.reactions?.map((r) => ({
                emoji: r.emoji,
                count: r.count,
                reactedByMe: Boolean(r.reactedByMe),
              })) ?? [],
            createdAt: message.createdAt,
          };

          return [...list, formatted].sort((a, b) => compareMessageIds(a.id, b.id));
        });
      }),
    );

    // 2. Cập nhật tin nhắn sửa
    this.subs.add(
      this.chatSocket.messageUpdated$.subscribe(({ message }) => {
        if (message.conversationId !== this._conversationId()) return;

        this._messages.update((list) =>
          list.map((m) =>
            m.id === message.id
              ? {
                  ...m,
                  content: message.content,
                  editedAt: message.editedAt,
                }
              : m,
          ),
        );
      }),
    );

    // 3. Xoá mềm tin nhắn (Thu hồi cho mọi người)
    this.subs.add(
      this.chatSocket.messageDeleted$.subscribe((payload) => {
        if (payload.conversationId && payload.conversationId !== this._conversationId()) {
          return;
        }

        this._messages.update((list) =>
          list.map((m) =>
            m.id === payload.messageId
              ? {
                  ...m,
                  content: null,
                  reactions: undefined,
                  attachments: [],
                  externalMedia: null,
                  deletedAt: new Date().toISOString(),
                }
              : m,
          ),
        );
        this.applyPinUpdate({ id: payload.messageId } as MessageResponseDto, false);
      }),
    );

    // 3b. Ẩn tin nhắn ở phía người dùng (user-scoped sync từ socket Room.user(userId))
    if (this.chatSocket.messageHiddenForUser$) {
      this.subs.add(
        this.chatSocket.messageHiddenForUser$.subscribe((payload) => {
          if (payload.conversationId && payload.conversationId !== this._conversationId()) {
            return;
          }

          this._messages.update((list) => list.filter((m) => m.id !== payload.messageId));
          this.applyPinUpdate({ id: payload.messageId } as MessageResponseDto, false);
        }),
      );
    }

    // 4. Đồng bộ ghim theo room của cuộc trò chuyện.
    this.subs.add(
      this.chatSocket.messagePinUpdated$.subscribe(({ conversationId, message, pinned }) => {
        if (conversationId !== this._conversationId()) return;
        this.applyPinUpdate(message as MessageResponseDto, pinned);
      }),
    );

    // 5. Trạng thái đang gõ
    this.subs.add(
      this.chatSocket.typingUpdated$.subscribe((payload) => {
        if (payload.conversationId !== this._conversationId()) return;

        const currentUserId = this.auth.user()?.id;
        const otherUserIds = payload.userIds.filter((id) => id !== currentUserId);

        this._typingUserIds.set(otherUserIds);
      }),
    );

    // 6. Cập nhật Read State từ socket
    this.subs.add(
      this.chatSocket.messageRead$.subscribe((payload) => {
        if (payload.conversationId !== this._conversationId()) return;

        this._readStates.update((state) => ({
          ...state,
          [payload.userId]: payload.lastReadMessageId,
        }));
      }),
    );

    // 7. Lỗi Join Room từ socket
    this.subs.add(
      this.chatSocket.joinError$.subscribe((payload) => {
        if (payload.conversationId === this._conversationId()) {
          this._error.set(payload.error);
        }
      }),
    );

    // 8. Cập nhật Reaction realtime từ socket
    this.subs.add(
      this.chatSocket.reactionUpdated$.subscribe((payload) => {
        if (payload.conversationId !== this._conversationId()) return;

        // Nếu là mutation do chính client này vừa thực hiện và đã reconcile qua REST thì bỏ qua
        if (payload.clientMutationId && this.handledMutationIds.has(payload.clientMutationId)) {
          return;
        }

        const currentUserId = this.auth.user()?.id;

        this._messages.update((list) =>
          list.map((m) => {
            if (m.id !== payload.messageId) return m;

            const prevReactions = m.reactions ?? [];
            const updatedReactions: ReactionSummaryDto[] = payload.reactions.map((canonical) => {
              const prev = prevReactions.find((p) => p.emoji === canonical.emoji);
              let reactedByMe = prev?.reactedByMe ?? false;

              if (payload.actorUserId === currentUserId) {
                if (payload.emoji === canonical.emoji) {
                  reactedByMe = payload.action === 'added';
                }
              }

              return {
                emoji: canonical.emoji,
                count: canonical.count,
                reactedByMe,
              };
            });

            return {
              ...m,
              reactions: updatedReactions,
            };
          }),
        );
      }),
    );
  }
}
