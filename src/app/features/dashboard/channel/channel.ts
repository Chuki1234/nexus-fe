import { DatePipe, isPlatformBrowser } from '@angular/common';
import { ToastService } from '../../../core/toast/toast.service';
import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  OnInit,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatToolbar } from '../components/chat-toolbar/chat-toolbar';
import { ContextPanel } from '../components/context-panel/context-panel';
import { MOBILE_BREAKPOINT_QUERY } from '../../../layouts/app-layout/services/dashboard-layout.service';
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
import { ServersApiService, type ServerMemberDto } from '../../../core/api/servers-api.service';
import { ChannelChatStore, type ChannelChatUiMessage } from '../services/channel-chat.store';
import { compareMessageOrder } from '../../../core/utils/safe-message-comparator';
import {
  MessagesApiService,
  type MessageResponseDto,
} from '../../../core/api/messages-api.service';
import { ServersStore } from '../../../core/servers/servers.store';
import { ServerRealtimeCoordinator } from '../../../core/servers/server-realtime-coordinator.service';
import { PresenceService } from '../../../core/presence/presence.service';
import { ChatScrollController } from '../../../core/utils/chat-scroll.controller';
import type { PresenceStatus } from '../../../../shared/dto/common';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { ProfileTrigger } from '../../profile/profile-trigger';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ChannelSettingsModal } from '../../settings/modals/channel-settings-modal/channel-settings-modal';
import { ForwardMessageModal } from '../components/forward-message-modal/forward-message-modal';
import {
  DeleteMessageModal,
  type DeleteMessageModalData,
} from '../components/delete-message-modal/delete-message-modal';
import { LightboxGalleryService } from '../../../shared/ui/lightbox-gallery/lightbox-gallery.service';
import type { LightboxMediaItem } from '../../../shared/ui/lightbox-gallery/lightbox-gallery.types';
import { VoiceRoom } from '../../voice/voice-room/voice-room';
import { GiphyMessageEmbedComponent } from '../components/giphy-message-embed/giphy-message-embed.component';
import { formatMessageTimestamp, formatCompactTime } from '../../../core/utils/date-format.util';
import {
  parseMessageContent,
  type MessageContentToken,
} from '../conversation/utils/message-content-parser';
import {
  getMessagePresentationVariant,
  formatDateDividerLabel,
  isSameCalendarDay,
  parseTimestamp,
  type MessagePresentationVariant,
} from '../conversation/conversation';
import { InlineMessageEditor } from '../components/inline-message-editor/inline-message-editor';
import { MessageClockService } from '../../../core/utils/message-clock.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { UserSettingsService } from '../../settings/services/user-settings.service';
import { canEditMessage } from '../../../../shared/dto/messages.dto';
import { extractErrorMessage } from '../../../core/utils/error.util';
import type { AttachmentResponseDto } from '../../../core/api/messages-api.service';

import { ProfileStore } from '../../profile/profile-store';

/** Kênh trong server — `/channels/:serverId/:channelId`. */
@Component({
  selector: 'app-channel-page',
  imports: [
    Avatar,
    ChatToolbar,
    ContextPanel,
    DashboardState,
    DatePipe,
    EmptyState,
    ForwardMessageModal,
    GiphyMessageEmbedComponent,
    InlineMessageEditor,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MessageActions,
    MessageComposer,
    PinnedMessagesList,
    ProfileTrigger,
    VoiceRoom,
  ],
  providers: [MessageClockService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  templateUrl: './channel.html',
  styleUrl: './channel.css',
})
export class ChannelPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly serversStore = inject(ServersStore, { optional: true });
  private readonly serversApi = inject(ServersApiService, { optional: true });
  private readonly coordinator = inject(ServerRealtimeCoordinator, { optional: true });
  readonly channelChat = inject(ChannelChatStore, { optional: true }) ?? inject(ChannelChatStore);
  protected readonly auth = inject(AuthService, { optional: true }) ?? inject(AuthService);
  protected readonly profileStore = inject(ProfileStore);
  readonly messageClock = inject(MessageClockService);
  private readonly notificationService = inject(NotificationService, { optional: true });
  private readonly userSettings = inject(UserSettingsService, { optional: true });
  private readonly presenceService =
    inject(PresenceService, { optional: true }) ?? inject(PresenceService);
  private readonly dialog = inject(MatDialog);

  readonly editingMessageId = signal<string | null>(null);
  readonly editingSaving = signal<boolean>(false);
  readonly editingError = signal<string | null>(null);
  readonly failedAttachmentIds = signal<Set<string>>(new Set());
  private readonly lightbox = inject(LightboxGalleryService);
  private readonly uiState = inject(DashboardUiState);
  private readonly toast = inject(ToastService);
  private readonly messagesApi = inject(MessagesApiService);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpoints = inject(BreakpointObserver);
  private isDestroyed = false;

  protected readonly isMobile = toSignal(
    this.breakpoints.observe(MOBILE_BREAKPOINT_QUERY).pipe(map((state) => state.matches)),
    { initialValue: typeof window !== 'undefined' ? window.innerWidth < 768 : false },
  );

  protected readonly chatViewportRef = viewChild<ElementRef<HTMLDivElement>>('chatViewport');
  protected readonly chatHistoryRef = viewChild<ElementRef<HTMLDivElement>>('chatHistory');

  readonly scrollController = new ChatScrollController({
    getContainer: () => this.chatHistoryRef()?.nativeElement,
    getContentWrapper: () =>
      (this.chatHistoryRef()?.nativeElement.firstElementChild as HTMLElement) ||
      this.chatHistoryRef()?.nativeElement,
    injector: this.injector,
    platformId: this.platformId,
    threshold: 120,
    onPillChange: (show, count) => {
      this.showScrollDownButton.set(show);
      this.unreadCountBelow.set(count);
    },
  });

  // UI state signals
  protected readonly detailsOpen = signal<boolean>(false);
  protected readonly searchOpen = signal<boolean>(false);
  protected readonly pinsOpen = signal<boolean>(false);
  protected readonly pinBusyIds = signal<Set<string>>(new Set());
  protected readonly searchResults = signal<MessageResponseDto[]>([]);
  protected readonly searchLoading = signal<boolean>(false);
  protected readonly searchQuery = signal<string>('');
  protected readonly composerContext = signal<MessageComposerContext | null>(null);
  protected readonly forwardModalMessage = signal<ChannelChatUiMessage | null>(null);
  protected readonly serverMembers = signal<ServerMemberDto[]>([]);
  protected readonly loadingMembers = signal<boolean>(false);
  protected readonly showScrollDownButton = signal<boolean>(false);
  protected readonly highlightedMessageId = signal<string | null>(null);
  protected readonly unreadCountBelow = signal<number>(0);
  private readonly processedMessageIds = new Set<string>();

  protected readonly blockingState = this.uiState.blockingState;
  protected readonly connectionState = this.uiState.connectionState;

  private readonly params = toSignal(
    this.route.paramMap.pipe(
      map((params) => ({
        serverId: params.get('serverId'),
        channelId: params.get('channelId'),
      })),
    ),
    { initialValue: { serverId: null, channelId: null } },
  );

  protected readonly serverId = computed(() => this.params().serverId || '');
  protected readonly channelId = computed(() => this.params().channelId || '');

  protected readonly server = computed(() => {
    const sId = this.serverId();
    return sId ? this.serversStore?.serverOf(sId) : undefined;
  });

  protected readonly channel = computed(() => {
    const sId = this.serverId();
    const cId = this.channelId();
    if (!sId || !cId) return undefined;
    return this.serversStore?.channelsOf(sId).find((c) => c.id === cId);
  });

  /** Kiểm tra kênh có bật giới hạn độ tuổi không */
  protected readonly isAgeRestricted = computed(() => {
    const ch = this.channel();
    return Boolean(ch?.isAgeRestricted || ch?.contentVisibility === 'age_restricted');
  });

  /** Kiểm tra người dùng có đủ từ 18 tuổi trở lên hay không */
  protected readonly isUserAllowedAge = computed(() => {
    if (!this.isAgeRestricted()) return true;
    const birthdate = this.profileStore.profile()?.birthdate;
    if (!birthdate) return true;
    const parts = birthdate.split('-');
    const birthYear = parseInt(parts[0], 10);
    if (isNaN(birthYear)) return true;
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear >= 18;
  });

  protected readonly permissions = this.channelChat.permissions;
  protected readonly messages = this.channelChat.allMessages;
  protected readonly typingUserIds = this.channelChat.typingUserIds;
  protected readonly typingText = computed(() => {
    const ids = this.typingUserIds();
    const latestUserId = ids[ids.length - 1];
    if (!latestUserId) return null;
    const member = this.serverMembers().find((item) => item.userId === latestUserId);
    const displayName = member?.nickname || member?.displayName || member?.username;
    return `${displayName || 'Một thành viên'} đang gõ...`;
  });

  // Thành viên server kèm live presence
  protected readonly membersWithPresence = computed(() => {
    const raw = this.serverMembers();
    const presenceMap = this.presenceService.presences();
    return raw.map((m) => {
      const livePres = presenceMap.get(m.userId);
      return {
        ...m,
        presence: (livePres?.status || 'offline') as PresenceStatus,
      };
    });
  });

  protected readonly onlineMembers = computed(() =>
    this.membersWithPresence().filter((m) => m.presence !== 'offline'),
  );

  protected readonly offlineMembers = computed(() =>
    this.membersWithPresence().filter((m) => m.presence === 'offline'),
  );

  protected readonly mentionCandidates = computed<MentionCandidate[]>(() => {
    const members = this.serverMembers();
    const list: MentionCandidate[] = [
      {
        id: 'everyone',
        username: 'everyone',
        displayName: 'everyone',
        avatarUrl: null,
        isEveryone: true,
        description: 'Thông báo tới tất cả thành viên trong kênh',
      },
    ];

    for (const m of members) {
      list.push({
        id: m.userId,
        username: m.username,
        displayName: m.nickname || m.displayName || m.username,
        avatarUrl: m.avatarUrl,
        role: m.role,
      });
    }

    return list;
  });

  private previousIsMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      this.scrollController.destroy();
    });

    // Khi viewport chuyển từ desktop sang mobile (có nút hamburger), tự đóng details panel
    effect(() => {
      const mobile = this.isMobile();
      if (mobile && !this.previousIsMobile) {
        untracked(() => {
          this.detailsOpen.set(false);
        });
      }
      this.previousIsMobile = mobile;
    });

    // Tự động load channel khi params thay đổi
    effect(() => {
      const sId = this.serverId();
      const cId = this.channelId();
      if (sId && cId) {
        untracked(() => {
          void this.initChannel(sId, cId);
        });
      }
    });

    // DOM-Driven Smart Scroll khi messages thay đổi (Phân biệt Initial History vs Realtime)
    effect(() => {
      const msgs = this.messages();
      const isLoading = this.channelChat.loadingInitial();
      const isLoadingMore = this.channelChat.loadingMore();
      const sId = this.serverId();
      const cId = this.channelId();
      const myId = this.auth.user()?.id;

      if (!sId || !cId || isLoading || isLoadingMore) {
        return;
      }

      const targetKey = `${sId}:${cId}`;

      untracked(() => {
        if (msgs.length === 0) {
          this.processedMessageIds.clear();
          return;
        }

        // 1. Initial history: thực hiện đúng 1 lần instant scroll
        if (!this.scrollController.hasScrolledInitial) {
          for (const m of msgs) {
            const k = m.id || m.clientNonce;
            if (k) this.processedMessageIds.add(k);
          }
          this.scrollController.handleInitialRender(targetKey, this.scrollController.generation);
          return;
        }

        // 2. Realtime messages:
        const newMsgs: ChannelChatUiMessage[] = [];
        for (const m of msgs) {
          const k = m.id || m.clientNonce;
          if (k && !this.processedMessageIds.has(k)) {
            this.processedMessageIds.add(k);
            newMsgs.push(m);
          }
        }

        if (newMsgs.length === 0) return;

        const { wasNearBottom } = this.scrollController.capturePreMutationState();
        const hasOwnMessage = newMsgs.some((m) => m.authorId === myId);
        const inboundCount = newMsgs.filter(
          (m) => m.authorId !== myId && m.status === 'persisted',
        ).length;

        this.scrollController.handleRealtimeAppend(targetKey, this.scrollController.generation, {
          isMine: hasOwnMessage,
          wasNearBottom,
          count: inboundCount,
        });
      });
    });
  }

  async ngOnInit(): Promise<void> {
    void this.profileStore.ensureLoaded();
    if (this.serversStore && this.serversApi) {
      await this.serversStore.ensureHydrated(this.serversApi);
    }
  }

  ngAfterViewInit(): void {
    // Initial scroll được điều khiển bởi scrollController khi messages render xong
  }

  private async initChannel(serverId: string, channelId: string): Promise<void> {
    const targetKey = `${serverId}:${channelId}`;
    this.scrollController.reset(targetKey);
    this.processedMessageIds.clear();
    this.composerContext.set(null);
    this.forwardModalMessage.set(null);
    this.unreadCountBelow.set(0);
    this.serversStore?.setActive(serverId, channelId);

    // Ensure hydration
    if (this.serversStore && this.serversApi) {
      await this.serversStore.ensureHydrated(this.serversApi);
    }

    // Load channel messages & permissions
    if (this.channelChat) {
      await this.channelChat.loadInitial(serverId, channelId);
    }

    // Load server members
    void this.loadMembers(serverId);
  }

  private async loadMembers(serverId: string): Promise<void> {
    if (!this.serversApi) return;
    this.loadingMembers.set(true);
    try {
      const members = await this.serversApi.getServerMembers(serverId);
      this.serverMembers.set(members);
    } catch {
      this.serverMembers.set([]);
    } finally {
      this.loadingMembers.set(false);
    }
  }

  protected clearUiState(): void {
    void this.uiState.clearPreview();
  }

  // --- Date and Unread Divider Helpers ---

  protected shouldShowDateDivider(index: number): boolean {
    const list = this.messages();
    if (index === 0) return true;
    const prev = list[index - 1];
    const curr = list[index];
    const dPrev = parseTimestamp(prev.createdAt);
    const dCurr = parseTimestamp(curr.createdAt);
    return !isSameCalendarDay(dPrev, dCurr);
  }

  protected getDateDividerLabel(index: number): string {
    const list = this.messages();
    const curr = list[index];
    return formatDateDividerLabel(curr.createdAt);
  }

  protected isUnreadDivider(index: number): boolean {
    const list = this.messages();
    const curr = list[index];
    const lastRead = this.channelChat.lastReadMessageId();
    if (!lastRead || curr.status !== 'persisted') return false;

    const prev = index > 0 ? list[index - 1] : null;
    const isCurrUnread = compareMessageOrder(curr, { id: lastRead }) > 0;
    const isPrevRead =
      !prev || prev.status !== 'persisted' || compareMessageOrder(prev, { id: lastRead }) <= 0;

    return isCurrUnread && isPrevRead;
  }

  protected getPresentationVariant(msg: ChannelChatUiMessage): MessagePresentationVariant {
    return getMessagePresentationVariant(msg);
  }

  protected parseContent(content: string | null | undefined, id: string): MessageContentToken[] {
    return parseMessageContent(content, `ch-${id}`);
  }

  protected isCompact(index: number): boolean {
    const list = this.messages();
    if (index === 0) return false;
    const prev = list[index - 1];
    const curr = list[index];

    if (prev.authorId !== curr.authorId) return false;
    if (this.shouldShowDateDivider(index)) return false;
    if (this.isUnreadDivider(index)) return false;
    if (curr.replyToId) return false;

    const tPrev = parseTimestamp(prev.createdAt)?.getTime() ?? 0;
    const tCurr = parseTimestamp(curr.createdAt)?.getTime() ?? 0;
    return Math.abs(tCurr - tPrev) < 5 * 60 * 1000;
  }

  // --- Chat Actions ---

  protected async onSendMessage(payload: SendMessagePayload): Promise<void> {
    const context = this.composerContext();

    if (context?.kind === 'edit' && context.messageId) {
      await this.channelChat.editMessage(context.messageId, payload.content || '');
      this.composerContext.set(null);
      return;
    }

    const replyToId = context?.kind === 'reply' ? context.messageId : undefined;
    this.composerContext.set(null);

    // Âm thanh gửi tin (đồng bộ toggle "Tin nhắn" trong Cài đặt thông báo).
    if (this.userSettings?.preferences().soundMessage) {
      this.notificationService?.playMessageSound();
    }

    await this.channelChat.sendMessage({
      content: payload.content,
      files: payload.files,
      attachments: payload.attachments,
      replyToId,
      externalMedia: payload.externalMedia,
    });
    this.unreadCountBelow.set(0);

    // Gửi tin của chính mình -> cuộn mượt về đáy
    this.scrollController.scrollToBottom('smooth');
  }

  protected readonly currentUserId = computed(() => this.auth.user()?.id ?? '');
  protected readonly deleteModalMessage = signal<ChannelChatUiMessage | null>(null);
  protected readonly isDeletingMessage = signal<boolean>(false);

  protected closeDeleteModal(): void {
    this.deleteModalMessage.set(null);
  }

  protected openDeleteModal(msg: ChannelChatUiMessage): void {
    const canRecall = msg.authorId === this.auth.user()?.id || this.permissions().canManageMessages;
    const dialogRef = this.dialog.open<
      DeleteMessageModal,
      DeleteMessageModalData,
      'for_me' | 'everyone'
    >(DeleteMessageModal, {
      data: {
        message: msg,
        canRecall,
      },
      panelClass: 'nexus-dialog-clean-panel',
      backdropClass: 'nexus-dialog-backdrop-blur',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((scope) => {
      if (scope) {
        void this.channelChat.deleteMessage(msg.id, scope);
      }
    });
  }

  protected async onConfirmDelete(scope: 'for_me' | 'everyone'): Promise<void> {
    const msg = this.deleteModalMessage();
    if (!msg) return;
    this.isDeletingMessage.set(true);
    try {
      await this.channelChat.deleteMessage(msg.id, scope);
      this.closeDeleteModal();
    } catch {
      // Handled in store error
    } finally {
      this.isDeletingMessage.set(false);
    }
  }

  protected isMine(msg: ChannelChatUiMessage): boolean {
    const uid = this.auth.user()?.id;
    return Boolean(uid && msg.authorId === uid);
  }

  protected canEdit(msg: ChannelChatUiMessage): boolean {
    return canEditMessage(msg, this.auth.user()?.id, this.messageClock.now());
  }

  protected startEdit(msg: ChannelChatUiMessage): void {
    this.editingMessageId.set(msg.id);
    this.editingError.set(null);
  }

  protected cancelInlineEdit(): void {
    this.editingMessageId.set(null);
    this.editingError.set(null);
  }

  protected async saveInlineEdit(messageId: string, newContent: string): Promise<void> {
    try {
      this.editingSaving.set(true);
      this.editingError.set(null);
      await this.channelChat.editMessage(messageId, newContent);
      this.editingMessageId.set(null);
    } catch (err: unknown) {
      this.editingError.set(extractErrorMessage(err, 'Lỗi khi chỉnh sửa tin nhắn.'));
    } finally {
      this.editingSaving.set(false);
    }
  }

  protected onAction(event: MessageComposerContext): void {
    if (event.kind === 'edit' && event.messageId) {
      const msg = this.messages().find((m) => m.id === event.messageId);
      if (msg) {
        this.startEdit(msg);
      }
      return;
    }
    if (event.kind === 'forward' && event.messageId) {
      const msg = this.messages().find((m) => m.id === event.messageId);
      if (msg) {
        this.forwardModalMessage.set(msg);
      }
      return;
    }
    if (event.kind === 'delete' && event.messageId) {
      const msg = this.messages().find((m) => m.id === event.messageId);
      if (msg) {
        this.openDeleteModal(msg);
      }
      return;
    }
    if (event.kind === 'copy' && event.messageId) {
      void this.copyMessageContent(event.messageId);
      return;
    }
    if (event.kind === 'pin' && event.messageId) {
      void this.setMessagePinned(event.messageId, true);
      return;
    }
    if (event.kind === 'unpin' && event.messageId) {
      void this.setMessagePinned(event.messageId, false);
      return;
    }
    this.composerContext.set(event);
  }

  /** Sao chép nội dung tin nhắn vào bộ nhớ tạm. */
  private async copyMessageContent(messageId: string): Promise<void> {
    const msg = this.messages().find((m) => m.id === messageId);
    const text = msg?.content ?? '';
    if (!text) {
      this.toast.show({
        message: 'Tin nhắn này không có nội dung văn bản để sao chép.',
        type: 'info',
      });
      return;
    }
    if (!isPlatformBrowser(this.platformId) || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.toast.show({ message: 'Đã sao chép nội dung tin nhắn.', type: 'success' });
    } catch {
      this.toast.show({ message: 'Không sao chép được. Hãy thử lại.', type: 'error' });
    }
  }

  protected async onToggleReaction(messageId: string, emoji: string): Promise<void> {
    const msg = this.messages().find((m) => m.id === messageId);
    const reaction = msg?.reactions?.find((r) => r.emoji === emoji);
    const reactedByMe = reaction?.reactedByMe ?? false;
    await this.channelChat.setReaction(messageId, emoji, !reactedByMe);
  }

  /** Tìm kiếm tin nhắn trong kênh; mở panel kết quả bên phải. */
  protected async onSearch(query: string): Promise<void> {
    const q = query.trim();
    this.searchQuery.set(q);
    if (q.length === 0) {
      this.searchOpen.set(false);
      this.searchResults.set([]);
      return;
    }
    const channelId = this.channelId();
    if (!channelId) {
      return;
    }
    this.pinsOpen.set(false);
    this.detailsOpen.set(false);
    this.searchOpen.set(true);
    this.searchLoading.set(true);
    try {
      const res = await this.messagesApi.searchChannelMessages(channelId, q, { limit: 30 });
      this.searchResults.set(res.messages);
    } catch {
      this.searchResults.set([]);
    } finally {
      this.searchLoading.set(false);
    }
  }

  /** Mở panel danh sách tin đã ghim. */
  protected openPins(): void {
    this.searchOpen.set(false);
    this.detailsOpen.set(false);
    this.pinsOpen.set(true);
  }

  protected async unpinFromPanel(message: MessageResponseDto): Promise<void> {
    await this.setMessagePinned(message.id, false);
  }

  private async setMessagePinned(messageId: string, pinned: boolean): Promise<void> {
    if (this.pinBusyIds().has(messageId)) return;
    this.pinBusyIds.update((ids) => new Set(ids).add(messageId));
    try {
      if (pinned) {
        await this.channelChat.pinMessage(messageId);
      } else {
        await this.channelChat.unpinMessage(messageId);
      }
      this.toast.show({
        message: pinned ? 'Đã ghim tin nhắn.' : 'Đã bỏ ghim tin nhắn.',
        type: 'success',
      });
    } catch (error: unknown) {
      this.toast.show({
        message: extractErrorMessage(
          error,
          pinned ? 'Không thể ghim tin nhắn.' : 'Không thể bỏ ghim tin nhắn.',
        ),
        type: 'error',
      });
    } finally {
      this.pinBusyIds.update((ids) => {
        const next = new Set(ids);
        next.delete(messageId);
        return next;
      });
    }
  }

  /** Nhảy tới tin nhắn từ panel (kết quả tìm kiếm / danh sách ghim) rồi đóng panel. */
  protected jumpFromPanel(messageOrId: MessageResponseDto | string): void {
    const messageId = typeof messageOrId === 'string' ? messageOrId : messageOrId.id;
    if (typeof messageOrId !== 'string') {
      this.channelChat.revealPinnedMessage(messageOrId);
    }
    this.searchOpen.set(false);
    this.pinsOpen.set(false);
    setTimeout(() => this.jumpToMessage(messageId));
  }

  protected onComposerTyping(): void {
    this.channelChat.startTyping();
  }

  protected onRetry(clientNonce: string): void {
    void this.channelChat.retrySendMessage(clientNonce);
  }

  protected onCancel(clientNonce: string): void {
    this.channelChat.cancelOptimisticMessage(clientNonce);
  }

  protected openSettings(): void {
    const ch = this.channel();
    const sId = this.serverId();
    if (!ch || !sId) return;

    const ref = this.dialog.open(ChannelSettingsModal, {
      data: { channel: ch, serverId: sId },
      panelClass: 'nexus-dialog-overlay',
      maxWidth: '92vw',
      maxHeight: '88vh',
      autoFocus: false,
    });

    ref.afterClosed().subscribe((res) => {
      if (res?.deleted) {
        const remaining = this.serversStore?.channelsOf(sId) || [];
        const next = remaining.find((c) => c.type === 'text') || remaining[0];
        if (next) {
          void this.router.navigate(['/channels', sId, next.id]);
        } else {
          void this.router.navigate(['/channels', sId]);
        }
      }
    });
  }

  protected isImage(att: AttachmentResponseDto): boolean {
    if (att.mimeType && att.mimeType.startsWith('image/')) return true;
    return /\.(jpg|jpeg|jfif|png|webp|gif|svg|avif|bmp)$/i.test(att.filename || '');
  }

  protected isAudio(att: AttachmentResponseDto): boolean {
    return (
      att.mimeType === 'audio/mpeg' ||
      att.mimeType === 'audio/mp3' ||
      /\.mp3$/i.test(att.filename || '')
    );
  }

  protected isVideo(att: AttachmentResponseDto): boolean {
    return (
      Boolean(att.mimeType?.startsWith('video/')) ||
      /\.(mp4|m4v|webm|ogv|mov|qt|mkv|avi|mpeg|mpg|3gp|wmv|flv)$/i.test(att.filename || '')
    );
  }

  protected isBrowserPlayableVideo(att: AttachmentResponseDto): boolean {
    return (
      ['video/mp4', 'video/x-m4v', 'video/webm', 'video/ogg'].includes(att.mimeType) ||
      /\.(mp4|m4v|webm|ogv)$/i.test(att.filename || '')
    );
  }

  protected formatAttachmentSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected onAttachmentMediaError(attId: string): void {
    this.failedAttachmentIds.update((set) => {
      const next = new Set(set);
      next.add(attId);
      return next;
    });
  }

  protected openLightbox(msg: ChannelChatUiMessage, att: AttachmentResponseDto): void {
    if (!att.signedUrl) return;
    const allAttachments = (msg.attachments || []).filter((a) => this.isImage(a));
    const items: LightboxMediaItem[] = allAttachments.map((a) => ({
      messageId: msg.id,
      attachmentId: a.id,
      filename: a.filename,
      mimeType: a.mimeType || 'image/png',
      url: a.signedUrl || '',
      sizeBytes: a.sizeBytes,
    }));

    const initialActiveId = { messageId: msg.id, attachmentId: att.id };
    this.lightbox.open({
      items,
      initialActiveId,
    });
  }

  protected jumpToMessage(messageId: string): void {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlightedMessageId.set(messageId);
      setTimeout(() => {
        this.highlightedMessageId.set(null);
      }, 2000);
    }
  }

  // --- Scroll & Pagination ---

  protected onScrollHistory(): void {
    const el = this.chatHistoryRef()?.nativeElement;
    if (!el) return;

    this.scrollController.onScroll();

    // Load more khi cuộn lên đỉnh
    if (el.scrollTop < 80 && this.channelChat.hasMore() && !this.channelChat.loadingMore()) {
      const prevScrollHeight = el.scrollHeight;
      const prevScrollTop = el.scrollTop;
      const targetKey = `${this.serverId()}:${this.channelId()}`;
      const gen = this.scrollController.generation;

      void this.channelChat.loadMore().then(() => {
        this.scrollController.preserveScrollOnPrepend(
          prevScrollHeight,
          prevScrollTop,
          targetKey,
          gen,
        );
      });
    }

    if (this.scrollController.isNearBottom()) {
      const msgs = this.messages();
      const lastPersisted = [...msgs].reverse().find((m) => m.status === 'persisted');
      if (lastPersisted) {
        void this.channelChat.markAsRead(lastPersisted.id);
      }
    }
  }

  protected scrollToLatest(behavior: ScrollBehavior = 'smooth'): void {
    this.scrollController.scrollToLatest(behavior);
    const msgs = this.messages();
    const lastPersisted = [...msgs].reverse().find((m) => m.status === 'persisted');
    if (lastPersisted) {
      void this.channelChat.markAsRead(lastPersisted.id);
    }
  }

  protected scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    this.scrollToLatest(behavior);
  }

  protected formatMessageTime(dateStr: string | null | undefined): string {
    return formatMessageTimestamp(dateStr);
  }

  getMessageExcerpt(msg: ChannelChatUiMessage): string {
    if (msg.deletedAt) {
      return 'Tin nhắn đã bị xóa';
    }
    if (msg.content && msg.content.trim().length > 0) {
      return msg.content;
    }
    if (msg.externalMedia) {
      const type = msg.externalMedia.mediaType || (msg.externalMedia as { type?: string }).type;
      const title = (msg.externalMedia as { title?: string }).title;
      if (type === 'sticker' || msg.externalMedia.provider === 'stipop') {
        return title ? `[Nhãn dán] ${title}` : '[Nhãn dán]';
      }
      return title ? `[GIF] ${title}` : '[GIF]';
    }
    if (msg.attachments && msg.attachments.length > 0) {
      const first = msg.attachments[0];
      const isImg =
        first.mimeType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(first.filename);
      const isVid =
        first.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(first.filename);
      const isAud =
        first.mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(first.filename);

      if (isImg) {
        return msg.attachments.length > 1
          ? `[${msg.attachments.length} hình ảnh] ${first.filename}`
          : `[Hình ảnh] ${first.filename}`;
      }
      if (isVid) {
        return msg.attachments.length > 1
          ? `[${msg.attachments.length} video] ${first.filename}`
          : `[Video] ${first.filename}`;
      }
      if (isAud) {
        return `[Tin nhắn thoại] ${first.filename}`;
      }
      return `[Tệp đính kèm] ${first.filename}`;
    }
    return '[Nội dung đính kèm]';
  }
}
