import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatToolbar } from '../components/chat-toolbar/chat-toolbar';
import { MOBILE_BREAKPOINT_QUERY } from '../../../layouts/app-layout/services/dashboard-layout.service';
import { PRESENCE_LABEL, type PresenceStatus } from '../../../../shared/dto/common';
import { PresenceService } from '../../../core/presence/presence.service';
import { ChatScrollController } from '../../../core/utils/chat-scroll.controller';
import {
  MessageComposer,
  type MessageComposerContext,
  type SendMessagePayload,
  type MentionCandidate,
} from '../components/message-composer/message-composer';
import { MessageActions } from '../components/message-actions/message-actions';
import { PinnedMessagesList } from '../components/pinned-messages-list/pinned-messages-list';
import { DashboardState } from '../components/dashboard-state/dashboard-state';
import { DashboardUiState } from '../services/dashboard-ui-state';
import { AuthService } from '../../../core/auth/auth.service';
import {
  ConversationsApiService,
  type ConversationResponseDto,
} from '../../../core/api/conversations-api.service';
import { ActiveChatStore, type ChatUiMessage } from '../services/active-chat.store';
import type {
  AttachmentResponseDto,
  MessageResponseDto,
} from '../../../core/api/messages-api.service';
import { ContextPanel } from '../components/context-panel/context-panel';
import { ProfileAvatar } from '../../profile/components/profile-avatar/profile-avatar';
import { ProfilePanel } from '../../profile/components/profile-panel/profile-panel';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ForwardMessageModal } from '../components/forward-message-modal/forward-message-modal';
import {
  DeleteMessageModal,
  type DeleteMessageModalData,
} from '../components/delete-message-modal/delete-message-modal';
import { LightboxGalleryService } from '../../../shared/ui/lightbox-gallery/lightbox-gallery.service';
import type { LightboxMediaItem } from '../../../shared/ui/lightbox-gallery/lightbox-gallery.types';
import { extractErrorMessage } from '../../../core/utils/error.util';
import { GiphyMessageEmbedComponent } from '../components/giphy-message-embed/giphy-message-embed.component';
import { InlineMessageEditor } from '../components/inline-message-editor/inline-message-editor';
import { MessageClockService } from '../../../core/utils/message-clock.service';
import { canEditMessage } from '../../../../shared/dto/messages.dto';
import { parseMessageContent, type MessageContentToken } from './utils/message-content-parser';

export interface ConversationHttpError {
  status?: number;
  message: string;
  type: '401' | '403' | '404' | '5xx' | 'network' | 'unknown';
}

export type MessagePresentationVariant =
  | 'deleted'
  | 'text-only'
  | 'media-only'
  | 'file-only'
  | 'text-with-media'
  | 'text-with-file'
  | 'mixed';

export function getMessagePresentationVariant(
  msg: Partial<MessageResponseDto>,
): MessagePresentationVariant {
  if (msg.deletedAt) {
    return 'deleted';
  }

  const hasText = Boolean(msg.content && msg.content.trim().length > 0);
  const attachments = msg.attachments ?? [];
  const hasAttachments = attachments.length > 0;
  const hasExternalMedia = Boolean(msg.externalMedia);

  if (!hasAttachments && !hasExternalMedia) {
    return 'text-only';
  }

  const imageAttachments = attachments.filter(
    (att) => att.mimeType && att.mimeType.startsWith('image/'),
  );
  const fileAttachments = attachments.filter(
    (att) => !att.mimeType || !att.mimeType.startsWith('image/'),
  );

  const hasImages = imageAttachments.length > 0 || hasExternalMedia;
  const hasFiles = fileAttachments.length > 0;

  if (hasImages && !hasFiles && !hasText) {
    return 'media-only';
  }

  if (hasFiles && !hasImages && !hasText) {
    return 'file-only';
  }

  if (hasImages && !hasFiles && hasText) {
    return 'text-with-media';
  }

  if (hasFiles && !hasImages && hasText) {
    return 'text-with-file';
  }

  return 'mixed';
}

export {
  VI_WEEKDAYS_SHORT,
  parseTimestamp,
  getLocalDateKey,
  isSameCalendarDay,
  formatDateDividerLabel,
  formatCompactTime,
  formatMessageTimestamp,
  formatFullTimestamp,
} from '../../../core/utils/date-format.util';

import {
  parseTimestamp,
  getLocalDateKey,
  isSameCalendarDay,
  formatDateDividerLabel,
  formatCompactTime,
  formatMessageTimestamp,
  formatFullTimestamp,
} from '../../../core/utils/date-format.util';

/**
 * So sánh 2 Message ID dạng chuỗi BigInt để kiểm tra msgId có nằm sau lastReadId hay không.
 * Bỏ qua optimistic IDs (không phải số nguyên dương thuần túy).
 */
export function isMessageAfterLastRead(
  msgId: string | null | undefined,
  lastReadId: string | null | undefined,
): boolean {
  if (!msgId || !lastReadId) return false;
  if (!/^\d+$/.test(msgId) || !/^\d+$/.test(lastReadId)) return false;
  try {
    return BigInt(msgId) > BigInt(lastReadId);
  } catch {
    if (msgId.length !== lastReadId.length) return msgId.length > lastReadId.length;
    return msgId > lastReadId;
  }
}

export type ConversationStreamItem =
  | {
      kind: 'date-divider';
      key: string;
      dateKey: string;
      date: Date;
      label: string;
    }
  | {
      kind: 'unread-divider';
      key: string;
      label: string;
    }
  | {
      kind: 'message';
      key: string;
      message: ChatUiMessage;
      isGrouped: boolean;
      variant: MessagePresentationVariant;
      timeFormatted: string;
      hoverTimeFormatted: string;
      accessibleTimeFormatted: string;
      contentTokens: MessageContentToken[];
    };

export interface StreamMessageViewModel {
  message: ChatUiMessage;
  isGrouped: boolean;
  variant: MessagePresentationVariant;
  timeFormatted: string;
  hoverTimeFormatted: string;
  accessibleTimeFormatted: string;
}

import { DirectCallCoordinatorService } from '../../../core/calls/direct-call-coordinator.service';
import { UserSettingsService } from '../../settings/services/user-settings.service';
import { FriendsStore } from '../friends/services/friends-store';

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
    ContextPanel,
    DashboardState,
    EmptyState,
    ForwardMessageModal,
    GiphyMessageEmbedComponent,
    InlineMessageEditor,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MessageActions,
    MessageComposer,
    PinnedMessagesList,
    ProfileAvatar,
    ProfilePanel,
    RouterLink,
  ],
  providers: [MessageClockService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col relative' },
  templateUrl: './conversation.html',
  styleUrl: './conversation.css',
})
export class ConversationPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly conversationsApi = inject(ConversationsApiService);
  private readonly directCallCoordinator = inject(DirectCallCoordinatorService);
  private readonly userSettings = inject(UserSettingsService);
  private readonly friendsStore = inject(FriendsStore);
  readonly activeChatStore = inject(ActiveChatStore);
  readonly messageClock = inject(MessageClockService);
  private readonly uiState = inject(DashboardUiState);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);

  readonly editingMessageId = signal<string | null>(null);
  readonly editingSaving = signal<boolean>(false);
  readonly editingError = signal<string | null>(null);

  readonly chatHistoryRef = viewChild<ElementRef<HTMLElement>>('chatHistory');
  readonly composerWrapperRef = viewChild<ElementRef<HTMLElement>>('composerWrapper');

  readonly scrollController = new ChatScrollController({
    getContainer: () => this.chatHistoryRef()?.nativeElement,
    getContentWrapper: () =>
      (this.chatHistoryRef()?.nativeElement.firstElementChild as HTMLElement) ||
      this.chatHistoryRef()?.nativeElement,
    injector: this.injector,
    platformId: this.platformId,
    threshold: 120,
    onPillChange: (show, count) => {
      this.showNewMessagesPill.set(show);
      this.newMessagesBelowCount.set(count);
    },
  });

  protected readonly composerContext = signal<MessageComposerContext | null>(null);
  protected readonly blockingState = this.uiState.blockingState;
  protected readonly connectionState = this.uiState.connectionState;

  readonly conversationDetails = signal<ConversationResponseDto | null>(null);
  readonly detailsLoading = signal<boolean>(false);
  readonly detailsError = signal<ConversationHttpError | null>(null);
  readonly showNewMessagesPill = signal<boolean>(false);
  readonly newMessagesBelowCount = signal<number>(0);
  readonly isNearBottom = this.scrollController.isNearBottom;
  readonly toastMessage = signal<string | null>(null);

  protected readonly isRecipientBlocked = computed(() => {
    const details = this.conversationDetails();
    if (!details?.recipient?.id) return false;
    return this.friendsStore.isBlocked(details.recipient.id);
  });

  protected readonly isRelationshipInvalidated = computed(() => {
    const details = this.conversationDetails();
    if (!details?.recipient?.id) return false;
    return this.friendsStore.isRelationshipInvalidated(details.recipient.id);
  });

  protected unblockRecipient(): void {
    const details = this.conversationDetails();
    if (details?.recipient?.id) {
      void this.friendsStore.unblockUser(details.recipient.id);
    }
  }

  // ID của tin nhắn chưa đọc đầu tiên được capture khi mở conversation
  readonly initialUnreadBoundaryId = signal<string | null>(null);
  private lastCapturedConversationId: string | null = null;

  // Dynamic bottom padding theo chiều cao composer
  readonly dynamicBottomPadding = signal<number>(0);
  private composerResizeObserver: ResizeObserver | null = null;

  private intersectionObserver: IntersectionObserver | null = null;
  private markReadTimeout: ReturnType<typeof setTimeout> | null = null;
  private latestPendingReadId: string | null = null;
  private highestMarkedReadId: string | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private processedMessageIds = new Set<string>();

  readonly conversationId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('conversationId'))),
    { initialValue: null },
  );

  protected readonly currentUser = this.auth.user;

  // Tên và tiêu đề của cuộc trò chuyện hiện tại (lấy thuần túy từ conversationDetails thật)
  protected readonly recipientName = computed(() => {
    const details = this.conversationDetails();
    if (details?.recipient) {
      return details.recipient.displayName || details.recipient.username;
    }
    return details?.name || 'Cuộc trò chuyện';
  });

  /** Username người bên kia (DM 1-1) — để mở thẻ hồ sơ khi bấm avatar. */
  protected readonly recipientUsername = computed(
    () => this.conversationDetails()?.recipient?.username ?? null,
  );

  protected readonly mentionCandidates = computed<MentionCandidate[]>(() => {
    const recipient = this.conversationDetails()?.recipient;
    if (!recipient) return [];
    return [
      {
        id: recipient.id,
        username: recipient.username,
        displayName: recipient.displayName || recipient.username,
        avatarUrl: recipient.avatarUrl ?? null,
      },
    ];
  });

  private readonly breakpoints = inject(BreakpointObserver);
  protected readonly isMobile = toSignal(
    this.breakpoints.observe(MOBILE_BREAKPOINT_QUERY).pipe(map((state) => state.matches)),
    { initialValue: typeof window !== 'undefined' ? window.innerWidth < 768 : false },
  );

  /** Cột hồ sơ bên phải đang mở hay không (nút "hồ sơ" trên thanh tiêu đề). */
  protected readonly profilePanelOpen = signal(false);
  protected readonly pinsOpen = signal(false);
  protected readonly pinBusyIds = signal<Set<string>>(new Set());

  protected toggleProfilePanel(): void {
    const next = !this.profilePanelOpen();
    this.pinsOpen.set(false);
    this.profilePanelOpen.set(next);
  }

  protected openPins(): void {
    this.profilePanelOpen.set(false);
    this.pinsOpen.set(true);
  }

  protected readonly recipientStatus = computed(() => {
    return this.conversationDetails()?.recipient?.statusMessage || null;
  });

  protected readonly recipientAvatar = computed(() => {
    return this.conversationDetails()?.recipient?.avatarUrl || null;
  });

  private readonly presenceService = inject(PresenceService);

  protected readonly recipientPresence = computed<PresenceStatus>(() => {
    const recipientId = this.conversationDetails()?.recipient?.id;
    if (recipientId) {
      return this.presenceService.getPresence(recipientId)();
    }
    return (this.conversationDetails()?.recipient?.presence as PresenceStatus) || 'offline';
  });

  protected readonly recipientStatusSubtitle = computed(() => {
    const customStatus = this.conversationDetails()?.recipient?.statusMessage;
    if (customStatus) {
      return customStatus;
    }
    const recipientId = this.conversationDetails()?.recipient?.id;
    const presence = this.recipientPresence();
    if (presence === 'offline' && recipientId) {
      const lastSeenText = this.presenceService.getLastSeenLabel(recipientId)();
      return lastSeenText ?? PRESENCE_LABEL['offline'];
    }
    return PRESENCE_LABEL[presence] ?? null;
  });

  protected readonly hasValidConversation = computed(() => {
    const id = this.conversationId();
    if (!id) return false;
    const err = this.detailsError();
    if (err && (err.type === '404' || err.type === '403' || err.type === '401')) {
      return false;
    }
    return true;
  });

  // Selectors từ ActiveChatStore
  protected readonly messages = this.activeChatStore.allMessages;
  protected readonly loadingInitial = this.activeChatStore.loadingInitial;
  protected readonly loadingMore = this.activeChatStore.loadingMore;
  protected readonly hasMore = this.activeChatStore.hasMore;
  protected readonly storeError = this.activeChatStore.error;
  protected readonly chatError = this.activeChatStore.chatError;
  protected readonly paginationError = this.activeChatStore.paginationError;
  protected readonly typingUserIds = this.activeChatStore.typingUserIds;

  /**
   * Tính toán danh sách presentation stream bao gồm Date Dividers, Unread Dividers và Messages:
   * - Tự động chèn Date Divider (divider-${localDateKey}) khi chuyển sang ngày mới theo local timezone.
   * - Tự động chèn Unread Divider (unread-divider-${id}) trước tin nhắn chưa đọc đầu tiên.
   * - Ranh giới ngày bắt buộc phá vỡ Message Grouping (tin đầu ngày mới luôn là Head message).
   * - Stable presentation keys (ưu tiên msg-${clientNonce} nếu có, ngược lại msg-${id}).
   */
  readonly streamItems = computed<ConversationStreamItem[]>(() => {
    const rawList = this.messages();
    const result: ConversationStreamItem[] = [];
    let lastDateKey: string | null = null;
    const unreadBoundaryId = this.initialUnreadBoundaryId();

    for (let i = 0; i < rawList.length; i++) {
      const msg = rawList[i];
      const msgDate = parseTimestamp(msg.createdAt);
      const dateKey = msgDate ? getLocalDateKey(msgDate) : null;

      // 1. Chèn Date Divider khi bước sang một ngày mới
      if (dateKey && dateKey !== lastDateKey) {
        if (msgDate) {
          result.push({
            kind: 'date-divider',
            key: `divider-${dateKey}`,
            dateKey,
            date: msgDate,
            label: formatDateDividerLabel(msgDate),
          });
        }
        lastDateKey = dateKey;
      }

      // 2. Chèn Unread Divider nếu tin nhắn này là first unread boundary
      if (unreadBoundaryId && msg.id === unreadBoundaryId) {
        result.push({
          kind: 'unread-divider',
          key: `unread-divider-${unreadBoundaryId}`,
          label: 'Tin nhắn mới',
        });
      }

      // 3. Tính toán grouping: chỉ gom nhóm nếu cùng author, cùng ngày, cách nhau < 5 phút
      let isGrouped = false;
      if (i > 0) {
        const prevMsg = rawList[i - 1];
        const prevMsgDate = parseTimestamp(prevMsg.createdAt);

        const isSameDay = isSameCalendarDay(msgDate, prevMsgDate);
        const isSameAuthor = Boolean(
          msg.authorId && prevMsg.authorId && msg.authorId === prevMsg.authorId,
        );

        let isWithin5Minutes = false;
        if (msgDate && prevMsgDate) {
          const timeDiff = msgDate.getTime() - prevMsgDate.getTime();
          isWithin5Minutes = timeDiff >= 0 && timeDiff < 5 * 60 * 1000;
        }

        const isDefaultType = !msg.type || msg.type === 'default';
        const isPrevDefaultType = !prevMsg.type || prevMsg.type === 'default';
        const isNotReply = !msg.replyToId;
        const isNotForwarded = !msg.isForwarded;
        const isNotDeleted = !msg.deletedAt;
        const isPrevNotDeleted = !prevMsg.deletedAt;

        if (
          isSameDay &&
          isSameAuthor &&
          isWithin5Minutes &&
          isDefaultType &&
          isPrevDefaultType &&
          isNotReply &&
          isNotForwarded &&
          isNotDeleted &&
          isPrevNotDeleted
        ) {
          isGrouped = true;
        }
      }

      // 4. Stable Message Key: ưu tiên clientNonce để duy trì ổn định khi optimistic reconcile
      const itemKey = msg.clientNonce ? `msg-${msg.clientNonce}` : `msg-${msg.id}`;

      result.push({
        kind: 'message',
        key: itemKey,
        message: msg,
        isGrouped,
        variant: getMessagePresentationVariant(msg),
        timeFormatted: formatMessageTimestamp(msgDate),
        hoverTimeFormatted: formatCompactTime(msgDate),
        accessibleTimeFormatted: formatFullTimestamp(msgDate),
        contentTokens: parseMessageContent(msg.content || '', itemKey),
      });
    }

    return result;
  });

  /**
   * Helper view model trích xuất danh sách message view models (tương thích backward)
   */
  readonly streamMessages = computed<StreamMessageViewModel[]>(() => {
    return this.streamItems()
      .filter(
        (item): item is Extract<ConversationStreamItem, { kind: 'message' }> =>
          item.kind === 'message',
      )
      .map((item) => ({
        message: item.message,
        isGrouped: item.isGrouped,
        variant: item.variant,
        timeFormatted: item.timeFormatted,
        hoverTimeFormatted: item.hoverTimeFormatted,
        accessibleTimeFormatted: item.accessibleTimeFormatted,
      }));
  });

  protected readonly typingText = computed(() => {
    const ids = this.typingUserIds();
    if (ids.length === 0) return null;
    if (ids.length === 1) return `${this.recipientName()} đang soạn tin...`;
    return `${ids.length} người đang soạn tin...`;
  });

  private lastActiveKey: string | null = null;
  private detailsGeneration = 0;

  private previousIsMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  constructor() {
    // Khi viewport chuyển từ desktop sang mobile (có nút hamburger), tự động đóng profile panel
    effect(() => {
      const mobile = this.isMobile();
      if (mobile && !this.previousIsMobile) {
        untracked(() => {
          this.profilePanelOpen.set(false);
        });
      }
      this.previousIsMobile = mobile;
    });

    // Tự động kích hoạt phòng chat khi URL param thay đổi hoặc session hoàn tất
    // Sử dụng untracked() và dedupe theo userId:conversationId để ngăn chặn reactive loop
    effect(() => {
      const id = this.conversationId();
      const userId = this.currentUser()?.id ?? null;

      untracked(() => {
        if (!id) {
          this.resetConversationState();
          return;
        }

        if (userId) {
          const activationKey = `${userId}:${id}`;
          if (this.lastActiveKey !== activationKey) {
            this.lastActiveKey = activationKey;
            this.resetConversationState();
            this.scrollController.reset(id);
            void this.activeChatStore.setActiveConversation(id);
            void this.loadConversationDetails(id);
          }
        }
      });
    });

    // Smart-Scroll State Machine & Unread Boundary Capture (Phân biệt Initial History vs Realtime)
    effect(() => {
      const msgs = this.messages();
      const myId = this.currentUser()?.id;
      const loadingInitial = this.loadingInitial();
      const loadingMore = this.loadingMore();
      const id = this.conversationId();

      untracked(() => {
        if (!id || loadingInitial || loadingMore) {
          return;
        }

        // 1. Capture unread boundary khi mở conversation lần đầu
        this.updateUnreadBoundary();

        if (msgs.length === 0) {
          this.processedMessageIds.clear();
          return;
        }

        // 2. Initial History Load: thực hiện đúng 1 lần instant scroll xuống đáy
        if (!this.scrollController.hasScrolledInitial) {
          for (const m of msgs) {
            const key = m.id || m.clientNonce;
            if (key) {
              this.processedMessageIds.add(key);
            }
          }
          this.scrollController.handleInitialRender(id, this.scrollController.generation);
          return;
        }

        // 3. Realtime Messages: chỉ xử lý những tin chưa có trong processedMessageIds
        const newMsgs: ChatUiMessage[] = [];
        for (const m of msgs) {
          const key = m.id || m.clientNonce;
          if (key && !this.processedMessageIds.has(key)) {
            this.processedMessageIds.add(key);
            newMsgs.push(m);
          }
        }

        if (newMsgs.length === 0) {
          return;
        }

        // Chụp trạng thái Near-Bottom TRƯỚC KHI render/mutation (canonical từ controller)
        const { wasNearBottom } = this.scrollController.capturePreMutationState();
        const hasOwnMessage = newMsgs.some((m) => m.authorId === myId);
        const inboundCount = newMsgs.filter(
          (m) => m.authorId !== myId && m.status === 'persisted',
        ).length;

        this.scrollController.handleRealtimeAppend(id, this.scrollController.generation, {
          isMine: hasOwnMessage,
          wasNearBottom,
          count: inboundCount,
        });
      });
    });
  }

  private resetConversationState(): void {
    this.scrollController.reset(null);
    this.activeChatStore.clear();
    this.conversationDetails.set(null);
    this.detailsError.set(null);
    this.initialUnreadBoundaryId.set(null);
    this.lastCapturedConversationId = null;
    this.newMessagesBelowCount.set(0);
    this.showNewMessagesPill.set(false);
    this.processedMessageIds.clear();
    this.highestMarkedReadId = null;
    this.latestPendingReadId = null;
    if (this.markReadTimeout) {
      clearTimeout(this.markReadTimeout);
      this.markReadTimeout = null;
    }
  }

  private updateUnreadBoundary(): void {
    const convId = this.conversationId();
    if (!convId) {
      this.initialUnreadBoundaryId.set(null);
      this.lastCapturedConversationId = null;
      return;
    }

    if (this.lastCapturedConversationId !== convId) {
      const details = this.conversationDetails();
      const lastReadId = details?.lastReadMessageId;
      const rawList = this.messages();

      if (details && rawList.length > 0) {
        if (lastReadId) {
          const firstUnread = rawList.find(
            (m) =>
              m.status === 'persisted' &&
              m.authorId !== this.currentUser()?.id &&
              isMessageAfterLastRead(m.id, lastReadId),
          );
          this.initialUnreadBoundaryId.set(firstUnread ? firstUnread.id : null);
        } else {
          this.initialUnreadBoundaryId.set(null);
        }
        this.lastCapturedConversationId = convId;
      }
    }
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.resetConversationState();
      if (this.composerResizeObserver) {
        this.composerResizeObserver.disconnect();
        this.composerResizeObserver = null;
      }
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
        this.intersectionObserver = null;
      }
      if (this.markReadTimeout) {
        clearTimeout(this.markReadTimeout);
        this.markReadTimeout = null;
      }
      if (this.highlightTimeout) {
        clearTimeout(this.highlightTimeout);
        this.highlightTimeout = null;
      }
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
        this.toastTimeout = null;
      }
    });
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
    this.setupComposerResizeObserver();
  }

  ngOnDestroy(): void {
    this.resetConversationState();
    this.scrollController.destroy();
    if (this.composerResizeObserver) {
      this.composerResizeObserver.disconnect();
      this.composerResizeObserver = null;
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  private setupComposerResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const el = this.composerWrapperRef()?.nativeElement;
    if (!el) return;

    this.composerResizeObserver = new ResizeObserver((entries) => {
      // Khóa resize adjustment khi pagination đang chạy
      if (this.loadingMore()) return;

      for (const entry of entries) {
        const height = Math.round(entry.contentRect.height);
        if (Math.abs(height - this.dynamicBottomPadding()) > 2) {
          this.dynamicBottomPadding.set(height);
          if (this.isNearBottom()) {
            this.scrollToBottom(false);
          }
        }
      }
    });
    this.composerResizeObserver.observe(el);
  }

  async loadConversationDetails(id: string): Promise<void> {
    const generation = ++this.detailsGeneration;
    this.detailsLoading.set(true);
    this.detailsError.set(null);

    // Kiểm tra định dạng ID cơ bản (UUID v4)
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid && !id.startsWith('conv-') && !id.startsWith('dm-')) {
      if (this.detailsGeneration === generation && this.conversationId() === id) {
        this.detailsError.set({
          status: 404,
          message: 'Cuộc trò chuyện không tồn tại hoặc định dạng ID không hợp lệ.',
          type: '404',
        });
        this.conversationDetails.set(null);
        this.detailsLoading.set(false);
      }
      return;
    }

    try {
      const details = await this.conversationsApi.getConversation(id);
      if (this.detailsGeneration === generation && this.conversationId() === id) {
        this.conversationDetails.set(details);
        this.detailsError.set(null);
        this.updateUnreadBoundary();
      }
    } catch (err: unknown) {
      if (this.detailsGeneration === generation && this.conversationId() === id) {
        const httpStatus = (err as { status?: number })?.status;
        let errType: '401' | '403' | '404' | '5xx' | 'network' | 'unknown' = 'unknown';
        let defaultMsg = 'Không thể tải thông tin cuộc trò chuyện.';

        if (httpStatus === 401) {
          errType = '401';
          defaultMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else if (httpStatus === 403) {
          errType = '403';
          defaultMsg = 'Bạn không có quyền truy cập vào cuộc trò chuyện này.';
        } else if (httpStatus === 404) {
          errType = '404';
          defaultMsg = 'Cuộc trò chuyện không tồn tại hoặc đã bị xóa.';
        } else if (httpStatus && httpStatus >= 500) {
          errType = '5xx';
          defaultMsg = 'Máy chủ gặp sự cố khi tải thông tin cuộc trò chuyện.';
        } else {
          errType = 'network';
          defaultMsg = 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền.';
        }

        this.detailsError.set({
          status: httpStatus,
          message: extractErrorMessage(err, defaultMsg),
          type: errType,
        });
        this.conversationDetails.set(null);
      }
    } finally {
      if (this.detailsGeneration === generation && this.conversationId() === id) {
        this.detailsLoading.set(false);
      }
    }
  }

  retryDetails(): void {
    const id = this.conversationId();
    if (id) {
      void this.loadConversationDetails(id);
    }
  }

  retryMessages(): void {
    void this.activeChatStore.retryInitialLoad();
  }

  retryPagination(): void {
    void this.activeChatStore.loadOlderMessages();
  }

  // ---------------------------------------------------------------------------
  // Scroll & Viewport Observer
  // ---------------------------------------------------------------------------

  async onScroll(event: Event): Promise<void> {
    const el = event.target as HTMLElement;
    if (!el) return;

    this.scrollController.onScroll();

    if (this.scrollController.isNearBottom()) {
      this.markLatestInboundAsRead();
    }

    // Infinite scroll up khi cuộn lên gần đỉnh (< 80px)
    if (el.scrollTop < 80 && this.hasMore() && !this.loadingMore()) {
      const prevScrollHeight = el.scrollHeight;
      const prevScrollTop = el.scrollTop;
      const currentId = this.conversationId();
      const currentGen = this.scrollController.generation;

      await this.activeChatStore.loadOlderMessages();

      if (currentId) {
        this.scrollController.preserveScrollOnPrepend(
          prevScrollHeight,
          prevScrollTop,
          currentId,
          currentGen,
        );
      }
    }
  }

  markLatestInboundAsRead(): void {
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
      const rawList = this.messages();
      const myId = this.currentUser()?.id;
      for (let i = rawList.length - 1; i >= 0; i--) {
        const m = rawList[i];
        if (m.status === 'persisted' && m.authorId !== myId && /^\d+$/.test(m.id)) {
          this.scheduleMarkRead(m.id);
          break;
        }
      }
    }
  }

  scrollToLatest(smooth = true): void {
    this.scrollController.scrollToLatest(smooth ? 'smooth' : 'auto');
    this.markLatestInboundAsRead();
  }

  scrollToBottom(smooth = true): void {
    this.scrollToLatest(smooth);
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

            // Chỉ markAsRead tin nhắn của người khác (inbound) và là ID persisted hợp lệ
            if (msgId && authorId && authorId !== myId && /^\d+$/.test(msgId)) {
              if (!maxVisibleInboundId || isMessageAfterLastRead(msgId, maxVisibleInboundId)) {
                maxVisibleInboundId = msgId;
              }
            }
          }
        }

        if (maxVisibleInboundId) {
          this.scheduleMarkRead(maxVisibleInboundId);
        }
      },
      { root: this.chatHistoryRef()?.nativeElement || null, threshold: 0.2 },
    );

    this.observeMessageElements();
  }

  observeMessageElements(): void {
    if (!this.intersectionObserver) return;
    const historyEl = this.chatHistoryRef()?.nativeElement;
    if (!historyEl) return;

    const rows = historyEl.querySelectorAll('.message-row[data-message-id]');
    rows.forEach((row) => {
      this.intersectionObserver?.observe(row);
    });
  }

  private scheduleMarkRead(messageId: string): void {
    // 1. Không mark as read khi tab bị ẩn
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    // 2. Bỏ qua optimistic non-numeric IDs
    if (!messageId || !/^\d+$/.test(messageId)) {
      return;
    }

    // 3. Monotonic check: Chỉ gửi ID tiến lên (không gọi lùi bigint ID)
    if (this.highestMarkedReadId && !isMessageAfterLastRead(messageId, this.highestMarkedReadId)) {
      return;
    }

    this.latestPendingReadId = messageId;
    if (this.markReadTimeout) {
      clearTimeout(this.markReadTimeout);
    }

    // Debounce 400ms để không spam API khi cuộn nhanh
    this.markReadTimeout = setTimeout(() => {
      if (this.latestPendingReadId) {
        const idToMark = this.latestPendingReadId;
        this.highestMarkedReadId = idToMark;
        void this.activeChatStore.markAsRead(idToMark);
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
    messageId?: string;
    attachmentId?: string;
  } | null>(null);

  private readonly lightboxGalleryService = inject(LightboxGalleryService);
  private lastFocusedElement: HTMLElement | null = null;

  protected readonly galleryMediaItems = computed<LightboxMediaItem[]>(() => {
    const items: LightboxMediaItem[] = [];
    for (const msg of this.messages()) {
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.filename)) {
            items.push({
              messageId: String(msg.id),
              attachmentId: att.id,
              filename: att.filename,
              mimeType: att.mimeType,
              url: att.signedUrl || '',
              sizeBytes: att.sizeBytes,
              createdAt: msg.createdAt,
              senderName: msg.author?.displayName || msg.author?.username,
            });
          }
        }
      }
    }
    return items;
  });

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.activeLightbox()) {
      event.preventDefault();
      this.closeLightbox();
    } else if (this.forwardModalMessage()) {
      event.preventDefault();
      this.closeForwardModal();
    }
  }

  openLightbox(
    src: string,
    alt: string,
    messageId?: string,
    attachmentId?: string,
    event?: Event,
  ): void {
    const openerElement =
      (event?.target as HTMLElement) ||
      (typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null);

    const allMedia = this.galleryMediaItems();
    const items =
      allMedia.length > 0
        ? allMedia
        : [
            {
              messageId: messageId || 'temp',
              attachmentId: attachmentId || 'temp',
              filename: alt || 'image',
              mimeType: 'image/png',
              url: src,
            },
          ];

    this.activeLightbox.set({ src, alt, messageId, attachmentId });

    this.lightboxGalleryService.open({
      items,
      initialActiveId: messageId && attachmentId ? { messageId, attachmentId } : undefined,
      openerElement,
      refreshAttachmentUrl: async (mId, aId) => {
        try {
          const freshUrl = await this.activeChatStore.refreshAttachmentUrl(mId, aId);
          return freshUrl || null;
        } catch {
          return null;
        }
      },
      onDownload: async (item) => {
        await this.downloadAttachment(item.messageId, item.attachmentId, item.url, item.filename);
      },
    });
  }

  closeLightbox(): void {
    this.activeLightbox.set(null);
    this.lightboxGalleryService.close();
  }

  readonly downloadingAttachmentIds = signal<Set<string>>(new Set());

  getFileIcon(filename: string): string {
    const lower = (filename || '').toLowerCase();
    if (lower.endsWith('.pdf')) return 'picture_as_pdf';
    if (lower.endsWith('.zip')) return 'folder_zip';
    if (lower.endsWith('.docx')) return 'description';
    if (lower.endsWith('.txt')) return 'text_snippet';
    return 'description';
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  async downloadAttachment(
    messageId: string | undefined,
    attachmentId: string | undefined,
    currentUrl: string | null | undefined,
    filename: string,
    event?: Event,
  ): Promise<void> {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const attKey = attachmentId || currentUrl || filename;
    if (!attKey || this.downloadingAttachmentIds().has(attKey)) {
      return;
    }

    this.downloadingAttachmentIds.update((set) => new Set(set).add(attKey));

    let validUrl = currentUrl;
    let hasRefreshed = false;

    try {
      // Nếu chưa có URL hoặc đã bị đánh dấu lỗi trước đó, refresh ngay 1 lần
      if (
        (!validUrl || (attachmentId && this.failedAttachmentIds().has(attachmentId))) &&
        messageId &&
        attachmentId
      ) {
        validUrl = await this.activeChatStore.refreshAttachmentUrl(messageId, attachmentId);
        hasRefreshed = true;
        if (validUrl) {
          this.failedAttachmentIds.update((set) => {
            const next = new Set(set);
            next.delete(attachmentId);
            return next;
          });
        }
      }

      if (!validUrl) {
        this.showToast('Không thể tạo liên kết tải tệp.');
        return;
      }

      let blobDownloaded = false;
      try {
        let res = await fetch(validUrl);
        // Refresh đúng 1 lần nếu gặp lỗi auth/expired từ signed URL
        if (
          (res.status === 400 || res.status === 401 || res.status === 403) &&
          !hasRefreshed &&
          messageId &&
          attachmentId
        ) {
          validUrl = await this.activeChatStore.refreshAttachmentUrl(messageId, attachmentId);
          hasRefreshed = true;
          if (validUrl) {
            this.failedAttachmentIds.update((set) => {
              const next = new Set(set);
              next.delete(attachmentId);
              return next;
            });
            res = await fetch(validUrl);
          }
        }

        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          try {
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || 'download';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            blobDownloaded = true;
          } finally {
            URL.revokeObjectURL(blobUrl);
          }
        }
      } catch {
        // Fetch thất bại do CORS hoặc network
      }

      // Fallback mở trực tiếp signed URL canonical
      if (!blobDownloaded && validUrl) {
        const a = document.createElement('a');
        a.href = validUrl;
        a.download = filename || 'download';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      this.showToast('Lỗi khi tải tệp về máy.');
    } finally {
      this.downloadingAttachmentIds.update((set) => {
        const next = new Set(set);
        next.delete(attKey);
        return next;
      });
    }
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  isAudioAttachment(att: AttachmentResponseDto): boolean {
    return (
      att.mimeType === 'audio/mpeg' ||
      att.mimeType === 'audio/mp3' ||
      /\.mp3$/i.test(att.filename || '')
    );
  }

  isVideoAttachment(att: AttachmentResponseDto): boolean {
    return (
      Boolean(att.mimeType?.startsWith('video/')) ||
      /\.(mp4|m4v|webm|ogv|mov|qt|mkv|avi|mpeg|mpg|3gp|wmv|flv)$/i.test(att.filename || '')
    );
  }

  isBrowserPlayableVideo(att: AttachmentResponseDto): boolean {
    return (
      ['video/mp4', 'video/x-m4v', 'video/webm', 'video/ogg'].includes(att.mimeType) ||
      /\.(mp4|m4v|webm|ogv)$/i.test(att.filename || '')
    );
  }

  onSendMessage(payload: SendMessagePayload): void {
    if (payload.editMessageId) {
      void this.activeChatStore.editMessage(payload.editMessageId, payload.content);
    } else {
      void this.activeChatStore.sendMessage({
        content: payload.content,
        files: payload.files,
        attachments: payload.attachments,
        replyToId: payload.replyToId,
        externalMedia: payload.externalMedia,
      });
    }
  }

  onTyping(): void {
    this.activeChatStore.setTyping(true);
  }

  onStoppedTyping(): void {
    this.activeChatStore.setTyping(false);
  }

  readonly forwardModalMessage = signal<ChatUiMessage | null>(null);

  openForwardModal(message: ChatUiMessage): void {
    this.forwardModalMessage.set(message);
  }

  closeForwardModal(): void {
    this.forwardModalMessage.set(null);
  }

  onForwardSuccess(dto: MessageResponseDto): void {
    this.closeForwardModal();
  }

  readonly currentUserId = computed(() => this.auth.user()?.id ?? '');
  readonly deleteModalMessage = signal<ChatUiMessage | null>(null);
  readonly isDeletingMessage = signal<boolean>(false);

  closeDeleteModal(): void {
    this.deleteModalMessage.set(null);
  }

  openDeleteModal(msg: ChatUiMessage): void {
    const dialogRef = this.dialog.open<
      DeleteMessageModal,
      DeleteMessageModalData,
      'for_me' | 'everyone'
    >(DeleteMessageModal, {
      data: {
        message: msg,
        canRecall: msg.authorId === this.currentUserId(),
      },
      panelClass: 'nexus-dialog-clean-panel',
      backdropClass: 'nexus-dialog-backdrop-blur',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((scope) => {
      if (scope) {
        void this.activeChatStore.deleteMessage(msg.id, scope);
      }
    });
  }

  async onConfirmDelete(scope: 'for_me' | 'everyone'): Promise<void> {
    const msg = this.deleteModalMessage();
    if (!msg) return;
    this.isDeletingMessage.set(true);
    try {
      await this.activeChatStore.deleteMessage(msg.id, scope);
      this.closeDeleteModal();
    } catch {
      // Handled by store
    } finally {
      this.isDeletingMessage.set(false);
    }
  }

  canEdit(msg: ChatUiMessage): boolean {
    return canEditMessage(msg, this.currentUserId(), this.messageClock.now());
  }

  startEdit(msg: ChatUiMessage): void {
    this.editingMessageId.set(msg.id);
    this.editingError.set(null);
  }

  cancelInlineEdit(): void {
    this.editingMessageId.set(null);
    this.editingError.set(null);
  }

  async saveInlineEdit(messageId: string, newContent: string): Promise<void> {
    try {
      this.editingSaving.set(true);
      this.editingError.set(null);
      await this.activeChatStore.editMessage(messageId, newContent);
      this.editingMessageId.set(null);
    } catch (err: unknown) {
      this.editingError.set(extractErrorMessage(err, 'Lỗi khi chỉnh sửa tin nhắn.'));
    } finally {
      this.editingSaving.set(false);
    }
  }

  onMessageAction(action: MessageComposerContext): void {
    if (action.kind === 'edit' && action.messageId) {
      const msg = this.messages().find((m) => m.id === action.messageId);
      if (msg) {
        this.startEdit(msg);
      }
    } else if (action.kind === 'delete' && action.messageId) {
      const msg = this.messages().find((m) => m.id === action.messageId);
      if (msg) {
        this.openDeleteModal(msg);
      }
    } else if (action.kind === 'forward' && action.messageId) {
      const msg = this.messages().find((m) => m.id === action.messageId);
      if (msg) {
        this.openForwardModal(msg);
      }
    } else if (action.kind === 'pin' && action.messageId) {
      void this.setMessagePinned(action.messageId, true);
    } else if (action.kind === 'unpin' && action.messageId) {
      void this.setMessagePinned(action.messageId, false);
    } else {
      this.composerContext.set(action);
    }
  }

  protected async unpinFromPanel(message: MessageResponseDto): Promise<void> {
    await this.setMessagePinned(message.id, false);
  }

  private async setMessagePinned(messageId: string, pinned: boolean): Promise<void> {
    if (this.pinBusyIds().has(messageId)) return;
    this.pinBusyIds.update((ids) => new Set(ids).add(messageId));
    try {
      if (pinned) {
        await this.activeChatStore.pinMessage(messageId);
      } else {
        await this.activeChatStore.unpinMessage(messageId);
      }
      this.showToast(pinned ? 'Đã ghim tin nhắn.' : 'Đã bỏ ghim tin nhắn.');
    } catch (error: unknown) {
      this.showToast(
        extractErrorMessage(
          error,
          pinned ? 'Không thể ghim tin nhắn.' : 'Không thể bỏ ghim tin nhắn.',
        ),
      );
    } finally {
      this.pinBusyIds.update((ids) => {
        const next = new Set(ids);
        next.delete(messageId);
        return next;
      });
    }
  }

  protected jumpFromPins(message: MessageResponseDto): void {
    this.activeChatStore.revealPinnedMessage(message);
    this.pinsOpen.set(false);
    setTimeout(() => this.scrollToMessage(message.id));
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
    const newUrl = await this.activeChatStore.refreshAttachmentUrl(messageId, attachmentId);
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

  getReplySnippet(msg: ChatUiMessage): string {
    if (msg.deletedAt) {
      return 'Tin nhắn đã bị xóa';
    }
    if (msg.content && msg.content.trim().length > 0) {
      return msg.content;
    }
    if (msg.attachments && msg.attachments.length > 0) {
      const first = msg.attachments[0];
      const isImg =
        first.mimeType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(first.filename);
      if (isImg) {
        return msg.attachments.length > 1
          ? `[${msg.attachments.length} hình ảnh] ${first.filename}`
          : `[Hình ảnh] ${first.filename}`;
      }
      return `[Tệp đính kèm] ${first.filename}`;
    }
    return 'Tin nhắn trống';
  }

  getMessageExcerpt(msg: ChatUiMessage): string {
    if (msg.deletedAt) {
      return 'Tin nhắn đã bị xóa';
    }
    if (msg.content && msg.content.trim().length > 0) {
      return msg.content;
    }
    if (msg.attachments && msg.attachments.length > 0) {
      const first = msg.attachments[0];
      const isImg =
        first.mimeType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(first.filename);
      if (isImg) {
        return msg.attachments.length > 1
          ? `[${msg.attachments.length} hình ảnh] ${first.filename}`
          : `[Hình ảnh] ${first.filename}`;
      }
      return `[Tệp đính kèm] ${first.filename}`;
    }
    return '';
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

  formatHoverTime(isoString: string): string {
    return this.formatTime(isoString);
  }

  formatAccessibleTime(isoString: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  readonly highlightedMessageId = signal<string | null>(null);
  private highlightTimeout: ReturnType<typeof setTimeout> | null = null;

  scrollToMessage(targetMessageId: string | null): void {
    if (!targetMessageId) return;

    if (typeof document !== 'undefined') {
      const targetElement = document.querySelector(
        `[data-message-id="${targetMessageId}"]`,
      ) as HTMLElement | null;

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        this.highlightedMessageId.set(targetMessageId);
        if (this.highlightTimeout) {
          clearTimeout(this.highlightTimeout);
        }
        this.highlightTimeout = setTimeout(() => {
          if (this.highlightedMessageId() === targetMessageId) {
            this.highlightedMessageId.set(null);
          }
        }, 2000);
      } else {
        this.toastMessage.set('Tin nhắn gốc chưa được tải trong lịch sử hiển thị.');
        if (this.toastTimeout) {
          clearTimeout(this.toastTimeout);
        }
        this.toastTimeout = setTimeout(() => {
          this.toastMessage.set(null);
        }, 3000);
      }
    }
  }

  onStartAudioCall(): void {
    if (this.isRecipientBlocked() || this.isRelationshipInvalidated()) return;
    const convId = this.conversationId();
    if (convId) {
      void this.directCallCoordinator.startCall(convId, 'audio');
    }
  }

  onStartVideoCall(): void {
    if (this.isRecipientBlocked() || this.isRelationshipInvalidated()) return;
    const convId = this.conversationId();
    if (convId) {
      void this.directCallCoordinator.startCall(convId, 'video');
    }
  }

  protected clearUiState(): void {
    void this.uiState.clearPreview();
  }
}
