import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatToolbar } from '../components/chat-toolbar/chat-toolbar';
import type { PresenceStatus } from '../../../../shared/dto/common';
import {
  MessageComposer,
  type MessageComposerContext,
  type SendMessagePayload,
} from '../components/message-composer/message-composer';
import { MessageActions } from '../components/message-actions/message-actions';
import { DashboardState } from '../components/dashboard-state/dashboard-state';
import { DashboardUiState } from '../services/dashboard-ui-state';
import { ShellData } from '../../../core/api/shell-data';
import { AuthService } from '../../../core/auth/auth.service';
import {
  ConversationsApiService,
  type ConversationResponseDto,
} from '../../../core/api/conversations-api.service';
import {
  ActiveChatStore,
  type ChatUiMessage,
} from '../services/active-chat.store';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';

/**
 * Trang chi tiết cuộc trò chuyện Direct Message — `/channels/@me/:conversationId`.
 *
 * Kết nối trực tiếp với ActiveChatStore và ConversationsApiService,
 * hiển thị realtime tin nhắn, optimistic UI, smart auto-scroll,
 * pagination cuộn ngược, và typing indicator.
 */
@Component({
  selector: 'app-conversation-page',
  imports: [
    Avatar,
    ChatToolbar,
    DashboardState,
    EmptyState,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MessageActions,
    MessageComposer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col relative' },
  templateUrl: './conversation.html',
  styleUrl: './conversation.css',
})
export class ConversationPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly shell = inject(ShellData);
  private readonly auth = inject(AuthService);
  private readonly conversationsApi = inject(ConversationsApiService);
  readonly activeChatStore = inject(ActiveChatStore);
  private readonly uiState = inject(DashboardUiState);
  private readonly destroyRef = inject(DestroyRef);

  readonly chatHistoryRef = viewChild<ElementRef<HTMLElement>>('chatHistory');

  protected readonly demoEnabled = this.shell.demoEnabled;
  protected readonly composerContext = signal<MessageComposerContext | null>(null);
  protected readonly blockingState = this.uiState.blockingState;
  protected readonly connectionState = this.uiState.connectionState;

  readonly conversationDetails = signal<ConversationResponseDto | null>(null);
  readonly showNewMessagesPill = signal<boolean>(false);
  readonly isNearBottom = signal<boolean>(true);
  readonly notFound = signal<boolean>(false);

  private intersectionObserver: IntersectionObserver | null = null;
  private markReadTimeout: ReturnType<typeof setTimeout> | null = null;
  private latestPendingReadId: string | null = null;

  readonly conversationId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('conversationId'))),
    { initialValue: null },
  );

  protected readonly currentUser = this.auth.user;

  // Dữ liệu cuộc trò chuyện demo từ ShellData
  protected readonly demoConversation = computed(() => {
    const id = this.conversationId();
    return id ? this.shell.conversationOf(id) : undefined;
  });

  // Tên và tiêu đề của cuộc trò chuyện hiện tại
  protected readonly recipientName = computed(() => {
    if (this.demoEnabled()) {
      return this.demoConversation()?.name || 'Trò chuyện';
    }
    const details = this.conversationDetails();
    if (details?.recipient) {
      return details.recipient.displayName || details.recipient.username;
    }
    return details?.name || 'Trò chuyện';
  });

  protected readonly recipientStatus = computed(() => {
    if (this.demoEnabled()) {
      return this.demoConversation()?.statusMessage || null;
    }
    return this.conversationDetails()?.recipient?.statusMessage || null;
  });

  protected readonly recipientAvatar = computed(() => {
    if (this.demoEnabled()) {
      return null;
    }
    return this.conversationDetails()?.recipient?.avatarUrl || null;
  });

  protected readonly recipientPresence = computed<PresenceStatus>(() => {
    if (this.demoEnabled()) {
      return this.demoConversation()?.presence || 'offline';
    }
    return (
      (this.conversationDetails()?.recipient?.presence as PresenceStatus) ||
      'offline'
    );
  });

  protected readonly hasValidConversation = computed(() => {
    const id = this.conversationId();
    if (!id) return false;
    if (this.demoEnabled()) {
      return Boolean(this.demoConversation());
    }
    if (this.notFound()) {
      return false;
    }
    if (this.shell.conversationOf(id) || this.conversationDetails()) {
      return true;
    }
    // Cho phép các conversation ID hợp lệ dạng UUID hoặc ID có cấu trúc
    return (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
      id.startsWith('conv-') ||
      id.startsWith('dm-')
    );
  });

  // Selectors từ ActiveChatStore
  protected readonly messages = this.activeChatStore.allMessages;
  protected readonly loadingInitial = this.activeChatStore.loadingInitial;
  protected readonly loadingMore = this.activeChatStore.loadingMore;
  protected readonly hasMore = this.activeChatStore.hasMore;
  protected readonly storeError = this.activeChatStore.error;
  protected readonly typingUserIds = this.activeChatStore.typingUserIds;

  protected readonly typingText = computed(() => {
    const ids = this.typingUserIds();
    if (ids.length === 0) return null;
    if (ids.length === 1) return `${this.recipientName()} đang soạn tin...`;
    return `${ids.length} người đang soạn tin...`;
  });

  private lastActiveKey: string | null = null;
  private detailsGeneration = 0;

  constructor() {
    // Tự động kích hoạt phòng chat khi URL param thay đổi hoặc session hoàn tất
    // Sử dụng untracked() và dedupe theo userId:conversationId để ngăn chặn reactive loop
    effect(() => {
      const id = this.conversationId();
      const userId = this.currentUser()?.id ?? null;
      const isDemo = this.demoEnabled();

      untracked(() => {
        if (!id) {
          this.lastActiveKey = null;
          this.activeChatStore.clear();
          this.conversationDetails.set(null);
          return;
        }

        if (isDemo) {
          this.lastActiveKey = null;
          return;
        }

        if (userId) {
          const activationKey = `${userId}:${id}`;
          if (this.lastActiveKey !== activationKey) {
            this.lastActiveKey = activationKey;
            void this.activeChatStore.setActiveConversation(id);
            void this.loadConversationDetails(id);
          }
        }
      });
    });

    // Smart auto-scroll khi có tin nhắn mới
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        if (this.isNearBottom()) {
          setTimeout(() => this.scrollToBottom(false), 50);
        } else {
          this.showNewMessagesPill.set(true);
        }
      }
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.lastActiveKey = null;
      this.activeChatStore.clear();
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
      }
      if (this.markReadTimeout) {
        clearTimeout(this.markReadTimeout);
      }
    });
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.lastActiveKey = null;
    this.activeChatStore.clear();
  }

  async loadConversationDetails(id: string): Promise<void> {
    const generation = ++this.detailsGeneration;
    this.notFound.set(false);
    try {
      const details = await this.conversationsApi.getConversation(id);
      if (this.detailsGeneration === generation && this.conversationId() === id) {
        this.conversationDetails.set(details);
      }
    } catch (err: unknown) {
      if (this.detailsGeneration === generation && this.conversationId() === id) {
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          this.notFound.set(true);
        }
        this.conversationDetails.set(null);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Scroll & Viewport Observer
  // ---------------------------------------------------------------------------

  async onScroll(event: Event): Promise<void> {
    const el = event.target as HTMLElement;
    if (!el) return;

    // Kiểm tra xem người dùng có ở gần đáy không (< 150px)
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distanceToBottom < 150;
    this.isNearBottom.set(near);
    if (near) {
      this.showNewMessagesPill.set(false);
    }

    // Infinite scroll up khi cuộn lên gần đỉnh (< 80px)
    if (el.scrollTop < 80 && this.hasMore() && !this.loadingMore()) {
      const prevScrollHeight = el.scrollHeight;
      const prevScrollTop = el.scrollTop;

      await this.activeChatStore.loadOlderMessages();

      // Bảo toàn vị trí cuộn mượt mà sau khi prepend
      requestAnimationFrame(() => {
        const newScrollHeight = el.scrollHeight;
        el.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
      });
    }
  }

  scrollToBottom(smooth = true): void {
    const el = this.chatHistoryRef()?.nativeElement;
    if (el) {
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
      } else {
        el.scrollTop = el.scrollHeight;
      }
      this.showNewMessagesPill.set(false);
      this.isNearBottom.set(true);
    }
  }

  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        let maxVisibleInboundId: string | null = null;

        for (const entry of entries) {
          if (entry.isIntersecting) {
            const msgId = entry.target.getAttribute('data-message-id');
            const authorId = entry.target.getAttribute('data-author-id');
            const myId = this.currentUser()?.id;

            // Chỉ markAsRead tin nhắn của người khác (inbound)
            if (msgId && authorId && authorId !== myId) {
              if (
                !maxVisibleInboundId ||
                BigInt(msgId) > BigInt(maxVisibleInboundId)
              ) {
                maxVisibleInboundId = msgId;
              }
            }
          }
        }

        if (maxVisibleInboundId) {
          this.scheduleMarkRead(maxVisibleInboundId);
        }
      },
      { threshold: 0.5 },
    );
  }

  private scheduleMarkRead(messageId: string): void {
    this.latestPendingReadId = messageId;
    if (this.markReadTimeout) {
      clearTimeout(this.markReadTimeout);
    }

    // Debounce 400ms để không spam API khi cuộn nhanh
    this.markReadTimeout = setTimeout(() => {
      if (this.latestPendingReadId) {
        void this.activeChatStore.markAsRead(this.latestPendingReadId);
        this.latestPendingReadId = null;
      }
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  readonly activeLightbox = signal<{
    src: string;
    alt: string;
  } | null>(null);

  openLightbox(src: string, alt: string): void {
    this.activeLightbox.set({ src, alt });
  }

  closeLightbox(): void {
    this.activeLightbox.set(null);
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onSendMessage(payload: SendMessagePayload): void {
    if (payload.editMessageId) {
      void this.activeChatStore.editMessage(
        payload.editMessageId,
        payload.content,
      );
    } else {
      void this.activeChatStore.sendMessage({
        content: payload.content,
        files: payload.files,
        replyToId: payload.replyToId,
      });
    }
  }

  onTyping(): void {
    this.activeChatStore.setTyping(true);
  }

  onStoppedTyping(): void {
    this.activeChatStore.setTyping(false);
  }

  onMessageAction(action: MessageComposerContext): void {
    if (action.kind === 'delete' && action.messageId) {
      void this.activeChatStore.deleteMessage(action.messageId);
    } else {
      this.composerContext.set(action);
    }
  }

  onToggleReaction(messageId: string, emoji: string): void {
    void this.activeChatStore.toggleReaction(messageId, emoji);
  }

  retryMessage(clientNonce: string): void {
    void this.activeChatStore.retryMessage(clientNonce);
  }

  dismissFailedMessage(clientNonce: string): void {
    this.activeChatStore.removeFailedMessage(clientNonce);
  }

  readonly failedAttachmentIds = signal<Set<string>>(new Set());

  onAttachmentMediaError(attId: string): void {
    this.failedAttachmentIds.update((set) => new Set(set).add(attId));
  }

  async refreshAttachment(messageId: string, attachmentId: string): Promise<void> {
    const newUrl = await this.activeChatStore.refreshAttachmentUrl(
      messageId,
      attachmentId,
    );
    if (newUrl) {
      this.failedAttachmentIds.update((set) => {
        const next = new Set(set);
        next.delete(attachmentId);
        return next;
      });
    }
  }

  isMine(msg: ChatUiMessage): boolean {
    const currentId = this.currentUser()?.id;
    return Boolean(currentId && msg.authorId === currentId);
  }

  findReplyMessage(replyToId: string | null): ChatUiMessage | undefined {
    if (!replyToId) return undefined;
    return this.messages().find((m) => m.id === replyToId);
  }

  formatTime(isoString: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  }

  protected clearUiState(): void {
    void this.uiState.clearPreview();
  }
}
